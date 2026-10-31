# Especificação: Backoffice Farmarcas — fase 2 (funcionários, parceiros e pendências do cadastro)

**Feature Branch**: `003-backoffice-fase-2`

**Created**: 2026-10-31

**Status**: Draft

**Input**: "vamos fazer o que falta de backoffice, funcionário são realmente funcionários Farmarcas e Parceiros são nossas indústrias e distribuidores". Respostas da pessoa: Parceiros guarda a empresa e os contatos, sem ligação com lojas por enquanto. Loja "Bloqueada" corta o acesso da loja à Radar Suite.

Referências do pacote: `project/Suite Operator.dc.html` (Transferir titularidade, Cartão Alelo), `project/Lojas Lista.dc.html` (Anjo, Status, Situação, Bloqueio, ações em lote, Exportar CSV, alertas), `project/Loja Detalhe.dc.html` (bloco "Anjo Farmarcas"), `project/Gestão 360.dc.html` (o Anjo do grupo é o responsável pelos chamados e planos), `project/uploads/01-product-vision.md` e `project/uploads/M1-cadastros.md`.

## Contexto

As entregas 001 e 002 fizeram o cadastro de marcas, grupos e lojas e a página da loja. Esta fase completa o Backoffice antes do Gestão 360:

- **Funcionários** são as pessoas da **Farmarcas**. Entre elas estão os **Anjos**: o Anjo é o funcionário que acompanha um grupo econômico. O Gestão 360 usa o Anjo como responsável pelos chamados e planos do grupo, por isso ele precisa existir antes.
- **Parceiros** são as **indústrias e os distribuidores** com quem a Farmarcas trabalha.
- O resto são pendências que as entregas anteriores deixaram para depois: etapa e bloqueio da loja, transferência de titularidade, Cartão Alelo, ações em lote e exportação.

Os funcionários dos grupos (farmacêutico, gerente, balconista…) **não** entram aqui. Eles são do grupo e vêm do módulo Cadastros do lado do associado.

## User Scenarios & Testing *(mandatory)*

### User Story 0 — Início: mapa da rede (Priority: P1)

Pedido em 2026-10-31, a partir do protótipo `Proj. Suíte – Suite Operator (1).html` (componente "Home Mapa").

O Backoffice ganha a tela **Início**, a primeira do menu. Ela mostra a presença da rede no mapa do Brasil, estado por estado. Tudo vem do cadastro de lojas e grupos que já existe.

- O mapa pinta cada estado conforme a medida escolhida: **Lojas**, **Grupos**, **Lojas por grupo** ou **Com proprietário**.
- Ao lado ficam os cartões **Brasil** e das 5 regiões (lojas, % da rede, grupos e "N de M estados").
- Clicar numa região aproxima o mapa nela. Clicar num estado aproxima e abre o painel do estado.
- Embaixo, a tabela **Estados** ordena os estados pela medida escolhida.

**Why this priority**: é a porta de entrada do Backoffice e usa só dados que já existem. Pode ir para o ar antes de todo o resto.

**Independent Test**:
1. Abrir o Início e ver o mapa com os estados que têm lojas pintados.
2. Clicar em São Paulo e conferir que o número de lojas do painel bate com a lista de Lojas filtrada por SP.
3. Clicar em "Ver lojas de SP" e chegar a essa lista.

**Acceptance Scenarios**:

1. **Given** o menu, **When** a pessoa entra no Backoffice, **Then** a primeira tela é Início. "Visão geral" continua no menu, logo abaixo, e o Início tem um atalho para ela.
2. **Given** o Início, **When** a pessoa escolhe a medida (Lojas, Grupos, Lojas por grupo, Com proprietário), **Then** as cores do mapa, as etiquetas dos estados, a legenda e a ordem da tabela mudam para aquela medida.
3. **Given** o mapa, **When** a pessoa passa o mouse num estado, **Then** aparece "Nome do estado · N lojas · N grupos", ou "sem lojas associadas".
4. **Given** um cartão de região, **When** a pessoa clica nele, **Then** o mapa aproxima a região, o cartão fica destacado, a tabela mostra só os estados da região e aparece "‹ Voltar para o Brasil".
5. **Given** um estado com lojas, **When** a pessoa clica nele (no mapa ou na tabela), **Then** abre o painel do estado com:
   - os indicadores Lojas (em N cidades), Grupos (lojas por grupo), Com proprietário (N de M) e Marcas (com a líder);
   - as 4 cidades com mais lojas e quantas lojas ficam nas outras;
   - a divisão das lojas por marca (as 3 maiores e "Outras");
   - os 3 grupos com mais lojas no estado.
