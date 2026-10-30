import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useMutation } from '@/hooks/useMutation';
import { STORE_STATUS } from '../storeLabels';
import type { Store } from '../types';

type StoreStatusCellProps = {
  store: Store;
  canEdit: boolean;
  onSetStatus?: (id: string, status: 'ACTIVE' | 'INACTIVE') => Promise<void>;
};

export function StoreStatusCell({ store, canEdit, onSetStatus }: StoreStatusCellProps) {
  const { run, isPending, error } = useMutation();
  const status = STORE_STATUS[store.status];
  const next = store.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

  return (
    <div className="flex flex-col items-start gap-1">
      <StatusBadge tone={status.tone} title={status.title}>
        {status.label}
      </StatusBadge>
      {canEdit && onSetStatus && (
        <Button
          variant="link"
          size="sm"
          disabled={isPending}
          onClick={(event) => {
            event.stopPropagation();
            void run(() => onSetStatus(store.id, next));
          }}
          className="text-xs"
        >
          {next === 'ACTIVE' ? 'Ativar' : 'Inativar'}
        </Button>
      )}
      {error && <span className="text-xs text-destructive-text">{error.message}</span>}
    </div>
  );
}
