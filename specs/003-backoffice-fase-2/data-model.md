# Data Model: Backoffice Farmarcas — fase 2

PK UUIDv7 gerada pela aplicação, `created_at`/`updated_at` em `timestamptz(3)`. Exclusão lógica por `deleted_at` onde houver exclusão. Collation e índices parciais no SQL da migration, como em 001 e 002.

## Fatia 1

### `farmarcas_employees` (dado da plataforma)

| Coluna | Tipo | Regra |
|---|---|---|
| id | uuid | PK |
| name | text | obrigatório |
| email | text | obrigatório, único (sem diferenciar maiúsculas) entre não excluídos. O formato é validado na API |
| phone | text? | só dígitos, 10 ou 11 |
| area | enum `employee_area` | `COMMERCIAL`, `MEMBER_FINANCE`, `TRADE`, `DIGITAL_PRODUCTS`, `MEMBER_SUCCESS`, `OPERATIONS` |
| job_title | text | obrigatório |
| access_role | enum `employee_access_role` | `PLATFORM_ADMIN`, `PLATFORM_ANALYST`, `NONE` |
| status | enum `employee_status` | `ACTIVE`, `TERMINATED` |
| terminated_at | timestamptz? | preenchido ao desligar e limpo ao religar |
| deleted_at, created_at, updated_at | | |

RLS:
- `platform_operator`: tudo para a plataforma.
- `tenant_angel`: só SELECT, e só quando `id = (SELECT angel_employee_id FROM economic_groups WHERE id::text = current_setting('app.tenant_id', true))`.

Transições de `status`:
- `ACTIVE → TERMINATED`: exige motivo e carteira vazia.
- `TERMINATED → ACTIVE`: exige motivo.

### `economic_groups` (+)

| Coluna | Tipo | Regra |
|---|---|---|
| angel_employee_id | uuid? | FK `farmarcas_employees`. Só funcionário `ACTIVE` pode ser escolhido (regra na API) |

Índice em `angel_employee_id` para a carteira e o filtro.

### `audit_events` (+)

| Coluna | Tipo | Regra |
|---|---|---|
| entity_type | enum `audit_entity`, opcional | `GROUP`, `EMPLOYEE`, `PARTNER`. Backfill: `GROUP` onde há grupo. Eventos de marca ficam sem registro (nulo) |
| entity_id | uuid, opcional | backfill: `economic_group_id`. Índice `(entity_type, entity_id, created_at)` |

## Fatia 2

### `partners` (dado da plataforma)

| Coluna | Tipo | Regra |
|---|---|---|
| id | uuid | PK |
| type | enum `partner_type` | `INDUSTRY`, `DISTRIBUTOR` |
| cnpj | char(14) | válido, único entre não excluídos |
| legal_name | text | obrigatório |
| trade_name | text | obrigatório |
| status | enum `partner_status` | `ACTIVE`, `INACTIVE` |
| deleted_at, created_at, updated_at | | não há exclusão pela tela |

### `partner_contacts`

| Coluna | Tipo | Regra |
|---|---|---|
| id | uuid | PK |
| partner_id | uuid | FK `partners` |
| name | text | obrigatório |
| job_title | text? | |
| email | text? | pelo menos um entre e-mail e telefone |
| phone | text? | |
| is_primary | boolean | no máximo 1 por parceiro (índice único parcial `WHERE is_primary AND deleted_at IS NULL`) |
| deleted_at, created_at, updated_at | | remover contato = `deleted_at` |

RLS das duas tabelas: só `platform_operator`.

### `stores` (+)

| Coluna | Tipo | Regra |
|---|---|---|
| stage | enum `store_stage` | `PROSPECTING`, `SETUP`, `OPENED`. Default `PROSPECTING`. Backfill: `OPENED` se `opened_at` existe |
| blocked_at | timestamptz? | não nulo = bloqueada |
| blocked_reason | text? | obrigatório quando bloqueada (CHECK) |
| blocked_by | text? | sujeito de quem bloqueou |

Transições de `stage` (puras, `stage.ts`):
- Avançar (`PROSPECTING → SETUP → OPENED`, ou pular etapa): livre.
- `→ OPENED`: exige `openedAt`.
- Voltar: exige justificativa.

## Fatia 3

### `group_owners`

Sem mudança de estrutura. A transferência marca `deleted_at` no proprietário atual e cria o novo. A regra "1 proprietário ativo por grupo" vira índice único parcial `(economic_group_id) WHERE deleted_at IS NULL`, se ainda não existir.

### `group_benefit_cards` (tenant)

| Coluna | Tipo | Regra |
|---|---|---|
| id | uuid | PK |
| economic_group_id | uuid | FK, único (1 cartão por grupo) |
| store_id | uuid | FK `stores`, do mesmo grupo e `ACTIVE` na gravação |
| holder_name | text | obrigatório |
| holder_cpf | char(11) | CPF válido |
| holder_birth_date | date | no passado |
| holder_pseudonym | text | único, gerado pela API (mesmo formato do proprietário) |
| card_number | text | 13 a 19 dígitos. Nunca devolvido inteiro |
| created_at, updated_at | | |

RLS igual às tabelas do tenant (`platform_operator` + `tenant_isolation`).

## Visões devolvidas pela API (resumo)

- **Funcionário:** `id, name, email, phone, area, jobTitle, accessRole, status, terminatedAt, portfolioCount`. O detalhe acrescenta `portfolio[{ number, name, status, storeCount }]`.
- **Anjo no grupo, na loja e na página da loja:** `angel: { id, name, jobTitle, email, phone } | null`. No lado do grupo vêm os mesmos campos (pessoa da Farmarcas).
- **Parceiro:** `id, type, cnpj, legalName, tradeName, status, primaryContact, contactCount`. O detalhe traz `contacts[]`.
- **Loja:** acrescenta `stage, isBlocked, blockedAt, blockedReason, isOutdated, angel`.
- **Cartão Alelo:**
  - Administrador: `{ holderName, holderCpfMasked, holderBirthDate, cardLast4, store }`.
  - Analista: `{ holderPseudonym, cardLast4: null, store }`.

## Fatia 0 — Início

Sem tabela nova. A rota `GET /home/map` lê `stores`, `economic_groups`, `group_owners` e `brands` pelo caminho do operador.

Regra de contagem:
- Entram as lojas com `deleted_at IS NULL` e `status <> 'INACTIVE'`, de grupos com `status <> 'ARCHIVED'`.
- Um grupo conta num estado quando tem pelo menos uma dessas lojas lá.
- "Com proprietário" é o grupo com proprietário não excluído.

A resposta está em [contracts/api.md](contracts/api.md).
