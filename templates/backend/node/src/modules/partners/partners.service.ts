import { ConflictError } from '../../shared/errors/conflict-error.js';
import { NotFoundError } from '../../shared/errors/not-found-error.js';
import { ValidationError } from '../../shared/errors/validation-error.js';
import type { PlatformIdentity } from '../../shared/identity/identity.js';
import type { AuditEntry, AuditEventView } from '../audit/audit.types.js';
import type {
  CreateContactInput,
  CreatePartnerInput,
  PartnerFilter,
  PartnerStatusChangeInput,
  PartnerStatusValue,
  PartnerTypeValue,
  UpdateContactInput,
  UpdatePartnerInput,
} from './partners.schemas.js';
import { hasReach, shouldBePrimary } from './primary-contact.js';

export type ContactRecord = {
  id: string;
  name: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
};

export type PartnerRecord = {
  id: string;
  type: PartnerTypeValue;
  cnpj: string;
  legalName: string;
  tradeName: string;
  status: PartnerStatusValue;
  primaryContact: ContactRecord | null;
  contactCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PartnerDetailRecord = PartnerRecord & { contacts: ContactRecord[] };

export type PartnerStats = {
  active: number;
  industries: number;
  distributors: number;
  withoutPrimaryContact: number;
  byType: { all: number; industry: number; distributor: number };
};

export type ContactWrite = Partial<Omit<ContactRecord, 'id'>>;

export type PartnersRepository = {
  list: (
    actor: PlatformIdentity,
    filter: PartnerFilter,
    page: number,
    pageSize: number,
  ) => Promise<{ data: PartnerRecord[]; total: number }>;
  stats: (actor: PlatformIdentity) => Promise<PartnerStats>;
  findById: (actor: PlatformIdentity, id: string) => Promise<PartnerDetailRecord | null>;
  findIdByCnpj: (actor: PlatformIdentity, cnpj: string) => Promise<string | null>;
  create: (
    actor: PlatformIdentity,
    input: CreatePartnerInput,
    audit: (id: string) => AuditEntry,
  ) => Promise<PartnerDetailRecord>;
  update: (
    actor: PlatformIdentity,
    id: string,
    input: Partial<CreatePartnerInput> & { status?: PartnerStatusValue },
    audit: AuditEntry,
  ) => Promise<PartnerDetailRecord>;
  // Marcar um contato como principal tira o anterior, na mesma transação.
  saveContact: (
    actor: PlatformIdentity,
    partnerId: string,
    contactId: string | null,
    input: ContactWrite,
    audit: AuditEntry,
  ) => Promise<PartnerDetailRecord>;
  removeContact: (
    actor: PlatformIdentity,
    partnerId: string,
    contactId: string,
    audit: AuditEntry,
  ) => Promise<PartnerDetailRecord>;
  listAudit: (
    actor: PlatformIdentity,
    id: string,
    page: number,
    pageSize: number,
  ) => Promise<{ data: AuditEventView[]; total: number }>;
};

const notFound = () => new NotFoundError('Parceiro não encontrado', 'PARTNER_NOT_FOUND');
const contactNotFound = () => new NotFoundError('Contato não encontrado', 'CONTACT_NOT_FOUND');
const cnpjTaken = () =>
  new ConflictError('Já existe um parceiro com esse CNPJ', 'PARTNER_CNPJ_TAKEN');

const TYPE_LABEL: Record<PartnerTypeValue, string> = {
  INDUSTRY: 'Indústria',
  DISTRIBUTOR: 'Distribuidor',
};

const FIELD_LABELS: Record<keyof UpdatePartnerInput, string> = {
  type: 'tipo',
  cnpj: 'CNPJ',
  legalName: 'razão social',
  tradeName: 'nome fantasia',
};

const TRANSITIONS: Record<
  PartnerStatusChangeInput['action'],
  { from: PartnerStatusValue; to: PartnerStatusValue; action: string; verb: string }
> = {
  inactivate: { from: 'ACTIVE', to: 'INACTIVE', action: 'PARTNER_INACTIVATED', verb: 'inativado' },
  reactivate: { from: 'INACTIVE', to: 'ACTIVE', action: 'PARTNER_REACTIVATED', verb: 'reativado' },
};

const partnerAudit = (id: string, action: string, summary: string, justification?: string) => ({
  economicGroupId: null,
  entity: { type: 'PARTNER' as const, id },
  action,
  summary,
  justification: justification ?? null,
});

export const makePartnersService = (repo: PartnersRepository) => {
  const requirePartner = async (actor: PlatformIdentity, id: string) => {
    const partner = await repo.findById(actor, id);
    if (!partner) throw notFound();
    return partner;
  };

  const requireContact = (partner: PartnerDetailRecord, contactId: string) => {
    const contact = partner.contacts.find((item) => item.id === contactId);
    if (!contact) throw contactNotFound();
    return contact;
  };

  return {
    async list(actor: PlatformIdentity, filter: PartnerFilter, page: number, pageSize: number) {
      const { data, total } = await repo.list(actor, filter, page, pageSize);
      return { data, meta: { page, pageSize, total } };
    },

    stats(actor: PlatformIdentity) {
      return repo.stats(actor);
    },

    get: requirePartner,

    async create(actor: PlatformIdentity, input: CreatePartnerInput) {
      if (await repo.findIdByCnpj(actor, input.cnpj)) throw cnpjTaken();
      return repo.create(actor, input, (id) =>
        partnerAudit(
          id,
          'PARTNER_CREATED',
          `${TYPE_LABEL[input.type]} ${input.tradeName} cadastrado`,
        ),
      );
    },

    async update(actor: PlatformIdentity, id: string, input: UpdatePartnerInput) {
      const current = await requirePartner(actor, id);
      if (input.cnpj && input.cnpj !== current.cnpj) {
        const owner = await repo.findIdByCnpj(actor, input.cnpj);
        if (owner && owner !== id) throw cnpjTaken();
      }
      const changed = (Object.keys(input) as (keyof UpdatePartnerInput)[]).filter(
        (key) => input[key] !== undefined && input[key] !== current[key],
      );
      if (changed.length === 0) return current;
      return repo.update(
        actor,
        id,
        Object.fromEntries(changed.map((key) => [key, input[key]])),
        partnerAudit(
          id,
          'PARTNER_UPDATED',
          `Dados alterados: ${changed.map((key) => FIELD_LABELS[key]).join(', ')}`,
        ),
      );
    },

    async changeStatus(actor: PlatformIdentity, id: string, input: PartnerStatusChangeInput) {
      const current = await requirePartner(actor, id);
      const transition = TRANSITIONS[input.action];
      if (transition.from !== current.status) {
        throw new ConflictError(
          'Esta mudança de situação não é permitida a partir da situação atual',
          'INVALID_STATUS_TRANSITION',
        );
      }
      return repo.update(
        actor,
        id,
        { status: transition.to },
        partnerAudit(
          id,
          transition.action,
          `Parceiro ${current.tradeName} ${transition.verb}`,
          input.justification,
        ),
      );
    },

    async addContact(actor: PlatformIdentity, id: string, input: CreateContactInput) {
      const partner = await requirePartner(actor, id);
      const isPrimary = shouldBePrimary(input.isPrimary, Boolean(partner.primaryContact));
      return repo.saveContact(
        actor,
        id,
        null,
        {
          name: input.name,
          jobTitle: input.jobTitle ?? null,
          email: input.email ?? null,
          phone: input.phone ?? null,
          isPrimary,
        },
        partnerAudit(
          id,
          'CONTACT_ADDED',
          `Contato ${input.name} incluído${isPrimary ? ' como principal' : ''}`,
        ),
      );
    },

    async updateContact(
      actor: PlatformIdentity,
      id: string,
      contactId: string,
      input: UpdateContactInput,
    ) {
      const partner = await requirePartner(actor, id);
      const current = requireContact(partner, contactId);
      const next = {
        email: input.email === undefined ? current.email : input.email,
        phone: input.phone === undefined ? current.phone : input.phone,
      };
      if (!hasReach(next)) {
        throw new ValidationError('Informe e-mail ou telefone', [
          { path: 'email', message: 'Informe e-mail ou telefone' },
        ]);
      }
      const becamePrimary = input.isPrimary === true && !current.isPrimary;
      const write: ContactWrite = Object.fromEntries(
        Object.entries(input).filter(([, value]) => value !== undefined),
      );
      return repo.saveContact(
        actor,
        id,
        contactId,
        write,
        partnerAudit(
          id,
          becamePrimary ? 'CONTACT_PRIMARY' : 'CONTACT_UPDATED',
          becamePrimary
            ? `${input.name ?? current.name} virou o contato principal`
            : `Contato ${input.name ?? current.name} alterado`,
        ),
      );
    },

    async removeContact(actor: PlatformIdentity, id: string, contactId: string) {
      const partner = await requirePartner(actor, id);
      const contact = requireContact(partner, contactId);
      return repo.removeContact(
        actor,
        id,
        contactId,
        partnerAudit(id, 'CONTACT_REMOVED', `Contato ${contact.name} removido`),
      );
    },

    async listAudit(actor: PlatformIdentity, id: string, page: number, pageSize: number) {
      await requirePartner(actor, id);
      const { data, total } = await repo.listAudit(actor, id, page, pageSize);
      return { data, meta: { page, pageSize, total } };
    },
  };
};

export type PartnersService = ReturnType<typeof makePartnersService>;
