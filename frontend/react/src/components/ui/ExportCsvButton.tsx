import { Download } from 'lucide-react';
import { useCsvDownload } from '@/hooks/useCsvDownload';
import { Button } from './Button';

type ExportCsvButtonProps = {
  // Rota de exportação com os filtros da lista, ex.: /stores/export?uf=SP.
  path: string;
  fileName: string;
  label?: string;
};

// Exporta o que está filtrado na lista, em CSV que abre certo na planilha.
export function ExportCsvButton({ path, fileName, label = 'Exportar CSV' }: ExportCsvButtonProps) {
  const { download, isDownloading, error } = useCsvDownload();
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        variant="secondary"
        size="sm"
        disabled={isDownloading}
        onClick={() => void download(path, fileName)}
        title="Baixa todas as linhas filtradas (até 5.000)"
      >
        <Download aria-hidden="true" className="size-4" />
        {isDownloading ? 'Exportando…' : label}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-destructive-text">
          {error.status === 413 ? 'Lista grande demais: filtre antes de exportar.' : error.message}
        </span>
      )}
    </span>
  );
}
