import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { formatNumber, pluralize } from '@/lib/format';
import type { Overview } from '../types';

type AttentionItem = {
  key: string;
  value: number;
  title: string;
  detail: string;
  action: string;
  to: string;
  isCritical?: boolean;
};

const itemsOf = (attention: Overview['attention']): AttentionItem[] => [
  {
    key: 'owner',
    value: attention.groupsWithoutOwner,
    title: 'GEs sem proprietário cadastrado',
    detail: 'Sem proprietário não há quem administre o grupo',
    action: 'Ver lista',
    to: '/grupos',
    isCritical: true,
  },
  {
    key: 'validation',
    value: attention.storesValidationAttention.stores,
    title: 'Lojas com validação vencida ou nunca feita',
    detail: `Em ${pluralize(attention.storesValidationAttention.groups, 'grupo', 'grupos')} · o dono revisa os dados a cada 6 meses`,
    action: 'Ver lojas',
    to: '/lojas?validacao=attention',
    isCritical: true,
  },
  {
    key: 'requests',
    value: attention.requestsWaitingPlatform.requests,
    title: 'Solicitações aguardando a Farmarcas',
    detail: `Em ${pluralize(attention.requestsWaitingPlatform.stores, 'loja', 'lojas')} · CNPJ, endereço, bandeira e regime`,
    action: 'Ver lojas',
    to: '/lojas?solicitacao=1',
  },
  {
    key: 'documents',
    value: attention.documentAlerts.docs,
    title: 'Documentos vencidos ou vencendo',
    detail: `Em ${pluralize(attention.documentAlerts.stores, 'loja', 'lojas')} · nos próximos 30 dias`,
    action: 'Ver lojas',
    to: '/lojas?documento=1',
  },
  {
    key: 'pending',
    value: attention.storesPending,
    title: 'Lojas pendentes no grupo',
    detail: 'Aguardando o grupo verificar a loja e completar os dados',
    action: 'Ver lojas',
    to: '/lojas?status=PENDING',
  },
];

type AttentionListProps = { attention: Overview['attention'] | undefined };

// Pontos de atenção do cadastro: a ação é sempre por grupo e por loja, nunca por pessoa.
export function AttentionList({ attention }: AttentionListProps) {
  return (
    <Card as="section" className="p-5">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-base font-semibold">Pontos de atenção</h2>
        <span className="text-xs text-muted-foreground">
          A ação é sempre por grupo e por loja, nunca por pessoa
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {(attention ? itemsOf(attention) : []).map((item) => (
          <li
            key={item.key}
            className={cn(
              'flex items-center gap-4 rounded-md border px-4 py-3',
              item.value > 0 && item.isCritical
                ? 'border-destructive-border bg-destructive-soft/40'
                : 'border-border',
            )}
          >
            <span
              className={cn(
                'w-14 shrink-0 text-xl font-bold',
                item.value === 0
                  ? 'text-control'
                  : item.isCritical
                    ? 'text-destructive'
                    : 'text-primary',
              )}
            >
              {formatNumber(item.value)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{item.title}</span>
              <span className="block text-xs text-muted-foreground">{item.detail}</span>
            </span>
            <Link
              to={item.to}
              className="shrink-0 text-[13px] font-semibold text-primary hover:text-primary-hover"
            >
              {item.action}
            </Link>
          </li>
        ))}
        {!attention && <li className="text-sm text-muted-foreground">Carregando…</li>}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        Convites pendentes, funcionários sem acesso, uso em queda e tenants só com Cadastros entram
        quando houver convite do proprietário, funcionários, dados de uso e liberação de módulos.
      </p>
    </Card>
  );
}
