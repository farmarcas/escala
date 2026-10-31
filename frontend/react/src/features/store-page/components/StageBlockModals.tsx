import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SelectField } from '@/components/ui/SelectField';
import { InlineAlert } from '@/components/ui/States';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';
import { useMutation } from '@/hooks/useMutation';
import { fieldErrors } from '@/lib/api';
import { STAGE_LABEL } from '../labels';
import type { StorePage } from '../types';

const ORDER = ['PROSPECTING', 'SETUP', 'OPENED'];

type StageModalProps = {
  page: StorePage;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (input: { stage: string; openedAt?: string; justification?: string }) => Promise<void>;
};

// Mudar a etapa (spec 003, FR-040): avançar é livre; Inaugurada pede a data; voltar pede motivo.
export function StageModal(props: StageModalProps) {
  if (!props.isOpen) return null;
  return <StageDialog {...props} />;
}

function StageDialog({ page, onClose, onConfirm }: StageModalProps) {
  const [stage, setStage] = useState('');
  const [openedAt, setOpenedAt] = useState(page.basic.openedAt ?? '');
  const [justification, setJustification] = useState('');
  const { run, isPending, error } = useMutation();
  const errors = fieldErrors(error);
  const isBack = stage !== '' && ORDER.indexOf(stage) < ORDER.indexOf(page.stage);
  const isReady =
    stage !== '' &&
    (stage !== 'OPENED' || openedAt !== '') &&
    (!isBack || justification.trim().length >= 5);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isReady) return;
    const ok = await run(() =>
      onConfirm({
        stage,
        ...(stage === 'OPENED' ? { openedAt } : {}),
        ...(justification.trim() ? { justification: justification.trim() } : {}),
      }),
    );
    if (ok) onClose();
  };

  return (
    <Modal
      isOpen
      title="Mudar etapa da loja"
      subtitle={`Hoje: ${STAGE_LABEL[page.stage]?.label ?? page.stage}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="stage-form" disabled={!isReady || isPending}>
            Salvar etapa
          </Button>
        </>
      }
    >
      <form id="stage-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && Object.keys(errors).length === 0 && <InlineAlert>{error.message}</InlineAlert>}
        <SelectField
          label="Nova etapa"
          isRequired
          placeholder="Escolha"
          options={ORDER.filter((value) => value !== page.stage).map((value) => ({
            value,
            label: STAGE_LABEL[value]?.label ?? value,
          }))}
          value={stage}
          onChange={(event) => setStage(event.target.value)}
        />
        {stage === 'OPENED' && (
          <TextField
            label="Data de inauguração"
            isRequired
            type="date"
            value={openedAt}
            onChange={(event) => setOpenedAt(event.target.value)}
            errorMessage={errors.openedAt}
            hint="Vira a data de abertura da loja."
          />
        )}
        {isBack && (
          <TextArea
            label="Justificativa"
            isRequired
            rows={3}
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
            errorMessage={errors.justification}
            placeholder="Voltar de etapa pede o motivo (mínimo de 5 caracteres). Fica na auditoria do grupo."
          />
        )}
      </form>
    </Modal>
  );
}

type BlockModalProps = {
  page: StorePage;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (block: boolean, justification: string) => Promise<void>;
};

// Bloquear corta o acesso do grupo à loja; desbloquear devolve (spec 003, FR-041/042).
export function BlockModal(props: BlockModalProps) {
  if (!props.isOpen) return null;
  return <BlockDialog {...props} />;
}

function BlockDialog({ page, onClose, onConfirm }: BlockModalProps) {
  const isBlocking = !page.block;
  const [justification, setJustification] = useState('');
  const { run, isPending, error } = useMutation();
  const isReady = justification.trim().length >= 5;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isReady) return;
    const ok = await run(() => onConfirm(isBlocking, justification.trim()));
    if (ok) onClose();
  };

  return (
    <Modal
      isOpen
      title={isBlocking ? 'Bloquear loja' : 'Desbloquear loja'}
      subtitle={page.basic.name ?? page.receita.legalName ?? ''}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="block-form"
            variant={isBlocking ? 'danger' : 'primary'}
            disabled={!isReady || isPending}
          >
            {isBlocking ? 'Bloquear' : 'Desbloquear'}
          </Button>
        </>
      }
    >
      <form id="block-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-secondary-foreground">
          {isBlocking
            ? 'Ninguém do grupo consegue abrir nem alterar esta loja enquanto ela estiver bloqueada. As outras lojas do grupo continuam normais, e a Farmarcas continua vendo tudo.'
            : 'O grupo volta a ver e a alterar esta loja.'}
        </p>
        {error && <InlineAlert>{error.message}</InlineAlert>}
        <TextArea
          label="Motivo"
          isRequired
          rows={3}
          value={justification}
          onChange={(event) => setJustification(event.target.value)}
          placeholder="Explique o motivo (mínimo de 5 caracteres). Fica na auditoria do grupo e no histórico da loja."
        />
      </form>
    </Modal>
  );
}
