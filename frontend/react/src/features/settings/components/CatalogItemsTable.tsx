import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Cell, HeaderCell, Row, Table } from '@/components/ui/Table';
import { formatBrl, formatNumber } from '@/lib/format';
import { furnitureIcon } from '@/lib/furniture-icons';
import { groupLabelText, type CatalogListConfig } from '../catalogKinds';
import type { SettingsCatalogItem } from '../types';

type CatalogItemsTableProps = {
  list: CatalogListConfig;
  items: SettingsCatalogItem[];
  canReorder: boolean;
  busyId: string | null;
  onEdit: (item: SettingsCatalogItem) => void;
  onMove: (item: SettingsCatalogItem, direction: 'up' | 'down') => void;
  onToggleActive: (item: SettingsCatalogItem) => void;
  onDelete: (item: SettingsCatalogItem) => void;
};

const orderButton =
  'flex size-7 items-center justify-center rounded-sm text-secondary-foreground hover:bg-subtle hover:text-foreground disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring';

// Itens de uma lista de Configurações, na ordem em que a página da loja mostra.
export function CatalogItemsTable({
  list,
  items,
  canReorder,
  busyId,
  onEdit,
  onMove,
  onToggleActive,
  onDelete,
}: CatalogItemsTableProps) {
  return (
    <Table label={list.label} minWidth="880px">
      <thead>
        <tr>
          {canReorder && <HeaderCell className="w-20">Ordem</HeaderCell>}
          <HeaderCell>Item</HeaderCell>
          {list.groupLabel && <HeaderCell>{list.groupLabel.label}</HeaderCell>}
          {list.hasSelfService && <HeaderCell>Autosserviço</HeaderCell>}
          {list.hasUsedByScale && <HeaderCell>Módulo Escala</HeaderCell>}
          {list.hasNegotiated && <HeaderCell isNumeric>Valor negociado</HeaderCell>}
          <HeaderCell isNumeric>Em uso</HeaderCell>
          <HeaderCell>Situação</HeaderCell>
          <HeaderCell isNumeric>Ações</HeaderCell>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => {
          const { icon: Icon } = furnitureIcon(item.icon);
          const isBusy = busyId === item.id;
          return (
            <Row key={item.id} isDimmed={!item.active}>
              {canReorder && (
                <Cell>
                  <div className="flex gap-0.5">
                    <button
                      type="button"
                      className={orderButton}
                      aria-label={`Subir ${item.name}`}
                      disabled={index === 0 || isBusy}
                      onClick={() => onMove(item, 'up')}
                    >
                      <ChevronUp aria-hidden="true" className="size-4" />
                    </button>
                    <button
                      type="button"
                      className={orderButton}
                      aria-label={`Descer ${item.name}`}
                      disabled={index === items.length - 1 || isBusy}
                      onClick={() => onMove(item, 'down')}
                    >
                      <ChevronDown aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                </Cell>
              )}
              <Cell className="max-w-96">
                <div className="flex items-center gap-3">
                  {list.hasIcon && (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                      <Icon aria-hidden="true" className="size-[18px]" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{item.name}</p>
                    {item.description && (
                      <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                </div>
              </Cell>
              {list.groupLabel && (
                <Cell className="whitespace-nowrap text-[13px]">
                  {groupLabelText(list, item.groupLabel)}
                </Cell>
              )}
              {list.hasSelfService && (
                <Cell className="text-[13px]">{item.selfService ? 'Sim' : 'Não'}</Cell>
              )}
              {list.hasUsedByScale && (
                <Cell>
                  {item.usedByScale ? (
                    <StatusBadge tone="info" size="sm">
                      Usada no módulo Escala
                    </StatusBadge>
                  ) : (
                    <span className="text-[13px] text-muted-foreground">Não</span>
                  )}
                </Cell>
              )}
              {list.hasNegotiated && (
                <Cell isNumeric className="whitespace-nowrap text-[13px]">
                  {item.negotiatedMonthlyCents === null
                    ? '—'
                    : `${formatBrl(item.negotiatedMonthlyCents)}/mês`}
                </Cell>
              )}
              <Cell isNumeric className="whitespace-nowrap text-[13px]">
                {item.storesInUse === 0
                  ? 'Nenhuma loja'
                  : `${formatNumber(item.storesInUse)} ${item.storesInUse === 1 ? 'loja' : 'lojas'}`}
              </Cell>
              <Cell>
                <StatusBadge tone={item.active ? 'success' : 'neutral'} size="sm">
                  {item.active ? 'Ativo' : 'Desativado'}
                </StatusBadge>
              </Cell>
              <Cell isNumeric>
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isBusy}
                    aria-label={`Alterar ${item.name}`}
                    onClick={() => onEdit(item)}
                  >
                    Alterar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isBusy}
                    aria-label={`${item.active ? 'Desativar' : 'Reativar'} ${item.name}`}
                    onClick={() => onToggleActive(item)}
                  >
                    {item.active ? 'Desativar' : 'Reativar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isBusy}
                    aria-label={`Excluir ${item.name}`}
                    className="text-destructive-text hover:bg-destructive-soft"
                    onClick={() => onDelete(item)}
                  >
                    Excluir
                  </Button>
                </div>
              </Cell>
            </Row>
          );
        })}
      </tbody>
    </Table>
  );
}
