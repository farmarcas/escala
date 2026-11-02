import { useState } from 'react';
import { Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
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

// Aba Sistemas e acesso: um papel por sistema da Suite, independente da ocupação (spec 005, US2).
export function AccessTab({ employee, options, canEdit, onChange }: AccessTabProps) {
  const isTerminated = employee.status === 'TERMINATED';
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {isTerminated
          ? `Desligado em ${employee.terminatedAt ? formatDate(employee.terminatedAt) : '—'}: os acessos foram encerrados. Ao religar, a pessoa volta sem acesso.`
          : 'Cada sistema tem um papel próprio, que não depende da ocupação. Toda mudança entra no histórico.'}
      </p>
      {options?.systems.map((system) => (
        <SystemCard
          key={system.system}
          system={system}
          roles={options.roles}
          access={employee.accesses.find((access) => access.system === system.system)}
          canEdit={canEdit && !isTerminated}
          isTerminated={isTerminated}
          onChange={(role) => onChange(system.system, role)}
        />
      ))}
    </div>
  );
}

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
    <Card as="section" className="overflow-hidden">
      <div className="flex flex-wrap items-start gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0 flex-1 basis-60">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{system.label}</h2>
            <StatusBadge tone={system.isLive ? 'success' : 'neutral'} size="sm">
              {system.isLive ? 'No ar' : 'Em desenvolvimento'}
            </StatusBadge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {system.description}
            {!system.isLive && ' · o acesso vale quando o sistema entrar no ar'}
          </p>
        </div>
        <label
          className={cn(
            'flex items-center gap-2.5 text-sm font-semibold',
            canEdit ? 'cursor-pointer' : 'cursor-default',
          )}
        >
          <span>
            {isTerminated && access ? 'Encerrado' : hasAccess ? 'Tem acesso' : 'Sem acesso'}
          </span>
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

      {(hasAccess || (isTerminated && access)) && (
        <div className="flex flex-col gap-4 px-5 py-4">
          {error && <InlineAlert>{error.message}</InlineAlert>}
          <div className="flex flex-wrap items-center gap-3">
            {canEdit ? (
              <SegmentedControl
                label={`Papel no ${system.label}`}
                segments={roles.map((item) => ({ value: item.role, label: item.label }))}
                value={role ?? 'ANALYST'}
                onChange={(next) => save(next)}
                isDisabled={isPending}
              />
            ) : (
              <p className="text-sm">
                Papel: <span className="font-semibold">{role ? ROLE_LABEL[role] : '—'}</span>
              </p>
            )}
            {access && (
              <span className="text-xs text-muted-foreground">
                {isTerminated && access.revokedAt
                  ? `de ${formatDate(access.grantedAt)} a ${formatDate(access.revokedAt)}`
                  : `desde ${formatDate(access.grantedAt)} · por ${access.grantedBy}`}
              </span>
            )}
          </div>
          {shown && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.4px] text-muted-foreground">
                O que o {shown.label.toLowerCase()} faz no {system.label}
              </p>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {rules.map((rule) => (
                  <li key={rule} className="flex items-start gap-2 text-[13px]">
                    <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-success" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {!hasAccess && !isTerminated && error && (
        <div className="px-5 py-4">
          <InlineAlert>{error.message}</InlineAlert>
        </div>
      )}
    </Card>
  );
}
