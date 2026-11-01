import { useState } from 'react';
import { cn } from '@/lib/cn';
import type { OpeningHour, Weekday } from '../types';
import { CheckItem } from './CheckItem';

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  MON: 'Segunda',
  TUE: 'Terça',
  WED: 'Quarta',
  THU: 'Quinta',
  FRI: 'Sexta',
  SAT: 'Sábado',
  SUN: 'Domingo',
  HOLIDAY: 'Feriado',
};

const WEEK: Weekday[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

export function hourIssue(hour: OpeningHour): string | null {
  if (!hour.isOpen || hour.is24h) return null;
  if (!hour.opensAt || !hour.closesAt) return 'Informe abrir e fechar';
  if (hour.closesAt <= hour.opensAt) return 'Fechar depois de abrir';
  return null;
}

// Resumo do cabeçalho do cartão "Funcionamento da loja".
export function openDaysText(hours: OpeningHour[]): string {
  const count = hours.filter((hour) => hour.day !== 'HOLIDAY' && hour.isOpen).length;
  return `${count} ${count === 1 ? 'dia aberto' : 'dias abertos'} na semana · domingo e feriado contam para plantão`;
}

type HoursGridProps = {
  hours: OpeningHour[];
  isEditing: boolean;
  onChange?: (hours: OpeningHour[]) => void;
};

const timeInput =
  'h-[34px] w-full rounded-md border border-control bg-surface px-2.5 text-[13px] focus:border-2 focus:border-primary focus:px-[9px] focus:outline-none';
const timeView =
  'min-h-[34px] rounded-md border border-border bg-subtle px-2.5 py-[7px] text-[13px]';
const shortcutButton =
  'whitespace-nowrap rounded-sm border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-secondary-foreground hover:border-primary hover:text-primary';

// Grade de horário por dia, com atalhos de aplicar e replicar (protótipo "Loja Detalhe").
export function HoursGrid({ hours, isEditing, onChange }: HoursGridProps) {
  const [pattern, setPattern] = useState({ opensAt: '08:00', closesAt: '20:00' });
  const [replicatedFrom, setReplicatedFrom] = useState<Weekday | null>(null);

  const update = (day: Weekday, patch: Partial<OpeningHour>) =>
    onChange?.(hours.map((hour) => (hour.day === day ? { ...hour, ...patch } : hour)));

  const apply = (days: Weekday[] | 'open') =>
    onChange?.(
      hours.map((hour) => {
        const target =
          days === 'open' ? hour.isOpen && hour.day !== 'HOLIDAY' : days.includes(hour.day);
        return target ? { ...hour, isOpen: true, is24h: false, ...pattern } : hour;
      }),
    );

  const replicate = (source: OpeningHour) => {
    setReplicatedFrom(source.day);
    onChange?.(
      hours.map((hour) =>
        hour.day !== source.day && hour.isOpen
          ? { ...hour, opensAt: source.opensAt, closesAt: source.closesAt, is24h: source.is24h }
          : hour,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {isEditing && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-control bg-background px-3.5 py-3">
          <div>
            <p className="mb-1.5 text-xs font-bold text-secondary-foreground">Replicar horário</p>
            <div className="flex items-center gap-2">
              <input
                type="time"
                aria-label="Horário padrão: abre às"
                value={pattern.opensAt}
                onChange={(event) =>
                  setPattern((current) => ({ ...current, opensAt: event.target.value }))
                }
                className={cn(timeInput, 'w-[96px]')}
              />
              <span className="text-xs text-muted-foreground">às</span>
              <input
                type="time"
                aria-label="Horário padrão: fecha às"
                value={pattern.closesAt}
                onChange={(event) =>
                  setPattern((current) => ({ ...current, closesAt: event.target.value }))
                }
                className={cn(timeInput, 'w-[96px]')}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={shortcutButton} onClick={() => apply(WEEK)}>
              Aplicar de seg a sex
            </button>
            <button
              type="button"
              className={shortcutButton}
              onClick={() => apply([...WEEK, 'SAT'])}
            >
              Aplicar de seg a sáb
            </button>
            <button type="button" className={shortcutButton} onClick={() => apply('open')}>
              Aplicar em todos os dias abertos
            </button>
          </div>
          <span className="min-w-44 flex-1 text-[11px] text-muted-foreground">
            Ou use “Replicar” em um dia para copiar o horário dele para os demais dias abertos
          </span>
        </div>
      )}
      <ul
        aria-label="Horário de funcionamento"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] gap-x-6 gap-y-2"
      >
        {hours.map((hour, index) => {
          const isTimed = hour.isOpen && !hour.is24h;
          const canType = isEditing && isTimed;
          const issue = isEditing ? hourIssue(hour) : null;
          const opensAt = hour.is24h ? '00:00' : hour.opensAt;
          const closesAt = hour.is24h ? '24:00' : hour.closesAt;
          const label = WEEKDAY_LABEL[hour.day];
          return (
            <li
              key={hour.day}
              className={cn(
                'grid grid-cols-[110px_1fr_1fr_auto] items-center gap-3 rounded-md border px-3 py-2.5',
                index % 2 === 0 ? 'bg-background' : 'bg-surface',
                replicatedFrom === hour.day && isEditing ? 'border-primary' : 'border-transparent',
                isEditing && 'grid-cols-[110px_1fr_1fr_auto_64px]',
              )}
            >
              <CheckItem
                label={label}
                checked={hour.isOpen}
                isEditing={isEditing}
                onToggle={() =>
                  update(
                    hour.day,
                    hour.isOpen
                      ? { isOpen: false, opensAt: null, closesAt: null, is24h: false }
                      : { isOpen: true },
                  )
                }
              />
              {(['opensAt', 'closesAt'] as const).map((key) => (
                <div key={key} className={cn(!isTimed && 'opacity-45')}>
                  <p className="mb-1 text-[11px] text-muted-foreground">
                    {key === 'opensAt' ? 'Abre às' : 'Fecha às'}
                  </p>
                  {canType ? (
                    <input
                      type="time"
                      aria-label={`${label} ${key === 'opensAt' ? 'abre às' : 'fecha às'}`}
                      value={hour[key] ?? ''}
                      onChange={(event) => update(hour.day, { [key]: event.target.value || null })}
                      aria-invalid={key === 'closesAt' && Boolean(issue)}
                      className={cn(timeInput, 'aria-invalid:border-destructive')}
                    />
                  ) : (
                    <p className={timeView}>
                      {(key === 'opensAt' ? opensAt : closesAt) ?? (isEditing ? '' : '—')}
                    </p>
                  )}
                </div>
              ))}
              <div className="flex flex-col gap-1.5">
                <CheckItem
                  label="Aberta 24h"
                  checked={hour.is24h}
                  isEditing={isEditing}
                  disabled={!hour.isOpen}
                  onToggle={() => update(hour.day, { is24h: !hour.is24h })}
                />
                <CheckItem
                  label="Faz plantão"
                  checked={hour.isOnCall}
                  isEditing={isEditing}
                  onToggle={() => update(hour.day, { isOnCall: !hour.isOnCall })}
                />
              </div>
              {isEditing && (
                <div className="text-right">
                  {hour.isOpen && (
                    <button
                      type="button"
                      title="Copiar este horário para os demais dias abertos"
                      onClick={() => replicate(hour)}
                      className="text-xs font-semibold text-primary hover:text-primary-hover"
                    >
                      Replicar
                    </button>
                  )}
                </div>
              )}
              {issue && (
                <p className="col-span-full text-xs text-destructive-text" role="alert">
                  {label}: {issue}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
