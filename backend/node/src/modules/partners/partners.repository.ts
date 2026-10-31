import type { Prisma } from '../../generated/prisma/client.js';
import { withActor, type Tx } from '../../shared/database/with-actor.js';
import { listAuditByEntity, recordAudit } from '../audit/audit.repository.js';
import type { PartnerFilter } from './partners.schemas.js';
import type {
  ContactRecord,
  PartnerDetailRecord,
  PartnerRecord,
  PartnersRepository,
} from './partners.service.js';

const contactSelect = {
  id: true,
  name: true,
  jobTitle: true,
  email: true,
  phone: true,
  isPrimary: true,
} as const satisfies Prisma.PartnerContactSelect;

const ACTIVE_CONTACT = { deletedAt: null } as const;

const partnerSelect = {
  id: true,
  type: true,
  cnpj: true,
  legalName: true,
  tradeName: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  // Principal primeiro; na ficha, o resto por ordem de cadastro.
  contacts: {
    where: ACTIVE_CONTACT,
    select: contactSelect,
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  },
} as const satisfies Prisma.PartnerSelect;

type PartnerRow = Prisma.PartnerGetPayload<{ select: typeof partnerSelect }>;

const toRecord = ({ contacts, ...row }: PartnerRow): PartnerRecord => ({
  ...row,
  primaryContact: contacts.find((contact) => contact.isPrimary) ?? null,
  contactCount: contacts.length,
});

const toDetail = (row: PartnerRow): PartnerDetailRecord => ({
  ...toRecord(row),
  contacts: row.contacts as ContactRecord[],
});

const whereOf = (filter: PartnerFilter): Prisma.PartnerWhereInput => {
  const where: Prisma.PartnerWhereInput = { deletedAt: null };
  if (filter.type) where.type = filter.type;
  if (filter.status) where.status = filter.status;
  if (filter.search) {
    const text = { contains: filter.search, mode: 'insensitive' } as const;
    const digits = filter.search.replace(/\D/g, '');
    const or: Prisma.PartnerWhereInput[] = [{ tradeName: text }, { legalName: text }];
    if (digits.length >= 4) or.push({ cnpj: { contains: digits } });
    else if (digits.length >= 2) or.push({ cnpj: { startsWith: digits } });
    where.OR = or;
  }
  return where;
};

const findDetail = async (tx: Tx, id: string): Promise<PartnerDetailRecord | null> => {
  const row = await tx.partner.findFirst({ where: { id, deletedAt: null }, select: partnerSelect });
  return row ? toDetail(row) : null;
};

const requireDetail = async (tx: Tx, id: string): Promise<PartnerDetailRecord> => {
  const found = await findDetail(tx, id);
  if (!found) throw new Error(`partner ${id} vanished inside transaction`);
  return found;
};

