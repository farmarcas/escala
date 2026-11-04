# Especificação: Perfil do funcionário e acesso aos sistemas da Suite

**Feature Branch**: `005-funcionario-acessos`

**Created**: 2026-11-02

**Status**: Implementado

**Input**: "verifique a página detalhe do funcionário para ter as mesmas funções que o sistema legado, porém use os modelos atuais, o funcionário precisa ter acesso a determinados sistemas do suite, independente do cargo o usuário pode ser administrador, analista, gestor; defina regras para cada um deles e ajuste a página". Referência: tela "Perfil do usuário" do sistema legado (abas Dados gerais e Sistemas e acesso).

## Contexto

Hoje o detalhe do funcionário (spec 003) mostra os dados num cartão, a carteira como Anjo e o histórico. Cada funcionário tem um único "papel de acesso", e esse papel vale só para o Backoffice: Administrador, Analista ou Sem acesso.

O sistema legado organiza o funcionário como **Perfil do usuário**, em duas abas:
- **Dados gerais**: informações gerais e informações profissionais.
- **Sistemas e acesso**: a quais sistemas a pessoa tem acesso.

Esta entrega leva esse jeito para a Radar Suite, com o visual atual. A mudança principal é que o acesso passa a ser **por sistema**: a mesma pessoa pode ser Administrador no Backoffice e Analista no Gestão 360. O papel não depende do cargo.

Sistemas da Suite considerados nesta entrega:

| Sistema | Situação hoje | O que o papel muda |
| --- | --- | --- |
| Backoffice | No ar | As regras abaixo valem na hora |
| Gestão 360 | Em desenvolvimento | O acesso fica registrado; as regras valem quando o sistema entrar no ar |
| Escala | Em desenvolvimento | Igual ao Gestão 360 |

### Os três papéis

A regra geral vale para qualquer sistema da Suite:
- **Administrador**: faz tudo no sistema, inclusive as configurações e quem tem acesso a ele.
- **Gestor**: opera o sistema por inteiro, ou seja, cadastra, altera, decide e aprova, mas não mexe em configurações nem em acessos.
- **Analista**: consulta e acompanha, sem alterar cadastros.

No **Backoffice**, isso fica assim:

| O que a pessoa faz | Administrador | Gestor | Analista |
| --- | :---: | :---: | :---: |
| Ver Início, Visão geral, grupos, lojas, marcas, parceiros e funcionários | ✔ | ✔ | ✔ |
| Ver dados pessoais do proprietário sem máscara | ✔ | ✔ | — |
| Cadastrar e alterar grupos, lojas, marcas e parceiros | ✔ | ✔ | — |
| Definir o Anjo, mudar etapa, bloquear loja, transferir titularidade, Cartão Alelo | ✔ | ✔ | — |
| Corrigir dados da loja, decidir solicitações, enviar documentos, cobrar revisão | ✔ | ✔ | — |
| Ações em lote e exportar CSV | ✔ | ✔ | só exportar |
| Cadastrar, alterar, desligar e religar funcionários | ✔ | — | — |
| Dar e tirar acesso aos sistemas | ✔ | — | — |
| Configurações | ✔ | — | — |

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Perfil do usuário com Dados gerais (Priority: P1)

O detalhe do funcionário vira **Perfil do usuário**. No topo aparecem a inicial, o nome, a ocupação e o tipo de perfil "Colaborador Farmarcas". A aba **Dados gerais** traz duas seções:
- **Informações gerais**: nome completo, gênero, telefone fixo, celular e e-mail.
- **Informações profissionais**: departamento e ocupação.

O administrador altera tudo ali mesmo, sem abrir janela.

**Why this priority**: é a tela que a operação já conhece do sistema legado. Os campos novos (gênero, celular, telefone fixo, departamento e ocupação de lista) entram aqui.

**Independent Test**:
1. Abrir um funcionário e ver as duas seções preenchidas.
2. Como administrador, mudar o celular e a ocupação, salvar e ver as duas mudanças no histórico.
3. Como analista, ver a mesma tela sem poder editar.

**Acceptance Scenarios**:

1. **Given** a lista de funcionários, **When** a pessoa abre um funcionário, **Then** vê "Perfil do usuário" com:
   - "‹ Voltar", que leva de volta à lista;
   - a inicial em círculo, o nome e a ocupação;
   - o tipo de perfil "Colaborador Farmarcas", fixo;
   - a situação (Ativo ou Desligado);
   - as abas Dados gerais e Sistemas e acesso.
