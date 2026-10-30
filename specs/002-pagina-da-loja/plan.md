# Implementation Plan: Página da loja (visão Farmarcas e visão do grupo)

**Branch**: `002-pagina-da-loja` | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-pagina-da-loja/spec.md`

## Summary

Criar a página da loja, servida por dois caminhos isolados da mesma API:
- `/api/v1/backoffice`, para a Farmarcas;
- `/api/v1/tenant`, para o grupo, que só alcança as próprias lojas pelo RLS do banco.

O que entra:
- A loja ganha campos de Receita, contato, endereço popular e estrutura.
- Novas tabelas guardam horário, catálogos e respostas da loja, solicitações com etapas, documentos (o arquivo fica no próprio banco, sob o mesmo isolamento) e o histórico da loja (somente acréscimo).
- O % de preenchimento é recalculado a cada gravação e guardado na loja, para a lista de Lojas filtrar sem recalcular tudo.
- A tela ganha a área do grupo (menu escuro, ação azul) e uma feature `store-page` única, que recebe o lado (Farmarcas ou grupo) e decide o que cada um pode fazer.

## For the reader

**Chosen:** a mesma página da loja serve aos dois lados. O que cada um pode alterar é decidido na API, e o banco garante que um grupo nunca enxerga loja de outro.
**Why:** é uma tela só para manter, e a regra fica protegida mesmo se alguém tentar por fora da tela.

**Chosen:** os arquivos dos documentos ficam guardados no próprio banco, junto da loja.
**Why:** assim o isolamento entre grupos e as cópias de segurança valem também para os arquivos, sem precisar de outro serviço.

**Chosen:** entregar em três fatias, na ordem de prioridade da especificação, conferindo cada uma no navegador.
**Why:** a página é grande. Fatias menores deixam você ver e corrigir cedo.

## Technical Context

**Language/Version**: Node 22 + TypeScript (API); React 18 + TypeScript (tela). Igual a 001.

**Primary Dependencies**: as mesmas de 001. Entra só o `multer`, para receber os arquivos dos documentos (upload `multipart/form-data` em memória, com limite de 10 MB).

**Storage**: PostgreSQL 16, uma migration nova por fatia (Prisma Migrate). RLS em todas as tabelas novas do tenant.

**Testing**:
- Vitest: regras puras (preenchimento, validação semestral, etapas das solicitações, horário, ferramentas e economia).
- Supertest: rotas dos dois caminhos e isolamento entre tenants.

**Target Platform**: navegador desktop e celular, ambiente Docker local.

**Project Type**: aplicação web (API + SPA). Sem serviço novo no Compose.

**Performance Goals**: página da loja abre em menos de 1 s com o histórico paginado; lista de Lojas filtra por preenchimento sem recálculo.

**Constraints**:
- Isolamento por RLS.
- Camadas de edição validadas na API por lado e papel.
- Arquivos de até 10 MB, apenas PDF, JPG ou PNG, conferidos pelo conteúdo e não só pela extensão.
- Layout fluido.

**Scale/Scope**: cerca de 1.800 lojas e cerca de 500 grupos; 8 abas, 1 cartão de governança, 1 painel de solicitações e 1 área nova do grupo.

## Constitution Check

| Princípio | Situação |
|---|---|
| I. Spec Kit | ✅ spec aprovada |
| II. Docker | ✅ nada fora do Compose |
| III. Stack | ✅ mesma stack. Acréscimo: `multer` (justificado em `research.md` R6) |
| IV. Migration | ✅ uma por fatia. RLS, índices parciais e CHECKs escritos no SQL |
| V. Dados protegidos | ✅ a coluna `address` é **renomeada** para `street`, sem perda. Seeds idempotentes; nenhum reset |
| VI. Linguagem simples | ✅ |
| VII. Começar pequeno | ✅ três fatias (P1, P2, P3), cada uma testável no navegador |
| VIII. Agente decide o técnico | ✅ `research.md` |

Invariantes do Product Vision §9:
- isolamento no banco para o tenant;
- caminho dedicado do operador;
- identidade nunca vinda do cliente em produção;
- histórico e auditoria somente acréscimo;
- pseudonimização para o analista;
- testes de isolamento como gate, estendidos às tabelas novas.

**Re-check pós-design**: sem violações.

## Project Structure

### Documentation

```text
specs/002-pagina-da-loja/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/api.md
└── tasks.md   # próxima etapa
```

### Source Code

```text
backend/node/
├── prisma/migrations/<ts>_store_page_p1/ … _p2/ … _p3/
├── seeds/<ts>_store_page_catalogos.sql   # catálogos + dados de exemplo da loja LJ-002 (idempotente)
└── src/
    ├── shared/identity/demo-identity-provider.ts   # + "owner" com x-demo-tenant
    ├── shared/identity/authenticate.ts             # + requireTenant
    └── modules/
        ├── tenant/tenant.routes.ts                 # /api/v1/tenant: só identidade de tenant
        ├── demo/demo.routes.ts                     # lista de grupos para o seletor (só com DEMO ligado)
        └── store-page/
            ├── store-page.routes.ts                # montado nos dois caminhos
            ├── store-page.controller.ts / .service.ts / .repository.ts / .schemas.ts
            ├── permissions.ts                      # quem edita o quê, por lado e papel (puro + teste)
            ├── completeness.ts                     # % de preenchimento e validação semestral (puro + teste)
            ├── change-requests/                    # tipos, etapas, transições (puro + teste), service, repository
            ├── structure/                          # horário, catálogos, seções livres
            ├── documents/                          # upload, download, validade
            └── history/                            # histórico da loja (somente acréscimo)

frontend/react/src/
├── app/
│   ├── router.tsx                     # + /lojas/:codigo e área do grupo /grupo/...
│   ├── StorePage.tsx                  # Backoffice
│   └── tenant/TenantLayout.tsx, TenantStoresPage.tsx, TenantStorePage.tsx
├── components/layout/                 # AppShell com variante "tenant" (menu escuro, tokens azuis)
├── features/
│   ├── demo-role/                     # + papel "Proprietário do grupo" com escolha do grupo
│   ├── store-page/                    # página da loja (lado = platform | tenant)
│   │   ├── components/ (StoreHeader, GovernanceCard, DataTab, RequestsPanel, RequestModal,
│   │   │                StructureSection, StrategiesTab, FurnitureTab, SystemsTab, ChannelsTab,
│   │   │                DocumentsTab, ResponsiblesTab, HistoryTab)
│   │   └── hooks/
│   ├── stores/                        # lista ganha colunas, filtros e indicadores de governança
│   └── tenant-stores/                 # "Minhas lojas" do grupo
```

**Structure Decision**: a mesma API e a mesma tela, cada uma com um caminho por lado. A regra de quem pode o quê fica num módulo puro (`permissions.ts`), testado sozinho e usado pela API. A tela só esconde o que a API já recusaria.

## Complexity Tracking

| Ponto | Por que é necessário | Alternativa mais simples recusada porque |
|---|---|---|
| Valores pedidos da solicitação em `jsonb` | Cada um dos 4 tipos pede campos diferentes, e o formato é validado por Zod por tipo | Uma tabela por tipo: 4 tabelas quase vazias e consultas de painel bem mais complexas |
| Arquivo dos documentos em `bytea` | Isolamento por RLS e backup sem serviço extra | Volume em disco: o arquivo ficaria fora do RLS, e o isolamento dependeria só do código |
