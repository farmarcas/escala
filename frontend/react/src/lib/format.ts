// Formatação pt-BR usada em todas as telas (números, datas, CNPJ, telefone, códigos).

const numberFormat = new Intl.NumberFormat('pt-BR');

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function formatGroupNumber(value: number): string {
  return String(value).padStart(4, '0');
}

export function formatStoreCode(value: number): string {
  return `LJ-${String(value).padStart(3, '0')}`;
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

// Máscara progressiva enquanto a pessoa digita: 00.000.000/0000-00.
export function formatCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 8), d.slice(8, 12), d.slice(12, 14)];
  let out = parts[0] ?? '';
  if (d.length > 2) out += `.${parts[1]}`;
  if (d.length > 5) out += `.${parts[2]}`;
  if (d.length > 8) out += `/${parts[3]}`;
  if (d.length > 12) out += `-${parts[4]}`;
  return out;
}

export function formatPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  const split = rest.length > 8 ? 5 : 4;
  if (rest.length <= split) return `(${ddd}) ${rest}`;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

// Data sem hora (AAAA-MM-DD) não passa por fuso: evita "voltar um dia".
export function formatDate(value: string | Date): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
  return new Date(value).toLocaleDateString('pt-BR');
}

export function formatDateTime(value: string | Date): string {
  const date = new Date(value);
  return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

export function formatZip(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

// Dinheiro em centavos → "R$ 1.787" (sem casas, como nos indicadores do protótipo).
export function formatBrl(cents: number): string {
  return `R$ ${Math.round(cents / 100).toLocaleString('pt-BR')}`;
}

export function parseBrlToCents(value: string): number | null {
  const digits = value.replace(/\D/g, '');
  return digits === '' ? null : Number(digits) * 100;
}
