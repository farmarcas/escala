// Chave de comparação de nomes: ignora maiúsculas, acentos e espaços repetidos.
export const normalizeName = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
