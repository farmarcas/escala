import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePageTitle } from '@/components/layout/PageTitle';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, InlineAlert, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useMutation } from '@/hooks/useMutation';
import { formatCnpj, formatDate, formatPhone } from '@/lib/format';
import { usePartnerDetail } from '../hooks/usePartnerDetail';
import { PARTNER_STATUS, TYPE_LABEL, TYPE_TONE } from '../labels';
import type { Contact, PartnerDetail, PartnerStatusAction } from '../types';
import { ContactFormModal } from './ContactFormModal';
import { PartnerFormModal } from './PartnerFormModal';
import { PartnerStatusModal } from './PartnerStatusModal';

const cardLabel = 'text-xs font-bold uppercase tracking-[0.4px] text-muted-foreground';

type PartnerDetailViewProps = {
  id: string;
  canEdit: boolean;
  // A trilha é de outra feature: a página entrega pronta.
  renderHistory: (partner: PartnerDetail) => ReactNode;
};

export function PartnerDetailView({ id, canEdit, renderHistory }: PartnerDetailViewProps) {
  const detail = usePartnerDetail(id);
  const { partner } = detail;
  const [isEditing, setIsEditing] = useState(false);
  const [statusAction, setStatusAction] = useState<PartnerStatusAction | null>(null);
  // undefined = fechado; null = novo contato; Contact = editar.
  const [editingContact, setEditingContact] = useState<Contact | null | undefined>(undefined);
  const contactAction = useMutation();

  if (detail.isLoading) return <LoadingState label="Carregando parceiro" />;
  if (detail.error?.code === 'PARTNER_NOT_FOUND') {
    return (
      <EmptyState
        title="Parceiro não encontrado"
        action={
          <Link
            to="/parceiros"
            className="text-sm font-semibold text-primary hover:text-primary-hover"
          >
            Ver todos os parceiros
          </Link>
        }
      />
    );
  }
  if (detail.error || !partner) {
    return (
      <ErrorState message={detail.error?.message ?? 'Erro ao carregar'} onRetry={detail.reload} />
    );
  }

  return (
    <>
      <PartnerHeader
        partner={partner}
        canEdit={canEdit}
        onEdit={() => setIsEditing(true)}
        onStatusAction={setStatusAction}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Card className="p-5">
          <p className={cardLabel}>Dados</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
            <dt className="text-muted-foreground">Tipo</dt>
            <dd>{TYPE_LABEL[partner.type]}</dd>
            <dt className="text-muted-foreground">CNPJ</dt>
            <dd className="font-mono">{formatCnpj(partner.cnpj)}</dd>
            <dt className="text-muted-foreground">Razão social</dt>
            <dd>{partner.legalName}</dd>
            <dt className="text-muted-foreground">Nome fantasia</dt>
            <dd>{partner.tradeName}</dd>
            <dt className="text-muted-foreground">Cadastro</dt>
            <dd>{formatDate(partner.createdAt)}</dd>
          </dl>
        </Card>

        <Card as="section" className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold">Contatos</h2>
              <p className="text-xs text-muted-foreground">
                Contatos comerciais da empresa. O principal aparece na lista de parceiros.
              </p>
            </div>
            {canEdit && (
              <Button size="sm" variant="secondary" onClick={() => setEditingContact(null)}>
                Adicionar contato
              </Button>
            )}
          </div>
          {contactAction.error && (
            <div className="px-5 pt-4">
              <InlineAlert>{contactAction.error.message}</InlineAlert>
            </div>
          )}
          {partner.contacts.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-muted-foreground">
              Nenhum contato cadastrado ainda.
            </p>
          ) : (
            <ul>
              {partner.contacts.map((contact) => (
                <li
                  key={contact.id}
                  className="flex flex-wrap items-start gap-3 border-b border-subtle px-5 py-3.5 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {contact.name}
                      {contact.isPrimary && (
                        <StatusBadge tone="brand" size="sm">
                          Principal
                        </StatusBadge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        contact.jobTitle,
                        contact.email,
                        contact.phone ? formatPhone(contact.phone) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex flex-wrap gap-1">
                      {!contact.isPrimary && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={contactAction.isPending}
                          onClick={() =>
                            contactAction.run(() =>
                              detail.updateContact(contact.id, { isPrimary: true }),
                            )
                          }
                        >
                          Tornar principal
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setEditingContact(contact)}>
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={contactAction.isPending}
                        onClick={() => {
                          if (window.confirm(`Remover o contato ${contact.name}?`)) {
                            void contactAction.run(() => detail.removeContact(contact.id));
                          }
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card as="section" className="overflow-hidden">
        {renderHistory(partner)}
      </Card>

      <PartnerFormModal
        isOpen={isEditing}
        partner={partner}
        onClose={() => setIsEditing(false)}
        onUpdate={detail.update}
      />
      <PartnerStatusModal
        partner={partner}
        action={statusAction}
        onClose={() => setStatusAction(null)}
        onConfirm={detail.changeStatus}
      />
      <ContactFormModal
        isOpen={editingContact !== undefined}
        contact={editingContact ?? undefined}
        partnerName={partner.tradeName}
        onClose={() => setEditingContact(undefined)}
        onSave={(input) =>
          editingContact ? detail.updateContact(editingContact.id, input) : detail.addContact(input)
        }
      />
    </>
  );
}

type PartnerHeaderProps = {
  partner: PartnerDetail;
  canEdit: boolean;
  onEdit: () => void;
  onStatusAction: (action: PartnerStatusAction) => void;
};

function PartnerHeader({ partner, canEdit, onEdit, onStatusAction }: PartnerHeaderProps) {
  const navigate = useNavigate();
  const status = PARTNER_STATUS[partner.status];
  usePageTitle(partner.tradeName);

  return (
    <div className="flex flex-col gap-3">
      <Link
        to="/parceiros"
        onClick={(event) => {
          if (window.history.state?.idx > 0) {
            event.preventDefault();
            navigate(-1);
          }
        }}
        className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-secondary-foreground hover:text-primary"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Voltar
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="sr-only">{partner.tradeName}</h1>
        <StatusBadge tone={TYPE_TONE[partner.type]}>{TYPE_LABEL[partner.type]}</StatusBadge>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        {!partner.primaryContact && <StatusBadge tone="warning">Sem contato principal</StatusBadge>}
        <span className="text-sm text-muted-foreground">{partner.legalName}</span>
        <div className="flex-1" />
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onEdit}>
              Editar
            </Button>
            {partner.status === 'ACTIVE' ? (
              <Button variant="danger-outline" onClick={() => onStatusAction('inactivate')}>
                Inativar
              </Button>
            ) : (
              <Button onClick={() => onStatusAction('reactivate')}>Reativar</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
