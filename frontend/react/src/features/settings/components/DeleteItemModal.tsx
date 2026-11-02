import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { InlineAlert } from '@/components/ui/States';
import { useMutation } from '@/hooks/useMutation';
import { inUseText, type CatalogListConfig } from '../catalogKinds';
import type { SettingsCatalogItem } from '../types';

type DeleteItemModalProps = {
  list: CatalogListConfig;
  item: SettingsCatalogItem;
  onClose: () => void;
  onDelete: (item: SettingsCatalogItem) => Promise<unknown>;
  onDeactivate: (item: SettingsCatalogItem) => Promise<unknown>;
};

// Excluir só sem uso; em uso, a saída é desativar (specs/004, FR-033).
export function DeleteItemModal({
  list,
  item,
  onClose,
  onDelete,
  onDeactivate,
}: DeleteItemModalProps) {
  const { run, isPending, error } = useMutation();
  const inUse =
    error?.code === 'IN_USE'
      ? Number((error.details[0] as unknown as { inUse?: number } | undefined)?.inUse ?? item.inUse)
      : item.inUse;
  const isInUse = inUse > 0;

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
            Em uso por {inUseText(list, inUse).toLowerCase()}.{' '}
            {item.active
              ? 'Desative em vez de excluir: o item sai das opções novas e continua com quem já usa, sem perder o que foi informado.'
              : 'O item já está desativado e continua só com quem já usa.'}
          </p>
        ) : (
          <p>
            O item some das listas e das opções. Os históricos continuam mostrando o nome. Esta ação
            não pode ser desfeita.
          </p>
        )}
      </div>
    </Modal>
  );
}
