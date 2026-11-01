import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { InlineAlert } from '@/components/ui/States';
import { useMutation } from '@/hooks/useMutation';
import { formatNumber } from '@/lib/format';
import type { SettingsCatalogItem } from '../types';

type DeleteItemModalProps = {
  item: SettingsCatalogItem;
  onClose: () => void;
  onDelete: (item: SettingsCatalogItem) => Promise<unknown>;
  onDeactivate: (item: SettingsCatalogItem) => Promise<unknown>;
};

// Excluir só sem uso; em uso, a saída é desativar (specs/004, FR-033).
export function DeleteItemModal({ item, onClose, onDelete, onDeactivate }: DeleteItemModalProps) {
  const { run, isPending, error } = useMutation();
  const storesInUse =
    error?.code === 'IN_USE'
      ? Number(
          (error.details[0] as unknown as { stores?: number } | undefined)?.stores ??
            item.storesInUse,
        )
      : item.storesInUse;
  const isInUse = storesInUse > 0;

  const act = async (action: () => Promise<unknown>) => {
    if (await run(action)) onClose();
  };

  return (
    <Modal
      isOpen
      title={isInUse ? `Não dá para excluir ${item.name}` : `Excluir ${item.name}?`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          {isInUse ? (
            item.active && (
              <Button disabled={isPending} onClick={() => act(() => onDeactivate(item))}>
                Desativar
              </Button>
            )
          ) : (
            <Button variant="danger" disabled={isPending} onClick={() => act(() => onDelete(item))}>
              Excluir
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3 text-sm">
        {error && error.code !== 'IN_USE' && <InlineAlert>{error.message}</InlineAlert>}
        {isInUse ? (
          <p>
            Em uso por {formatNumber(storesInUse)} {storesInUse === 1 ? 'loja' : 'lojas'}.{' '}
            {item.active
              ? 'Desative em vez de excluir: o item sai das opções novas e continua nas lojas que já usam, com o que elas informaram.'
              : 'O item já está desativado e continua só nas lojas que já usam.'}
          </p>
        ) : (
          <p>
            O item some das listas e das opções das lojas. O histórico das lojas continua mostrando
            o nome. Esta ação não pode ser desfeita.
          </p>
        )}
      </div>
    </Modal>
  );
}
