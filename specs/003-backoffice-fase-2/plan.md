# Implementation Plan: Backoffice Farmarcas — fase 2

**Branch**: `003-backoffice-fase-2` | **Date**: 2026-10-31 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-backoffice-fase-2/spec.md`

## Summary

Completar o Backoffice antes do Gestão 360, em quatro fatias.

- **Fatia 0 (P1):** tela Início com o mapa da rede.
  - Uma rota de leitura devolve os números por estado (lojas, grupos, grupos com proprietário, cidades, cidades principais, divisão por marca e grupos principais), calculados direto do cadastro.
  - A tela desenha o mapa em SVG com a geometria do protótipo (svg-maps/brazil, CC BY 4.0). Regiões, totais, faixas de cor e zoom são calculados na tela.
  - Não há tabela nova.
- **Fatia 1 (P1):** cadastro de funcionários da Farmarcas e Anjo do grupo.
  - Tabela de funcionários da plataforma, fora de qualquer tenant.
  - O grupo ganha a coluna do Anjo.
  - O lado do grupo lê só o Anjo do próprio grupo, por uma política do banco.
- **Fatia 2 (P2):** parceiros (empresa e contatos), etapa da loja e bloqueio da loja.
  - O bloqueio é conferido no ponto único por onde a página da loja carrega a loja. Por isso vale para leitura e gravação do lado do grupo.
- **Fatia 3 (P3):** transferência de titularidade, Cartão Alelo, ações em lote e exportação CSV.

A auditoria ganha dois campos (tipo e id do registro), para guardar também o histórico de funcionário e de parceiro.

## For the reader

**Chosen:** o Início lê os números direto do cadastro de lojas e grupos, na hora, sem uma cópia separada.
**Why:** o mapa sempre bate com as listas de Lojas e Grupos. Com 1.800 lojas, a conta é rápida.

**Chosen:** o mapa é desenhado pela própria tela, com o mesmo desenho dos estados do protótipo.
**Why:** não depende de serviço de mapas de fora nem de internet, e fica igual ao que você aprovou no protótipo.

**Chosen:** funcionários e parceiros ficam guardados como dados da Farmarcas, separados dos dados dos grupos.
**Why:** um grupo nunca vê a lista de pessoas da Farmarcas nem os parceiros. A única exceção é o Anjo do próprio grupo, que o banco libera sozinho.

**Chosen:** o bloqueio da loja é conferido no mesmo lugar por onde toda a página da loja passa.
**Why:** assim ninguém do grupo abre nem altera a loja bloqueada, nem por fora da tela, e não existe caminho esquecido.

**Chosen:** as telas de Funcionários e Parceiros seguem o desenho das listas que já existem (Grupos e Marcas), porque o protótipo não tem essas telas.
**Why:** mantém o Backoffice com a mesma cara e o mesmo jeito de usar.

**Chosen:** entregar em quatro fatias, na ordem da especificação, conferindo cada uma no navegador. O Início vem primeiro.
**Why:** o Início só usa o que já existe e fica pronto logo. Funcionários e Anjo destravam o Gestão 360. O resto vem em seguida, sem segurar o principal.

## Technical Context

**Language/Version**: Node 22 + TypeScript (API); React 18 + TypeScript (tela). Igual a 001 e 002.

**Primary Dependencies**: as mesmas de 002. Nenhuma biblioteca nova. O CSV é gerado à mão (separador `;` e BOM UTF-8), ver `research.md` R6.

**Storage**: PostgreSQL 16, uma migration por fatia (Prisma Migrate). RLS em todas as tabelas novas.

**Testing**:
- Vitest: regras puras.
  - Faixas de cor, regiões e totais do mapa.
  - Transições de etapa da loja.
  - Desligamento com carteira.
  - Contato principal.
  - CPF.
  - Máscara do cartão.
  - Escape do CSV.
  - Resultado do lote (alteradas e puladas).
- Supertest:
  - Rotas novas.
  - Números do Início iguais aos das listas filtradas por UF.
  - Isolamento: o grupo só lê o próprio Anjo.
  - Loja bloqueada recusada para o grupo.
  - Analista sem CPF nem número do cartão.

**Target Platform**: navegador desktop e celular, ambiente Docker local.

**Project Type**: aplicação web (API + SPA). Sem serviço novo no Compose.

**Performance Goals**:
- Listas de até 2.000 linhas filtram em menos de 1 s.
- Exportação de 2.000 lojas em menos de 3 s.
- Lote de 50 lojas em uma transação.

**Constraints**:
- Isolamento por RLS.
- Papel conferido na API.
- Pseudonimização igual na tela e no CSV.
- Layout fluido.

**Scale/Scope**:
- Cerca de 100 funcionários, 300 parceiros, 500 grupos e 1.800 lojas.
- 5 telas novas: Início (mapa), lista e detalhe de funcionário, lista e detalhe de parceiro.
- Ajustes em grupos, lojas e página da loja.

## Constitution Check

| Princípio | Situação |
|---|---|
| I. Spec Kit | ✅ spec aprovada em 2026-10-31 |
| II. Docker | ✅ nada fora do Compose |
| III. Stack | ✅ mesma stack, sem dependência nova |
| IV. Migration | ✅ uma por fatia. RLS, índices parciais e CHECKs no SQL. Só colunas novas e tabelas novas: nada é apagado nem renomeado |
| V. Dados protegidos | ✅ Seeds idempotentes. Nenhum reset. Lojas existentes ganham etapa por regra (Inaugurada se têm abertura, senão Prospecção) |
| VI. Linguagem simples | ✅ |
| VII. Começar pequeno | ✅ quatro fatias, cada uma testável no navegador |
| VIII. Agente decide o técnico | ✅ `research.md` |

Invariantes do Product Vision §9:
- isolamento no banco para o tenant, estendido às tabelas novas;
- caminho dedicado do operador;
- identidade nunca vinda do cliente em produção;
- auditoria somente acréscimo;
- pseudonimização para o analista (titular do Alelo entra na regra);
- testes de isolamento como gate.

**Re-check pós-design**: sem violações.

## Project Structure

### Documentation

```text
specs/003-backoffice-fase-2/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/api.md
└── tasks.md   # próxima etapa
```

### Source Code

```text
backend/node/
├── prisma/migrations/<ts>_backoffice_fase2_p1/ … _p2/ … _p3/
├── seeds/<ts>_funcionarios_e_anjos.sql, <ts>_parceiros_e_lojas.sql, <ts>_alelo_exemplo.sql   # idempotentes
└── src/
    ├── shared/br/cpf.ts (+ teste), shared/http/csv.ts (+ teste)
    └── modules/
        ├── home/                       # GET /backoffice/home/map: agregados por UF (repository SQL + teste de integração)
        ├── audit/                      # + entityType/entityId; listAuditByEntity
        ├── employees/                  # routes, controller, service (+ teste), repository, schemas
        ├── partners/                   # idem, com contatos
        ├── economic-groups/            # + Anjo (definir, trocar, lote), transferência, Cartão Alelo, export
        ├── stores/                     # + etapa (stage.ts puro + teste), bloqueio, lote, filtros, export
        ├── store-page/                 # loadStore recusa loja bloqueada para o grupo; Anjo no detalhe
        └── tenant/                     # "Minhas lojas" traz bloqueio; /me traz o Anjo

