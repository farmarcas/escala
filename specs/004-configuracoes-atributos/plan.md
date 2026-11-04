# Implementation Plan: Configurações do Backoffice — etapa 1 (atributos da loja)

**Branch**: `004-configuracoes-atributos` (o trabalho segue na branch do PR atual) | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-configuracoes-atributos/spec.md`

## Summary

O Backoffice ganha o menu **Configurações**, só para o administrador, com a seção **Atributos da loja**. Nela o administrador mantém as 8 listas que a página da loja usa: inclui, altera, reordena, desativa, exclui o que não está em uso e consulta o histórico. O mobiliário ganha um ícone escolhido numa galeria.

Abordagem:
- **Banco.** A tabela de listas que já existe (`catalog_items`) ganha ícone, autosserviço, "usada no Escala", versão, data de alteração e exclusão lógica. O nome passa a ser único sem diferença de maiúscula entre os itens não excluídos. A tabela ganha RLS: só a plataforma grava.
- **API.** Módulo novo `settings-catalog` em `/api/v1/backoffice/settings/catalog`, só para o administrador. A auditoria ganha o tipo `CATALOG_ITEM`.
- **Página da loja.** Passa a receber também os itens desativados, com os campos novos. As gravações da loja aceitam manter um item desativado que a loja já usa, mas não marcá-lo de novo.
- **Tela.** Feature nova `settings`, com as páginas Configurações e Lista. A galeria de ícones é um registro fixo de cerca de 40 ícones Lucide. A aba Mobiliário mostra os ícones e soma o autosserviço pelo campo novo. As Estratégias mostram a etiqueta do Escala pelo campo novo.

## For the reader

**Chosen:** usar as mesmas listas que a página da loja já usa, só acrescentando o que falta (ícone, autosserviço, "usada no Escala").
**Why:** nada do que as lojas preencheram muda de lugar, e renomear um item muda em todas as lojas na hora.

**Chosen:** a galeria de ícones usa a mesma coleção que o Backoffice já usa nos menus, com cerca de 40 ícones escolhidos para farmácia.
**Why:** fica com a mesma cara do resto do sistema e não precisa instalar nada novo.

**Chosen:** só o administrador entra, e o próprio banco recusa gravação de quem não é da Farmarcas.
**Why:** mesmo que alguém ache um caminho fora da tela, o grupo não consegue mudar as listas.

**Chosen:** a ordem dos itens muda com botões de subir e descer, não arrastando.
**Why:** funciona igual no computador, no celular e no teclado, sem peça nova.

## Technical Context

**Language/Version**: Node 22 + TypeScript (API); React 18 + TypeScript (tela). Igual a 001–003.

**Primary Dependencies**: as que o projeto já tem (Express, Zod, Prisma, React Router, Tailwind v4, lucide-react). Nenhuma nova.

**Storage**: PostgreSQL 16. Uma migration (`--create-only` com SQL editado à mão para o índice parcial por expressão e para o RLS) e um seed idempotente.

**Testing**: Vitest para as regras puras e Supertest para as rotas e o isolamento. A lista completa está em `research.md`, R12.

**Target Platform**: navegador desktop e celular, ambiente Docker local.

**Project Type**: aplicação web (API + SPA). Sem serviço novo no Compose.

**Performance Goals**: listas de até ~50 itens; a lista e a busca respondem na hora (< 300 ms local). A contagem "em uso" sai numa consulta agrupada por item.

**Constraints**:
- O que as lojas informaram nunca muda (FR-051).
- A gravação ao mesmo tempo é resolvida por versão.
- O histórico é somente acréscimo.
- Só o administrador acessa, inclusive para leitura.

**Scale/Scope**: 8 listas, cerca de 100 itens, 2 telas novas, 1 modal de item, 1 galeria, ajustes em 4 abas da página da loja.

## Constitution Check

| Princípio | Situação |
| --- | --- |
| I. Spec Kit obrigatório | ✅ spec aprovada; plano em aprovação; tarefas depois |
| II. Tudo roda no Docker | ✅ nada fora do Compose; migration e seed rodam na subida da API |
| III. Stack padrão | ✅ sem tecnologia nova |
| IV. Banco só muda por migration | ✅ uma migration nova; nenhuma migration antiga editada |
| V. Dados locais protegidos | ✅ nenhum comando destrutivo; a migration só acrescenta colunas e troca um índice |
| VI. Linguagem simples | ✅ "For the reader" e fechamento sem jargão |
| VII. Começar pequeno | ✅ etapa 1 de 3; US1 sozinha já entrega valor |
| VIII. Agente decide o técnico | ✅ decisões em `research.md`; nenhuma pergunta técnica à pessoa |

Reavaliado depois do desenho: sem violação.

## Project Structure

### Documentation (this feature)

```text
specs/004-configuracoes-atributos/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
├── checklists/requirements.md
└── tasks.md             # próxima etapa (/speckit-tasks)
```

### Source Code

```text
backend/node/
├── prisma/
│   ├── schema.prisma                                  # CatalogItem: colunas novas; AuditEntity: CATALOG_ITEM
│   └── migrations/20261101120000_configuracoes_atributos/migration.sql
├── seeds/20261101120000_configuracoes_atributos.sql   # ícones, autosserviço, Escala (idempotente)
└── src/
    ├── modules/
    │   ├── settings-catalog/                          # NOVO
    │   │   ├── settings-catalog.routes.ts             # tudo com requirePlatformRole('PLATFORM_ADMIN')
    │   │   ├── settings-catalog.controller.ts
    │   │   ├── settings-catalog.service.ts            # regras: nome único, mover, excluir só sem uso, versão, auditoria
    │   │   ├── settings-catalog.repository.ts
    │   │   ├── settings-catalog.schemas.ts            # Zod por lista (discriminado por kind)
    │   │   ├── catalog-kinds.ts                       # slug ↔ kind, rótulos, tipos de mobiliário
    │   │   ├── furniture-icons.ts                     # chaves válidas da galeria
    │   │   ├── audit-summary.ts                       # "Campo: antes → depois"
    │   │   ├── *.test.ts                              # Vitest das regras puras
    │   │   └── settings-catalog.routes.integration.test.ts
    │   ├── audit/audit.types.ts                       # AuditEntityType + CATALOG_ITEM
    │   ├── backoffice/backoffice.routes.ts            # monta /settings/catalog
    │   └── store-page/
    │       ├── structure/structure.service.ts         # catálogo com desativados; regra "ativo ou já usado"
    │       └── structure/tools-channels.service.ts    # mesma regra
    └── (sem mudança em shared/)

