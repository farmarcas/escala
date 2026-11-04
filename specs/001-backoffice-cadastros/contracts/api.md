# Contrato HTTP — Backoffice (operador)

Prefixo: `/api/v1/backoffice`. Toda rota exige identidade de plataforma. Identidade de tenant recebe 403 `FORBIDDEN`. Escrita exige `PLATFORM_ADMIN`.

No ambiente local, a identidade vem do cabeçalho `x-demo-role: admin | analyst`.

As convenções seguem o `BACKEND.md`:
- Erro: `{ error: { code, message, details } }`.
- Listas: `{ data, meta: { page, pageSize, total } }`.
- JSON em camelCase e datas em ISO 8601 UTC.
- O CNPJ trafega só com dígitos.

## Marcas
| Método | Rota | Corpo / query | Resposta | Erros |
|---|---|---|---|---|
| GET | `/brands` | `status?`, `page`, `pageSize` | `{ id, name, status, storeCount, groupCount, createdAt }[]` | |
| GET | `/brands/stats` | | `{ active, historical, withoutStores }` | |
| POST | `/brands` | `{ name }` | 201 marca | 409 `BRAND_NAME_TAKEN` |
| PATCH | `/brands/:id` | `{ name?, status? }` | 200 marca | 404 `BRAND_NOT_FOUND`, 409 `BRAND_NAME_TAKEN` |
| DELETE | `/brands/:id` | | 204 | 409 `BRAND_HAS_STORES` |

## Grupos econômicos (`:number` = número do GE)
| Método | Rota | Corpo / query | Resposta | Erros |
|---|---|---|---|---|
| GET | `/economic-groups` | `status?`, `search?`, `uf?`, `brandId?`, `page`, `pageSize` | linha: `{ number, name, legalName, status, owner, storeCount, pdvCount, cdCount, brands[], ufs[], badges[] }` | |
| GET | `/economic-groups/stats` | | `{ byStatus:{all,active,suspended,archived}, stores:{total,pdv,cd}, ufCount, withOwner, multiBrand }` | |
| POST | `/economic-groups` | `{ name, legalName, cnpj, owner?: { name, email, phone } }` | 201 detalhe | 400 CNPJ inválido |
| GET | `/economic-groups/:number` | | detalhe: os campos da linha + `cnpj`, `owner`, `brandsBreakdown[]`, `ufsBreakdown[]`, `activeStores`, `inactiveStores` | 404 `GROUP_NOT_FOUND` |
| PATCH | `/economic-groups/:number` | `{ name?, legalName?, cnpj?, owner? }` (`number` não aceito) | 200 | 404 |
| POST | `/economic-groups/:number/status-changes` | `{ action: suspend\|archive\|restore, justification }` | 200 detalhe | 409 `INVALID_STATUS_TRANSITION`, 400 justificativa vazia |
| GET | `/economic-groups/:number/stores` | `type?`, `search?`, `page`, `pageSize` | lojas do grupo | 404 |
| POST | `/economic-groups/:number/stores` | `{ name, type, cnpj, brandId, address, city, uf, openedAt? }` | 201 loja (`status: PENDING`) | 409 `STORE_CNPJ_TAKEN`, 409 `BRAND_INACTIVE`, 409 `GROUP_ARCHIVED` |
| GET | `/economic-groups/:number/audit-events` | `page`, `pageSize` | `{ id, at, action, summary, actorSubject, actorRole, justification }[]` | 404 |

`owner` na resposta:
- `PLATFORM_ADMIN`: `{ name, email, phone, pseudonym }`.
- `PLATFORM_ANALYST`: `{ pseudonym }` apenas.
- Sem proprietário: `null`.

## Lojas (rede inteira)
| Método | Rota | Corpo / query | Resposta | Erros |
|---|---|---|---|---|
| GET | `/stores` | `search?`, `brandId?`, `uf?`, `type?`, `status?`, `page`, `pageSize` | `{ id, code, groupNumber, groupName, brand, name, type, cnpj, city, uf, openedAt, status }[]` | |
| GET | `/stores/stats` | | `{ total, pdv, cd, active, pending, inactive, groups }` | |
| PATCH | `/stores/:id` | `{ status: ACTIVE\|INACTIVE }` | 200 | 404 `STORE_NOT_FOUND` |

## Geral
- `GET /api/v1/backoffice/me` devolve `{ subject, role, kind }`, usado pelo TopBar.
- Todas as escritas geram `audit_events` na mesma transação.
