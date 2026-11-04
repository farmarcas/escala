# Data Model — 001 Backoffice cadastros

PK: UUIDv7 em todas as tabelas (padrão de `users`). Instantes em `timestamptz(3)`. Texto exibido a pessoas usa a collation `pt_br`. A chave de tenant é `economic_group_id`.

## brands — catálogo de plataforma (sem tenant)
| Coluna | Tipo | Regra |
|---|---|---|
| id | uuid PK | |
| name | text COLLATE pt_br | obrigatório, 2–60 caracteres |
| normalized_name | text | sem acento e em minúsculas. Único parcial `WHERE deleted_at IS NULL` |
| status | enum `brand_status` (`ACTIVE`, `HISTORICAL`) | padrão `ACTIVE` |
| created_at, updated_at, deleted_at | timestamptz | exclusão lógica só com 0 lojas |

## economic_groups — o tenant
| Coluna | Tipo | Regra |
|---|---|---|
| id | uuid PK | é o `tenant_id` |
| number | int, único, sequência | emitido ao criar, imutável, exibido com 4 dígitos |
| name | text COLLATE pt_br | obrigatório |
| legal_name | text COLLATE pt_br | obrigatório |
| cnpj | char(14) | CNPJ válido da matriz |
| status | enum `group_status` (`ACTIVE`, `SUSPENDED`, `ARCHIVED`) | padrão `ACTIVE` |
| created_at, updated_at, deleted_at | timestamptz | `deleted_at` reservado; grupo não é excluído |

Transições de status (sempre com justificativa):

| Ação | De | Para |
|---|---|---|
| suspend | ACTIVE | SUSPENDED |
| archive | ACTIVE, SUSPENDED | ARCHIVED |
| restore | SUSPENDED, ARCHIVED | ACTIVE |

## group_owners — PII, tenant-owned, RLS
| Coluna | Tipo | Regra |
|---|---|---|
| id | uuid PK | |
| economic_group_id | uuid FK, NOT NULL | único parcial (1 proprietário ativo por grupo) |
| name | text COLLATE pt_br | PII |
| email | text | PII, e-mail válido |
| phone | text | PII, só dígitos (10–11) |
| pseudonym | text, único | `F-XXXXX`, estável |
| created_at, updated_at, deleted_at | timestamptz | |

## stores — tenant-owned, RLS
| Coluna | Tipo | Regra |
|---|---|---|
| id | uuid PK | |
| code | int, único, sequência | exibido como `LJ-NNN` |
| economic_group_id | uuid FK, NOT NULL | índice |
| brand_id | uuid FK, NOT NULL | precisa estar `ACTIVE` ao criar |
| name | text COLLATE pt_br | obrigatório |
| type | enum `store_type` (`PDV`, `CD`) | |
| cnpj | char(14) | válido; único parcial `WHERE deleted_at IS NULL` |
| address | text COLLATE pt_br | obrigatório |
| city | text COLLATE pt_br | obrigatório |
| uf | char(2) | uma das 27 UFs |
| opened_at | date, NULL | opcional |
| status | enum `store_status` (`PENDING`, `ACTIVE`, `INACTIVE`) | padrão `PENDING` |
| created_at, updated_at, deleted_at | timestamptz | |

Regra: grupo `ARCHIVED` não recebe loja nova (409 `GROUP_ARCHIVED`).

## audit_events — append-only, RLS
| Coluna | Tipo | Regra |
|---|---|---|
| id | uuid PK | |
| economic_group_id | uuid FK, NULL | NULL só para evento de catálogo (marca) |
| action | text | ex.: `GROUP_CREATED`, `GROUP_SUSPENDED`, `STORE_CREATED`, `BRAND_RENAMED`, `OWNER_VIEWED` |
| summary | text | frase pt-BR exibida na trilha |
| actor_subject | text | identificador do ator (ex.: `OP-02`) |
| actor_role | text | `PLATFORM_ADMIN`, `PLATFORM_ANALYST` |
| justification | text, NULL | obrigatória nas mudanças de status |
| created_at | timestamptz | sem update nem delete. O usuário `app_runtime` só tem permissão de `INSERT`/`SELECT` |

## RLS (tabelas tenant-owned)
```
ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_operator ON <t> USING (current_setting('app.actor_kind', true) = 'platform')
                                        WITH CHECK (current_setting('app.actor_kind', true) = 'platform');
CREATE POLICY tenant_isolation  ON <t> USING (economic_group_id::text = current_setting('app.tenant_id', true))
                                        WITH CHECK (economic_group_id::text = current_setting('app.tenant_id', true));
```
- `economic_groups` também tem RLS: o tenant enxerga só a própria linha (`id = app.tenant_id`).
- `brands` não tem RLS, porque é catálogo.

## Derivados (consulta, não gravados)
- **Do grupo**: total de lojas, PDV/CD, ativas/inativas, marcas distintas com contagem, UFs distintas com contagem e o selo "Sem proprietário".
- **Da marca**: número de lojas e de grupos distintos.
- **KPIs de grupos**: total por status, lojas (PDV/CD), UFs cobertas, grupos com proprietário, grupos multimarca (≥ 2 marcas).
