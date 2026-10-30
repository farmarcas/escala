import { useState } from 'react';
import { buildQuery, type Paginated } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';

export type AuditEvent = {
  id: string;
  at: string;
  action: string;
  summary: string;
  actorSubject: string;
  actorRole: string;
  justification: string | null;
};

export function useGroupAudit(groupNumber: number) {
  const [page, setPage] = useState(1);
  const query = useApiQuery<Paginated<AuditEvent>>(
    `/economic-groups/${groupNumber}/audit-events${buildQuery({ page, pageSize: 20 })}`,
  );
  return {
    events: query.data?.data ?? [],
    meta: query.data?.meta,
    isLoading: query.isLoading && !query.data,
    error: query.error,
    reload: query.reload,
    setPage,
  };
}
