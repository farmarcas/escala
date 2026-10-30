import { Card } from '@/components/ui/Card';
import { formatNumber } from '@/lib/format';

type ModuleAdoptionProps = { includedGroups: number | undefined };

// Adoção por módulo: licenciado × em uso. O uso aparece quando houver dados de acesso.
export function ModuleAdoption({ includedGroups }: ModuleAdoptionProps) {
  return (
    <Card as="section" className="p-5">
      <h2 className="text-base font-semibold">Adoção por módulo</h2>
      <p className="mb-4 text-xs text-muted-foreground">Licenciado · em uso no período</p>
      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-1.5 flex flex-wrap justify-between gap-2 text-[13px]">
            <span className="font-semibold">Cadastros</span>
            <span className="text-muted-foreground">
              uso ainda não medido · {formatNumber(includedGroups ?? 0)} incluídos
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-subtle" aria-hidden="true">
            <div className="h-full w-full rounded-full bg-primary-soft" />
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex flex-wrap justify-between gap-2 text-[13px]">
            <span className="font-semibold">Verbas</span>
            <span className="text-muted-foreground">liberação de módulos em desenvolvimento</span>
          </div>
          <div
            className="h-2.5 rounded-full border border-dashed border-control"
            aria-hidden="true"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Campanhas, Escala, Check-list, Tarefas, Comunicados, Agenda e NPS estão em construção.
        </p>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-primary" aria-hidden="true" />
            Em uso
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-primary-soft" aria-hidden="true" />
            Licenciado ocioso
          </span>
        </div>
      </div>
    </Card>
  );
}
