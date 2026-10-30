import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import type { OpeningHour, Weekday } from '../types';

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

function describe(hour: OpeningHour): string {
  if (!hour.isOpen) return hour.isOnCall ? 'Fechado · plantão' : 'Fechado';
  if (hour.is24h) return '24 horas';
  return `${hour.opensAt ?? '—'} às ${hour.closesAt ?? '—'}${hour.isOnCall ? ' · plantão' : ''}`;
}

type HoursGridProps = {
  hours: OpeningHour[];
  isEditing: boolean;
  onChange?: (hours: OpeningHour[]) => void;
};

const timeInput =
  'h-9 rounded-md border border-border bg-surface px-2 text-sm focus:border-2 focus:border-primary focus:px-[7px] focus:outline-none disabled:bg-subtle';

// Grade de horário por dia, com atalhos de aplicar e replicar (protótipo "Loja Detalhe").
export function HoursGrid({ hours, isEditing, onChange }: HoursGridProps) {
  const [pattern, setPattern] = useState({ opensAt: '08:00', closesAt: '20:00' });
  const openDays = hours.filter((hour) => hour.day !== 'HOLIDAY' && hour.isOpen).length;

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

  const replicate = (source: OpeningHour) =>
    onChange?.(
      hours.map((hour) =>
        hour.day !== source.day && hour.isOpen
          ? { ...hour, opensAt: source.opensAt, closesAt: source.closesAt, is24h: source.is24h }
          : hour,
      ),
    );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        {openDays} {openDays === 1 ? 'dia aberto' : 'dias abertos'} na semana · domingo e feriado
        contam para plantão
      </p>
      {isEditing && (
        <div className="flex flex-wrap items-end gap-2 rounded-md bg-subtle p-3">
          <label className="flex flex-col text-xs text-secondary-foreground">
            Abre às
            <input
              type="time"
              value={pattern.opensAt}
              onChange={(event) =>
                setPattern((current) => ({ ...current, opensAt: event.target.value }))
              }
              className={timeInput}
            />
          </label>
          <label className="flex flex-col text-xs text-secondary-foreground">
            Fecha às
            <input
              type="time"
              value={pattern.closesAt}
              onChange={(event) =>
                setPattern((current) => ({ ...current, closesAt: event.target.value }))
              }
              className={timeInput}
            />
          </label>
          <Button size="sm" variant="secondary" onClick={() => apply(WEEK)}>
            Aplicar de seg a sex
          </Button>
          <Button size="sm" variant="secondary" onClick={() => apply([...WEEK, 'SAT'])}>
            Aplicar de seg a sáb
          </Button>
          <Button size="sm" variant="secondary" onClick={() => apply('open')}>
            Aplicar em todos os dias abertos
          </Button>
        </div>
      )}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[640px] text-sm" aria-label="Horário de funcionamento">
          <tbody>
            {hours.map((hour, index) => {
              const issue = isEditing ? hourIssue(hour) : null;
              return (
                <tr
                  key={hour.day}
                  className={cn(
                    'border-b border-subtle last:border-b-0',
                    index % 2 === 0 && 'bg-background',
                  )}
                >
                  <th scope="row" className="w-28 px-3 py-2 text-left font-medium">
                    {WEEKDAY_LABEL[hour.day]}
                  </th>
                  {!isEditing ? (
                    <td className={cn('px-3 py-2', !hour.isOpen && 'text-muted-foreground')}>
                      {describe(hour)}
                    </td>
                  ) : (
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-1.5 text-[13px]">
                          <input
                            type="checkbox"
                            checked={hour.isOpen}
                            onChange={(event) => update(hour.day, { isOpen: event.target.checked })}
                            className="accent-primary"
                          />
                          Aberto
                        </label>
                        <input
                          type="time"
                          aria-label={`${WEEKDAY_LABEL[hour.day]} abre às`}
                          disabled={!hour.isOpen || hour.is24h}
                          value={hour.opensAt ?? ''}
                          onChange={(event) =>
                            update(hour.day, { opensAt: event.target.value || null })
                          }
                          className={timeInput}
                        />
                        <span className="text-muted-foreground">às</span>
                        <input
                          type="time"
                          aria-label={`${WEEKDAY_LABEL[hour.day]} fecha às`}
                          disabled={!hour.isOpen || hour.is24h}
                          value={hour.closesAt ?? ''}
                          onChange={(event) =>
                            update(hour.day, { closesAt: event.target.value || null })
                          }
                          aria-invalid={Boolean(issue)}
                          className={cn(timeInput, 'aria-invalid:border-destructive')}
                        />
                        <label className="flex items-center gap-1.5 text-[13px]">
                          <input
                            type="checkbox"
                            disabled={!hour.isOpen}
                            checked={hour.is24h}
                            onChange={(event) => update(hour.day, { is24h: event.target.checked })}
                            className="accent-primary"
                          />
                          24 horas
                        </label>
                        <label className="flex items-center gap-1.5 text-[13px]">
                          <input
                            type="checkbox"
                            checked={hour.isOnCall}
                            onChange={(event) =>
                              update(hour.day, { isOnCall: event.target.checked })
                            }
                            className="accent-primary"
                          />
                          Plantão
                        </label>
                        {hour.isOpen && (
                          <Button size="sm" variant="link" onClick={() => replicate(hour)}>
                            Replicar
                          </Button>
                        )}
                        {issue && <span className="text-xs text-destructive-text">{issue}</span>}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {isEditing && (
        <p className="text-xs text-muted-foreground">
          Ou use “Replicar” em um dia para copiar o horário dele para os demais dias abertos.
        </p>
      )}
    </div>
  );
}
