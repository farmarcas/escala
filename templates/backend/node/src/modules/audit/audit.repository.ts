import type { Tx } from '../../shared/database/with-actor.js';
import type { AuditActor, AuditEntityType, AuditEntry, AuditEventView } from './audit.types.js';

// Append-only: o usuário da aplicação não tem UPDATE nem DELETE nesta tabela.
export const recordAudit = async (tx: Tx, actor: AuditActor, entry: AuditEntry): Promise<void> => {
  const entity =
    entry.entity ??
    (entry.economicGroupId ? { type: 'GROUP' as const, id: entry.economicGroupId } : null);
  await tx.auditEvent.create({
    data: {
      economicGroupId: entry.economicGroupId,
      entityType: entity?.type ?? null,
      entityId: entity?.id ?? null,
      action: entry.action,
      summary: entry.summary,
      justification: entry.justification ?? null,
      actorSubject: actor.subject,
      actorRole: actor.role,
    },
  });
};

const listAudit = async (
  tx: Tx,
  where:
    | { economicGroupId: string }
    | { entityType: AuditEntityType; entityId: string | { in: string[] } },
  page: number,
  pageSize: number,
): Promise<{ data: AuditEventView[]; total: number }> => {
  // Consultas em sequência: dentro de uma transação interativa há uma só conexão.
  const rows = await tx.auditEvent.findMany({
    where,
    // Mesmo milissegundo: o id (UUIDv7) desempata na ordem em que foi gravado.
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  const total = await tx.auditEvent.count({ where });

  return {
    data: rows.map((row) => ({
      id: row.id,
      at: row.createdAt,
      action: row.action,
      summary: row.summary,
      actorSubject: row.actorSubject,
      actorRole: row.actorRole,
      justification: row.justification,
    })),
    total,
  };
};

export const listAuditByGroup = (
  tx: Tx,
  economicGroupId: string,
  page: number,
  pageSize: number,
): Promise<{ data: AuditEventView[]; total: number }> =>
  listAudit(tx, { economicGroupId }, page, pageSize);

// Histórico de um registro que não é de grupo (funcionário, parceiro).
export const listAuditByEntity = (
  tx: Tx,
  entityType: AuditEntityType,
  entityId: string,
  page: number,
  pageSize: number,
): Promise<{ data: AuditEventView[]; total: number }> =>
  listAudit(tx, { entityType, entityId }, page, pageSize);

// Histórico de vários registros juntos (ex.: todos os itens de uma lista de Configurações).
export const listAuditByEntities = (
  tx: Tx,
  entityType: AuditEntityType,
  entityIds: string[],
  page: number,
  pageSize: number,
): Promise<{ data: AuditEventView[]; total: number }> =>
  listAudit(tx, { entityType, entityId: { in: entityIds } }, page, pageSize);
