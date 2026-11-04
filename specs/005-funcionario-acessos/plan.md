# Implementation Plan: Perfil do funcionário e acesso aos sistemas da Suite

**Branch**: `005-funcionario-acessos` (o trabalho segue na branch do PR atual) | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-funcionario-acessos/spec.md`

## Summary

O detalhe do funcionário vira **Perfil do usuário**, com as abas **Dados gerais** e **Sistemas e acesso**, como no sistema legado.

- **Dados gerais**: o funcionário ganha gênero, celular, telefone fixo, departamento e ocupação. Departamento e ocupação vêm de listas de Configurações (seção nova "Pessoas da Farmarcas").
- **Sistemas e acesso**: o papel único do Backoffice dá lugar a um acesso por sistema (Backoffice, Gestão 360, Escala), cada um com papel Administrador, Gestor ou Analista.
- **Gestor no Backoffice**: o Backoffice passa a reconhecer o gestor, que opera tudo, menos funcionários, acessos e Configurações.

Abordagem:
- **Banco**:
  - Uma migration cria a tabela de acessos e as colunas novas, copia os dados de hoje (área, cargo, telefone e papel) e retira as colunas antigas.
  - As listas de departamento e ocupação são dois tipos novos no catálogo de Configurações.
- **API**:
  - O módulo `employees` muda os campos e ganha as rotas de acesso e de opções.
  - O guarda de papel passa a aceitar mais de um papel, com dois atalhos: `operators` (administrador e gestor) e `adminOnly`.
  - O `settings-catalog` ganha a seção de pessoas.
- **Tela**:
  - A feature `employees` ganha o perfil com abas e o novo formulário de cadastro.
  - O contexto de papel ganha o Gestor e o atalho `canOperate`.
  - Configurações ganha a seção nova.

## For the reader

**Chosen:** guardar o acesso de cada pessoa sistema por sistema, com a data em que começou e terminou.
**Why:** a mesma pessoa pode ter papéis diferentes em cada sistema, e o histórico mostra quem deu e quem tirou cada acesso.

**Chosen:** departamento e ocupação viram listas em Configurações, do mesmo jeito que os atributos da loja.
**Why:** a tela de manter listas já existe, e você inclui "Capacitação e Desenvolvimento" sem depender de ninguém.

**Chosen:** na mudança, cada pessoa mantém o acesso ao Backoffice que já tinha, e o telefone, a área e o cargo de hoje viram celular, departamento e ocupação.
**Why:** ninguém perde acesso nem dado no dia da troca.

**Chosen:** a regra "ninguém muda o próprio acesso" fica pronta, mas só passa a bloquear quando existir login.
**Why:** hoje os papéis de demonstração não são pessoas do cadastro, então o sistema ainda não sabe quem é "você".

## Technical Context

**Language/Version**: Node 22 + TypeScript (API); React 18 + TypeScript (tela).

**Primary Dependencies**: as que o projeto já tem. Nenhuma nova.

**Storage**: PostgreSQL 16. Uma migration com cópia e retirada dos dados, editada à mão (índice parcial, cópia e RLS). O seed de funcionários é reescrito.

**Testing**: Vitest e Supertest (`research.md`, R11).

**Target Platform**: navegador desktop e celular, ambiente Docker local.

**Project Type**: aplicação web (API + SPA).

**Performance Goals**: a lista de até 500 funcionários, com filtro por acesso, responde na hora (menos de 300 ms local).

**Constraints**:
- O Backoffice nunca fica sem administrador.
- O histórico é somente acréscimo.
- O analista continua só leitura.
- Nenhum funcionário perde acesso na migration.

**Scale/Scope**: 3 sistemas e 3 papéis. As mudanças tocam 6 módulos da API e 8 telas por causa do gestor. São 2 abas novas e 2 listas novas em Configurações.

## Constitution Check

| Princípio | Situação |
| --- | --- |
| I. Spec Kit | ✅ spec aprovada; plano em aprovação |
| II. Docker | ✅ nada fora do Compose |
| III. Stack padrão | ✅ sem tecnologia nova |
| IV. Banco só por migration | ✅ uma migration nova; seed reescrito (seed não é migration) |
| V. Dados protegidos | ✅ a migration copia antes de retirar; nenhum comando destrutivo no volume |
| VI. Linguagem simples | ✅ |
| VII. Começar pequeno | ✅ três fatias (US1, US2, US3), cada uma conferida no navegador |
| VIII. Agente decide o técnico | ✅ decisões em `research.md` |

## Project Structure

### Documentation

```text
specs/005-funcionario-acessos/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/api.md
├── checklists/requirements.md
└── tasks.md   # próxima etapa
```

### Source Code

```text
backend/node/
├── prisma/schema.prisma                                  # enums novos, FarmarcasEmployee, EmployeeSystemAccess
├── prisma/migrations/20261102120000_funcionario_acessos/  # cópia + retirada
├── seeds/20261031130000_funcionarios_e_anjos.sql          # reescrito com as colunas novas
└── src/
    ├── shared/identity/                                   # PLATFORM_MANAGER, requirePlatformRoles, canSeeOwnerData, demo manager
    ├── modules/employees/
    │   ├── suite-systems.ts                               # sistemas, papéis e regras (texto)
    │   ├── access-rules.ts (+ test)                       # último admin, desligar, resumo
    │   ├── employees.schemas.ts / service / repository / controller / routes / csv
    │   └── employees.routes.integration.test.ts           # campos, acessos, último admin, gestor
    ├── modules/settings-catalog/                          # seção people: departments, occupations; inUse
    ├── modules/{brands,economic-groups,stores,partners}/  # adminOnly → operators
    ├── modules/store-page/                                # permissions (gestor), presenters, catálogo só da loja, Anjo
    └── test-support/owner-db.ts                           # createEmployee com os campos novos