export const partnersRepository: PartnersRepository = {
  list(actor, filter, page, pageSize) {
    return withActor(actor, async (tx) => {
      const where = whereOf(filter);
      const rows = await tx.partner.findMany({
        where,
        select: partnerSelect,
        orderBy: [{ status: 'asc' }, { tradeName: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      const total = await tx.partner.count({ where });
      return { data: rows.map(toRecord), total };
    });
  },

  stats(actor) {
    return withActor(actor, async (tx) => {
      const rows = await tx.$queryRaw<
        {
          all: number;
          industry: number;
          distributor: number;
          active: number;
          active_industries: number;
          active_distributors: number;
          without_primary: number;
        }[]
      >`
        SELECT count(*)::int AS all,
               (count(*) FILTER (WHERE p.type = 'INDUSTRY'))::int AS industry,
               (count(*) FILTER (WHERE p.type = 'DISTRIBUTOR'))::int AS distributor,
               (count(*) FILTER (WHERE p.status = 'ACTIVE'))::int AS active,
               (count(*) FILTER (WHERE p.status = 'ACTIVE' AND p.type = 'INDUSTRY'))::int AS active_industries,
               (count(*) FILTER (WHERE p.status = 'ACTIVE' AND p.type = 'DISTRIBUTOR'))::int AS active_distributors,
               (count(*) FILTER (WHERE p.status = 'ACTIVE' AND NOT EXISTS (
                  SELECT 1 FROM partner_contacts c
                   WHERE c.partner_id = p.id AND c.is_primary AND c.deleted_at IS NULL)))::int AS without_primary
          FROM partners p
         WHERE p.deleted_at IS NULL`;
      const row = rows[0];
      return {
        active: row?.active ?? 0,
        industries: row?.active_industries ?? 0,
        distributors: row?.active_distributors ?? 0,
        withoutPrimaryContact: row?.without_primary ?? 0,
        byType: {
          all: row?.all ?? 0,
          industry: row?.industry ?? 0,
          distributor: row?.distributor ?? 0,
        },
      };
    });
  },

  findById(actor, id) {
    return withActor(actor, (tx) => findDetail(tx, id));
  },

  findIdByCnpj(actor, cnpj) {
    return withActor(actor, async (tx) => {
      const found = await tx.partner.findFirst({
        where: { cnpj, deletedAt: null },
        select: { id: true },
      });
      return found?.id ?? null;
    });
  },

  create(actor, input, audit) {
    return withActor(actor, async (tx) => {
      const created = await tx.partner.create({ data: input, select: { id: true } });
      await recordAudit(tx, actor, audit(created.id));
      return requireDetail(tx, created.id);
    });
  },

  update(actor, id, input, audit) {
    return withActor(actor, async (tx) => {
      await tx.partner.update({ where: { id }, data: input });
      await recordAudit(tx, actor, audit);
      return requireDetail(tx, id);
    });
  },

  saveContact(actor, partnerId, contactId, input, audit) {
    return withActor(actor, async (tx) => {
      if (input.isPrimary) {
        await tx.partnerContact.updateMany({
          where: {
            partnerId,
            isPrimary: true,
            deletedAt: null,
            ...(contactId ? { id: { not: contactId } } : {}),
          },
          data: { isPrimary: false },
        });
      }
      if (contactId) {
        await tx.partnerContact.update({ where: { id: contactId }, data: input });
      } else {
        await tx.partnerContact.create({
          data: { partnerId, name: input.name ?? '', ...input },
        });
      }
      // Mudar contato é mudar o parceiro: a data de alteração acompanha (e a trilha da tela recarrega).
      await tx.partner.update({ where: { id: partnerId }, data: { updatedAt: new Date() } });
      await recordAudit(tx, actor, audit);
      return requireDetail(tx, partnerId);
    });
  },

  // Exclusão lógica. Se era o principal, o contato mais antigo que sobrou assume.
  removeContact(actor, partnerId, contactId, audit) {
    return withActor(actor, async (tx) => {
      await tx.partnerContact.update({
        where: { id: contactId },
        data: { deletedAt: new Date(), isPrimary: false },
      });
      const primaries = await tx.partnerContact.count({
        where: { partnerId, isPrimary: true, deletedAt: null },
      });
      if (primaries === 0) {
        const next = await tx.partnerContact.findFirst({
          where: { partnerId, deletedAt: null },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
        if (next) {
          await tx.partnerContact.update({ where: { id: next.id }, data: { isPrimary: true } });
        }
      }
      // Mudar contato é mudar o parceiro: a data de alteração acompanha (e a trilha da tela recarrega).
      await tx.partner.update({ where: { id: partnerId }, data: { updatedAt: new Date() } });
      await recordAudit(tx, actor, audit);
      return requireDetail(tx, partnerId);
    });
  },

  listAudit(actor, id, page, pageSize) {
    return withActor(actor, (tx) => listAuditByEntity(tx, 'PARTNER', id, page, pageSize));
  },
};