2. **Given** a aba Dados gerais, **When** ela abre, **Then** mostra "Informações gerais" (nome completo, gênero, telefone fixo, celular, e-mail) e "Informações profissionais" (departamento, ocupação). Os campos obrigatórios têm asterisco.
3. **Given** o administrador na aba, **When** ele clica em "Editar", muda os campos e salva, **Then** as mudanças são gravadas e cada uma entra no histórico com o antes e o depois.
4. **Given** um e-mail que já é de outro funcionário, **When** o administrador salva, **Then** o sistema recusa e diz o motivo no campo.
5. **Given** um celular sem DDD ou com menos de 11 dígitos, ou um telefone fixo sem 10 dígitos, **When** o administrador salva, **Then** o sistema recusa e diz o motivo no campo.
6. **Given** um gestor ou um analista, **When** abre o perfil, **Then** vê todos os dados e não tem o botão "Editar".
7. **Given** o formulário "Novo funcionário" da lista, **When** o administrador cadastra alguém, **Then** o formulário pede os mesmos campos da aba Dados gerais.
8. **Given** a carteira como Anjo, o histórico e as ações Desligar e Religar, **When** o perfil abre, **Then** continuam disponíveis: a carteira e o histórico ficam na aba Dados gerais, abaixo das informações, e as ações ficam no topo.

---

### User Story 2 — Sistemas e acesso, com um papel por sistema (Priority: P1)

Na aba **Sistemas e acesso**, o administrador vê cada sistema da Suite com uma chave "tem acesso" e, quando ligada, o papel: Administrador, Gestor ou Analista. Cada papel mostra, ali mesmo, o que permite naquele sistema.

**Why this priority**: é o pedido central. O acesso deixa de ser um papel único do Backoffice e passa a ser por sistema, independente do cargo.

**Independent Test**:
1. Dar a uma pessoa acesso ao Backoffice como Gestor e ao Gestão 360 como Analista.
2. Ver os dois acessos na aba e na lista de funcionários, e as duas mudanças no histórico.
3. Tirar o acesso ao Gestão 360 e ver que ele some.

**Acceptance Scenarios**:

1. **Given** a aba Sistemas e acesso, **When** ela abre, **Then** lista Backoffice, Gestão 360 e Escala, cada um com:
   - situação do sistema ("No ar" ou "Em desenvolvimento");
   - se a pessoa tem acesso;
   - o papel;
   - o resumo do que o papel permite.
2. **Given** o administrador, **When** ele liga o acesso a um sistema e escolhe o papel, **Then** o acesso é gravado e entra no histórico ("Backoffice: sem acesso → Gestor").
3. **Given** o administrador, **When** ele troca o papel ou desliga o acesso, **Then** a mudança é gravada e entra no histórico com o antes e o depois.
4. **Given** um sistema em desenvolvimento, **When** o administrador dá acesso, **Then** o acesso fica registrado, com o aviso "vale quando o sistema entrar no ar".
5. **Given** o último administrador ativo do Backoffice, **When** alguém tenta tirar o acesso dele, rebaixá-lo ou desligá-lo, **Then** o sistema recusa: o Backoffice precisa ter sempre pelo menos um administrador.
6. **Given** o administrador no próprio perfil, **When** ele tenta mudar o próprio acesso, **Then** o sistema recusa. Outra pessoa administradora precisa fazer isso.
7. **Given** um funcionário desligado, **When** o perfil abre, **Then** a aba mostra todos os acessos como encerrados, com a data do desligamento. Ao religar, a pessoa volta sem acesso, e o administrador concede de novo.
8. **Given** a lista de funcionários, **When** ela abre, **Then** a coluna "Papel" vira "Acessos" e mostra os sistemas da pessoa com o papel de cada um (ex.: "Backoffice · Gestor"). O filtro "Papel" passa a filtrar por "Sistema e papel".
9. **Given** um gestor ou um analista, **When** abre a aba, **Then** vê os acessos e não consegue mudá-los.

---

### User Story 3 — O papel Gestor vale no Backoffice (Priority: P2)

O Backoffice passa a reconhecer três papéis. O gestor faz o trabalho de operação que hoje só o administrador faz, mas não entra em Configurações nem mexe em funcionários e acessos.

**Why this priority**: sem isso, o papel Gestor existiria só no cadastro. Fica depois das US1 e US2 porque elas já entregam a tela e o registro dos acessos.

**Independent Test**:
1. Trocar o seletor de papel do topo para Gestor.
2. Editar um grupo, definir um Anjo e decidir uma solicitação de loja, e ver tudo funcionar.
3. Abrir Configurações e ver "Você não tem acesso a esta área".
4. No perfil de um funcionário, não ver "Editar" nem as chaves de acesso.

**Acceptance Scenarios**:

