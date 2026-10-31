export type AuditEntityType = 'GROUP' | 'EMPLOYEE' | 'PARTNER';

export type AuditEntry = {
  economicGroupId: string | null;
  // Registro a que o evento se refere. Sem isso, o grupo (quando houver) é o registro.
  entity?: { type: AuditEntityType; id: string };
  action: string;
  summary: string;
  justification?: string | null;
};

export type AuditEventView = {
  id: string;
  at: Date;
  action: string;
  summary: string;
  actorSubject: string;
  actorRole: string;
  justification: string | null;
};

// Quem agiu: operador (OP-02) ou o grupo (pseudônimo do proprietário).
export type AuditActor = { subject: string; role: string };
