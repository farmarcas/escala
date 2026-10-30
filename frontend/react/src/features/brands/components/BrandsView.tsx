import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, InlineAlert, LoadingState } from '@/components/ui/States';
import { HeaderCell, Table, TableFooter } from '@/components/ui/Table';
import { useMutation } from '@/hooks/useMutation';
import { useBrands } from '../hooks/useBrands';
import type { Brand } from '../types';
import { BrandCreateForm } from './BrandCreateForm';
import { BrandRow } from './BrandRow';
import { BrandsKpis } from './BrandsKpis';

type BrandsViewProps = { canEdit: boolean };

export function BrandsView({ canEdit }: BrandsViewProps) {
  const { brands, stats, isLoading, error, reload, create, rename, setStatus, remove } =
    useBrands();
  const [toDelete, setToDelete] = useState<Brand | null>(null);
  const deletion = useMutation();

  const handleDelete = async () => {
    if (!toDelete) return;
    if (await deletion.run(() => remove(toDelete.id))) setToDelete(null);
  };

  const closeDelete = () => {
    deletion.reset();
    setToDelete(null);
  };

  return (
    <>
      <BrandsKpis stats={stats} />

      <Card as="section">
        <div className="border-b border-border px-5 py-4">
          <CardTitle
            title="Cadastro de marcas"
            description="Só marcas ativas aparecem no cadastro de loja."
          />
          {canEdit && (
            <div className="mt-4">
              <BrandCreateForm onCreate={create} />
            </div>
          )}
        </div>

        {isLoading && <LoadingState label="Carregando marcas" />}
        {error && !isLoading && <ErrorState message={error.message} onRetry={reload} />}
        {!isLoading && !error && brands.length === 0 && (
          <EmptyState
            title="Nenhuma marca cadastrada"
            description={canEdit ? 'Adicione a primeira marca acima.' : undefined}
          />
        )}
        {!isLoading && !error && brands.length > 0 && (
          <Table label="Marcas Farmarcas" minWidth="760px">
            <thead>
              <tr>
                <HeaderCell>Marca</HeaderCell>
                <HeaderCell>Situação</HeaderCell>
                <HeaderCell isNumeric>Lojas</HeaderCell>
                <HeaderCell isNumeric>Grupos</HeaderCell>
                <HeaderCell>Criada em</HeaderCell>
                <HeaderCell isNumeric>{canEdit ? 'Ações' : ''}</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => (
                <BrandRow
                  key={brand.id}
                  brand={brand}
                  canEdit={canEdit}
                  onRename={rename}
                  onSetStatus={setStatus}
                  onRequestDelete={setToDelete}
                />
              ))}
            </tbody>
          </Table>
        )}
        <TableFooter>
          Marcas com lojas vinculadas não podem ser excluídas, apenas desativadas.
        </TableFooter>
      </Card>

      <Modal
        title="Excluir marca"
        subtitle={toDelete?.name}
        isOpen={toDelete !== null}
        onClose={closeDelete}
        footer={
          <>
            <Button variant="secondary" onClick={closeDelete}>
              Cancelar
            </Button>
            <Button variant="danger" disabled={deletion.isPending} onClick={handleDelete}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-secondary-foreground">
          A marca sai da lista e não poderá ser escolhida em lojas novas. Esta ação fica registrada
          na auditoria.
        </p>
        {deletion.error && <InlineAlert>{deletion.error.message}</InlineAlert>}
      </Modal>
    </>
  );
}