1. **Given** o seletor de papel de demonstração no topo, **When** a pessoa abre o seletor, **Then** aparecem Administrador, Gestor e Analista da plataforma, além dos grupos.
2. **Given** o papel Gestor, **When** ele faz qualquer ação da tabela "No Backoffice" marcada para o gestor, **Then** a ação funciona como para o administrador.
3. **Given** o papel Gestor, **When** ele tenta uma ação só do administrador (funcionários, acessos, Configurações), **Then** a tela não oferece a ação e o servidor recusa se ela chegar por fora.
4. **Given** o papel Gestor, **When** ele corrige dados de uma loja, **Then** o histórico da loja mostra "Gestor da plataforma" como papel de quem fez.
5. **Given** o papel Analista, **When** ele usa o Backoffice, **Then** tudo continua como hoje: só consulta, com os dados pessoais do proprietário mascarados.

---

### Edge Cases

- **Funcionário sem nenhum acesso**: continua no cadastro, pode ser Anjo e aparece como "Sem acesso" na lista.
- **Funcionários que já existem**: o papel de acesso atual vira o acesso ao Backoffice. Administrador vira Administrador, Analista vira Analista, e "Sem acesso ao Backoffice" vira nenhum acesso.
- **Celular dos funcionários que já existem**: o telefone atual vira celular quando tem 11 dígitos, e telefone fixo quando tem 10. Quem fica sem celular aparece com o aviso "Complete o celular", e o administrador preenche ao editar, porque o campo é obrigatório.
- **Departamento e ocupação dos que já existem**: a área atual vira o departamento. O cargo atual vira a ocupação; cada cargo diferente vira um item da lista de ocupações.
- **Departamento ou ocupação desativados em Configurações**: quem já tem continua com eles, com a marca "desativado", mas não dá para escolhê-los em cadastro novo. É a mesma regra dos atributos da loja.
- **Duas pessoas editando o mesmo perfil**: a segunda a salvar recebe "Este perfil mudou desde que você abriu. Recarregue." e nada se perde.
- **Gênero**: é opcional e tem a opção "Prefiro não informar".

## Requirements *(mandatory)*

### Functional Requirements

**Perfil e Dados gerais**

- **FR-001**: O detalhe do funcionário MUST se chamar "Perfil do usuário", com:
  - "‹ Voltar";
  - a inicial, o nome e a ocupação;
  - o tipo de perfil "Colaborador Farmarcas", fixo;
  - a situação;
  - as abas Dados gerais e Sistemas e acesso;
  - as ações Desligar e Religar, para o administrador.
- **FR-002**: Os dados gerais MUST ser:
  - nome completo (obrigatório, de 3 a 120 caracteres);
  - gênero (opcional: Feminino, Masculino, Outro, Prefiro não informar);
  - telefone fixo (opcional, com DDD, 10 dígitos);
  - celular (obrigatório, com DDD, 11 dígitos);
  - e-mail corporativo (obrigatório e único entre os funcionários).
- **FR-003**: Os dados profissionais MUST ser departamento e ocupação, os dois obrigatórios e escolhidos de listas mantidas em Configurações.
- **FR-004**: Só o administrador MUST editar os dados, na própria aba ("Editar" → campos → "Salvar"/"Cancelar"). Gestor e analista só veem.
- **FR-005**: O formulário "Novo funcionário" MUST pedir os mesmos campos de FR-002 e FR-003. O acesso aos sistemas é definido depois, na aba Sistemas e acesso.
- **FR-006**: A carteira como Anjo e o histórico do cadastro MUST continuar no perfil, na aba Dados gerais.

**Listas de departamento e ocupação**

- **FR-010**: Configurações MUST ganhar a seção "Pessoas da Farmarcas", com duas listas: Departamentos e Ocupações. As duas funcionam como os atributos da loja: incluir, alterar, ordenar, desativar, excluir sem uso e histórico.
- **FR-011**: Departamentos MUST começar com as 6 áreas de hoje (Comercial, Financeiro do associado, Trade, Produtos digitais, Sucesso do associado, Operações).
- **FR-012**: Ocupações MUST começar com os cargos que já existem no cadastro.

**Sistemas e acesso**

- **FR-020**: Cada funcionário MUST ter, para cada sistema da Suite (Backoffice, Gestão 360, Escala), nenhum acesso ou um único papel: Administrador, Gestor ou Analista.
- **FR-021**: A aba MUST mostrar, para cada sistema:
  - situação do sistema;
  - acesso e papel;
  - o resumo do que o papel permite, conforme as regras do Contexto.
