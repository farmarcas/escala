# Implementation Plan: Backoffice Farmarcas — cadastros de grupos, lojas e marcas

**Branch**: `001-backoffice-cadastros` | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-backoffice-cadastros/spec.md`

## Summary

Construir o Backoffice do operador Farmarcas, com marcas, grupos econômicos, lojas, ciclo de vida do grupo com auditoria e papel de demonstração (Administrador ou Analista). Os dados ficam salvos no PostgreSQL. A API em Node aplica as regras: GE imutável, marca obrigatória e ativa, exclusão de marca só sem loja, justificativa obrigatória, analista só lê e vê o proprietário pseudonimizado. A tela em React segue o protótipo `Suite Operator.dc.html` e os tokens do Alquimia DS.

## For the reader

Chosen: banco, API e tela no mesmo jeito que o projeto já usa (PostgreSQL, Node e React, tudo no Docker), com as cores e medidas do Alquimia DS.

Why: aproveita o que já está montado, os dados não somem ao reiniciar e a tela fica igual ao protótipo.

Chosen: cada grupo econômico é um tenant separado, e o banco só entrega os dados do próprio grupo para quem é do grupo. A Farmarcas entra por um caminho exclusivo dela.

Why: é a regra central da Radar Suite. Deixar isso pronto desde já evita refazer as tabelas quando a suíte do associado chegar.

Chosen: as regras ficam na API, e não só na tela. O papel de demonstração só funciona no ambiente local.

Why: o analista não consegue gravar nada nem ver dado pessoal, mesmo que tente por fora da tela. E a identidade simulada nunca vai para produção.

Chosen: a tela passa a usar TypeScript, Tailwind e rotas com endereço próprio para cada página.

Why: são o padrão das regras de frontend do projeto. Com rotas próprias, dá para abrir um grupo direto pelo link (`/grupos/0417`).

## Technical Context

**Language/Version**: Node 22 + TypeScript (API); React 18 + TypeScript (tela)

**Primary Dependencies**:
- API (já existentes): Express 5, Zod 4, Prisma 7, Pino.
- Tela: Vite 5, Tailwind 4 (`@tailwindcss/vite`), React Router 6, `clsx` e `tailwind-merge`.

**Storage**: PostgreSQL 16 (serviço `postgres` do Compose), via Prisma Migrate

**Testing**:
- API: Vitest para as regras dos services e Supertest para as rotas (banco `_test`).
- Tela: Vitest para as funções puras (máscara de CNPJ, formatação pt-BR).
- `tsc`, `eslint` e `prettier` nos dois serviços.

**Target Platform**: navegador desktop, com o ambiente local no Docker Compose

**Project Type**: aplicação web (API + SPA)

**Performance Goals**: listas de até 500 grupos e 2.000 lojas respondendo em menos de 1 s, com busca paginada no servidor

**Constraints**:
- Layout fluido, sem `max-width` em containers de página.
- Números e datas em pt-BR.
- Multi-tenant (GE = tenant), com isolamento por RLS no Postgres.
- Operador só por `/api/v1/backoffice/*`.
- Identidade por provedor plugável: o de demonstração (`x-demo-role`) só liga com `DEMO_IDENTITY_ENABLED=true` e nunca em produção.

**Scale/Scope**: 5 telas (Visão geral, Grupos, Detalhe do grupo, Lojas, Marcas), 4 modais e 5 tabelas no banco

## Constitution Check

| Princípio | Situação |
|---|---|
| I. Spec Kit obrigatório | ✅ spec aprovada; plan → tasks → implement com aprovação |
| II. Tudo no Docker | ✅ nada novo fora do Compose; dependências novas instaladas pelo entrypoint do container |
| III. Stack padrão | ✅ Postgres 16, Node 22 + TS + Prisma, React + Vite + Tailwind. Acréscimos justificados em `research.md`: React Router (rotas) e TypeScript na tela (exigido pela skill de componentes) |
| IV. Banco só por migration | ✅ uma migration nova gerada pelo Prisma, com índices parciais e collation escritos à mão |
| V. Dados locais protegidos | ✅ nenhum reset. Os dados de exemplo entram por seed idempotente, sem apagar nada |
| VI. Linguagem simples | ✅ |
| VII. Começar pequeno | ✅ escopo cortado (ver Assumptions da spec) |
| VIII. Agente decide o técnico | ✅ decisões em `research.md` |

Invariantes do Product Vision (§6 e §9) cobertas nesta entrega:
- GE = tenant como fronteira de isolamento, com RLS no banco.
- Caminho dedicado do operador.
- Identidade nunca vinda do cliente em produção.
- Auditoria append-only.
- Pseudonimização do proprietário para o analista.
- Testes de isolamento como gate.

Lacunas conhecidas:
- Não existe skill de autenticação. O provedor de demonstração é provisório e está documentado como tal.
- Auditar a leitura do operador sobre dado individual vale para o proprietário e fica registrada quando o administrador abre o detalhe do grupo. A leitura de funcionários entra junto com o módulo de funcionários.

Mudança de infraestrutura: o Compose ganha um usuário de banco para a aplicação (`app_runtime`, sem ser dono das tabelas), para o RLS valer. As migrations continuam com o usuário atual. A mudança segue a skill `containerization`.

**Re-check pós-design**: sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/001-backoffice-cadastros/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
└── tasks.md            # próxima etapa
```

### Source Code (repository root)

```text
backend/node/
├── prisma/
│   ├── schema.prisma                       # + Brand, EconomicGroup, GroupOwner, Store, AuditEvent
│   └── migrations/<ts>_backoffice_cadastros/migration.sql
├── seeds/<ts>_backoffice_exemplo.sql       # dados fictícios do protótipo (idempotente)
└── src/
    ├── shared/
    │   ├── identity/                       # IdentityProvider, demo-provider, requirePlatformRole
    │   ├── database/with-actor.ts          # transação com app.actor_kind / app.tenant_id (RLS)
    │   ├── errors/forbidden-error.ts
    │   └── br/                             # cnpj.ts, uf.ts, normalize-name.ts (puros + testes)
    └── modules/
        ├── brands/                         # routes, controller, service, repository, schemas, testes
        ├── economic-groups/                # idem (+ stats, status-changes, owner pseudonym)
        ├── stores/                         # idem
        └── audit/                          # repository + service usado pelos demais

frontend/react/
├── index.html
├── tsconfig.json, eslint.config.js, .prettierrc.json
└── src/
    ├── main.tsx
    ├── styles/globals.css                  # @import tailwindcss + @theme com tokens do Alquimia DS
    ├── app/                                # router + páginas finas
    │   ├── router.tsx
    │   ├── OverviewPage.tsx  GroupsPage.tsx  GroupDetailPage.tsx  StoresPage.tsx  BrandsPage.tsx
    ├── components/
    │   ├── layout/   AppShell.tsx  MenuRail.tsx  TopBar.tsx  PageHeader.tsx
    │   └── ui/       Button  TextField  SelectField  TextArea  StatusBadge  Pill  KpiCard
    │                 Modal  SegmentedControl  DataTable  EmptyState  ErrorState  Spinner
    ├── features/
    │   ├── demo-role/        # contexto do papel + seletor no TopBar
    │   ├── brands/           # hooks + componentes da tela de marcas
    │   ├── economic-groups/  # lista, KPIs, formulário, detalhe, ciclo de vida
    │   ├── stores/           # tabela do grupo, lista geral, formulário de loja
    │   └── audit/            # aba de auditoria
    └── lib/                  # api.ts, cn.ts, format.ts (+ format.test.ts)
```

**Structure Decision**: aplicação web nos dois serviços que já existem (`backend/node` e `frontend/react`), sem serviço novo no Compose. O módulo `users` de exemplo continua como está.

## Complexity Tracking

Nenhuma violação a justificar.
