# Especificação: Configurações do Backoffice — etapa 1 (atributos da loja)

**Feature Branch**: `004-configuracoes-atributos`

**Created**: 2026-11-01

**Status**: Implementado (etapa 1)

**Input**: "preciso provisionar uma área acessada apenas pelo admin de gestão de cadastro e atributos das lojas, exemplos: criação de áreas para o sistema, criação de atributos de lojas, exemplo inclusão de um novo tipo de mobiliário". Depois: "em mobiliário preciso de uma biblioteca de ícones para selecionar no momento do cadastro". A pessoa aprovou começar pela etapa 1 (atributos da loja).

## Contexto

A página da loja (entrega 002) mostra várias listas definidas pela Farmarcas: mobiliário, serviços, sistema utilizado, ferramentas de boas práticas, PBMs, estratégias comerciais, ferramentas externas e canais de venda. Hoje essas listas só mudam com um desenvolvedor. Ninguém da Farmarcas consegue, por exemplo, incluir um novo tipo de mobiliário.

Esta entrega cria o menu **Configurações** no Backoffice, só para o administrador da plataforma, e coloca nele a seção **Atributos da loja**, com as 8 listas. O mobiliário ganha um **ícone**, escolhido numa galeria no momento do cadastro.

O plano completo do menu tem 3 etapas. Esta especificação cobre só a etapa 1. As outras duas ficam registradas em "Fora desta etapa".

| Lista | Itens hoje | O que cada item tem |
| --- | --- | --- |
| Mobiliário | 12 | Nome, descrição, tipo, ícone, conta como autosserviço |
| Serviços | 10 | Nome |
| Sistema utilizado | 5 | Nome |
| Ferramentas de boas práticas | 4 | Nome |
| PBMs | 36 | Nome, operadora |
| Estratégias comerciais | 6 | Nome, descrição, usada no módulo Escala |
| Ferramentas externas | 15 | Nome, categoria, valor mensal negociado, observação da condição |
| Canais de venda | 8 | Nome, próprio ou de terceiro, o que a loja informa (ex.: "Perfil", "Endereço do site") |

Todo item tem também **ordem** e **situação** (ativo ou desativado).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Incluir um novo mobiliário com ícone (Priority: P1)

O administrador abre **Configurações → Atributos da loja → Mobiliário**, clica em **Novo mobiliário**, preenche nome, tipo, escolhe um ícone na galeria e salva. O item novo aparece na aba Mobiliário de todas as lojas, com o ícone, pronto para o grupo informar a quantidade.

**Why this priority**: é o exemplo que a pessoa deu e o maior incômodo de hoje. Sozinha, esta história já entrega valor.

**Independent Test**:
1. Como administrador, incluir "Expositor de vitaminas", tipo Expositor, com um ícone de prateleira.
2. Abrir a página de uma loja, aba Mobiliário, e ver o item novo com o ícone escolhido e quantidade 0.
3. Como dono do grupo, informar a quantidade desse item e salvar.

**Acceptance Scenarios**:

1. **Given** o administrador no Backoffice, **When** ele olha o menu, **Then** vê o item **Configurações**, no fim do menu.
2. **Given** a tela Configurações, **When** ela abre, **Then** mostra a seção Atributos da loja com as 8 listas, cada uma com o número de itens ativos.
3. **Given** a lista Mobiliário, **When** ela abre, **Then** cada item aparece com o ícone, nome, tipo, se conta como autosserviço, situação e em quantas lojas ele está em uso (quantidade maior que zero).
4. **Given** o formulário de novo mobiliário, **When** o administrador abre a galeria de ícones, **Then** vê os ícones organizados por grupo (expositores e gôndolas, caixa e check-out, refrigeração, balcão e atendimento, salas, telas e sinalização, outros) e pode buscar por palavra em português ("geladeira", "caixa", "tela").
5. **Given** um ícone escolhido, **When** o administrador olha o formulário, **Then** vê uma prévia do item como ele vai aparecer na página da loja.
6. **Given** o formulário, **When** o administrador escolhe o tipo, **Then** "conta como autosserviço" já vem marcado para Gôndola e Expositor e desmarcado para os demais. Ele pode mudar.
7. **Given** o formulário preenchido, **When** o administrador salva, **Then** o item entra no fim da lista, ativo, e aparece na aba Mobiliário de todas as lojas na próxima vez que a página abrir.
8. **Given** a aba Mobiliário de uma loja, **When** ela abre, **Then** cada item mostra o ícone ao lado do nome. O cartão "Gôndolas e expositores" passa a somar os itens marcados como autosserviço.
9. **Given** os 12 itens de mobiliário que já existem, **When** esta entrega vai para o ar, **Then** cada um já tem um ícone inicial adequado, e o administrador pode trocar.