6. **Given** o painel do estado, **When** a pessoa clica num grupo, em "Ver grupos de UF" ou em "Ver lojas de UF", **Then** vai para o detalhe do grupo ou para a lista filtrada por aquele estado.
7. **Given** um estado sem nenhuma loja, **When** a pessoa clica nele, **Then** o painel diz "Nenhum grupo econômico ou loja associada nesta UF". A tabela lista esses estados em "Sem presença".
8. **Given** o papel Analista, **When** o Início abre, **Then** vê os mesmos números. A tela não mostra nenhum dado de pessoa.

---

### User Story 1 — Cadastrar os funcionários da Farmarcas (Priority: P1)

O administrador da plataforma cadastra as pessoas da Farmarcas que usam a Radar Suite: nome, e-mail corporativo, telefone, área, cargo e papel de acesso ao Backoffice. A lista mostra quem está ativo, de que área é e quantos grupos acompanha como Anjo.

**Why this priority**: sem os funcionários não existe Anjo. Sem Anjo, o Gestão 360 não tem a quem entregar chamados e planos.

**Independent Test**: abrir "Funcionários", cadastrar uma pessoa da área Sucesso do associado, achá-la pela busca, editar o cargo e desligá-la.

**Acceptance Scenarios**:

1. **Given** o formulário "Novo funcionário", **When** o administrador preenche nome, e-mail corporativo, área, cargo e papel e salva, **Then** a pessoa aparece na lista como Ativa.
2. **Given** um e-mail que já pertence a outro funcionário, **When** o administrador salva, **Then** o sistema recusa e diz o motivo no campo.
3. **Given** a lista, **When** a pessoa busca por nome ou e-mail ou filtra por área, papel ou situação, **Then** só aparecem os funcionários que atendem a todos os filtros, com "Exibindo X de Y".
4. **Given** o topo da tela, **When** ela abre, **Then** mostra os indicadores: funcionários ativos, Anjos (com quantos grupos acompanham ao todo), grupos sem Anjo e administradores da plataforma.
5. **Given** um funcionário ativo que não é Anjo de nenhum grupo, **When** o administrador clica em "Desligar" e escreve o motivo, **Then** ele fica Desligado, sai das listas de escolha e o desligamento entra no histórico.
6. **Given** um funcionário que ainda é Anjo de algum grupo, **When** o administrador tenta desligá-lo, **Then** o sistema recusa e pede para passar os grupos a outro Anjo antes.

---

### User Story 2 — Definir o Anjo de cada grupo (Priority: P1)

O administrador escolhe o Anjo de cada grupo econômico. O Anjo aparece no detalhe do grupo, na página da loja e na lista de lojas. Dá para filtrar lojas e grupos pelo Anjo. No detalhe do funcionário aparece a carteira: os grupos que ele acompanha.

**Why this priority**: é o que o Gestão 360 consome. Também responde à pergunta mais comum da operação: "quem cuida deste grupo?".

**Independent Test**: no detalhe de um grupo sem Anjo, escolher um Anjo e ver o nome dele no grupo, nas lojas do grupo e na carteira do funcionário. Depois trocar o Anjo e ver a troca no histórico do grupo.

**Acceptance Scenarios**:

