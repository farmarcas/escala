import { z } from 'zod';

// Horário de funcionamento por dia (segunda a domingo e feriado). O módulo Escala consome daqui.
export const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN', 'HOLIDAY'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  MON: 'Segunda',
  TUE: 'Terça',
  WED: 'Quarta',
  THU: 'Quinta',
  FRI: 'Sexta',
  SAT: 'Sábado',
  SUN: 'Domingo',
  HOLIDAY: 'Feriado',
};

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM');

export const openingHourSchema = z
  .object({
    day: z.enum(WEEKDAYS),
    isOpen: z.boolean(),
    opensAt: time.nullable(),
    closesAt: time.nullable(),
    is24h: z.boolean(),
    isOnCall: z.boolean(),
  })
  .strict();
export type OpeningHour = z.infer<typeof openingHourSchema>;

// Regra do dia: aberto e não 24 horas exige abrir antes de fechar.
export const hourIssue = (hour: OpeningHour): string | null => {
  if (!hour.isOpen || hour.is24h) return null;
  if (!hour.opensAt || !hour.closesAt) return 'Informe a hora de abrir e de fechar';
  if (hour.closesAt <= hour.opensAt) return 'A hora de fechar precisa ser depois da de abrir';
  return null;
};

export const hoursSchema = z
  .array(openingHourSchema)
  .length(WEEKDAYS.length)
  .superRefine((hours, context) => {
    const days = new Set(hours.map((hour) => hour.day));
    if (days.size !== WEEKDAYS.length) {
      context.addIssue({ code: 'custom', message: 'Informe cada dia uma vez' });
    }
    hours.forEach((hour, index) => {
      const issue = hourIssue(hour);
      if (issue) context.addIssue({ code: 'custom', message: issue, path: [index, 'closesAt'] });
    });
  });

export const hasOpeningHours = (hours: OpeningHour[]) =>
  hours.some(
    (hour) =>
      hour.day !== 'HOLIDAY' && hour.isOpen && (hour.is24h || (hour.opensAt && hour.closesAt)),
  );

// Texto curto para o histórico ("Seg a Sáb 08:00–20:00 · Dom fechado").
export const summarizeHours = (hours: OpeningHour[]): string =>
  WEEKDAYS.map((day) => {
    const hour = hours.find((item) => item.day === day);
    const label = WEEKDAY_LABELS[day].slice(0, 3);
    if (!hour || !hour.isOpen) return `${label} fechado${hour?.isOnCall ? ' (plantão)' : ''}`;
    if (hour.is24h) return `${label} 24h`;
    return `${label} ${hour.opensAt}–${hour.closesAt}`;
  }).join(' · ');
