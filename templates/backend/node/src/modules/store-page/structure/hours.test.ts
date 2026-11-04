import { describe, expect, it } from 'vitest';
import {
  hasOpeningHours,
  hourIssue,
  hoursSchema,
  summarizeHours,
  WEEKDAYS,
  type OpeningHour,
} from './hours.js';

const week = (overrides: Partial<Record<string, Partial<OpeningHour>>> = {}): OpeningHour[] =>
  WEEKDAYS.map((day) => ({
    day,
    isOpen: day !== 'SUN',
    opensAt: day !== 'SUN' ? '08:00' : null,
    closesAt: day !== 'SUN' ? '20:00' : null,
    is24h: false,
    isOnCall: false,
    ...overrides[day],
  }));

describe('horário de funcionamento', () => {
  it('aceita a semana comercial com domingo fechado', () => {
    expect(hoursSchema.safeParse(week()).success).toBe(true);
    expect(hasOpeningHours(week())).toBe(true);
  });

  it('dia 24 horas não exige hora', () => {
    expect(
      hourIssue({
        day: 'MON',
        isOpen: true,
        opensAt: null,
        closesAt: null,
        is24h: true,
        isOnCall: false,
      }),
    ).toBeNull();
  });

  it('recusa fechar antes de abrir e dia aberto sem hora', () => {
    expect(hoursSchema.safeParse(week({ MON: { closesAt: '07:00' } })).success).toBe(false);
    expect(
      hourIssue({
        day: 'TUE',
        isOpen: true,
        opensAt: null,
        closesAt: '20:00',
        is24h: false,
        isOnCall: false,
      }),
    ).toBe('Informe a hora de abrir e de fechar');
  });

  it('recusa dia repetido ou faltando', () => {
    const repeated = week();
    repeated[1] = { ...repeated[0]! };
    expect(hoursSchema.safeParse(repeated).success).toBe(false);
  });

  it('resume para o histórico', () => {
    expect(summarizeHours(week({ SUN: { isOnCall: true } }))).toContain('Dom fechado (plantão)');
  });

  it('sem nenhum dia aberto não conta como horário informado', () => {
    expect(hasOpeningHours(week().map((hour) => ({ ...hour, isOpen: false })))).toBe(false);
  });
});