---

### User Story 2 — Manter as outras 7 listas (Priority: P1)

O administrador inclui, corrige e reordena itens de qualquer lista: um serviço novo, um PBM novo com a operadora, uma estratégia nova que o módulo Escala usa, uma ferramenta externa com o valor negociado, um canal novo.

**Why this priority**: o mesmo problema do mobiliário vale para as outras listas, e a tela é a mesma.

**Independent Test**:
1. Incluir o serviço "Vacinação" e ver na aba Estratégias de uma loja, no cartão Serviços.
2. Incluir a estratégia "Farmácia 24 horas", marcada como usada no módulo Escala, e ver a etiqueta "Usada no módulo Escala" quando o grupo a marcar.
3. Mover "Vacinação" para o topo e ver a nova ordem na página da loja.

**Acceptance Scenarios**:

1. **Given** qualquer lista, **When** o administrador inclui um item, **Then** o formulário pede só os campos daquela lista (tabela do Contexto).
2. **Given** um nome que já existe na mesma lista (sem diferença de maiúscula, minúscula ou acento), **When** o administrador salva, **Then** o sistema recusa e diz qual item já tem esse nome.
3. **Given** um item em uso por lojas, **When** o administrador muda o nome, **Then** o sistema avisa "este item está em uso por N lojas, o nome muda em todas" e, ao confirmar, o nome novo aparece em todas as lojas, sem perder o que as lojas já informaram.
4. **Given** uma lista, **When** o administrador muda a ordem de um item (subir, descer), **Then** a página da loja passa a mostrar a lista nessa ordem.
5. **Given** a lista PBMs ou Ferramentas externas, **When** o administrador digita a operadora ou a categoria, **Then** o sistema sugere as que já existem, para evitar "ePharma" e "E-Pharma" ao mesmo tempo. Ele também pode digitar uma nova.
6. **Given** a lista Estratégias comerciais, **When** o administrador marca "usada no módulo Escala", **Then** a etiqueta "Usada no módulo Escala" aparece na estratégia, na página da loja, quando ela estiver marcada.
7. **Given** a lista Ferramentas externas, **When** o administrador informa o valor mensal negociado, **Then** o valor é em reais, não negativo, e pode ficar em branco.
8. **Given** uma lista com muitos itens (PBMs tem 36), **When** o administrador busca por nome, operadora ou categoria, **Then** a lista filtra na hora.

---

### User Story 3 — Desativar e excluir itens sem estragar o cadastro das lojas (Priority: P2)

O administrador tira de circulação um item que a Farmarcas não oferece mais, ou apaga um item criado por engano.

**Why this priority**: sem isso as listas só crescem. Fica atrás das inclusões porque o problema de hoje é não conseguir incluir.

**Independent Test**:
1. Desativar um PBM que uma loja usa: ele some das opções das outras lojas e continua na loja que já usa, com a marca "desativado".
2. Excluir um item recém-criado que nenhuma loja usa: ele some das listas.
3. Tentar excluir um item em uso por alguma loja: o sistema recusa e oferece desativar.

