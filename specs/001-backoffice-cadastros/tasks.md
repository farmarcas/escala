# Tasks: Backoffice Farmarcas — cadastros de grupos, lojas e marcas

**Input**: `specs/001-backoffice-cadastros/` (plan, spec, research, data-model, contracts/api.md, quickstart)

**Tests**: incluídos. FR-058 exige teste de isolamento, e a skill `node-api-development` exige TDD nos services.

Caminhos: API em `backend/node/`, tela em `frontend/react/`.

## Phase 1: Setup

- [x] T001 Adicionar o usuário de banco `app_runtime` (não dono das tabelas):
  - Script de init em `infrastructure/docker/postgres-init/01-app-runtime.sh`, montado em `docker-entrypoint-initdb.d`.
  - Em `docker-compose.yml`, a API passa a usar `DATABASE_URL` com `app_runtime`, e `MIGRATION_DATABASE_URL` com o dono para migrate e seed.
  - Novas variáveis em `.env.example`: `APP_DB_USER`, `APP_DB_PASSWORD`, `DEMO_IDENTITY_ENABLED=true`.
  - Seguir a skill `containerization`.
- [x] T002 Ajustar `backend/node/docker/dev-entrypoint.sh` e `prisma.config.ts`:
  - `prisma migrate deploy` usa `MIGRATION_DATABASE_URL`.
  - Depois do migrate, conceder a `app_runtime` (idempotente) `SELECT, INSERT, UPDATE` nas tabelas de domínio, só `SELECT, INSERT` em `audit_events` e `USAGE` nas sequências.
  - Cobrir também o volume já existente: criar o usuário se não existir, sem apagar dados.
- [x] T003 Adicionar `DEMO_IDENTITY_ENABLED` e `MIGRATION_DATABASE_URL` em `backend/node/src/config/env.ts`. Falhar ao subir se `NODE_ENV=production` e `DEMO_IDENTITY_ENABLED=true`.
- [x] T004 [P] Migrar `frontend/react` para TypeScript:
  - `tsconfig.json` com strict e alias `@/` → `src/`.
  - Renomear `main.jsx` para `main.tsx` e remover `App.jsx`.
  - Atualizar `vite.config.js` para `vite.config.ts` com o alias.
- [x] T005 [P] Adicionar ao `frontend/react/package.json`:
  - Dependências: `tailwindcss` + `@tailwindcss/vite`, `react-router-dom@6`, `clsx`, `tailwind-merge`.
  - Dev: `typescript`, `@types/react*`, `vitest`, `eslint` + `typescript-eslint` + `eslint-plugin-react-hooks`, `prettier`.
  - Scripts `lint`, `typecheck` e `test`. Gerar o lock dentro do container.
- [x] T006 [P] Criar `frontend/react/src/styles/globals.css`: `@import "tailwindcss"` e `@theme` com os tokens do Alquimia DS (`project/handoff/tokens.css`), mapeados para os nomes semânticos da skill.
  - `primary` = `#F25C05`.
  - `foreground` = `#061938`.
  - Fundo da página `#FAFBFC`.
  - Raios de 4, 6 e 8 px e 999px para pill.
  - Fonte Inter.
- [x] T007 [P] Criar `frontend/react/src/lib/cn.ts`, `src/lib/format.ts` (número, data, CNPJ e telefone em pt-BR, GE com 4 dígitos, `LJ-NNN`) e `src/lib/format.test.ts`.

## Phase 2: Foundational (bloqueia todas as histórias)

- [x] T010 Modelar no `backend/node/prisma/schema.prisma` os enums `brand_status`, `group_status`, `store_type`, `store_status` e os models `Brand`, `EconomicGroup`, `GroupOwner`, `Store`, `AuditEvent`, conforme `data-model.md`:
  - `number` e `code` com `@default(autoincrement())` e `@unique`.
  - CNPJ com `@db.Char(14)`.
  - UF com `@db.Char(2)`.
  - `openedAt` com `@db.Date`.
- [x] T011 Gerar a migration com `--create-only` em `backend/node/prisma/migrations/<ts>_backoffice_cadastros/migration.sql` e editar à mão:
  - Collation `pt_br` nas colunas de texto exibido.
  - Índices únicos parciais `WHERE deleted_at IS NULL`: `brands.normalized_name`, `stores.cnpj` e `group_owners.economic_group_id`.
  - RLS e políticas `platform_operator` e `tenant_isolation` em `economic_groups`, `group_owners`, `stores` e `audit_events`.
  - Aplicar e conferir.
