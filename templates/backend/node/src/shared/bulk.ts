// Ação em lote: quais itens pedidos mudam e quantos são pulados (não achados ou já no estado
// pedido). A tela mostra "N alteradas, M puladas" (spec 003, FR-071).
export const splitBulk = <T>(
  requested: number,
  found: T[],
  shouldChange: (item: T) => boolean,
): { toChange: T[]; skipped: number } => {
  const toChange = found.filter(shouldChange);
  return { toChange, skipped: requested - toChange.length };
};