**Acceptance Scenarios**:

1. **Given** um item ativo, **When** o administrador desativa, **Then** ele deixa de aparecer como opção nova nas lojas que não o usam.
2. **Given** uma loja que já usa um item desativado, **When** a página da loja abre, **Then** o item continua lá, com o que a loja informou e a marca "desativado". O grupo pode desmarcar ou zerar, mas não pode marcar de novo.
3. **Given** o sistema utilizado de uma loja foi desativado, **When** o grupo edita a loja, **Then** o sistema atual continua aparecendo selecionado até ele escolher outro.
4. **Given** um item desativado, **When** o administrador reativa, **Then** ele volta a ser opção para todas as lojas.
5. **Given** um item que nenhuma loja usa, **When** o administrador exclui, **Then** o sistema pede confirmação e o item some das listas. O histórico das lojas que já o usaram continua mostrando o nome.
6. **Given** um item que alguma loja usa, **When** o administrador tenta excluir, **Then** o sistema recusa, explica em quantas lojas ele aparece e oferece desativar.
7. **Given** a lista, **When** o administrador filtra por situação, **Then** pode ver só os ativos, só os desativados ou todos. O padrão é só os ativos.

---

### User Story 4 — Histórico das configurações (Priority: P3)

O administrador consulta quem incluiu, mudou, desativou ou excluiu cada item, e quando.

**Why this priority**: dá segurança para várias pessoas mexerem nas listas, mas não impede o uso no dia a dia.

**Independent Test**: renomear um serviço e ver no histórico da lista "Nome: Aferição de Glicemia → Teste de glicemia", com o nome do administrador e a data.

**Acceptance Scenarios**:

1. **Given** qualquer inclusão, alteração, mudança de ordem, desativação, reativação ou exclusão, **When** ela é salva, **Then** entra no histórico com quem fez, quando, o item e o antes e depois de cada campo.
2. **Given** uma lista, **When** o administrador abre o histórico, **Then** vê as mudanças daquela lista, da mais recente para a mais antiga.
3. **Given** o histórico, **When** alguém tenta mudar ou apagar uma linha, **Then** não consegue: o histórico só cresce.

---

### Edge Cases

- **Analista e grupo**: o analista da plataforma não vê o menu Configurações. Se abrir o endereço direto, vê "Você não tem acesso a esta área". O mesmo vale para o dono do grupo. Nenhum dos dois consegue gravar nas listas, nem por fora da tela.
- **Duas pessoas ao mesmo tempo**: se dois administradores mudam o mesmo item, o segundo a salvar recebe "Este item foi alterado por outra pessoa. Recarregue para ver a versão atual", e nada se perde em silêncio.
- **Ícone que sai da galeria**: se um ícone deixar de existir numa versão futura da galeria, o item mostra o ícone padrão de mobiliário, sem quebrar a tela.
- **Mobiliário sem ícone escolhido**: o formulário já abre com o ícone padrão de mobiliário selecionado. Não existe item sem ícone.
- **Lista vazia**: uma lista com todos os itens desativados mostra, na página da loja, só os itens que a loja já usa. Se não houver nenhum, mostra "Nenhuma opção disponível".
- **Nome muito longo**: o nome tem no máximo 80 caracteres; a descrição, 200.
- **Lista Sistema utilizado**: cada loja escolhe um só sistema. Desativar não troca o sistema de nenhuma loja.
- **Estratégias desativadas**: o "desde" da estratégia que a loja já tinha é preservado.

## Requirements *(mandatory)*

### Functional Requirements

**Acesso e menu**

- **FR-001**: O Backoffice MUST mostrar o item **Configurações** no menu só para o administrador da plataforma.
- **FR-002**: O sistema MUST recusar leitura de tela e gravação das configurações para o analista da plataforma e para o grupo, com a mensagem "Você não tem acesso a esta área" na tela e recusa no servidor.
- **FR-003**: A tela Configurações MUST mostrar a seção Atributos da loja com as 8 listas, cada uma com o número de itens ativos e um atalho para abrir a lista.

