# Tasks: Página da loja (visão Farmarcas e visão do grupo)

**Input**: `specs/002-pagina-da-loja/` (plan, spec, research, data-model, contracts/api.md, quickstart)

**Tests**: incluídos. Regras puras com Vitest; rotas e isolamento com Supertest.

Caminhos: API em `backend/node/`, tela em `frontend/react/`.

Entrega em três fatias. Ao fim de cada fatia: testes verdes e conferência no navegador.

---

# Fatia 1 (P1) — página, dados, solicitações, governança

## Phase 1: Base

- [x] T001 Ampliar `prisma/schema.prisma`:
  - `Store` ganha as colunas de `data-model.md` (P1). `address` é renomeado para `street`.
  - Enum `TaxRegime`.
  - Models `StoreChangeRequest`, `StoreChangeRequestEvent`, `StoreDocument`, `StoreDocumentFile` e `StoreHistory`.
- [x] T002 Gerar a migration `<ts>_store_page_p1` com `--create-only` e editar o SQL:
  - `ALTER TABLE stores RENAME COLUMN address TO street`, sem perda de dados;
  - CHECKs: CEP com 8 dígitos, telefones com 10–11 dígitos, UF;
  - índice único parcial de solicitação aberta por (loja, tipo);
  - RLS: políticas diretas em requests, documents e history; `store_visible` em events e files.
- [x] T003 Atualizar `scripts/db-setup.ts`: `store_history` e `store_change_request_events` só com `INSERT` e `SELECT` para o usuário da aplicação.
- [x] T004 Ajustar o código de 001 que usava `address`: `stores` (schemas, service, repository, testes) e a tela (formulário de loja, tipos). Testes de 001 continuam verdes.
- [x] T005 [P] Identidade do grupo:
  - `shared/identity/demo-identity-provider.ts` ganha `owner` + `x-demo-tenant`. O pseudônimo do proprietário vira o `subject`.
  - `shared/identity/authenticate.ts` ganha `requireTenant`.
  - Testes do provedor.
- [x] T006 [P] Criar `modules/demo/demo.routes.ts` com `GET /api/v1/demo/tenants`, montado só com `DEMO_IDENTITY_ENABLED`.
- [x] T007 Criar `modules/tenant/tenant.routes.ts`: `/api/v1/tenant` com `authenticate` + `requireTenant`, `GET /me` e `GET /stores` (via `withActor`). Registrar em `app.ts`.
- [x] T008 Estender o gate de isolamento em `modules/tenant/tenant.isolation.integration.test.ts`:
  - tenant A não lê loja, documento, arquivo, solicitação nem histórico de B;
  - identidade de plataforma recebe 403 em `/api/v1/tenant`;
  - tenant recebe 403 em `/api/v1/backoffice`.
- [x] T009 [P] Regras puras com testes (TDD) em `modules/store-page/`:
  - `permissions.ts` + teste: matriz lado × papel × ação de `research.md` R2;
  - `completeness.ts` + teste: os 30 itens, faixas e status da validação semestral.
- [x] T010 [P] Regras de solicitação com testes (TDD) em `modules/store-page/change-requests/`:
  - `types.ts`: 4 tipos, etapas, donos, documentos e schema Zod dos valores;
  - `transition.ts` + teste: avançar, reprovar, contestar, cancelar, `NOT_YOUR_STEP`, `DOCS_MISSING`, `REASON_REQUIRED`, vigente com `apply`.
- [x] T011 Seed `seeds/<ts>_store_page_exemplo.sql`, idempotente:
  - dados de Receita, contato e endereço popular das lojas do 0417 (LJ-002 igual ao protótipo);
  - validação e histórico de exemplo;
  - solicitações de exemplo (regime e endereço abertas, CNPJ vigente).

## Phase 2: US1 — abrir a página pelos dois lados

- [x] T020 [US1] Criar `store-page.repository.ts` e `store-page.service.ts`:
  - `getPage(identity, code)` monta cabeçalho, camadas, `fieldMeta`, `governance`, `permissions` e `version`;
  - mascara o celular e o e-mail pessoal do proprietário para o Analista da plataforma.
- [x] T021 [US1] Criar `store-page.routes.ts`, montado em `{base}/stores/:code` nos dois caminhos (backoffice e tenant).
- [x] T022 [US1] Teste de integração `store-page.routes.integration.test.ts`:
  - plataforma vê todas as lojas;
  - tenant vê só as do próprio grupo (outro grupo dá 404);
  - Analista recebe os campos mascarados.
- [x] T023 [P] [US1] Tela:
  - `features/demo-role`: papel "Proprietário do grupo" com escolha do grupo, enviando `x-demo-tenant`;
  - `lib/api.ts` com base por lado.
