import type { Tx } from '../../shared/database/with-actor.js';
import type { AuditActor, AuditEntry, AuditEventView } from './audit.types.js';

// Append-only: o usuário da aplicação não tem UPDATE nem DELETE nesta tabela.
export const recordAudit = async (tx: Tx, actor: AuditActor, entry: AuditEntry): Promise<void> => {
  await tx.auditEvent.create({
    data: {
      economicGroupId: entry.economicGroupId,
      action: entry.action,
      summary: entry.summary,
      justification: entry.justification ?? null,
      actorSubject: actor.subject,
      actorRole: actor.role,
    },
  });
};

export const listAuditByGroup = async (
  tx: Tx,
  economicGroupId: string,
  page: number,
  pageSize: number,
): Promise<{ data: AuditEventView[]; total: number }> => {
  const where = { economicGroupId };
  // Consultas em sequência: dentro de uma transação interativa há uma só conexão.
  const rows = await tx.auditEvent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
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