**Listas**

- **FR-010**: Cada lista MUST mostrar seus itens na ordem definida, com nome, os campos próprios da lista, situação e o número de lojas que usam o item.
- **FR-011**: O administrador MUST conseguir incluir um item preenchendo os campos da lista. Nome é obrigatório em todas.
- **FR-012**: O sistema MUST recusar nome repetido na mesma lista, ignorando maiúsculas, minúsculas e acentos.
- **FR-013**: O administrador MUST conseguir alterar qualquer campo de um item. Se o item estiver em uso, o sistema MUST avisar quantas lojas serão afetadas antes de salvar.
- **FR-014**: O administrador MUST conseguir mudar a ordem dos itens. A página da loja MUST seguir essa ordem.
- **FR-015**: Cada lista MUST ter busca por nome (e por operadora ou categoria, onde houver) e filtro por situação, com "ativos" como padrão.
- **FR-016**: Operadora (PBMs) e categoria (Ferramentas externas) MUST sugerir os valores já usados na lista, aceitando um valor novo.
- **FR-017**: Estratégias comerciais MUST ter o campo "usada no módulo Escala". A etiqueta "Usada no módulo Escala" na página da loja MUST vir desse campo.
- **FR-018**: Ferramentas externas MUST ter o valor mensal negociado em reais, opcional e não negativo.
- **FR-019**: Canais de venda MUST ter o tipo: próprio ou de terceiro. A aba Canais da loja MUST separar os canais por esse tipo, como já faz.

**Mobiliário e ícones**

- **FR-020**: Mobiliário MUST ter tipo, escolhido entre Gôndola, Check-out, Balcão, Refrigeração, Expositor, Sala e Outro.
- **FR-021**: Mobiliário MUST ter um ícone, escolhido numa galeria de cerca de 40 ícones próprios para farmácia, organizados por grupo e com busca por palavra em português.
- **FR-022**: O formulário de mobiliário MUST abrir com o ícone padrão de mobiliário selecionado e MUST mostrar a prévia do item como na página da loja.
- **FR-023**: Mobiliário MUST ter o campo "conta como autosserviço", que vem marcado para Gôndola e Expositor e pode ser mudado.
- **FR-024**: A aba Mobiliário da loja MUST mostrar o ícone de cada item. O cartão "Gôndolas e expositores" MUST somar os itens marcados como autosserviço.
- **FR-025**: Os 12 itens de mobiliário existentes MUST receber um ícone inicial adequado ao ir para o ar.

**Desativar e excluir**

- **FR-030**: O administrador MUST conseguir desativar e reativar um item.
- **FR-031**: Item desativado MUST deixar de ser opção nova nas lojas e MUST continuar aparecendo, com a marca "desativado", nas lojas que já o usam, com tudo o que a loja informou.
- **FR-032**: Na loja, o grupo MUST conseguir desmarcar ou zerar um item desativado, mas não marcá-lo de novo.
- **FR-033**: O administrador MUST conseguir excluir um item só se nenhuma loja usa esse item. O histórico das lojas MUST continuar mostrando o nome do item excluído. Caso contrário, o sistema MUST recusar, dizer em quantas lojas ele aparece e oferecer desativar.

**Histórico**

- **FR-040**: Toda inclusão, alteração, mudança de ordem, desativação, reativação e exclusão MUST entrar num histórico que só cresce, com quem fez, quando, o item e o antes e depois de cada campo.
- **FR-041**: Cada lista MUST ter a consulta ao seu histórico, da mudança mais recente para a mais antiga.

**Segurança dos dados**

- **FR-050**: Duas gravações no mesmo item ao mesmo tempo MUST NOT se sobrescrever em silêncio. A segunda MUST ser recusada com aviso para recarregar.
- **FR-051**: Nenhuma ação desta tela MUST apagar ou alterar o que as lojas já informaram (quantidades, marcações, "desde", custos, identificações).

