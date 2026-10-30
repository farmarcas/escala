import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Cell, Row } from '@/components/ui/Table';
import { useMutation } from '@/hooks/useMutation';
import { cn } from '@/lib/cn';
import { formatDate, formatNumber } from '@/lib/format';
import type { Brand, BrandStatus } from '../types';

type BrandRowProps = {
  brand: Brand;
  canEdit: boolean;
  onRename: (id: string, name: string) => Promise<void>;
  onSetStatus: (id: string, status: BrandStatus) => Promise<void>;
  onRequestDelete: (brand: Brand) => void;
};

export function BrandRow({
  brand,
  canEdit,
  onRename,
  onSetStatus,
  onRequestDelete,
}: BrandRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(brand.name);
  const rename = useMutation();
  const toggle = useMutation();
  const isActive = brand.status === 'ACTIVE';
  const inputId = `brand-${brand.id}`;

  const handleRename = async (event: FormEvent) => {
    event.preventDefault();
    if (await rename.run(() => onRename(brand.id, name.trim()))) setIsEditing(false);
  };

  const handleCancel = () => {
    setName(brand.name);
    rename.reset();
    setIsEditing(false);
  };

  return (
    <Row isDimmed={!isActive}>
      <Cell className="font-semibold">
        {isEditing ? (
          <form onSubmit={handleRename} className="flex flex-wrap items-start gap-2">
            <div>
              <label htmlFor={inputId} className="sr-only">
                Novo nome da marca
              </label>
              <input
                id={inputId}
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') handleCancel();
                }}
                aria-invalid={Boolean(rename.error)}
                className="h-8 w-56 rounded-md border border-border px-2.5 text-sm font-normal focus:border-2 focus:border-primary focus:px-[9px] focus:outline-none aria-invalid:border-destructive"
              />
              {rename.error && (
                <p className="mt-1 text-xs font-normal text-destructive-text">
                  {rename.error.message}
                </p>
              )}
            </div>
            <Button size="sm" type="submit" disabled={rename.isPending || name.trim().length < 2}>
              Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              Cancelar
            </Button>
          </form>
        ) : (
          brand.name
        )}
      </Cell>
      <Cell>
        <StatusBadge tone={isActive ? 'success' : 'neutral'}>
          {isActive ? 'Ativa' : 'Histórica'}
        </StatusBadge>
      </Cell>
      <Cell
        isNumeric
        className={cn(brand.storeCount === 0 && isActive && 'font-semibold text-primary-hover')}
      >
        {formatNumber(brand.storeCount)}
      </Cell>
      <Cell isNumeric>{formatNumber(brand.groupCount)}</Cell>
      <Cell className="text-secondary-foreground">{formatDate(brand.createdAt)}</Cell>
      <Cell isNumeric>
        {canEdit && !isEditing && (
          <span className="inline-flex flex-wrap justify-end gap-3">
            <Button variant="link" size="sm" onClick={() => setIsEditing(true)}>
              Renomear
            </Button>
            <Button
              variant="link"
              size="sm"
              disabled={toggle.isPending}
              className={isActive ? 'text-destructive-text hover:text-destructive' : undefined}
              onClick={() =>
                toggle.run(() => onSetStatus(brand.id, isActive ? 'HISTORICAL' : 'ACTIVE'))
              }
            >
              {isActive ? 'Desativar' : 'Reativar'}
            </Button>
            {brand.storeCount === 0 && (
              <Button
                variant="link"
                size="sm"
                className="text-destructive-text hover:text-destructive"
                onClick={() => onRequestDelete(brand)}
              >
                Excluir
              </Button>
            )}
          </span>
        )}
      </Cell>
    </Row>
  );
}
