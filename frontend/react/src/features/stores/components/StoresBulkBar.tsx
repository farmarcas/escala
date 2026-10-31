import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { ExportCsvButton } from '@/components/ui/ExportCsvButton';
import { Modal } from '@/components/ui/Modal';
import { InlineAlert } from '@/components/ui/States';
import { TextArea } from '@/components/ui/TextArea';
import { useMutation } from '@/hooks/useMutation';
import { api } from '@/lib/api';
import { pluralize } from '@/lib/format';

type BulkAction = 'BLOCK' | 'UNBLOCK';
export type BulkResult = { changed: number; skipped: number };

type StoresBulkBarProps = {
  codes: number[];
  canEdit: boolean;
  onClear: () => void;
  onDone: (result: BulkResult & { action: BulkAction }) => void;
};

// Ações em lote na lista de lojas (spec 003, US7). Exportar vale para os dois papéis;
// bloquear e desbloquear, só para o administrador.
export function StoresBulkBar({ codes, canEdit, onClear, onDone }: StoresBulkBarProps) {
  const [action, setAction] = useState<BulkAction | null>(null);
  return (
    <div
      role="region"
      aria-label="Ações em lote"
      className="flex flex-wrap items-center gap-3 border-b border-border bg-primary-tint px-5 py-3 text-[13px]"
    >
      <span className="font-semibold">
        {pluralize(codes.length, 'loja selecionada', 'lojas selecionadas')}
      </span>
      <ExportCsvButton
        path={`/stores/export?codes=${codes.join(',')}`}
        fileName="lojas-selecionadas"
        label="Exportar selecionadas"
      />
      {canEdit && (
        <>
          <Button size="sm" variant="danger-outline" onClick={() => setAction('BLOCK')}>
            Bloquear lojas
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setAction('UNBLOCK')}>
            Desbloquear lojas
          </Button>
        </>
      )}
      <Button size="sm" variant="ghost" onClick={onClear}>
        Limpar seleção
      </Button>
      {action && (
        <BulkBlockDialog
          action={action}
          codes={codes}
          onClose={() => setAction(null)}
          onDone={(result) => onDone({ ...result, action })}
        />
      )}
    </div>
  );
}

type BulkBlockDialogProps = {
  action: BulkAction;
  codes: number[];
  onClose: () => void;
  onDone: (result: BulkResult) => void;
};

function BulkBlockDialog({ action, codes, onClose, onDone }: BulkBlockDialogProps) {
  const [justification, setJustification] = useState('');
  const { run, isPending, error } = useMutation();
  const isBlocking = action === 'BLOCK';
  const isReady = justification.trim().length >= 5;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isReady) return;
    let result: BulkResult | null = null;
    const ok = await run(async () => {
      result = await api.post<BulkResult>('/stores/bulk', {
        action,
        codes,
        justification: justification.trim(),
      });
    });
    if (ok && result) {
      onDone(result);
      onClose();
    }
  };

  return (
    <Modal
      isOpen
      title={isBlocking ? 'Bloquear lojas' : 'Desbloquear lojas'}
      subtitle={pluralize(codes.length, 'loja selecionada', 'lojas selecionadas')}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="bulk-block-form"
            variant={isBlocking ? 'danger' : 'primary'}
            disabled={!isReady || isPending}
          >
            {isBlocking ? 'Bloquear' : 'Desbloquear'}
          </Button>
        </>
      }
    >
      <form id="bulk-block-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-secondary-foreground">
          {isBlocking
            ? 'Ninguém dos grupos consegue abrir nem alterar essas lojas enquanto estiverem bloqueadas. As que já estão bloqueadas são puladas.'
            : 'Os grupos voltam a ver e a alterar essas lojas. As que não estão bloqueadas são puladas.'}{' '}
          Cada loja ganha o seu registro na auditoria do grupo.
        </p>
        {error && <InlineAlert>{error.message}</InlineAlert>}
        <TextArea
          label="Motivo"
          isRequired
          rows={3}
          value={justification}
          onChange={(event) => setJustification(event.target.value)}
          placeholder="Um motivo para todas as lojas (mínimo de 5 caracteres)."
        />
      </form>
    </Modal>
  );
}
