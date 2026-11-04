# Contrato HTTP — Página da loja

As mesmas rotas existem nos dois caminhos. `{base}` é:
- `/api/v1/backoffice` — identidade de plataforma;
- `/api/v1/tenant` — identidade de tenant. Loja de outro grupo responde 404 `STORE_NOT_FOUND`, pelo RLS.

`:code` é o código numérico da loja (`LJ-002` → `2`). Convenções e formato de erro iguais a 001.

As escritas de dados da loja exigem `expectedVersion`. Versão diferente responde 409 `STORE_VERSION_CONFLICT`.

## Área do grupo e demonstração
| Método | Rota | Resposta |
|---|---|---|
| GET | `/api/v1/tenant/me` | `{ subject, role, group: { number, name, status } }` |
| GET | `/api/v1/tenant/stores` | lojas do grupo (com preenchimento, validação e alertas) |
| GET | `/api/v1/demo/tenants` | `{ id, number, name }[]`. **Só existe com DEMO_IDENTITY_ENABLED** |

## Página
| Método | Rota | Corpo | Notas |
|---|---|---|---|
| GET | `{base}/stores/:code` | — | cabeçalho, dados por camada, estrutura (P2), `fieldMeta` ("alterado em/por"), `governance` (`filled/total/missing[]`, `validation{status, validatedAt, by, dueAt, remindedAt}`), `permissions` (o que este lado pode fazer), `version` |
| PATCH | `{base}/stores/:code` | `{ expectedVersion, reason?, basic?: {...}, structure?: {...}, hours?: [...], selections?: {...}, freeSections?: [...] }` | recusa campo de camada sensível (400 `FIELD_REQUIRES_REQUEST`). Plataforma sem `reason`: 400 `REASON_REQUIRED`. Plataforma em campo privado do proprietário: 403 |
| POST | `{base}/stores/:code/validation` | `{ expectedVersion }` | só tenant. Exige 100% preenchido (409 `INCOMPLETE`) |
| POST | `{base}/stores/:code/validation-reminders` | — | só plataforma admin. Recusa se a validação está em dia (409 `VALIDATION_UP_TO_DATE`) |

## Solicitações (P1)
| Método | Rota | Corpo | Erros |
|---|---|---|---|
| GET | `{base}/stores/:code/change-requests?status=OPEN\|ALL` | — | |
| POST | `{base}/stores/:code/change-requests` | `{ type, values, effectiveDate, justification, documentIds[] }` | 409 `REQUEST_ALREADY_OPEN`, 409 `STORE_CNPJ_TAKEN`, 409 `BRAND_INACTIVE`, 400 por tipo |
| POST | `{base}/change-requests/:id/actions` | `{ action: advance\|reject\|contest\|cancel, note?, expectedVersion }` | 403 `NOT_YOUR_STEP`, 409 `DOCS_MISSING`, 400 `REASON_REQUIRED`, 409 `REQUEST_VERSION_CONFLICT` |
| POST | `{base}/change-requests/:id/documents` | multipart `file`, `docType` | igual aos documentos |

## Documentos (P1 parcial, P3 completo)
| Método | Rota | Corpo | Erros |
|---|---|---|---|
| GET | `{base}/stores/:code/documents` | — | |
| POST | `{base}/stores/:code/documents` | multipart `file`, `docType`, `validUntil?` | 413 `FILE_TOO_LARGE`, 415 `FILE_TYPE_NOT_ALLOWED`, 403 se o lado não envia esse tipo |
| GET | `{base}/stores/:code/documents/:id/file` | — | arquivo com `Content-Disposition` |

## Catálogos e respostas (P2/P3)
| Método | Rota | Notas |
|---|---|---|
| GET | `{base}/catalog?kind=` | itens do catálogo |
| PUT | `{base}/stores/:code/furniture/:itemId` | `{ quantity, tradeQuantity, expectedVersion }`. 400 `TRADE_EXCEEDS_TOTAL` |
| PUT | `{base}/stores/:code/tools/:itemId` | só tenant · `{ uses, monthlyCost }` |
| POST/DELETE | `{base}/stores/:code/custom-entries` | só tenant · ferramenta ou canal próprio |
| PUT | `{base}/stores/:code/channels/:itemId` | só tenant · `{ uses, identifier }` |
| PUT | `{base}/stores/:code/no-external-tools` | só tenant · `{ value }` |
| PUT | `{base}/stores/:code/strategies` | só tenant · `{ itemIds[] }` (mantém o `since` das que continuam) |

## Histórico e responsáveis
| Método | Rota | Notas |
|---|---|---|
| GET | `{base}/stores/:code/history?kind=EDIT\|REQUEST\|DOCUMENT&page=` | autor do grupo vira o nome do proprietário; para o Analista, o pseudônimo |
| GET | `{base}/stores/:code/responsibles` | proprietário (mascarado conforme o papel) + avisos do que ainda não existe |

## Lista de Lojas (Backoffice, amplia 001)
`GET /api/v1/backoffice/stores` ganha:
- filtros `completeness=complete|partial|low`, `validation=ok|due_soon|overdue|never` e `hasOpenRequest=true`;
- campos `completeness`, `validation`, `docAlerts` e `openRequests` em cada linha.

`GET /stores/stats` ganha `avgCompleteness`, `validationAttention`, `docAlerts{docs, stores}` e `openRequests{requests, stores}`.