frontend/react/src/
├── lib/furniture-icons.ts                             # NOVO: registro da galeria (chave, ícone, rótulo, grupo, palavras)
├── components/layout/MenuRail.tsx                     # item Configurações só para admin
├── app/
│   ├── router.tsx                                     # /configuracoes e /configuracoes/atributos/:lista
│   ├── SettingsPage.tsx                               # NOVO
│   └── SettingsCatalogPage.tsx                        # NOVO
├── features/settings/                                 # NOVO
│   ├── types.ts
│   ├── catalogKinds.ts                                # rótulos e campos por lista
│   ├── hooks/useCatalogSummary.ts, useCatalogList.ts, useCatalogItemForm.ts
│   └── components/
│       ├── CatalogSummaryGrid.tsx
│       ├── CatalogItemsTable.tsx                      # busca, filtro de situação, subir/descer, ações
│       ├── CatalogItemModal.tsx                       # formulário por lista + prévia
│       ├── IconPicker.tsx                             # galeria com grupos e busca
│       └── NoAccess.tsx
└── features/store-page/
    ├── types.ts                                       # CatalogItem: icon, selfService, usedByScale, active
    ├── hooks/useCatalog.ts                            # byKind só ativos; usedOrActive(kind, ids)
    └── components/
        ├── FurnitureTab.tsx                           # ícone; autosserviço pelo campo
        ├── StrategiesTab.tsx                          # etiqueta pelo usedByScale; desativado
        ├── StructureSection.tsx                       # serviços, boas práticas, PBMs, sistema: desativado
        └── ChannelsTab.tsx / ToolsTab                 # desativado
```

**Structure Decision**: aplicação web já existente. O módulo novo na API segue o formato de `partners` (rotas, controller, service, repository, schemas). As telas seguem `features/<área>` e `app/<Página>.tsx`, como Funcionários e Parceiros. Depois de mudar `backend/node`, `scripts/sync-templates.sh` atualiza `templates/`.

## Ordem de entrega

1. **Fundação**: migration, seed, Prisma e auditoria `CATALOG_ITEM`. A página da loja lê os campos novos (sem mudar nada na tela).
2. **US1 (P1)**: API de listar, criar e alterar; tela Configurações, lista Mobiliário, modal e galeria de ícones; aba Mobiliário com ícones e autosserviço.
3. **US2 (P1)**: as outras 7 listas no mesmo modal, com campos por lista, sugestões, mover e etiqueta do Escala vinda do campo.
4. **US3 (P2)**: desativar, reativar e excluir sem uso; regra "ativo ou já usado" nas gravações da loja; marca "desativado" nas abas.
5. **US4 (P3)**: histórico por lista.
6. **Acabamento**: acesso negado para o analista, conflito de versão na tela, templates, checagens e conferência no navegador (quickstart).

## Complexity Tracking

Sem violações a justificar.
