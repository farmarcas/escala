import { Button } from '@/components/ui/Button';
import { InlineAlert } from '@/components/ui/States';
import { TextArea } from '@/components/ui/TextArea';
import type { BasicEditor } from '../hooks/useBasicEditor';

type EditBarProps = { editor: BasicEditor; onSave: () => void };

// Barra presa no topo durante "Editar dados básicos": conta as alterações, pede o motivo
// (Farmarcas) e salva. Aparece nas abas Dados e Estratégias.
export function EditBar({ editor, onSave }: EditBarProps) {
  if (!editor.isEditing) return null;
  return (
    <div className="sticky top-16 z-10 flex flex-wrap items-end gap-3 border-b border-border bg-primary-tint px-5 py-3">
      <div className="min-w-0 flex-1 basis-60">
        <p className="text-sm font-semibold">Editando dados básicos</p>
        <p className="text-xs text-muted-foreground">
          {editor.changeCount === 0
            ? 'Nenhuma alteração ainda'
            : `${editor.changeCount} ${editor.changeCount === 1 ? 'alteração' : 'alterações'} · cada uma entra no histórico`}
        </p>
      </div>
      {editor.needsReason && (
        <TextArea
          label="Motivo da correção"
          isRequired
          value={editor.reason}
          onChange={(event) => editor.setReason(event.target.value)}
          placeholder="O grupo vê este motivo no histórico"
          className="min-w-[260px] flex-1 [&_textarea]:min-h-12"
        />
      )}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={editor.cancel}>
          Cancelar
        </Button>
        <Button disabled={!editor.canSave} onClick={onSave}>
          Salvar
        </Button>
      </div>
      {editor.error && editor.error.code !== 'VALIDATION_ERROR' && (
        <div className="basis-full">
          <InlineAlert>{editor.error.message}</InlineAlert>
        </div>
      )}
    </div>
  );
}
