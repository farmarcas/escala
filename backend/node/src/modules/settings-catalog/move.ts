// Nova ordem da lista depois de subir ou descer um item: troca de lugar com o vizinho mais
// próximo que a pessoa vê junto (canSwap), e os demais ficam onde estão. Nas pontas, nada muda.
export const moveInOrder = (
  ids: string[],
  id: string,
  direction: 'up' | 'down',
  canSwap: (other: string) => boolean = () => true,
): string[] => {
  const from = ids.indexOf(id);
  if (from < 0) return ids;
  const step = direction === 'up' ? -1 : 1;
  let to = from + step;
  while (to >= 0 && to < ids.length && !canSwap(ids[to]!)) to += step;
  if (to < 0 || to >= ids.length) return ids;
  const next = [...ids];
  [next[from], next[to]] = [next[to]!, next[from]!];
  return next;
};
