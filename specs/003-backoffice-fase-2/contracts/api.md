# Contrato HTTP — Backoffice fase 2

Prefixo do operador: `/api/v1/backoffice`. Prefixo do grupo: `/api/v1/tenant`.

Regras gerais:
- Erros no formato `{ error: { code, message, details } }`.
- Listas paginadas com `{ data, meta: { page, pageSize, total } }`.
- Toda escrita é só do `PLATFORM_ADMIN`. Para o analista, a resposta é 403 `FORBIDDEN`.
- Justificativas e motivos têm de 5 a 500 caracteres.

## Fatia 0 — Início

### `GET /home/map`

Leitura para os dois papéis da plataforma. Não traz dado de pessoa.

```json
{
  "totals": { "stores": 1812, "groups": 498, "groupsWithOwner": 186 },
  "regions": [{ "region": "SE", "stores": 1011, "groups": 281, "groupsWithOwner": 108 }],
  "ufs": [
    {
      "uf": "SP",
      "stores": 586,
      "groups": 162,
      "groupsWithOwner": 64,
      "cities": 118,
      "topCities": [{ "city": "São Paulo", "stores": 148 }],
      "brands": [{ "name": "Rede Aurora", "stores": 223 }],
      "topGroups": [{ "number": 417, "name": "Grupo Aurora Norte", "stores": 34 }]
    }
  ]
}
```

Detalhes da resposta:
- `ufs` e `regions` trazem só os estados e as regiões com presença. Um grupo com lojas em vários estados conta uma vez em cada estado, uma vez na região e uma vez no Brasil.
- `topCities` traz até 4 cidades, `topGroups` até 3 grupos e `brands` todas as marcas, em ordem decrescente.

## Fatia 1 — Funcionários e Anjo

| Método e rota | Corpo / query | Resposta e erros |
|---|---|---|
| `GET /employees` | `page, pageSize, search, area, accessRole, status` | lista de funcionários com `portfolioCount` |
| `GET /employees/stats` | — | `{ active, angels, angelGroups, groupsWithoutAngel, admins }` |
| `GET /employees/:id` | — | funcionário + `portfolio[]`. 404 `EMPLOYEE_NOT_FOUND` |
| `POST /employees` | `{ name, email, phone?, area, jobTitle, accessRole }` | 201. 409 `EMPLOYEE_EMAIL_TAKEN` |
| `PATCH /employees/:id` | campos acima, todos opcionais | 200. 409 `EMPLOYEE_EMAIL_TAKEN` |
| `POST /employees/:id/status` | `{ action: 'terminate' \| 'rehire', justification }` | 200. 409 `EMPLOYEE_HAS_PORTFOLIO`, `INVALID_STATUS_TRANSITION` |
| `GET /employees/:id/audit-events` | `page, pageSize` | histórico do funcionário |
| `PUT /economic-groups/:number/angel` | `{ employeeId: string \| null }` | grupo atualizado. 409 `EMPLOYEE_NOT_ACTIVE`, `GROUP_ARCHIVED` |
| `POST /economic-groups/bulk-angel` | `{ numbers: number[1..200], employeeId }` | `{ changed, skipped }` |

Mudanças em rotas que já existem:
- `GET /economic-groups` aceita `angelId` e `withoutAngel=true` (sem Anjo e não arquivado, a mesma conta do indicador "Grupos sem Anjo"). Cada item traz `angel` e o selo `NO_ANGEL` (grupo arquivado não leva o selo).
- `GET /stores` aceita `angelId`. Cada item traz `angel`.
- A página da loja (`GET /stores/:code`, nos dois caminhos) traz `angel`.

## Fatia 2 — Parceiros, etapa e bloqueio