- **FR-022**: Só o administrador do Backoffice MUST conceder, trocar e tirar acessos.
- **FR-023**: Ninguém MUST alterar o próprio acesso. A regra passa a bloquear quando existir login: só então o sistema sabe que funcionário está usando a tela. Os papéis de demonstração não são pessoas do cadastro.
- **FR-024**: O Backoffice MUST ter sempre pelo menos um administrador ativo. O sistema recusa tirar, rebaixar ou desligar o último.
- **FR-025**: Desligar MUST encerrar todos os acessos da pessoa. Religar MUST trazer a pessoa sem acesso.
- **FR-026**: Toda concessão, troca e retirada de acesso MUST entrar no histórico do funcionário com o antes e o depois.
- **FR-026a**: A aba MUST mostrar os módulos como widgets numa grade de 3 a 4 colunas (1 no celular), um por módulo, com o nível de acesso, o que ele permite e a data. Cada módulo pode ganhar recursos e níveis de acesso próprios dentro do seu widget. Todo módulo novo da Suite MUST aparecer nesta aba.
- **FR-027**: Na lista de funcionários:
  - a coluna "Papel" MUST virar "Acessos";
  - o filtro "Papel" MUST virar "Sistema e papel";
  - o indicador "Administradores da plataforma" MUST contar quem é administrador do Backoffice;
  - a exportação CSV MUST trazer os acessos.

**Papéis no Backoffice**

- **FR-030**: O Backoffice MUST reconhecer os papéis Administrador, Gestor e Analista da plataforma e aplicar a tabela "No Backoffice" do Contexto na tela e no servidor.
- **FR-031**: O seletor de papel de demonstração MUST ganhar "Gestor da plataforma".
- **FR-032**: O histórico (da loja, do grupo e do funcionário) MUST mostrar "Gestor da plataforma" quando quem agiu for gestor.

### Key Entities

- **Funcionário Farmarcas** (já existe): ganha gênero, celular, telefone fixo, departamento e ocupação. O telefone, a área e o cargo de hoje viram esses campos. O "papel de acesso" único sai.
- **Departamento** e **Ocupação**: listas de Configurações, com nome, ordem e situação.
- **Sistema da Suite**: Backoffice, Gestão 360 e Escala, cada um com nome e situação (no ar ou em desenvolvimento). Nesta entrega é uma lista fixa.
- **Acesso**: um funcionário, um sistema e um papel (Administrador, Gestor ou Analista), com datas de início e de encerramento.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O administrador dá a uma pessoa acesso a dois sistemas, com papéis diferentes, em menos de 1 minuto.
- **SC-002**: 100% dos funcionários que já existem mantêm o acesso ao Backoffice que tinham (Administrador ou Analista) depois da mudança.
- **SC-003**: Nos testes de acesso, o gestor consegue todas as ações de operação da tabela e 0 ações só do administrador. O analista consegue 0 alterações.
- **SC-004**: 100% das mudanças de dados e de acesso aparecem no histórico do funcionário com quem fez e quando.
- **SC-005**: O Backoffice nunca fica sem administrador ativo: 0 casos aceitos nos testes.

## Fora desta entrega

- **Enviar convite e login.** A tela legada diz "Complete as informações para enviar o convite". O convite depende do login, que a Suite ainda não tem (lacuna conhecida: autenticação). Por enquanto, o acesso fica registrado e vale para o seletor de papel de demonstração.
- **Outros tipos de perfil** além de "Colaborador Farmarcas". As pessoas dos grupos (farmacêutico, gerente…) vêm do módulo Cadastros do lado do associado.
- **Regras internas do Gestão 360 e do Escala.** Ficam com cada sistema quando ele for construído, seguindo a regra geral dos três papéis.
- **Cadastro de novos sistemas da Suite** em Configurações.

## Assumptions

- "Independente do cargo" quer dizer que o papel em cada sistema não depende da ocupação: um Analista de relacionamento pode ser Administrador no Backoffice.
- O gestor do Backoffice tem as mesmas permissões de operação do administrador, sem Configurações, funcionários e acessos. Os dados pessoais do proprietário aparecem sem máscara para o gestor, porque ele decide solicitações que dependem deles.
- Departamento e ocupação viram listas em Configurações. Isso também responde à pergunta pendente da spec 004 sobre "criação de áreas para o sistema".
- Decisão: o acesso por sistema fica numa tabela própria (funcionário + sistema + papel). Por quê: cada pessoa pode ter vários sistemas, e o histórico de cada acesso fica claro.
- Decisão: departamento e ocupação usam o mesmo cadastro de listas de Configurações da spec 004. Por quê: a tela, a regra de desativar e o histórico já existem.
