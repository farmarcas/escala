import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Cell, HeaderCell, Row, Table } from '@/components/ui/Table';
import { useMutation } from '@/hooks/useMutation';
import { formatNumber } from '@/lib/format';
import type { Catalog } from '../hooks/useCatalog';
import type { CatalogItem, StorePage } from '../types';

const TYPE_LABEL: Record<string, string> = {
  gondola: 'Gôndola',
  checkout: 'Check-out',
  balcao: 'Balcão',
  frio: 'Refrigeração',
  expositor: 'Expositor',
  sala: 'Sala',
  outro: 'Outro',
};

type FurnitureTabProps = {
  page: StorePage;
  catalog: Catalog;
  onSave: (itemId: string, quantity: number, tradeQuantity: number) => Promise<void>;
};

// Mobiliário: total de cada item na loja e quanto fica disponível para ações de Trade (US7).
export function FurnitureTab({ page, catalog, onSave }: FurnitureTabProps) {
  const items = catalog.byKind('FURNITURE');
  const valueOf = (id: string) =>
    page.furniture.find((item) => item.itemId === id) ?? { quantity: 0, tradeQuantity: 0 };
  const total = page.furniture.reduce((sum, item) => sum + item.quantity, 0);
  const trade = page.furniture.reduce((sum, item) => sum + item.tradeQuantity, 0);
  const selfService = items
    .filter((item) => item.groupLabel === 'gondola' || item.groupLabel === 'expositor')
    .reduce((sum, item) => sum + valueOf(item.id).quantity, 0);

  return (
    <div className="flex flex-col gap-4 py-5">
      <div className="px-5">
        <h2 className="text-base font-semibold">Mobiliário da loja</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Total de cada item na loja e quanto fica disponível para ações de Trade da Farmarcas
        </p>
        <KpiGrid>
          <KpiCard
            label="Itens no total"
            value={formatNumber(total)}
            context={`${page.furniture.length} tipos de mobiliário`}
          />
          <KpiCard
            label="Disponível para Trade"
            value={formatNumber(trade)}
            context={`de ${formatNumber(total)} itens na loja`}
          />
          <KpiCard
            label="Gôndolas e expositores"
            value={formatNumber(selfService)}
            context="Área de autosserviço"
          />
        </KpiGrid>
      </div>
      <Table label="Mobiliário" minWidth="760px">
        <thead>
          <tr>
            <HeaderCell>Item</HeaderCell>
            <HeaderCell>Tipo</HeaderCell>
            <HeaderCell isNumeric>Total na loja</HeaderCell>
            <HeaderCell isNumeric>Disponível p/ Trade</HeaderCell>
            <HeaderCell isNumeric>{page.permissions.canEditFurniture ? 'Ações' : ''}</HeaderCell>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <FurnitureRow
              key={item.id}
              item={item}
              value={valueOf(item.id)}
              canEdit={page.permissions.canEditFurniture}
              onSave={onSave}
            />
          ))}
        </tbody>
      </Table>
      <p className="px-5 text-xs text-muted-foreground">
        Catálogo definido pela Farmarcas · cada edição entra no histórico da loja
      </p>
    </div>
  );
}

type FurnitureRowProps = {
  item: CatalogItem;
  value: { quantity: number; tradeQuantity: number };
  canEdit: boolean;
  onSave: (itemId: string, quantity: number, tradeQuantity: number) => Promise<void>;
};

const numberInput =
  'h-8 w-20 rounded-md border border-border px-2 text-right text-sm focus:border-2 focus:border-primary focus:px-[7px] focus:outline-none aria-invalid:border-destructive';

function FurnitureRow({ item, value, canEdit, onSave }: FurnitureRowProps) {
  const [draft, setDraft] = useState<{ quantity: string; trade: string } | null>(null);
  const { run, isPending, error } = useMutation();
  const quantity = Number(draft?.quantity || 0);
  const trade = Number(draft?.trade || 0);
  const issue = draft && trade > quantity ? 'Trade não pode passar do total na loja' : null;

  const save = async () => {
    if (!draft || issue) return;
    if (await run(() => onSave(item.id, quantity, trade))) setDraft(null);
  };

  return (
    <Row isDimmed={value.quantity === 0 && !draft}>
      <Cell>
        <p className="font-semibold">{item.name}</p>
        <p className="text-xs text-muted-foreground">{item.description}</p>
        {(issue || error) && (
          <p className="mt-1 text-xs text-destructive-text">{issue ?? error?.message}</p>
        )}
      </Cell>
      <Cell>
        <StatusBadge tone="neutral" size="sm">
          {TYPE_LABEL[item.groupLabel ?? 'outro'] ?? 'Outro'}
        </StatusBadge>
      </Cell>
      <Cell isNumeric>
        {draft ? (
          <input
            aria-label={`Total de ${item.name}`}
            inputMode="numeric"
            value={draft.quantity}
            onChange={(event) =>
              setDraft({ ...draft, quantity: event.target.value.replace(/\D/g, '') })
            }
            className={numberInput}
          />
        ) : (
          <span className="font-semibold">{formatNumber(value.quantity)}</span>
        )}
      </Cell>
      <Cell isNumeric>
        {draft ? (
          <input
            aria-label={`Disponível para Trade de ${item.name}`}
            inputMode="numeric"
            value={draft.trade}
            aria-invalid={Boolean(issue)}
            onChange={(event) =>
              setDraft({ ...draft, trade: event.target.value.replace(/\D/g, '') })
            }
            className={numberInput}
          />
        ) : (
          <span
            className={
              value.tradeQuantity ? 'font-semibold text-primary-hover' : 'text-muted-foreground'
            }
          >
            {formatNumber(value.tradeQuantity)}
          </span>
        )}
      </Cell>
      <Cell isNumeric>
        {canEdit &&
          (draft ? (
            <span className="inline-flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
                Cancelar
              </Button>
              <Button size="sm" disabled={Boolean(issue) || isPending} onClick={save}>
                Salvar
              </Button>
            </span>
          ) : (
            <Button
              size="sm"
              variant="link"
              onClick={() =>
                setDraft({ quantity: String(value.quantity), trade: String(value.tradeQuantity) })
              }
            >
              {value.quantity ? 'Editar' : 'Informar'}
            </Button>
          ))}
      </Cell>
    </Row>
  );
}