1. **Given** um grupo sem Anjo, **When** a lista de grupos é exibida, **Then** ele leva o selo "Sem Anjo".
2. **Given** o detalhe do grupo, **When** o administrador clica em "Definir Anjo" e escolhe um funcionário ativo, **Then** o grupo passa a mostrar o Anjo, e todas as lojas do grupo mostram o mesmo Anjo.
3. **Given** um grupo com Anjo, **When** o administrador troca o Anjo, **Then** a troca entra na auditoria do grupo com o Anjo anterior e o novo.
4. **Given** a lista de grupos, **When** o administrador seleciona vários grupos e escolhe "Atribuir Anjo", **Then** todos passam a ter o Anjo escolhido, cada um com seu registro na auditoria.
5. **Given** a lista de lojas ou de grupos, **When** a pessoa filtra pelo Anjo, **Then** só aparecem os grupos (ou as lojas dos grupos) daquele Anjo.
6. **Given** a página da loja, **When** ela abre, **Then** o bloco "Anjo Farmarcas" mostra nome, cargo, e-mail e telefone do Anjo, no lugar do aviso "chega com o cadastro de funcionários".

---

### User Story 3 — Cadastrar os parceiros: indústrias e distribuidores (Priority: P2)

O administrador cadastra as empresas parceiras da Farmarcas: tipo (Indústria ou Distribuidor), CNPJ, razão social, nome fantasia e os contatos comerciais (nome, cargo, e-mail e telefone, com um contato principal). O analista consulta.

**Why this priority**: é cadastro de base que os próximos módulos vão usar. Não depende de grupos nem de lojas.

**Independent Test**: cadastrar uma indústria com dois contatos, marcar um como principal, achá-la pela busca, filtrar por Distribuidor e não vê-la, inativar e reativar.

**Acceptance Scenarios**:

1. **Given** o formulário "Novo parceiro", **When** o administrador escolhe o tipo, preenche CNPJ, razão social e nome fantasia e salva, **Then** o parceiro aparece na lista como Ativo.
2. **Given** um CNPJ inválido ou já cadastrado em outro parceiro, **When** o administrador salva, **Then** o sistema recusa e diz o motivo no campo.
3. **Given** a lista, **When** a pessoa escolhe Todos / Indústrias / Distribuidores, busca por nome, razão social ou CNPJ, ou filtra pela situação, **Then** a tabela filtra, com "Exibindo X de Y".
4. **Given** o detalhe do parceiro, **When** o administrador adiciona, edita ou remove um contato, ou troca o contato principal, **Then** a mudança aparece na hora e entra no histórico do parceiro.
5. **Given** o topo da tela, **When** ela abre, **Then** mostra os indicadores: parceiros ativos, indústrias, distribuidores e parceiros sem contato principal.
6. **Given** um parceiro ativo, **When** o administrador clica em "Inativar" e escreve o motivo, **Then** ele fica Inativo, continua consultável e pode ser reativado. Parceiro não é excluído.

---

### User Story 4 — Etapa e bloqueio da loja (Priority: P2)

Cada loja passa a ter uma **etapa** (Prospecção, Montagem ou Inaugurada) e uma marca de **bloqueio**. Loja bloqueada perde o acesso à Radar Suite: ninguém do grupo consegue usar a página daquela loja até o desbloqueio. A lista de lojas ganha as colunas e os filtros de Etapa, Situação e Bloqueio, como no protótipo.

**Why this priority**: a lista de lojas do protótipo já mostra essas colunas, e o bloqueio é a forma de a Farmarcas cortar o acesso de uma loja sem inativá-la.

**Independent Test**: bloquear uma loja com motivo, entrar como proprietário do grupo e ver que a loja aparece como bloqueada e não abre. Desbloquear e ver que volta a abrir.

**Acceptance Scenarios**:

1. **Given** uma loja nova, **When** ela é cadastrada, **Then** nasce na etapa Prospecção, ou em outra que o administrador escolher no formulário.
2. **Given** uma loja em Montagem, **When** o administrador muda a etapa para Inaugurada, **Then** o sistema pede a data de inauguração, que vira a data de abertura da loja.
3. **Given** o administrador volta uma loja para uma etapa anterior, **When** confirma, **Then** o sistema exige justificativa, que vai para a auditoria do grupo.
4. **Given** uma loja desbloqueada, **When** o administrador clica em "Bloquear loja" e escreve o motivo, **Then** a loja fica Bloqueada, com o motivo, a data e quem bloqueou no histórico.
5. **Given** uma loja bloqueada, **When** alguém do grupo tenta abrir a página dela ou gravar algo nela, **Then** o sistema mostra "Loja bloqueada pela Farmarcas" e não deixa ver nem alterar os dados da loja. As outras lojas do grupo continuam normais.
6. **Given** uma loja bloqueada, **When** o administrador clica em "Desbloquear" com justificativa, **Then** o acesso volta.
7. **Given** a lista de lojas, **When** a pessoa filtra por etapa, situação, bloqueio ou pelo alerta "Dados desatualizados (+90 dias)", **Then** a tabela filtra.