- [x] T012 [P] Helpers puros com testes (TDD) em `backend/node/src/shared/br/`:
  - `cnpj.ts` + `cnpj.test.ts`: `isValidCnpj` e `onlyDigits`.
  - `uf.ts`: as 27 UFs.
  - `normalize-name.ts` + teste.
  - `pseudonym.ts` + teste: `F-XXXXX` com `[0-9A-Z]`.
- [x] T013 Camada de identidade em `backend/node/src/shared/identity/`:
  - `identity.ts`: tipos `Identity` e `IdentityProvider`.
  - `demo-identity-provider.ts`: lê `x-demo-role`; sem cabeçalho vale `PLATFORM_ANALYST`.
  - `identity.middleware.ts`: `req.identity`; recusa tudo se nenhum provedor estiver ligado.
  - `require-platform.ts`: `requirePlatform()` e `requirePlatformRole('PLATFORM_ADMIN')`.
  - `ForbiddenError` em `shared/errors/forbidden-error.ts`.
  - Tipar `req.identity` em `src/types/express.d.ts`.
- [x] T014 Criar `backend/node/src/shared/database/with-actor.ts`: `withActor(identity, fn)` abre uma `prisma.$transaction` e faz `set_config('app.actor_kind', …, true)` e `set_config('app.tenant_id', …, true)` antes de `fn(tx)`. Todo repository de tabela com RLS usa esse helper.
- [x] T015 Criar o módulo `backend/node/src/modules/audit/` com:
  - `audit.repository.ts`: `record(tx, event)` e `listByGroup`.
  - `audit.service.ts`.
  - `audit.schemas.ts`.

  A gravação acontece na mesma transação da escrita.
- [x] T016 Criar o router `backend/node/src/modules/backoffice/backoffice.routes.ts`:
  - Monta `/api/v1/backoffice` com `identity` + `requirePlatform()`.
  - Expõe `GET /me`.
  - Registrar em `src/app.ts`.
- [x] T017 Teste de isolamento (gate) em `backend/node/src/modules/backoffice/backoffice.isolation.integration.test.ts`:
  - Identidade de tenant em `/api/v1/backoffice/*` recebe 403.
  - Com `withActor` de tenant A, `stores` e `group_owners` de B não aparecem e um insert em B falha.
  - O app conecta como `app_runtime`.
- [x] T018 [P] Casca da tela em `frontend/react/src/components/layout/`:
  - `AppShell.tsx`, `MenuRail.tsx`: rail recolhível de 232/72 px com Visão geral, Grupos econômicos, Lojas e Marcas Farmarcas; Funcionários e Parceiros "Em desenvolvimento".
  - `TopBar.tsx`: breadcrumb, papel e chip "Somente leitura".
  - `PageHeader.tsx`.
- [x] T019 [P] Primitivos em `frontend/react/src/components/ui/`: `Button` (primary, secondary, danger, ghost), `TextField`, `SelectField`, `TextArea`, `StatusBadge` (ok, warn, bad, neu, neo, brand), `Pill`, `KpiCard` (com linha de contexto), `Modal` (Escape, foco preso, devolve o foco), `SegmentedControl` (com contagem), `DataTable`, `EmptyState`, `ErrorState` e `Spinner`. Seguir `project/handoff/components.md`.
- [x] T020 Tela, papel e rotas:
  - `frontend/react/src/lib/api.ts`: injeta `x-demo-role` e lança `ApiError` com `code` e `details`.
  - `src/features/demo-role/`: contexto, `useDemoRole` e o seletor "Papel de demonstração" no TopBar, guardado em `localStorage`.
  - `src/app/router.tsx`: rotas `/`, `/grupos`, `/grupos/:numero`, `/lojas`, `/marcas`.
- [x] T021 Criar o seed idempotente `backend/node/seeds/<ts>_backoffice_exemplo.sql` com os dados fictícios do protótipo:
  - As 11 marcas, 2 delas históricas.
  - Os 7 grupos 0417, 0388, 0129, 0452, 0066, 0301 e 0214, com proprietários (0066 sem proprietário).
  - As lojas do 0417 e lojas de exemplo para os demais grupos.
  - Eventos de auditoria iniciais.
  - `setval` das sequências.

  Criar o script `db:seed` no `package.json`, rodando com `MIGRATION_DATABASE_URL`. Seguir a skill `seed-data`.

**Checkpoint**: o banco sobe com RLS, o isolamento está testado e a casca da tela navega.

## Phase 3: US1 — Marcas (P1) 🎯 MVP

**Independent test**: em `/marcas`, adicionar, renomear, desativar, reativar e excluir (só com 0 lojas).

