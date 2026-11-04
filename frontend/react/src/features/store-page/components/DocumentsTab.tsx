import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { Cell, HeaderCell, Row, Table } from '@/components/ui/Table';
import { useMutation } from '@/hooks/useMutation';
import { formatDate } from '@/lib/format';
import { useStoreDocuments } from '../hooks/useStoreDocuments';
import type { DocumentStatus, Side, StoreDocumentRow } from '../types';

const STATUS: Record<DocumentStatus, { label: string; tone: BadgeTone }> = {
  valid: { label: 'Válido', tone: 'success' },
  due_soon: { label: 'Vence em breve', tone: 'warning' },
  expired: { label: 'Vencido', tone: 'danger' },
  missing: { label: 'Não enviado', tone: 'neutral' },
};

const DAY_MS = 86_400_000;

function statusLabel(row: StoreDocumentRow): string {
  if (row.status === 'due_soon' && row.document?.validUntil) {
    const days = Math.ceil(
      (new Date(`${row.document.validUntil}T00:00:00`).getTime() - Date.now()) / DAY_MS,
    );
    return `Vence em ${days} ${days === 1 ? 'dia' : 'dias'}`;
  }
  return STATUS[row.status].label;
}

type DocumentsTabProps = { side: Side; code: number; onChanged: () => void };

// Documentos da loja, com validade e alerta de vencimento (US10).
export function DocumentsTab({ side, code, onChanged }: DocumentsTabProps) {
  const documents = useStoreDocuments(side, code, onChanged);
  const alerts = documents.rows.filter(
    (row) => row.status === 'due_soon' || row.status === 'expired',
  ).length;

  return (
    <div className="flex flex-col gap-3 py-5">
      <div className="px-5">
        <h2 className="text-base font-semibold">Documentos da loja</h2>
        <p className="text-xs text-muted-foreground">
          {alerts
            ? `${alerts} ${alerts === 1 ? 'documento precisa' : 'documentos precisam'} de atenção · documentos de solicitações ficam também na solicitação`
            : 'Todos os documentos enviados estão válidos'}
        </p>
      </div>
      {documents.isLoading && <LoadingState label="Carregando documentos" />}
      {documents.error && (
        <ErrorState message={documents.error.message} onRetry={documents.reload} />
      )}
      {!documents.isLoading && !documents.error && (
        <Table label="Documentos da loja" minWidth="900px">
          <thead>
            <tr>
              <HeaderCell>Documento</HeaderCell>
              <HeaderCell>Arquivo</HeaderCell>
              <HeaderCell>Validade</HeaderCell>
              <HeaderCell>Situação</HeaderCell>
              <HeaderCell>Enviado por</HeaderCell>
              <HeaderCell isNumeric>Ações</HeaderCell>
            </tr>
          </thead>
          <tbody>
            {documents.rows.map((row) => (
              <DocumentRow
                key={row.docType}
                row={row}
                onUpload={documents.upload}
                onDownload={documents.download}
              />
            ))}
          </tbody>
        </Table>
      )}
      <p className="px-5 text-xs text-muted-foreground">
        PDF, JPG ou PNG de até 10 MB. O grupo envia alvará, licença, AFE e CRF; a Farmarcas envia o
        cartão CNPJ e o contrato.
      </p>
    </div>
  );
}

type DocumentRowProps = {
  row: StoreDocumentRow;
  onUpload: (docType: string, file: File, validUntil: string) => Promise<void>;
  onDownload: (documentId: string, fileName: string) => Promise<void>;
};

function DocumentRow({ row, onUpload, onDownload }: DocumentRowProps) {
  const [file, setFile] = useState<File | null>(null);
  const [validUntil, setValidUntil] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const { run, isPending, error } = useMutation();
  const status = STATUS[row.status];

  const send = async () => {
    if (!file) return;
    if (await run(() => onUpload(row.docType, file, validUntil))) {
      setFile(null);
      setValidUntil('');
    }
  };

  return (
    <Row>
      <Cell className="font-semibold">{row.label}</Cell>
      <Cell className="max-w-56 truncate text-[13px] text-secondary-foreground">
        {file?.name ?? row.document?.fileName ?? '—'}
      </Cell>
      <Cell className="whitespace-nowrap text-[13px]">
        {file ? (
          <input
            type="date"
            aria-label={`Validade de ${row.label}`}
            value={validUntil}
            onChange={(event) => setValidUntil(event.target.value)}
            className="h-8 rounded-md border border-border px-2 text-sm"
          />
        ) : row.document?.validUntil ? (
          formatDate(row.document.validUntil)
        ) : row.document ? (
          'Sem validade'
        ) : (
          '—'
        )}
      </Cell>
      <Cell>
        <StatusBadge tone={status.tone}>{statusLabel(row)}</StatusBadge>
      </Cell>
      <Cell className="text-xs text-muted-foreground">
        {row.document ? `${row.document.uploadedBy} · ${formatDate(row.document.uploadedAt)}` : '—'}
        {error && <p className="mt-1 text-destructive-text">{error.message}</p>}
      </Cell>
      <Cell isNumeric>
        <span className="inline-flex flex-wrap justify-end gap-2">
          {row.document && !file && (
            <Button
              size="sm"
              variant="link"
              onClick={() => run(() => onDownload(row.document!.id, row.document!.fileName))}
            >
              <Download aria-hidden="true" className="size-4" />
              Baixar
            </Button>
          )}
          {row.canUpload && !file && (
            <>
              <input
                ref={input}
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                className="sr-only"
                aria-label={`Escolher arquivo de ${row.label}`}
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  event.target.value = '';
                }}
              />
              <Button size="sm" variant="secondary" onClick={() => input.current?.click()}>
                <Upload aria-hidden="true" className="size-4" />
                {row.document ? 'Substituir' : 'Enviar'}
              </Button>
            </>
          )}
          {file && (
            <>
              <Button size="sm" variant="ghost" onClick={() => setFile(null)}>
                Cancelar
              </Button>
              <Button size="sm" disabled={isPending} onClick={send}>
                Salvar
              </Button>
            </>
          )}
        </span>
      </Cell>
    </Row>
  );
}
