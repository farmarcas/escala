import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SelectField } from '@/components/ui/SelectField';
import { InlineAlert } from '@/components/ui/States';
import { TextArea } from '@/components/ui/TextArea';
import { useCsvDownload } from '@/hooks/useCsvDownload';
import { useEmployeeOptions } from '@/hooks/useEmployeeOptions';
import { useMutation } from '@/hooks/useMutation';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { pluralize } from '@/lib/format';

export type BulkResult = { changed: number; skipped: number };
export type BulkDone = BulkResult & { message: string };

type Action = 'REMIND' | 'ANGEL' | 'BLOCK' | 'UNBLOCK';

type StoresActionsProps = {
  // Código da loja → número do grupo (o Anjo é do grupo).
  selected: Map<number, number>;
  canEdit: boolean;
  onDone: (result: BulkDone) => void;
};

// Botão "Ações (N)" do protótipo: cobrar, atribuir Anjo, exportar e bloquear em lote.
// Exportar vale para os dois papéis; o resto, só para o administrador.
export function StoresActions({ selected, canEdit, onDone }: StoresActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const csv = useCsvDownload();
  const codes = [...selected.keys()];
  const isEnabled = codes.length > 0;

  useEffect(() => {
    if (!isOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [isOpen]);

  const items: { label: string; isDanger?: boolean; run: () => void; isAdmin: boolean }[] = [
    { label: 'Cobrar preenchimento e validação', isAdmin: true, run: () => setAction('REMIND') },
    { label: 'Atribuir Anjo', isAdmin: true, run: () => setAction('ANGEL') },
    {
      label: 'Exportar selecionadas',
      isAdmin: false,
      run: () => void csv.download(`/stores/export?codes=${codes.join(',')}`, 'lojas-selecionadas'),
    },
    { label: 'Bloquear lojas', isAdmin: true, isDanger: true, run: () => setAction('BLOCK') },
    { label: 'Desbloquear lojas', isAdmin: true, run: () => setAction('UNBLOCK') },
  ];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={!isEnabled}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title={isEnabled ? undefined : 'Marque lojas na lista para usar as ações'}
        onClick={() => setIsOpen((value) => !value)}
        className={cn(
          'flex items-center gap-2 whitespace-nowrap rounded-sm px-3.5 py-2 text-[13px] font-semibold text-primary-foreground',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          isEnabled ? 'bg-primary hover:bg-primary-hover' : 'cursor-not-allowed bg-control',
        )}
      >
        Ações {isEnabled && `(${codes.length})`}
        <ChevronDown aria-hidden="true" className="size-4" />
      </button>
      {isOpen && isEnabled && (
        <ul
          role="menu"
          className="absolute left-0 top-[calc(100%+4px)] z-30 min-w-[240px] rounded-lg border border-border bg-surface py-1.5 shadow-[0_8px_16px_-4px_rgb(9_30_66/0.25)]"
        >
          {items
            .filter((item) => canEdit || !item.isAdmin)
            .map((item) => (
              <li key={item.label} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsOpen(false);
                    item.run();
                  }}
                  className={cn(
                    'w-full px-3.5 py-2 text-left text-[13px] hover:bg-subtle',
                    item.isDanger ? 'text-destructive-text' : 'text-foreground',
                  )}
                >
                  {item.label}
                </button>
              </li>
            ))}
        </ul>
      )}
      {csv.error && (
        <span role="alert" className="absolute left-0 top-full mt-1 text-xs text-destructive-text">
          {csv.error.message}
        </span>
      )}
      {action && (
        <ActionDialog
          action={action}
          selected={selected}
          onClose={() => setAction(null)}
          onDone={(result) => {
            setAction(null);
            onDone(result);
          }}
        />
      )}
    </div>
  );
}