- [x] T024 [P] [US1] Tela:
  - `components/layout/AppShell` com variante `tenant` (`data-side="tenant"`);
  - tokens azuis em `styles/globals.css`;
  - `app/tenant/TenantLayout.tsx`;
  - `features/tenant-stores`, com "Minhas lojas".
- [x] T025 [US1] Tela:
  - `features/store-page`: `StorePageView` (lado, código), `StoreHeader` e as abas (as de P2 e P3 com estado "em breve" até chegarem);
  - rotas `/lojas/:codigo` e `/grupo/lojas/:codigo`;
  - linhas das tabelas de lojas (do grupo e da rede) passam a abrir a página.

## Phase 3: US2 — dados em camadas e edição

- [x] T030 [US2] Criar `PATCH {base}/stores/:code`:
  - recusa campo sensível (`FIELD_REQUIRES_REQUEST`);
  - motivo obrigatório para a plataforma;
  - campos privados do proprietário só para o tenant;
  - `expectedVersion`;
  - uma linha em `store_history` por campo alterado;
  - recálculo do preenchimento;
  - testes unitários e de integração.
- [x] T031 [US2] Tela `DataTab`:
  - 4 seções; campos bloqueados com ação de solicitação;
  - "Editar dados básicos" com contador de alterações e motivo (lado Farmarcas);
  - "Alterado em … por …";
  - aviso de conflito de versão.

## Phase 4: US3 — solicitações com etapas

- [x] T040 [US3] Criar `change-requests/service` e `repository`:
  - abrir solicitação (CNPJ repetido e marca inativa recusados);
  - ações;
  - anexar documento;
  - `apply` na loja ao ficar vigente (mesma transação);
  - histórico e `audit_events` do grupo.
- [x] T041 [US3] Criar o upload em `documents/`:
  - `multer` em memória, 10 MB, tipo conferido pelos primeiros bytes;
  - gravação em `store_document_files`;
  - download que passa pelo RLS;
  - testes: 413, 415 e download de outro tenant dá 404.
- [x] T042 [US3] Testes de integração das solicitações cobrindo os 4 tipos, a vez de cada lado, documentos faltando e uma aberta por tipo.
- [x] T043 [US3] Tela:
  - `RequestsPanel`: etapas, "Aguarda você", documentos e ações;
  - `RequestModal`: tipos, valor atual × novo, data, documentos e justificativa;
  - campos marcados "em andamento".

## Phase 5: US4 — governança e lista de Lojas

- [x] T050 [US4] Criar `POST validation` e `POST validation-reminders`, com regras e testes.
- [x] T051 [US4] Ampliar `GET /backoffice/stores` e `/stores/stats` com os filtros e campos de governança, e o tenant `/stores` com os mesmos campos. Incluir testes.
- [x] T052 [US4] Tela:
  - `GovernanceCard`: anel de %, o que falta, validação, botões Validar e Cobrar;
  - `StoresView` com colunas Cadastro e Validação, filtros e 4 indicadores novos.
- [x] T053 [US4] Criar `HistoryTab` básico, com edições, solicitações, validações e cobranças.

**Checkpoint da fatia 1**: rodar `quickstart.md` (Roteiro P1), conferir no navegador e pedir sua avaliação.

---

# Fatia 2 (P2) — estrutura, estratégias, mobiliário

- [x] T060 Gerar a migration `<ts>_store_page_p2`: colunas de estrutura em `stores`, `store_opening_hours`, `catalog_items`, `store_catalog_entries`, `store_free_sections` e `store_free_fields`, com RLS `store_visible` e CHECKs de horário e Trade.
- [x] T061 Criar o seed `seeds/<ts>_store_page_catalogos.sql` com os catálogos do protótipo (serviços, sistemas, boas práticas, PBMs por programa, estratégias, mobiliário) e as respostas de exemplo da LJ-002.
- [x] T062 [P] [US5] Criar `structure/hours.ts` + teste: validação do dia, 24 h, plantão e atalhos de replicar.
- [x] T063 [US5] Fazer o PATCH aceitar `structure`, `hours`, `selections` e `freeSections` (seções livres só pela plataforma), com histórico por item e preenchimento recalculado. Incluir testes.
- [x] T064 [US5] Tela `StructureSection`:
  - prédio, áreas e colaboradores;
  - grade de horário com atalhos;
  - serviços, sistema, boas práticas e PBMs recolhíveis;
  - seções livres.
- [x] T065 [US6] Criar `PUT strategies` (só tenant, mantém o `since`) e a tela `StrategiesTab`, com aviso de que a Farmarcas vê. Incluir testes.
- [x] T066 [US7] Criar `PUT furniture/:itemId` (Trade ≤ total) e a tela `FurnitureTab`, com indicadores, edição em linha e modal de adicionar do catálogo. Incluir testes.

**Checkpoint da fatia 2**: Roteiro P2 e sua avaliação.

