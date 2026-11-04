import { useState } from 'react';
import { Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { InlineAlert } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useMutation } from '@/hooks/useMutation';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { ROLE_LABEL } from '../labels';
import type { EmployeeDetail, EmployeeOptions, SuiteRole, SuiteSystem } from '../types';

type AccessTabProps = {
  employee: EmployeeDetail;
  options: EmployeeOptions | undefined;
  canEdit: boolean;
  onChange: (system: SuiteSystem, role: SuiteRole | null) => Promise<void>;
};

// Aba Sistemas e acesso: um nível de acesso por módulo da Suite, independente da ocupação
// (spec 005, US2).
export function AccessTab({ employee, options, canEdit, onChange }: AccessTabProps) {
  const isTerminated = employee.status === 'TERMINATED';
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {isTerminated
          ? `Desligado em ${employee.terminatedAt ? formatDate(employee.terminatedAt) : '—'}: os acessos foram encerrados. Ao religar, a pessoa volta sem acesso.`
          : 'Cada módulo da Suite tem o seu nível de acesso, que não depende da ocupação. Toda mudança entra no histórico.'}
      </p>
      {/* Um widget por módulo da Suite, em 3 a 4 colunas: cada módulo pode ganhar recursos e
          níveis de acesso próprios. Módulo novo da Suite entra aqui (suite-systems.ts da API). */}
      <ul
        aria-label="Módulos da Suite"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
      >
        {options?.systems.map((system) => (
          <li key={system.system} className="min-w-0">
            <SystemCard
              system={system}
              roles={options.roles}
              access={employee.accesses.find((access) => access.system === system.system)}
              canEdit={canEdit && !isTerminated}
              isTerminated={isTerminated}
              onChange={(role) => onChange(system.system, role)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

const blockTitle = 'mb-2 text-xs font-bold uppercase tracking-[0.4px] text-muted-foreground';

type SystemCardProps = {
  system: EmployeeOptions['systems'][number];
  roles: EmployeeOptions['roles'];
  access: EmployeeDetail['accesses'][number] | undefined;
  canEdit: boolean;
  isTerminated: boolean;
  onChange: (role: SuiteRole | null) => Promise<unknown>;
};

function SystemCard({ system, roles, access, canEdit, isTerminated, onChange }: SystemCardProps) {
  const { run, isPending, error } = useMutation();
  // Ao ligar a chave, o papel sugerido é Analista (o mais restrito) até a pessoa escolher.
  const [pending, setPending] = useState<SuiteRole | null>(null);
  const hasAccess = Boolean(access) && !isTerminated;
  const role = access?.role ?? null;
  const shown = roles.find((item) => item.role === (role ?? pending ?? 'ANALYST'));
  const rules = shown
    ? system.system === 'BACKOFFICE'
      ? shown.rules.BACKOFFICE
      : shown.rules.default
    : [];

  const save = (next: SuiteRole | null) =>
    run(async () => {
      setPending(next);
      await onChange(next);
    });

  return (
    <Card as="section" className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold">{system.label}</h2>
            <StatusBadge tone={system.isLive ? 'success' : 'neutral'} size="sm">
              {system.isLive ? 'No ar' : 'Em desenvolvimento'}
            </StatusBadge>
          </div>
          <label
            className={cn(
              'flex shrink-0 items-center',
              canEdit ? 'cursor-pointer' : 'cursor-default',
            )}
          >
            <input
              type="checkbox"
              role="switch"
              aria-label={`Acesso ao ${system.label}`}
              checked={hasAccess}
              disabled={!canEdit || isPending}
              onChange={() => save(hasAccess ? null : 'ANALYST')}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors duration-150',
                'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
                hasAccess ? 'bg-primary' : 'bg-control',
                !canEdit && 'opacity-60',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 size-5 rounded-full bg-surface shadow-card transition-transform duration-150',
                  hasAccess ? 'translate-x-[22px]' : 'translate-x-0.5',
                )}
              />
            </span>
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          {system.description}
          {!system.isLive && ' · o acesso vale quando o módulo entrar no ar'}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-5 py-4">
        {error && <InlineAlert>{error.message}</InlineAlert>}
        {hasAccess || (isTerminated && access) ? (
          <>
            <div>
              <p className={blockTitle}>Nível de acesso</p>
              {canEdit ? (
                <div
                  role="radiogroup"
                  aria-label={`Nível de acesso no ${system.label}`}
                  className="flex flex-col gap-1.5"
                >
                  {roles.map((item) => {
                    const isOn = (role ?? 'ANALYST') === item.role;
                    return (
                      <button
                        key={item.role}
                        type="button"
                        role="radio"
                        aria-checked={isOn}
                        disabled={isPending}
                        onClick={() => !isOn && save(item.role)}
                        className={cn(
                          'flex items-center gap-2.5 rounded-md border px-3 py-2 text-left text-sm transition-colors duration-150',
                          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                          isOn
                            ? 'border-primary bg-primary-soft font-semibold text-foreground'
                            : 'border-border bg-surface text-secondary-foreground hover:border-control',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            'flex size-4 shrink-0 items-center justify-center rounded-full border',
                            isOn ? 'border-primary' : 'border-control',
                          )}
                        >
                          {isOn && <span className="size-2 rounded-full bg-primary" />}
                        </span>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm font-semibold">{role ? ROLE_LABEL[role] : '—'}</p>
              )}
            </div>
            {shown && (
              <div>
                <p className={blockTitle}>O que pode fazer</p>
                <ul className="flex flex-col gap-1.5">
                  {rules.map((rule) => (
                    <li key={rule} className="flex items-start gap-2 text-[13px]">
                      <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-success" />
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {access && (
              <p className="mt-auto border-t border-subtle pt-3 text-xs text-muted-foreground">
                {isTerminated && access.revokedAt
                  ? `Encerrado · de ${formatDate(access.grantedAt)} a ${formatDate(access.revokedAt)}`
                  : `Desde ${formatDate(access.grantedAt)} · por ${access.grantedBy}`}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sem acesso a este módulo.
            {canEdit && ' Ligue a chave para escolher o nível de acesso.'}
          </p>
        )}
      </div>
    </Card>
  );
}