---

### User Story 5 — Transferir a titularidade do grupo (Priority: P3)

O administrador troca o proprietário de um grupo por "Transferir titularidade". Ele informa os dados do novo proprietário e uma justificativa. O novo proprietário recebe um código novo, e o anterior deixa de ser o proprietário.

**Why this priority**: hoje o proprietário fica travado depois de cadastrado (regra da entrega 001). Esta é a saída prevista para trocá-lo.

**Independent Test**: em um grupo com proprietário, transferir para outra pessoa com justificativa. Conferir o nome novo, o código novo e o evento "Titularidade transferida para F-xxxx" na auditoria.

**Acceptance Scenarios**:

1. **Given** um grupo com proprietário e o papel Administrador, **When** a pessoa abre o detalhe, **Then** aparece "Transferir titularidade" no bloco do proprietário.
2. **Given** o formulário de transferência, **When** o administrador preenche nome, e-mail, telefone e justificativa e confirma, **Then** o grupo passa a ter o novo proprietário, com um código pseudonimizado novo.
3. **Given** a transferência feita, **When** a auditoria do grupo abre, **Then** mostra "Titularidade transferida para F-xxxx", com quem fez e a justificativa. O código do proprietário anterior fica no registro, sem nome nem contato.
4. **Given** o papel Analista, **When** o detalhe abre, **Then** a ação não aparece, e a gravação por fora da tela é recusada.

---

### User Story 6 — Cartão Alelo do grupo (Priority: P3)

O grupo pode ter um Cartão Alelo vinculado a uma das suas lojas ativas. O administrador registra o titular (nome, CPF e data de nascimento), o número do cartão e a loja. O analista vê o titular só por código.

**Why this priority**: está no protótipo do grupo, mas não trava nenhuma outra parte.

**Independent Test**: em "Editar grupo", preencher o Cartão Alelo com uma loja ativa, salvar e ver o bloco "Cartão Alelo" no detalhe. Trocar para Analista e ver o titular pseudonimizado.

**Acceptance Scenarios**:

1. **Given** "Editar grupo", **When** o administrador preenche titular, CPF, nascimento, número do cartão e loja e salva, **Then** o detalhe mostra o bloco "Cartão Alelo" com esses dados. O número do cartão aparece mascarado, com só os 4 últimos dígitos.
2. **Given** o campo "Loja vinculada", **When** a lista abre, **Then** só aparecem lojas ativas do grupo, com busca por CNPJ ou nome.
3. **Given** um cartão já cadastrado, **When** o administrador clica em "Alterar titular", **Then** precisa preencher CPF e nascimento do novo titular, e a troca entra na auditoria.
4. **Given** o papel Analista, **When** o detalhe abre, **Then** aparecem o código do titular e "Pseudonimizado" no lugar de CPF, nascimento e número.
5. **Given** a loja vinculada é inativada, **When** o detalhe do grupo abre, **Then** o bloco avisa que a loja do cartão está inativa.

---

### User Story 7 — Ações em lote e exportação (Priority: P3)

Na lista de lojas, a pessoa marca várias lojas e escolhe uma ação: exportar as selecionadas, bloquear ou desbloquear. As listas de lojas, de grupos, de funcionários e de parceiros ganham "Exportar CSV", que exporta o que está filtrado.

**Why this priority**: economiza trabalho na operação, mas cada ação já existe uma a uma.