---

# Fatia 3 (P3) — ferramentas, canais, documentos, responsáveis, histórico

- [x] T070 Gerar a migration `<ts>_store_page_p3`: `store_custom_entries` e `no_external_tools`. Seed com as ferramentas externas (negociação de exemplo) e os canais do protótipo.
- [x] T071 [P] [US8] Criar `tools.ts` + teste: custo total, negociações em uso e economia possível por ano.
- [x] T072 [US8] Criar as rotas de ferramentas e itens próprios (só tenant) e a tela `SystemsTab`, com indicadores, filtro Todas/Em uso/Com negociação, alerta de economia e "não usa ferramentas externas". Incluir testes.
- [x] T073 [US9] Criar as rotas de canais (só tenant) e a tela `ChannelsTab`, com proprietários e terceiros, Sim/Não + identificação, outros canais e indicadores. Incluir testes.
- [x] T074 [US10] Criar a tela `DocumentsTab` com tipos, status de validade, envio e substituição por lado, download e contador de alerta na aba. Fazer a lista de Lojas contar "Documentos com alerta".
- [x] T075 [US11] Criar `GET responsibles` e a tela `ResponsiblesTab`:
  - proprietário (mascarado para o Analista);
  - avisos: Anjo Farmarcas (funcionários da Farmarcas, futuro) e farmacêutico/gerente (funcionários do grupo, futuro).
- [x] T076 [US11] Fazer o `HistoryTab` completo, com filtros Tudo/Edições/Solicitações/Documentos e paginação.

**Checkpoint da fatia 3**: Roteiro P2 e P3 completo.

---

## Polish

- [x] T080 [P] Estados de carregando, vazio e erro em todas as abas. Conferir no celular (375 px) que a página não rola para os lados.
- [x] T081 [P] Verificações: `npm run lint`, `npm test` e `npm run test:integration` na API; tsc, eslint, vitest e prettier na tela; `scripts/check-repo.sh`.
- [x] T082 Atualizar o README (área do grupo, papel "Proprietário do grupo", página da loja) e rodar `scripts/sync-templates.sh`.

## Dependencies

- Fatia 1: T001→T004 em ordem. T005–T011 em paralelo depois de T002. US1 → US2 → US3 → US4.
- Fatia 2 depende da fatia 1. US5, US6 e US7 podem andar em paralelo depois de T060 e T061.
- Fatia 3 depende das fatias 1 e 2.

## Implementation Strategy

Construir uma fatia por vez e mostrar no navegador ao fim de cada uma. Ajustes que você pedir entram antes de começar a próxima.

## Notas da fatia 1 (concluída em 2026-10-30)

- A rota de status da loja de 001 passou a ser `PATCH /stores/:id/status`, para não colidir com a página da loja (`/stores/:code`).
- O grupo usa `GET /api/v1/tenant/brands` para a troca de bandeira (catálogo de marcas ativas).
- O preenchimento conta 22 itens nesta fatia (18 campos + 4 documentos). A fatia 2 acrescenta estrutura, horário, serviços, sistema, PBMs e estratégias.
- Os dados de exemplo rodam `recompute-completeness` depois do SQL, com a mesma regra da API.
- As abas Estratégias, Mobiliário, Responsáveis, Sistemas, Canais e Documentos mostram "chega na próxima parte".

## Notas da fatia 2 (concluída em 2026-10-30)

- O preenchimento passou a contar 30 itens (entram área, área de venda, colaboradores, horário, serviços, sistema de demanda, PBMs e estratégias).
- Marcar e desmarcar itens de catálogo apaga a linha de associação (o usuário da aplicação ganhou `DELETE` só em `store_catalog_entries` e `store_free_fields`); o histórico da loja registra a mudança.
- O mobiliário mostra todos os itens do catálogo, com "Informar" nos que ainda não têm quantidade.
- Defeito achado na conferência e corrigido: o Salvar enviava só os dados básicos; agora envia também estrutura, horário e catálogos.

## Notas da fatia 3 e do acabamento (concluídos em 2026-10-30)

- Ferramentas externas e canais: só o grupo preenche (`canEditTools`, `canEditChannels`); a Farmarcas acompanha. Itens que o grupo inclui ficam em `store_custom_entries` (com RLS).
- Economia possível = o que passa da condição Farmarcas × 12 meses, em centavos (`structure/tools.ts`).
- Responsáveis: proprietário do grupo (mascarado para o analista). Anjo Farmarcas vem do menu Funcionários do Backoffice (funcionários da Farmarcas); farmacêutico e gerente vêm do cadastro de funcionários do grupo — os dois em especificações futuras.
- Defeito achado na conferência e corrigido: no celular, os campos escondidos de envio de arquivo faziam a página rolar de lado (a tabela agora prende esses campos).