| Método e rota | Corpo / query | Resposta e erros |
|---|---|---|
| `GET /partners` | `page, pageSize, type, search, status` | lista com `primaryContact`, `contactCount` |
| `GET /partners/stats` | — | `{ active, industries, distributors, withoutPrimaryContact, byType: { all, industry, distributor } }` |
| `GET /partners/:id` | — | parceiro + `contacts[]`. 404 `PARTNER_NOT_FOUND` |
| `POST /partners` | `{ type, cnpj, legalName, tradeName }` | 201. 409 `PARTNER_CNPJ_TAKEN`. 400 CNPJ inválido |
| `PATCH /partners/:id` | campos acima, opcionais | 200 |
| `POST /partners/:id/status` | `{ action: 'inactivate' \| 'reactivate', justification }` | 200. 409 `INVALID_STATUS_TRANSITION` |
| `POST /partners/:id/contacts` | `{ name, jobTitle?, email?, phone?, isPrimary? }` | 201. 400 sem e-mail nem telefone |
| `PATCH /partners/:id/contacts/:contactId` | campos acima, opcionais | 200. Marcar `isPrimary` tira o principal anterior |
| `DELETE /partners/:id/contacts/:contactId` | — | 204 |
| `GET /partners/:id/audit-events` | `page, pageSize` | histórico do parceiro |
| `PATCH /stores/:code/stage` | `{ stage, openedAt?, justification? }` | 200. 400 `VALIDATION_ERROR` com `details` em `openedAt` (Inaugurada sem data) ou `justification` (voltar sem motivo). 409 `STAGE_UNCHANGED` |
| `POST /stores/:code/block` | `{ justification }` | 200. 409 `STORE_ALREADY_BLOCKED` |
| `POST /stores/:code/unblock` | `{ justification }` | 200. 409 `STORE_NOT_BLOCKED` |

Mudanças em rotas que já existem:
- `GET /stores` aceita `stage`, `blocked=true|false` e `outdated=true`. Cada item traz `stage`, `isBlocked`, `blockedAt`, `blockedReason` e `isOutdated`. A página da loja da Farmarcas traz `stage` e `block: { at, reason, by } | null`.
- Criar loja aceita `stage` (padrão `PROSPECTING`).
- Lado do grupo: qualquer rota da página da loja com loja bloqueada responde 403 `STORE_BLOCKED`, com `{ blockedAt }` em `details`.
- `GET /tenant/stores` traz `isBlocked`.

## Fatia 3 — Titularidade, Alelo, lote e exportação

| Método e rota | Corpo / query | Resposta e erros |
|---|---|---|
| `POST /economic-groups/:number/owner-transfer` | `{ name, email, phone, justification }` | grupo com proprietário novo. 409 `GROUP_ARCHIVED`, `GROUP_HAS_NO_OWNER` |
| `PUT /economic-groups/:number/benefit-card` | `{ holderName, holderCpf, holderBirthDate, cardNumber, storeCode }` | cartão (visão por papel). 400 CPF inválido. 409 `STORE_NOT_ACTIVE`, `STORE_NOT_IN_GROUP` |
| `POST /stores/bulk` | `{ action: 'BLOCK' \| 'UNBLOCK', codes: number[1..200], justification }` | `{ changed, skipped }` |
| `GET /stores/export` | filtros da lista | `text/csv; charset=utf-8` |
| `GET /economic-groups/export` | filtros da lista | idem |
| `GET /employees/export` | filtros da lista | idem |
| `GET /partners/export` | filtros da lista | idem |

Detalhes da Fatia 3:
- O detalhe do grupo traz `benefitCard`:
  - Administrador: `{ holderName, holderCpfMasked, holderBirthDate, cardLast4, store: { code, name, status } }`.
  - Analista: `{ holderPseudonym, store }`.
  - Sem cartão: `null`.
- Os arquivos CSV usam `;`, começam com BOM UTF-8 e se chamam, por exemplo, `lojas-2026-10-31.csv` (`Content-Disposition`). O teto é de 5.000 linhas, com 413 `EXPORT_TOO_LARGE` acima disso.