**Independent Test**: filtrar lojas por UF, marcar três, bloquear em lote com um motivo e ver as três bloqueadas, cada uma com o seu registro. Exportar a lista filtrada e abrir o arquivo numa planilha.

**Acceptance Scenarios**:

1. **Given** a lista de lojas, **When** a pessoa marca lojas, **Then** aparece "Ações (N)" com Exportar selecionadas, Bloquear lojas e Desbloquear lojas.
2. **Given** "Bloquear lojas" com 3 lojas marcadas, **When** o administrador escreve um motivo e confirma, **Then** as 3 ficam bloqueadas, e cada grupo recebe na sua auditoria o registro da sua loja.
3. **Given** "Exportar CSV" em qualquer uma das quatro listas, **When** a pessoa clica, **Then** baixa um arquivo com as linhas e colunas que estão na tela, respeitando os filtros, que abre certo numa planilha em português (acentos e separador).
4. **Given** o papel Analista, **When** ele exporta, **Then** o arquivo traz proprietários e titulares só por código, e as ações de bloqueio não aparecem.

---

### Edge Cases

- Funcionário desligado continua aparecendo no histórico com o nome, mas não é mais escolhido como Anjo.
- Grupo arquivado mantém o Anjo, que não pode ser trocado até o grupo ser restaurado.
- Loja de grupo suspenso já fica sem acesso pela suspensão do grupo. Bloquear a loja continua possível, e o bloqueio fica valendo depois que o grupo voltar.
- Loja bloqueada continua visível e editável para a Farmarcas. O bloqueio só corta o lado do grupo.
- Loja inativa não pode ser vinculada a um Cartão Alelo novo.
- Parceiro com CNPJ de uma loja da rede: aceito, porque são cadastros diferentes.
- Ação em lote com lojas que já estão no estado pedido (por exemplo, bloquear uma já bloqueada): essas são puladas, e a tela diz quantas foram alteradas e quantas foram puladas.
- Exportação sem nenhuma linha: o arquivo sai só com o cabeçalho.

## Requirements *(mandatory)*

### Functional Requirements

**Menu**

- **FR-001**: "Funcionários" e "Parceiros" MUST sair do estado "Em desenvolvimento" e abrir as suas telas. O Gestão 360 continua em desenvolvimento.
- **FR-002**: O menu MUST começar por "Início", que vira a tela de entrada do Backoffice. "Visão geral" fica logo abaixo, com endereço próprio.

**Início — mapa da rede**

- **FR-100**: O Início MUST mostrar o mapa do Brasil por estado, com as 4 medidas: Lojas, Grupos, Lojas por grupo e Com proprietário (% dos grupos do estado com proprietário cadastrado). Cada medida tem 5 faixas de cor e a faixa "Sem presença", com legenda.
- **FR-101**: Os números MUST vir do cadastro. Entram as lojas não excluídas e não inativas. Um grupo conta no estado quando tem pelo menos uma loja que entra nessa conta. Grupos arquivados não entram. A lista de Lojas ganha a opção de status "Em operação", com a mesma regra, e o atalho "Ver lojas de UF" abre a lista com ela.
- **FR-102**: MUST existir o cartão Brasil e os cartões das 5 regiões, com lojas, % da rede, barra proporcional, grupos e "N de M estados com presença".
- **FR-103**: Região e estado MUST poder ser escolhidos pelo mapa, pelos cartões e pela tabela. O mapa aproxima o recorte, e "‹ Voltar" sobe um nível.
- **FR-104**: O painel do estado MUST mostrar os 4 indicadores, as 4 cidades com mais lojas (e o resto somado), a divisão por marca (3 maiores e "Outras"), os 3 grupos com mais lojas no estado e os atalhos para grupos e lojas filtrados pela UF.
- **FR-105**: A tabela "Estados" MUST ter as colunas UF, Estado, Região, Lojas, % rede, Grupos, Lojas/grupo, Com proprietário e a medida escolhida com barra. Ela é ordenada pela medida e lista à parte os estados sem presença.
- **FR-106**: O Início MUST funcionar no celular: o mapa ocupa a largura toda, e cartões, painel e tabela vêm abaixo dele. Tudo o que o mapa mostra também está na tabela, para quem não enxerga cores.
- **FR-107**: A fonte do mapa (svg-maps/brazil, licença CC BY 4.0) MUST ser citada na tela, como no protótipo.