frontend/react/src/
├── features/demo-role/                                    # papel manager, canOperate, seletor
├── features/employees/
│   ├── components/EmployeeProfileView.tsx                 # topo + abas (substitui EmployeeDetailView)
│   ├── components/GeneralDataTab.tsx                      # Informações gerais e profissionais, edição na aba
│   ├── components/AccessTab.tsx                           # um cartão por sistema
│   ├── components/EmployeeFormModal.tsx                   # novos campos
│   ├── components/EmployeesTable.tsx, filterFields.ts, labels.ts, types.ts
│   └── hooks/useEmployeeOptions…                          # departamentos, ocupações, sistemas, papéis
├── features/settings/                                     # seção Pessoas da Farmarcas; inUse com unidade
├── features/audit/components/AuditTrail.tsx               # rótulo do gestor
├── features/{economic-groups,stores,store-page}/          # Anjo: ocupação e celular
└── app/*Page.tsx                                          # isAdmin → canOperate onde é operação
```

**Structure Decision**: a aplicação web continua a mesma. O perfil fica na feature `employees`, que já tem o detalhe. As listas novas entram no `settings-catalog`, sem módulo novo.

## Ordem de entrega

1. **Fundação**: migration, seed, Prisma, catálogo de pessoas em Configurações e Anjo lendo ocupação e celular. A API e a tela continuam funcionando.
2. **US1 (P1)**: campos novos na API (CRUD, versão, opções) e perfil com a aba Dados gerais e o novo formulário de cadastro.
3. **US2 (P1)**: tabela de acessos na API (conceder, trocar, tirar, desligar, último administrador), aba Sistemas e acesso, lista, filtros, indicadores e CSV.
4. **US3 (P2)**: papel Gestor na API (guardas, máscara, página da loja) e na tela (seletor, `canOperate`, rótulos).
5. **Acabamento**: templates, checagens e o roteiro do quickstart no navegador.

## Complexity Tracking

Sem violações.
