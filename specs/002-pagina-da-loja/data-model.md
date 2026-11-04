# Data Model — 002 Página da loja

Segue o padrão de 001:
- PK UUIDv7;
- instantes em `timestamptz(3)`;
- `pt_br` nas colunas de texto exibido;
- dinheiro em **centavos** (`integer`);
- RLS em toda tabela do tenant.

## stores (amplia 001) — migration P1 e P2

| Coluna | Tipo | Regra / camada |
|---|---|---|
| name | text | **apelido** (dado básico) |
| street ← `address` (renomeada) | text | Receita · logradouro (solicitação "endereço") |
| number, district, zip | text NULL | Receita (solicitação "endereço"). CEP com 8 dígitos |
| city, uf | já existem | Receita (solicitação "endereço") |
| legal_name, state_registration | text NULL | Receita (solicitação "CNPJ") |
| cnpj | já existe | Receita (solicitação "CNPJ") |
| brand_id | já existe | bandeira (solicitação "bandeira"). A nova marca precisa estar ativa |
| tax_regime | enum `tax_regime` (SIMPLES, PRESUMIDO, REAL) NULL | solicitação "regime" |
| store_category, affiliated_network | text NULL | dado básico |
| opened_at | já existe | data de inauguração · dado básico |
| trade_name | text NULL | dado básico |
| phone1, phone2, whatsapp, delivery_phone | text NULL (10–11 dígitos) | dado básico |
| email | text NULL | dado básico |
| owner_mobile, owner_personal_email | text NULL | **só o grupo edita**; o Analista recebe mascarado |
| pop_zip, pop_street, pop_number, pop_district, pop_complement, pop_city, pop_uf | NULL | endereço popular · dado básico |
| own_building | boolean NULL | estrutura (P2) |
| area_m2, sales_area_m2, staff_count | integer NULL (> 0) | estrutura (P2) |
| demand_system_id | uuid NULL → catalog_items (kind DEMAND_SYSTEM) | estrutura (P2) |
| no_external_tools | boolean default false | ferramentas (P3) |
| validated_at, validated_by | timestamptz NULL, text NULL | validação semestral |
| validation_reminded_at | timestamptz NULL | última cobrança |
| completeness_filled, completeness_total | integer | recalculados pelo service |
| version | integer default 1 | conflito de edição |

## store_opening_hours (P2) — RLS `store_visible`
`store_id`, `day` (enum MON…SUN, HOLIDAY; único por loja), `is_open`, `opens_at` e `closes_at` (`time` NULL), `is_24h`, `is_on_call`.

CHECK: se `is_open` e não `is_24h`, então `opens_at` e `closes_at` são obrigatórios e `closes_at > opens_at`.

## catalog_items — plataforma, sem RLS
`kind` (enum), `name`, `group_label` NULL, `description` NULL, `negotiated_monthly_cents` NULL, `sort`, `active`. Único (`kind`, `name`).

## store_catalog_entries — RLS `store_visible`
`store_id`, `catalog_item_id`, `uses` boolean NULL (NULL = não informado), `identifier` text NULL, `monthly_cost_cents` int NULL, `quantity` int NULL, `trade_quantity` int NULL, `since` date NULL.

Único (`store_id`, `catalog_item_id`). CHECK: `trade_quantity <= quantity`.

Para serviços, boas práticas, PBM e estratégias, a existência da linha = marcado.

## store_custom_entries (P3) — RLS `store_visible`
`store_id`, `kind` (EXTERNAL_TOOL | CHANNEL), `name`, `category` NULL, `identifier` NULL, `monthly_cost_cents` NULL, `deleted_at`.

## store_free_sections / store_free_fields (P2) — RLS `store_visible`
- Seção: `store_id`, `title`, `created_by`, `sort`, `deleted_at`.
- Campo: `section_id`, `label`, `value`, `sort`.

## store_change_requests (P1) — RLS direto (economic_group_id) + store
`store_id`, `economic_group_id`, `type` (CNPJ | ADDRESS | BRAND | TAX_REGIME), `origin` (PLATFORM | TENANT), `requested_by` (subject), `requested_values` jsonb (validado por Zod por tipo), `effective_date` date, `justification`, `current_step` int, `status` (OPEN | EFFECTIVE | REJECTED | CONTESTED | CANCELLED), `closed_note` NULL, `version`, `created_at`, `updated_at`.

Índice único parcial (`store_id`, `type`) WHERE `status = 'OPEN'` (uma aberta por tipo).

## store_change_request_events (P1) — RLS `store_visible` via request
`request_id`, `step_index`, `action` (OPENED | STEP_DONE | REJECTED | CONTESTED | CANCELLED | EFFECTIVE), `actor_kind`, `actor_subject`, `note` NULL, `created_at`. Somente acréscimo.

## store_documents (P1) — RLS direto + store
`store_id`, `economic_group_id`, `doc_type` (enum: CNPJ_CARD, OPERATING_PERMIT, SANITARY_LICENSE, AFE, CRF, ASSOCIATION_CONTRACT, ADDRESS_PROOF, ARTICLES, OPTION_TERM), `request_id` NULL, `file_name`, `mime_type`, `size_bytes`, `valid_until` date NULL, `uploaded_by_kind`, `uploaded_by`, `superseded_at` NULL, `created_at`.

O documento vigente de cada tipo é o último não substituído.

## store_document_files (P1) — RLS `store_visible` via document
`document_id` (PK/FK), `content` bytea.

## store_history (P1) — somente acréscimo, RLS direto
`store_id`, `economic_group_id`, `kind` (EDIT | REQUEST | DOCUMENT | VALIDATION | REMINDER), `field_key` NULL, `field_label`, `old_value` NULL, `new_value` NULL, `justification` NULL, `request_id` NULL, `actor_kind`, `actor_subject`, `actor_role`, `created_at`.

O usuário da aplicação só tem `INSERT` e `SELECT`.

## Regras derivadas
- **Preenchimento**: 30 itens (US4). Grava `filled/total`. Faixas: 100 | 80–99 | < 80.
- **Validação**: `ok` se `validated_at + 6 meses > hoje + 30 dias`; `due_soon` se faltam 30 dias ou menos; `overdue` se já passou; `never` se nunca validou.
- **Status do documento**: `valid`; `due_soon` (≤ 30 dias); `expired`; `missing`. Documentos obrigatórios para o preenchimento: OPERATING_PERMIT, SANITARY_LICENSE, AFE e CRF.
- **Economia de ferramenta**: `max(0, custo − negociado) × 12`, somada para as ferramentas em uso com negociação.