- [x] T030 [P] [US1] Schemas Zod em `backend/node/src/modules/brands/brands.schemas.ts`: `name` com 2–60 caracteres e `status` `ACTIVE|HISTORICAL`.
- [x] T031 [US1] Teste do service (RED) em `brands.service.test.ts`:
  - Nome duplicado ignorando maiúsculas e acentos gera `BRAND_NAME_TAKEN`.
  - Excluir com lojas gera `BRAND_HAS_STORES`.
  - Cada escrita grava auditoria.
- [x] T032 [US1] Escrever `brands.repository.ts` (contagens de lojas e grupos, stats) e `brands.service.ts` (GREEN).
- [x] T033 [US1] Escrever `brands.controller.ts` e `brands.routes.ts`, montados em `/api/v1/backoffice/brands`, com escrita protegida por `requirePlatformRole('PLATFORM_ADMIN')`.
- [x] T034 [US1] Teste de integração em `brands.routes.integration.test.ts`: 201, 400, 409 de nome, 409 de exclusão e 403 do analista.
- [x] T035 [P] [US1] Hook `frontend/react/src/features/brands/hooks/useBrands.ts` (lista, stats e mutações).
- [x] T036 [US1] Componentes em `features/brands/components/`:
  - `BrandsKpis`.
  - `BrandCreateForm`.
  - `BrandsTable`: Renomear inline, Desativar/Reativar e Excluir só com 0 lojas, com confirmação.

  Página `src/app/BrandsPage.tsx`.

## Phase 4: US2 — Grupos econômicos (P1)

**Independent test**: criar um grupo, achar na lista pela busca, abrir o detalhe e editar.

- [x] T040 [P] [US2] Schemas Zod em `backend/node/src/modules/economic-groups/economic-groups.schemas.ts`:
  - Param `number` (int).
  - Filtros `status`, `search`, `uf`, `brandId`.
  - Create e update: `owner` com `name`, `email` e `phone` de 10–11 dígitos; `number` rejeitado pelo `.strict()`.
- [x] T041 [US2] Teste do service (RED) em `economic-groups.service.test.ts`:
  - Cria com status ACTIVE e gera o pseudônimo do proprietário.
  - CNPJ inválido gera erro 400.
  - Mascaramento por papel (`toGroupView(identity)`): o analista não recebe nome, e-mail nem telefone.
  - Selo "Sem proprietário".
- [x] T042 [US2] Escrever `economic-groups.repository.ts` (via `withActor`, com agregados de lojas, marcas e UFs, filtros e stats) e `economic-groups.service.ts` (GREEN).
- [x] T043 [US2] Escrever controller e routes em `/api/v1/backoffice/economic-groups` (list, stats, create, get, patch). Ao abrir o detalhe com o proprietário visível, registrar `OWNER_VIEWED` na auditoria.
- [x] T044 [US2] Teste de integração em `economic-groups.routes.integration.test.ts`:
  - Número sequencial.
  - Filtros.
  - 404.
  - Analista sem PII na lista e no detalhe.
  - 403 na escrita.
- [x] T045 [P] [US2] Hooks `features/economic-groups/hooks/useEconomicGroups.ts` (lista com filtros + stats) e `useEconomicGroup.ts` (detalhe + editar).
- [x] T046 [US2] Componentes em `features/economic-groups/components/`:
  - `GroupsKpis`: 6 cards.
  - `GroupsFilters`: segmented de status, busca, estado e marca.
  - `GroupsTable`: colunas do protótipo, selos e linha clicável.
  - `GroupFormModal`: novo e editar, com o GE bloqueado e a explicação.
  - `GroupHeader`.
  - `OwnerCard`: mascarado para o analista.
  - `GroupSummaryCards`: lojas por tipo, marca e UF.
- [x] T047 [US2] Páginas `src/app/GroupsPage.tsx` e `src/app/GroupDetailPage.tsx` (abas Lojas e Auditoria). `src/app/OverviewPage.tsx` com os KPIs de cadastro e atalhos.

## Phase 5: US3 — Lojas (P1)

**Independent test**: adicionar loja no grupo 0417 e vê-la no grupo e na lista geral.

- [x] T050 [P] [US3] Schemas Zod em `backend/node/src/modules/stores/stores.schemas.ts`:
  - `type` `PDV|CD`, `uf` entre as 27 UFs, `brandId` uuid e `openedAt` date opcional.
  - CNPJ validado por `isValidCnpj`.
  - Filtros.
  - PATCH com status `ACTIVE|INACTIVE`.
