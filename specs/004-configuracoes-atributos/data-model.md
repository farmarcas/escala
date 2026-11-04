# Modelo de dados — Configurações, etapa 1

Uma migration: `20261101120000_configuracoes_atributos` (Prisma Migrate com `--create-only` e SQL editado à mão para o índice parcial e o RLS, conforme `database/DATABASE.md`).

## `catalog_items` (alterada)

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | uuid v7 | já existe |
| `kind` | `catalog_kind` | já existe; não muda depois de criado |
| `name` | text `pt_br` | já existe; 1 a 80 caracteres, sem espaço nas pontas |
| `group_label` | text | já existe; significado por lista (abaixo) |
| `description` | text | já existe; até 200 caracteres |
| `negotiated_monthly_cents` | int | já existe; só em Ferramentas externas; ≥ 0 ou vazio |
| `sort` | int | já existe; ordem dentro da lista |
| `active` | boolean | já existe; desativado = `false` |
| `icon` | text, nulo | **nova**; chave da galeria; só Mobiliário |
| `self_service` | boolean, padrão `false` | **nova**; só Mobiliário |
| `used_by_scale` | boolean, padrão `false` | **nova**; só Estratégias |
| `version` | int, padrão 1 | **nova**; sobe a cada gravação |
| `updated_at` | timestamptz | **nova**; padrão `now()` |
| `deleted_at` | timestamptz, nulo | **nova**; exclusão lógica |

Índices e restrições:
- Sai: `catalog_items_kind_name_key (kind, name)`.
- Entra: `catalog_items_kind_name_active_uidx` único em `(kind, lower(name)) WHERE deleted_at IS NULL` (escrito à mão).
- Entra: `catalog_items_kind_sort_idx (kind, sort)`.
- `catalog_items_negotiated_chk` continua.

RLS (nova):
- `catalog_read`: `FOR SELECT USING (true)`.
- `platform_write`: `FOR INSERT` e `FOR UPDATE`, com `current_setting('app.actor_kind', true) = 'platform'`.
- A aplicação não recebe DELETE nesta tabela (a exclusão é lógica).

### Campos por lista

| Lista (`kind`) | `group_label` | `description` | Outros |
| --- | --- | --- | --- |
| `FURNITURE` | tipo, obrigatório: `gondola`, `checkout`, `balcao`, `frio`, `expositor`, `sala`, `outro` | descrição | `icon` obrigatório na gravação; `self_service` |
| `SERVICE` | — | — | — |
| `DEMAND_SYSTEM` | — | — | — |
| `PRACTICE_TOOL` | — | — | — |
| `PBM` | operadora, opcional, até 60 | — | — |
| `STRATEGY` | — | descrição | `used_by_scale` |
| `EXTERNAL_TOOL` | categoria, opcional, até 60 | observação da condição | `negotiated_monthly_cents` |
| `CHANNEL` | tipo, obrigatório: `prop` ou `terc` | o que a loja informa, obrigatório | — |

Campo que não pertence à lista é recusado (400 `VALIDATION_ERROR`).

### Estados

```text
ativo ──desativar──▶ desativado ──reativar──▶ ativo
  │                       │
  └──excluir (sem uso)────┴──▶ excluído (deleted_at preenchido; some de todas as telas)
```

"Em uso" = existe `store_catalog_entries` para o item, ou alguma loja tem `demand_system_id` igual ao item. A contagem de lojas considera só lojas não excluídas.

### Dados existentes (na migration)

- Mobiliário de tipo `gondola` ou `expositor`: `self_service = true`.
- Mobiliário sem ícone recebe o ícone inicial do seu tipo:

  | Tipo | Ícone |
  | --- | --- |
  | `gondola` | `shelving` |
  | `checkout` | `scan-barcode` |
  | `balcao` | `counter` |
  | `frio` | `refrigerator` |
  | `expositor` | `display-stand` |
  | `sala` | `door-open` |
  | `outro` | `package` |

- Estratégia com descrição terminada em ` · usada no módulo Escala` (sem diferença de maiúsculas): `used_by_scale = true`, e o sufixo sai da descrição.

O seed `20261101120000_configuracoes_atributos.sql` repete essas regras por id, de forma idempotente, com o ícone específico de cada item de exemplo (por exemplo, Totem digital usa `monitor`).

## `audit_entity` (enum alterado)

Ganha o valor `CATALOG_ITEM`. Os eventos usam `entity_type = 'CATALOG_ITEM'`, `entity_id = catalog_items.id` e `economic_group_id = NULL`.

| `action` | `summary` (exemplo) |
| --- | --- |
| `CATALOG_ITEM_CREATED` | `Mobiliário · Expositor de vitaminas: incluído` |
| `CATALOG_ITEM_UPDATED` | `Serviços · Aferição de Glicemia: Nome: Aferição de Glicemia → Teste de glicemia` |
| `CATALOG_ITEM_MOVED` | `Serviços · Vacinação: subiu para a posição 1` |
| `CATALOG_ITEM_DEACTIVATED` | `PBMs · VIDALINK: desativado` |
| `CATALOG_ITEM_REACTIVATED` | `PBMs · VIDALINK: reativado` |
| `CATALOG_ITEM_DELETED` | `Serviços · Teste: excluído` |

## Sem mudança

`store_catalog_entries`, `stores.demand_system_id`, `store_history` e `store_custom_entries` continuam iguais. A regra de gravação da loja muda no serviço (research R5), não no banco.