**Funcionários da Farmarcas**

- **FR-010**: O cadastro de funcionário MUST ter nome, e-mail corporativo (único), telefone (opcional), área, cargo, papel de acesso e situação (Ativo ou Desligado).
- **FR-011**: As áreas MUST ser uma lista fechada, a mesma usada no Gestão 360: Comercial, Financeiro do associado, Trade, Produtos digitais, Sucesso do associado e Operações.
- **FR-012**: O papel de acesso MUST ser Administrador da plataforma, Analista da plataforma ou Sem acesso ao Backoffice.
- **FR-013**: Só o administrador cadastra, edita, desliga e religa funcionários. O analista consulta.
- **FR-014**: Desligar MUST exigir motivo e MUST ser recusado enquanto a pessoa for Anjo de algum grupo.
- **FR-015**: A lista MUST ter busca (nome, e-mail), filtros por área, papel e situação, os 4 indicadores da US1 e as colunas nome (com e-mail), área, cargo, papel, grupos como Anjo e situação.
- **FR-016**: O detalhe do funcionário MUST mostrar os dados, a carteira de grupos que ele acompanha como Anjo (com link para cada grupo) e o histórico de mudanças do cadastro.
- **FR-017**: Todo cadastro, mudança, desligamento e religamento de funcionário MUST gerar registro de auditoria com data/hora, ação, papel de quem fez e motivo (quando houver).

**Anjo do grupo**

- **FR-020**: Cada grupo MUST ter no máximo um Anjo, escolhido entre os funcionários ativos. As lojas do grupo mostram o Anjo do grupo.
- **FR-021**: Definir, trocar e retirar o Anjo MUST ser só do administrador e MUST entrar na auditoria do grupo com o Anjo anterior e o novo.
- **FR-022**: A lista de grupos MUST mostrar a coluna Anjo, o selo "Sem Anjo", o filtro por Anjo e a ação em lote "Atribuir Anjo".
- **FR-023**: A lista de lojas MUST mostrar a coluna Anjo e o filtro por Anjo.
- **FR-024**: A página da loja (operador e grupo) MUST mostrar o bloco "Anjo Farmarcas" com nome, cargo, e-mail e telefone.

**Parceiros**

- **FR-030**: O cadastro de parceiro MUST ter tipo (Indústria ou Distribuidor), CNPJ válido e único entre parceiros, razão social, nome fantasia e situação (Ativo ou Inativo).
- **FR-031**: Cada parceiro MUST poder ter vários contatos (nome, cargo, e-mail, telefone), com no máximo um principal.
- **FR-032**: Só o administrador cadastra, edita, inativa e reativa parceiros e contatos. O analista consulta. Parceiro não é excluído.
- **FR-033**: A lista MUST ter abas Todos / Indústrias / Distribuidores com contagem, busca (nome, razão social, CNPJ), filtro por situação, os 4 indicadores da US3 e as colunas parceiro (com razão social), tipo, CNPJ, contato principal, número de contatos e situação.
- **FR-034**: Toda mudança em parceiro ou contato MUST gerar registro de auditoria do parceiro.
- **FR-035**: Nesta fase, parceiros MUST NOT ter ligação com lojas, grupos ou marcas, nem acesso ao sistema.

**Etapa e bloqueio da loja**

- **FR-040**: A loja MUST ter etapa: Prospecção, Montagem ou Inaugurada. Avançar é livre para o administrador. Voltar exige justificativa. Chegar em Inaugurada exige a data de inauguração.
- **FR-041**: A loja MUST ter bloqueio (Bloqueada ou Desbloqueada). Bloquear e desbloquear são só do administrador e exigem motivo, que vai para a auditoria do grupo.
- **FR-042**: Loja bloqueada MUST ficar inacessível para o lado do grupo: a página da loja e as gravações nela são recusadas pelo próprio sistema, não só escondidas na tela. Em "Minhas lojas", ela aparece com o selo "Bloqueada" e sem link.
- **FR-043**: A lista de lojas MUST ter as colunas Etapa, Situação (o status atual: Pendente no grupo, Ativa, Inativa) e Bloqueio, com filtros para cada uma.
- **FR-044**: O alerta "Dados desatualizados (+90 dias)" MUST marcar a loja em operação que não teve mudança de cadastro nem validação nos últimos 90 dias, e MUST estar no filtro de alertas da lista.