### Key Entities

- **Item de atributo**: uma opção de uma das 8 listas. Tem lista, nome, ordem, situação (ativo ou desativado) e os campos próprios da lista (descrição, tipo, ícone, autosserviço, operadora, categoria, valor negociado, usada no Escala, próprio ou de terceiro). As lojas guardam suas respostas apontando para o item; por isso renomear muda em todas as lojas.
- **Ícone**: um desenho da galeria fixa do sistema, identificado por um nome. O item de mobiliário guarda só esse nome.
- **Registro de alteração de configuração**: quem, quando, qual item, qual ação e o antes e depois de cada campo. Não muda nem é apagado.
- **Resposta da loja** (já existe): o que a loja informou sobre um item (marcado, quantidade, "desde", custo, identificação). Esta entrega não muda essas respostas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O administrador inclui um mobiliário novo, com ícone, em menos de 1 minuto, sem ajuda de desenvolvedor.
- **SC-002**: Um item incluído aparece na página de 100% das lojas na próxima vez que a página abre.
- **SC-003**: Ao desativar ou renomear um item, 0 lojas perdem o que já tinham informado.
- **SC-004**: O analista e o grupo não conseguem ver nem gravar nenhuma configuração (0 acessos aceitos nos testes de acesso).
- **SC-005**: Na galeria, o administrador encontra o ícone procurado com uma busca de uma palavra em pelo menos 9 de cada 10 tentativas dos testes de aceitação.
- **SC-006**: 100% das mudanças nas listas aparecem no histórico com quem fez e quando.

## Fora desta etapa

Ficam para as próximas etapas do menu Configurações:

- **Etapa 2 — Listas de apoio**: tipos de mobiliário, operadoras de PBM e categorias de ferramenta como listas próprias; Tipo de loja e Rede filiada deixam de ser texto livre e viram lista; Áreas da Farmarcas (Comercial, Trade…) configuráveis.
- **Etapa 3 — Regras do cadastro**: documentos obrigatórios e quem envia; prazo de revisão do cadastro (hoje 180 dias); modelos de seção livre aplicados a todas as lojas.

Também fora desta etapa: criar listas novas além das 8; ícones para outras listas além do mobiliário; enviar ícone próprio; mudar situação, etapa, regime tributário, tipos de solicitação, dias da semana e perfis de acesso (o sistema toma decisões com base neles).

## Assumptions

- Quem usa é o administrador da plataforma (Farmarcas). Mudanças valem na hora, sem aprovação de outra pessoa.
- "Em uso" significa: marcado na loja, com quantidade maior que zero (mobiliário), com resposta preenchida (ferramenta, canal) ou escolhido como sistema utilizado. O histórico da loja guarda o nome do item como texto; por isso excluir um item sem uso não apaga nada do histórico.
- Nesta etapa os tipos de mobiliário são os 7 que já existem; virar lista editável é da etapa 2. Pelo mesmo motivo, operadora e categoria são texto com sugestão, não lista.
- A descrição das estratégias hoje traz o uso no Escala depois de um "·". Na entrada no ar, esse trecho vira o campo "usada no módulo Escala" e sai da descrição, sem mudar o que a loja vê.
- Decisão: aproveitar as listas que já existem no banco, acrescentando os campos novos. Por quê: nada do que as lojas já informaram se perde.
- Decisão: a galeria usa a mesma coleção de ícones que o Backoffice já usa nos menus e botões, com uma seleção de cerca de 40. Por quê: o visual fica igual ao resto do sistema e a escolha fica simples.
- Decisão: o histórico das configurações usa o mesmo histórico de auditoria do Backoffice (o mesmo de grupos, funcionários e parceiros). Por quê: um lugar só para consultar quem mudou o quê.
- A pergunta "criação de áreas para o sistema" ainda está em aberto com a pessoa e não afeta esta etapa.