- [x] T051 [US3] Teste do service (RED) em `stores.service.test.ts`:
  - Marca inativa gera `BRAND_INACTIVE`.
  - CNPJ repetido gera `STORE_CNPJ_TAKEN`.
  - Grupo arquivado gera `GROUP_ARCHIVED`.
  - Nasce `PENDING`.
  - Grava auditoria.
- [x] T052 [US3] Escrever `stores.repository.ts` (via `withActor`) e `stores.service.ts` (GREEN).
- [x] T053 [US3] Montar as rotas:
  - `POST/GET /economic-groups/:number/stores`.
  - `GET /stores`, `GET /stores/stats` e `PATCH /stores/:id`.
- [x] T054 [US3] Teste de integração em `stores.routes.integration.test.ts`: 201, 400 de CNPJ, 409 em cada regra, filtros e 403 do analista.
- [x] T055 [P] [US3] Hooks `features/stores/hooks/useGroupStores.ts` e `useStores.ts`.
- [x] T056 [US3] Componentes em `features/stores/components/`:
  - `StoreFormModal`: radio PDV/CD e select só com marcas ativas.
  - `GroupStoresTable`: segmented Todas/PDV/CD com contagem e busca.
  - `StoresKpis` e `StoresTable`: lista geral com filtros.

  Ligar ao `GroupDetailPage`. Criar `src/app/StoresPage.tsx`.

## Phase 6: US4 — Ciclo de vida + auditoria (P2)

**Independent test**: suspender o 0417 com justificativa, ver na Auditoria e restaurar.

- [x] T060 [US4] Teste (RED) das transições em `economic-groups.service.test.ts`:
  - suspend só de ACTIVE.
  - archive de ACTIVE ou SUSPENDED.
  - restore de SUSPENDED ou ARCHIVED.
  - Justificativa vazia gera erro 400.
  - Transição inválida gera `INVALID_STATUS_TRANSITION`.
- [x] T061 [US4] Implementar `changeStatus` no service e `POST /economic-groups/:number/status-changes`. Implementar `GET /economic-groups/:number/audit-events`, com teste de integração.
- [x] T062 [US4] Tela:
  - `features/economic-groups/components/StatusChangeModal.tsx`: texto de consequência; botão habilitado só com justificativa.
  - Botões Suspender, Arquivar e Restaurar no `GroupHeader`.
  - `features/audit/components/AuditTrail.tsx` na aba Auditoria.

## Phase 7: US5 — Papel de demonstração (P2)

**Independent test**: como Analista, nenhuma ação de escrita aparece e o proprietário fica por código.

- [x] T070 [US5] Esconder na tela toda ação de escrita quando o papel for Analista: Novo grupo, Editar, Adicionar loja, Suspender, Arquivar, Restaurar, ações de marca e status de loja. Mostrar o chip "Somente leitura". Recarregar os dados ao trocar de papel.
- [x] T071 [US5] Conferir que os testes de integração cobrem a recusa (403) e a ausência de PII em todas as rotas de escrita e leitura.

## Phase 8: Polish

- [x] T080 [P] Estados de carregando, vazio ("Nenhum grupo encontrado" + "Limpar filtros") e erro com "Tentar de novo" em todas as features.
- [x] T081 [P] Rodar `npm run lint`, `npm test` e `npm run test:integration` na API, e `scripts/validar-frontend.sh` na tela. Tudo verde.
- [x] T082 Executar o roteiro do `quickstart.md` no navegador (desktop e 375 px) e comparar com o protótipo.
- [x] T083 [P] Atualizar `README.md` (como abrir o Backoffice, papel de demonstração, seed) e `templates/` via `scripts/sync-templates.sh`, se o Docker de referência mudou.

## Dependencies

- Setup → Foundational → (US1, US2) → US3, que precisa de marcas e grupos → US4 → US5 → Polish.
- US1 e US2 podem andar em paralelo depois da Phase 2.

## Implementation Strategy

1. **Primeira fatia**: Phases 1, 2 e 3. Banco com RLS, casca da tela e Marcas funcionando de ponta a ponta.
2. Depois Grupos, Lojas, Ciclo de vida e Papel, conferindo cada história no navegador antes da próxima.

## Notas da implementação

- Vite subiu da versão 5 para a 7: a versão atual do Vitest exige isso.
- Os dados de exemplo entram sozinhos ao subir a API (`npm run db:seed` no entrypoint), sem apagar nada.
- A consulta do operador aos dados do proprietário (`OWNER_VIEWED`) é registrada uma vez por operador e grupo a cada 30 minutos, para recarregar a tela não encher a trilha.
- Os testes de isolamento estão em `backend/node/src/modules/backoffice/backoffice.isolation.integration.test.ts`.
