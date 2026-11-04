import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InlineAlert } from '@/components/ui/States';
import { useMutation } from '@/hooks/useMutation';
import { formatGroupNumber, pluralize } from '@/lib/format';
import { useEmployeeForm } from '../hooks/useEmployeeForm';
import type { EmployeeDetail, EmployeeInput, EmployeeOptions } from '../types';
import { GeneralDataFields } from './GeneralDataFields';

const GROUP_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Ativo',
  SUSPENDED: 'Suspenso',
  ARCHIVED: 'Arquivado',
};

type GeneralDataTabProps = {
  employee: EmployeeDetail;
  options: EmployeeOptions | undefined;
  canEdit: boolean;
  onSave: (version: number, changes: Partial<EmployeeInput>) => Promise<void>;
  onReload: () => void;
  history: ReactNode;
};

// Aba Dados gerais: informações gerais e profissionais (edição na própria aba), carteira como
// Anjo e histórico do cadastro (spec 005, US1).
export function GeneralDataTab({
  employee,
  options,
  canEdit,
  onSave,
  onReload,
  history,
}: GeneralDataTabProps) {
  // A chave remonta o formulário quando o funcionário muda (depois de salvar ou recarregar).
  return (
    <GeneralDataContent
      key={`${employee.id}:${employee.version}`}
      employee={employee}
      options={options}
      canEdit={canEdit}
      onSave={onSave}
      onReload={onReload}
      history={history}
    />
  );
}

function GeneralDataContent({
  employee,
  options,
  canEdit,
  onSave,
  onReload,
  history,
}: GeneralDataTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const form = useEmployeeForm(employee);
  const { run, isPending, error, reset } = useMutation();
  const errors = form.errorsFrom(error);
  const emailTaken = error?.code === 'EMPLOYEE_EMAIL_TAKEN' ? error.message : undefined;
  const isConflict = error?.code === 'VERSION_CONFLICT';

  const cancel = () => {
    form.reset();
    reset();
    setIsEditing(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.validate()) return;
    const changes = form.toChanges();
    if (Object.keys(changes).length === 0) {
      setIsEditing(false);
      return;
    }
    if (await run(() => onSave(employee.version, changes))) setIsEditing(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card as="section" className="p-5 md:p-6">
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
          {isConflict && (
            <div className="flex flex-wrap items-center gap-3 rounded-md bg-warning-soft px-3 py-2.5 text-sm text-warning-text">
              <p className="min-w-0 flex-1">{error.message}</p>
              <Button size="sm" variant="secondary" onClick={onReload}>
                Recarregar
              </Button>
            </div>
          )}
          {error && !isConflict && !emailTaken && Object.keys(errors).length === 0 && (
            <InlineAlert>{error.message}</InlineAlert>
          )}
          <GeneralDataFields
            form={form}
            options={options}
            errors={errors}
            emailTaken={emailTaken}
            isReadOnly={!isEditing}
            employee={employee}
          />
          {canEdit && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              {isEditing ? (
                <>
                  <Button variant="secondary" onClick={cancel}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    Salvar
                  </Button>
                </>
              ) : (
                <Button variant="secondary" onClick={() => setIsEditing(true)}>
                  Editar
                </Button>
              )}
            </div>
          )}
        </form>
      </Card>

      <Card as="section" className="overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Carteira como Anjo</h2>
          <p className="text-xs text-muted-foreground">
            {employee.portfolio.length
              ? `${pluralize(employee.portfolioCount, 'grupo', 'grupos')} em operação. Para trocar o Anjo, abra o grupo.`
              : 'Ainda não acompanha nenhum grupo. O Anjo é definido no detalhe do grupo.'}
          </p>
        </div>
        {employee.portfolio.length > 0 && (
          <ul className="max-h-[420px] overflow-y-auto">
            {employee.portfolio.map((group) => (
              <li key={group.number}>
                <Link
                  to={`/grupos/${group.number}`}
                  className="flex items-center gap-3 border-b border-subtle px-5 py-2.5 last:border-b-0 hover:bg-background focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="w-10 font-mono text-xs text-secondary-foreground">
                    {formatGroupNumber(group.number)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                    {group.name}
                  </span>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {pluralize(group.storeCount, 'loja', 'lojas')}
                    {group.status !== 'ACTIVE' && ` · ${GROUP_STATUS_LABEL[group.status]}`}
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4 text-control" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card as="section" className="overflow-hidden">
        {history}
      </Card>
    </div>
  );
}
