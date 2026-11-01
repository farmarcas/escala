import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/States';
import { formatNumber } from '@/lib/format';
import { CATALOG_LISTS } from '../catalogKinds';
import { useCatalogSummary } from '../hooks/useCatalogList';

// Configurações do Backoffice: por enquanto, a seção Atributos da loja (specs/004, etapa 1).
export function SettingsView() {
  const summary = useCatalogSummary();
  const countOf = (slug: string) => summary.lists.find((item) => item.kind === slug);

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Listas e atributos que a Farmarcas define para todas as lojas. Só administradores veem esta área."
      />
      <section aria-labelledby="store-attributes" className="flex flex-col gap-3">
        <div>
          <h2 id="store-attributes" className="text-base font-semibold">
            Atributos da loja
          </h2>
          <p className="text-xs text-muted-foreground">
            As opções que aparecem na página da loja. Mudanças valem na hora para todas as lojas.
          </p>
        </div>
        {summary.error ? (
          <Card>
            <ErrorState message={summary.error.message} onRetry={summary.reload} />
          </Card>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-3">
            {CATALOG_LISTS.map((list) => {
              const count = countOf(list.slug);
              return (
                <li key={list.slug}>
                  <Link
                    to={`/configuracoes/atributos/${list.slug}`}
                    className="group flex h-full items-start gap-3 rounded-lg border border-border bg-surface p-4 shadow-card transition-colors duration-150 hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold group-hover:text-primary">
                        {list.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {list.description}
                      </span>
                      <span className="mt-2 block text-[13px] text-secondary-foreground">
                        {count ? (
                          <>
                            <span className="font-semibold text-foreground">
                              {formatNumber(count.active)}
                            </span>{' '}
                            {count.active === 1 ? 'ativo' : 'ativos'}
                            {count.inactive > 0 &&
                              ` · ${formatNumber(count.inactive)} ${count.inactive === 1 ? 'desativado' : 'desativados'}`}
                          </>
                        ) : (
                          'Carregando…'
                        )}
                      </span>
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground group-hover:text-primary"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
