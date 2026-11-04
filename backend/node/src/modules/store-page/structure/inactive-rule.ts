import { AppError } from '../../../shared/errors/app-error.js';

// Item desativado em Configurações (specs/004, FR-031/032): a loja que já usa continua com ele
// e pode desmarcar ou zerar; marcar de novo, não.
export const inactiveItem = () =>
  new AppError('Este item foi desativado pela Farmarcas', 400, 'CATALOG_ITEM_INACTIVE');

// Seleções (serviços, PBMs, estratégias, sistema): desativados que entram agora.
export const newlyAddedInactive = (current: string[], next: string[], activeIds: Set<string>) =>
  next.filter((id) => !current.includes(id) && !activeIds.has(id));

// Respostas com valor (mobiliário, ferramenta, canal): só muda se a loja já usa, ou se deixa de usar.
export const canAnswerInactive = (alreadyUses: boolean, nextUses: boolean) =>
  alreadyUses || !nextUses;
