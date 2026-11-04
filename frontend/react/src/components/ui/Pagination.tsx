import { Button } from './Button';

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
};

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages === 1) return null;
  return (
    <nav aria-label="Paginação" className="ml-auto flex items-center gap-2">
      <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Anterior
      </Button>
      <span className="text-[13px]">
        Página {page} de {pages}
      </span>
      <Button
        size="sm"
        variant="secondary"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Próxima
      </Button>
    </nav>
  );
}
