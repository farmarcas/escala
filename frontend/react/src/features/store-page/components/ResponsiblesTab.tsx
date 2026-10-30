import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatPhone } from '@/lib/format';
import type { StorePage } from '../types';

const cardLabel = 'text-xs font-bold uppercase tracking-[0.4px] text-muted-foreground';

// Responsáveis: proprietário (cadastro do grupo); Anjo Farmarcas e responsáveis da loja chegam
// com os cadastros de funcionários de cada lado (US11).
export function ResponsiblesTab({ page }: { page: StorePage }) {
  const owner = page.owner;
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 px-5 py-5">
      <Card className="p-5">
        <p className={cardLabel}>Proprietário do grupo econômico</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Primeiro administrador · departamento Sócio
        </p>
        {!owner && <p className="text-sm text-destructive">Grupo sem proprietário cadastrado</p>}
        {owner && !owner.name && (
          <>
            <p className="font-mono text-lg font-semibold">{owner.pseudonym}</p>
            <p className="text-xs text-muted-foreground">
              Dados pessoais pseudonimizados para o analista
            </p>
          </>
        )}
        {owner?.name && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
            <dt className="text-muted-foreground">Nome</dt>
            <dd className="font-semibold">{owner.name}</dd>
            <dt className="text-muted-foreground">E-mail</dt>
            <dd className="truncate">{owner.email ?? '—'}</dd>
            <dt className="text-muted-foreground">Telefone</dt>
            <dd>{owner.phone ? formatPhone(owner.phone) : '—'}</dd>
            <dt className="text-muted-foreground">Código</dt>
            <dd className="font-mono">{owner.pseudonym}</dd>
          </dl>
        )}
      </Card>
      <Card className="p-5">
        <p className={cardLabel}>Anjo Farmarcas</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Analista da Farmarcas que acompanha a loja
        </p>
        <StatusBadge tone="neutral">Em desenvolvimento</StatusBadge>
        <p className="mt-2 text-xs text-muted-foreground">
          Chega com o menu Funcionários do Backoffice, onde ficam os funcionários da Farmarcas.
        </p>
      </Card>
      <Card className="p-5">
        <p className={cardLabel}>Responsáveis da loja</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Farmacêutico responsável técnico e gerente
        </p>
        <StatusBadge tone="neutral">Em desenvolvimento</StatusBadge>
        <p className="mt-2 text-xs text-muted-foreground">
          São funcionários do grupo econômico e chegam com o cadastro de funcionários do grupo.
          {page.side === 'platform' && ' A Farmarcas verá esses funcionários por código.'}
        </p>
      </Card>
    </div>
  );
}