frontend/react/src/
├── app/                                # + HomePage ("/"); OverviewPage vai para "/visao-geral"; + EmployeesPage, EmployeeDetailPage, PartnersPage, PartnerDetailPage; rotas
├── components/layout/MenuRail.tsx      # Funcionários e Parceiros saem de "Em desenvolvimento"
├── components/ui/                      # + seleção em tabela e barra de ações em lote (se não houver)
└── features/
    ├── home/                           # mapa (BrazilMap + geometria em lib), cartões de região, painel da UF,
    │                                   # tabela Estados; métricas, faixas e regiões em funções puras (+ teste)
    ├── employees/                      # lista, indicadores, formulário, detalhe com carteira
    ├── partners/                       # lista com abas, formulário, detalhe com contatos
    ├── economic-groups/                # coluna/selo/filtro Anjo, "Definir Anjo", lote, Transferir, Alelo
    ├── stores/                         # colunas Etapa/Situação/Bloqueio, filtros, seleção e lote, export
    ├── store-page/                     # bloco Anjo real; etapa e bloqueio no cabeçalho do operador
    └── tenant-stores/                  # loja bloqueada com selo e sem link; tela "Loja bloqueada"
```

**Structure Decision**: módulos novos `employees` e `partners` seguem o mesmo corte dos módulos de 001 (rota, controller, service, repository, schemas). Regras de decisão ficam em funções puras testadas sozinhas. A tela só esconde o que a API já recusaria.

## Complexity Tracking

| Ponto | Por que é necessário | Alternativa mais simples recusada porque |
|---|---|---|
| Política de RLS em `farmarcas_employees` que libera ao grupo só o seu Anjo | O grupo precisa ver o Anjo na página da loja | Copiar nome e contato do Anjo para o grupo: duplicaria dado de pessoa e ficaria velho quando o funcionário mudasse |
| Campos `entity_type` e `entity_id` na auditoria | Funcionário e parceiro precisam de histórico e não são de nenhum grupo | Uma tabela de auditoria por cadastro: três trilhas para manter, com regras de somente acréscimo repetidas |
