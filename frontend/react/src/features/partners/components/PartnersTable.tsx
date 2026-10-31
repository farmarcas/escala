import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Cell, HeaderCell, Row, Table } from '@/components/ui/Table';
import { formatCnpj, formatNumber } from '@/lib/format';
import { PARTNER_STATUS, TYPE_LABEL, TYPE_TONE } from '../labels';
import type { Partner } from '../types';

type PartnersTableProps = { partners: Partner[] };

export function PartnersTable({ partners }: PartnersTableProps) {
  const navigate = useNavigate();
  return (
    <Table label="Parceiros da Farmarcas" minWidth="1000px">
      <thead>
        <tr>
          <HeaderCell>Parceiro</HeaderCell>
          <HeaderCell>Tipo</HeaderCell>
          <HeaderCell>CNPJ</HeaderCell>
          <HeaderCell>Contato principal</HeaderCell>
          <HeaderCell isNumeric>Contatos</HeaderCell>
          <HeaderCell>Situação</HeaderCell>
        </tr>
      </thead>
      <tbody>
        {partners.map((partner) => {
          const status = PARTNER_STATUS[partner.status];
          const contact = partner.primaryContact;
          return (
            <Row
              key={partner.id}
              isDimmed={partner.status === 'INACTIVE'}
              onOpen={() => navigate(`/parceiros/${partner.id}`)}
              openLabel={`Abrir ${partner.tradeName}`}
            >
              <Cell className="max-w-80">
                <p className="truncate font-semibold">{partner.tradeName}</p>
                <p className="truncate text-xs text-muted-foreground">{partner.legalName}</p>
              </Cell>
              <Cell>
                <StatusBadge tone={TYPE_TONE[partner.type]} size="sm">
                  {TYPE_LABEL[partner.type]}
                </StatusBadge>
              </Cell>
              <Cell className="whitespace-nowrap font-mono text-[13px] text-secondary-foreground">
                {formatCnpj(partner.cnpj)}
              </Cell>
              <Cell className="max-w-72">
                {contact ? (
                  <>
                    <p className="truncate text-[13px] font-semibold">{contact.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {contact.jobTitle ?? contact.email ?? '—'}
                    </p>
                  </>
                ) : (
                  <StatusBadge tone="warning" size="sm">
                    Sem contato principal
                  </StatusBadge>
                )}
              </Cell>
              <Cell isNumeric>{formatNumber(partner.contactCount)}</Cell>
              <Cell>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </Cell>
            </Row>
          );
        })}
      </tbody>
    </Table>
  );
}