**Titularidade**

- **FR-050**: "Transferir titularidade" MUST pedir nome, e-mail, telefone do novo proprietário e justificativa, e gerar código pseudonimizado novo.
- **FR-051**: A auditoria MUST registrar "Titularidade transferida para F-xxxx", com o código anterior, sem nome nem contato de nenhuma das duas pessoas.
- **FR-052**: A transferência MUST ser só do administrador e não vale para grupo arquivado.

**Cartão Alelo**

- **FR-060**: O grupo MUST poder ter um Cartão Alelo com titular (nome, CPF válido, data de nascimento), número do cartão e loja vinculada (loja ativa do mesmo grupo).
- **FR-061**: CPF, nascimento e número do cartão MUST aparecer só para o administrador. O número aparece mascarado, com os 4 últimos dígitos. O analista vê o titular só por código.
- **FR-062**: Trocar o titular MUST pedir CPF e nascimento do novo titular e entrar na auditoria, sem os dados pessoais no registro.

**Lote e exportação**

- **FR-070**: A lista de lojas MUST permitir marcar lojas (uma a uma ou todas as filtradas) e aplicar Exportar selecionadas, Bloquear lojas e Desbloquear lojas.
- **FR-071**: Ação em lote MUST pedir um único motivo, gravar um registro por loja e informar quantas foram alteradas e quantas foram puladas.
- **FR-072**: As listas de lojas, grupos, funcionários e parceiros MUST ter "Exportar CSV" do que está filtrado, em formato que abre certo em planilha em português.
- **FR-073**: A exportação MUST seguir a mesma regra de pseudonimização da tela de quem exporta.

**Regras que continuam valendo**

- **FR-080**: As regras de papel MUST valer também quando a gravação chega por fora da tela.
- **FR-081**: O isolamento entre grupos MUST continuar: Anjo, etapa, bloqueio e Cartão Alelo são dados do grupo e seguem a mesma proteção do banco das entregas anteriores. Funcionários e parceiros são dados da Farmarcas, fora de qualquer grupo, e o lado do grupo só vê o Anjo do próprio grupo.
- **FR-082**: MUST existir teste automático que prova que um grupo não vê o Anjo nem as lojas de outro, que loja bloqueada é recusada para o grupo e que o analista não recebe CPF, nascimento nem número do cartão.

**Dados de exemplo**

- **FR-090**: O ambiente local MUST vir com funcionários fictícios (os Anjos do protótipo: Juliana Prado, Isabela Nunes e Marília Duarte, e outras pessoas das áreas), os Anjos ligados aos grupos de exemplo, alguns parceiros fictícios (indústrias e distribuidores com contatos) e lojas em etapas e bloqueios diferentes.

### Key Entities

