import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/States';
import { formatNumber } from '@/lib/format';
import { CATALOG_LISTS, CATALOG_SECTIONS } from '../catalogKinds';
import { useCatalogSummary } from '../hooks/useCatalogList';

// Configurações do Backoffice: atributos da loja (spec 004) e pessoas da Farmarcas (spec 005).
export function SettingsView() {
  const summary = useCatalogSummary();
  const countOf = (slug: string) => summary.lists.find((item) => item.kind === slug);

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Listas que a Farmarcas define para as lojas e para o próprio time. Só administradores veem esta área."
      />
      {CATALOG_SECTIONS.map((section) => (
        <section
          key={section.section}
          aria-labelledby={`section-${section.section}`}
          className="flex flex-col gap-3"
        >
          <div>
            <h2 id={`section-${section.section}`} className="text-base font-semibold">
              {section.title}
            </h2>
            <p className="text-xs text-muted-foreground">{section.description}</p>
          </div>
          {summary.error ? (
            <Card>
              <ErrorState message={summary.error.message} onRetry={summary.reload} />
            </Card>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-3">
              {CATALOG_LISTS.filter((list) => list.section === section.section).map((list) => {
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
      ))}
    </>
  );
}