const COPY: Record<Action, { title: string; text: string; button: string }> = {
  REMIND: {
    title: 'Cobrar preenchimento e validação',
    text: 'O proprietário de cada loja é avisado para completar e validar o cadastro. Lojas com a validação em dia são puladas. A cobrança fica no histórico da loja.',
    button: 'Cobrar',
  },
  ANGEL: {
    title: 'Atribuir Anjo',
    text: 'O Anjo é do grupo: todos os grupos das lojas marcadas passam a ter este Anjo, e todas as lojas desses grupos mostram o mesmo Anjo. Cada troca fica na auditoria do grupo.',
    button: 'Atribuir',
  },
  BLOCK: {
    title: 'Bloquear lojas',
    text: 'Ninguém dos grupos consegue abrir nem alterar essas lojas enquanto estiverem bloqueadas. As que já estão bloqueadas são puladas. Cada loja ganha o seu registro na auditoria do grupo.',
    button: 'Bloquear',
  },
  UNBLOCK: {
    title: 'Desbloquear lojas',
    text: 'Os grupos voltam a ver e a alterar essas lojas. As que não estão bloqueadas são puladas.',
    button: 'Desbloquear',
  },
};

type ActionDialogProps = {
  action: Action;
  selected: Map<number, number>;
  onClose: () => void;
  onDone: (result: BulkDone) => void;
};

function ActionDialog({ action, selected, onClose, onDone }: ActionDialogProps) {
  const [justification, setJustification] = useState('');
  const [angelId, setAngelId] = useState('');
  const angels = useEmployeeOptions();
  const { run, isPending, error } = useMutation();
  const copy = COPY[action];
  const codes = [...selected.keys()];
  const groups = [...new Set(selected.values())];
  const needsReason = action === 'BLOCK' || action === 'UNBLOCK';
  const isReady =
    (!needsReason || justification.trim().length >= 5) && (action !== 'ANGEL' || angelId !== '');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isReady) return;
    const outcome: { done: BulkDone | null } = { done: null };
    const ok = await run(async () => {
      if (action === 'ANGEL') {
        const result = await api.post<BulkResult>('/economic-groups/bulk-angel', {
          numbers: groups,
          employeeId: angelId,
        });
        outcome.done = {
          ...result,
          message: `Anjo atribuído: ${pluralize(result.changed, 'grupo alterado', 'grupos alterados')}`,
        };
        return;
      }
      const result = await api.post<BulkResult>('/stores/bulk', {
        action,
        codes,
        ...(needsReason ? { justification: justification.trim() } : {}),
      });
      const verb =
        action === 'REMIND' ? 'Cobrança enviada' : action === 'BLOCK' ? 'Bloqueio' : 'Desbloqueio';
      outcome.done = {
        ...result,
        message: `${verb}: ${pluralize(result.changed, 'loja', 'lojas')}`,
      };
    });
    if (ok && outcome.done) onDone(outcome.done);
  };

  return (
    <Modal
      isOpen
      title={copy.title}
      subtitle={
        action === 'ANGEL'
          ? `${pluralize(codes.length, 'loja', 'lojas')} de ${pluralize(groups.length, 'grupo', 'grupos')}`
          : pluralize(codes.length, 'loja selecionada', 'lojas selecionadas')
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="stores-action-form"
            variant={action === 'BLOCK' ? 'danger' : 'primary'}
            disabled={!isReady || isPending}
          >
            {copy.button}
          </Button>
        </>
      }
    >
      <form id="stores-action-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-secondary-foreground">{copy.text}</p>
        {error && <InlineAlert>{error.message}</InlineAlert>}
        {action === 'ANGEL' && (
          <SelectField
            label="Anjo"
            isRequired
            placeholder={
              angels.isLoading ? 'Carregando funcionários…' : 'Escolha um funcionário ativo'
            }
            options={angels.options.map((option) => ({
              value: option.id,
              label: `${option.name} · ${option.jobTitle}`,
            }))}
            value={angelId}
            onChange={(event) => setAngelId(event.target.value)}
          />
        )}
        {needsReason && (
          <TextArea
            label="Motivo"
            isRequired
            rows={3}
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
            placeholder="Um motivo para todas as lojas (mínimo de 5 caracteres)."
          />
        )}
      </form>
    </Modal>
  );
}