- **Funcionário Farmarcas**: nome, e-mail corporativo, telefone, área, cargo, papel de acesso, situação e datas. Não pertence a nenhum grupo.
- **Anjo do grupo**: a ligação entre um grupo e um funcionário ativo, com data de início. As trocas ficam na auditoria do grupo.
- **Parceiro**: tipo (Indústria ou Distribuidor), CNPJ, razão social, nome fantasia, situação e datas.
- **Contato do parceiro**: nome, cargo, e-mail, telefone e se é o principal. Pertence a um parceiro.
- **Loja** (novos dados): etapa, data de inauguração, bloqueio, motivo e data do bloqueio.
- **Cartão Alelo**: grupo, loja vinculada, titular (nome, CPF, nascimento, código pseudonimizado) e número do cartão.
- **Registro de auditoria**: passa a existir também para funcionário e parceiro, além do grupo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-000**: Os números de lojas do Início batem 100% com a lista de Lojas filtrada pelo mesmo estado e por "Em operação". O Início abre em menos de 2 segundos com 1.800 lojas.
- **SC-001**: O administrador cadastra um funcionário e o coloca como Anjo de um grupo em menos de 2 minutos.
- **SC-002**: Em qualquer grupo, loja ou página de loja, dá para responder "quem é o Anjo?" sem sair da tela.
- **SC-003**: 100% das trocas de Anjo, bloqueios, desbloqueios, transferências de titularidade e desligamentos têm registro com quem fez e o motivo.
- **SC-004**: Uma loja bloqueada não abre para nenhuma pessoa do grupo, nem por fora da tela, e volta a abrir logo depois do desbloqueio.
- **SC-005**: No papel Analista, nenhuma tela nem exportação mostra nome, contato ou CPF de proprietário ou titular do Cartão Alelo, nem número de cartão.
- **SC-006**: Bloquear 50 lojas em lote leva menos de 1 minuto de trabalho.
- **SC-007**: O arquivo exportado abre numa planilha com acentos corretos e uma coluna por campo, sem ajuste manual.

## Assumptions

- **O Anjo é do grupo, não da loja.** Decisão: um Anjo por grupo, e as lojas mostram o Anjo do grupo. Por quê: o Gestão 360 do protótipo usa o Anjo do grupo como responsável, e nos dados do protótipo todas as lojas de um grupo têm o mesmo Anjo. Por isso a ação em lote "Atribuir Anjo" fica na lista de **grupos**, não na de lojas (diferença do protótipo).
- **Papel de acesso**: o cadastro guarda o papel para a demonstração. Quando o login de verdade chegar, o papel passa a vir do provedor de identidade (regra da visão de produto) e o campo vira só leitura. O seletor "Papel de demonstração" continua como está.
- **Pessoas da Farmarcas aparecem pelo nome** para os dois papéis da plataforma e para o grupo (o Anjo). A pseudonimização vale para as pessoas dos grupos (proprietário, titular do Alelo), como nas entregas anteriores.
- **Contatos de parceiros** são contatos comerciais de empresa: os dois papéis da plataforma veem. Todos os dados de exemplo são fictícios (gate de LGPD D6).
- **Bloqueio corta o acesso da loja**, como a pessoa decidiu. Como o login ainda não existe, o corte é demonstrado pelo papel "Proprietário do grupo" da entrega 002.
- **"Dados desatualizados (+90 dias)"**: decisão: sem mudança de cadastro e sem validação nos últimos 90 dias. A regra dos 180 dias do grupo ("Cadastro desatualizado") continua igual. Os dois prazos estão "a validar" com a operação.
- **Etapa e Situação são independentes**: Situação é o status que já existe (Pendente no grupo, Ativa, Inativa). Etapa conta a vida da loja na rede.
- **Ficam para depois**:
  - lojas sem grupo (as "sem GE" em prospecção do protótipo): hoje toda loja pertence a um grupo, e mudar isso mexe na regra central do tenant;
  - "Minhas lojas" do Anjo e "Cobrar preenchimento e validação": dependem do login e das notificações;
  - convite e ativação do proprietário, que depende do login e do envio de e-mail;
  - ligação de parceiros com lojas, marcas ou estados, e acesso de representantes (convidado externo, Onda 2);
  - carga inicial por arquivo, indicadores de uso e módulos licenciados da Visão geral;
  - o módulo Gestão 360.
- **"Proprietário ativo" do protótipo vira "Com proprietário"**: o convite e a ativação do proprietário ainda não existem. Decisão: contar o grupo que tem proprietário cadastrado. Por quê: é o dado que o cadastro tem hoje. Quando o convite chegar, a medida passa a contar só quem aceitou.
- **"Atualizado hoje às 06h"** do protótipo: os números são lidos do cadastro na hora. A tela diz "Dados do cadastro, atualizados agora".
- **Ordem de entrega**:
  1. US0 (Início): usa só o que já existe.
  2. US1 e US2: o Gestão 360 depende delas.
  3. US3 e US4.
  4. US5 a US7.

  Cada uma funciona sozinha.
