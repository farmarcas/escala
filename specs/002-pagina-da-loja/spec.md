# Especificação: Página da loja (visão Farmarcas e visão do grupo)

**Feature Branch**: `002-pagina-da-loja`

**Created**: 2026-10-30

**Status**: Draft

**Input**: Implementar a página completa da loja do protótipo `Loja Detalhe.dc.html` (pacote `radar-suite-claude-code`), com a visão da Farmarcas (operador) e a visão do grupo econômico (tenant). A lista de lojas (`Lojas Lista.dc.html`) ganha as colunas de preenchimento e validação. Decisão da pessoa: incluir já a visão do grupo, com papel de demonstração.

Referências de regra: `project/uploads/M1-cadastros.md` (§5.1 camadas da loja, §7 solicitações de alteração), `project/uploads/01-product-vision.md` (§6 papéis, §9 invariantes) e a especificação 001 (Backoffice).

## Contexto

Hoje a loja só aparece em tabelas. Esta entrega cria a página da loja, aberta pelos dois lados:

- **Farmarcas (Backoffice)**: vê tudo, corrige dados básicos com motivo, decide as solicitações e cobra a validação.
- **Grupo econômico (tenant)**: o proprietário vê **só as lojas do próprio grupo**. Ele mantém os dados do dia a dia, pede mudanças em dados sensíveis e valida o cadastro a cada 6 meses.

Os dados da loja ficam em **camadas** (M1 §5.1):

- **Dados sensíveis** (identificação na Receita, bandeira e regime) só mudam por **solicitação com etapas**.
- **Dados básicos** (contato, endereço popular, estrutura, horário etc.) o grupo edita direto, e tudo entra no histórico.

**Pessoas, sem confundir os lados**:

- O **Anjo Farmarcas** é funcionário da Farmarcas e vem do menu Funcionários do Backoffice, que ainda não existe.
- **Farmacêutico e gerente** são funcionários do grupo e vêm do cadastro de funcionários do grupo, que também ainda não existe.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Abrir a página da loja pelos dois lados (Priority: P1)

**Farmarcas**: clica numa loja (na tabela do grupo ou na lista de Lojas) e abre a página dela.

**Grupo**: com o papel de demonstração "Proprietário do grupo", vê a área do grupo com a lista das próprias lojas e abre cada uma.

O topo da página mostra:
- o nome do dia a dia da loja (apelido) e a razão social;
- código, tipo (PDV/CD), status, grupo e GE;
- o lado em que a pessoa está ("Visão Farmarcas", "Visão Farmarcas · só leitura" ou "Visão do grupo").

As abas são: Dados, Estratégias, Mobiliário, Responsáveis, Sistemas, Canais, Documentos e Histórico.

**Why this priority**: sem a página, nada do resto existe. A visão do grupo é o que alimenta os dados.

**Independent Test**: como Farmarcas, abrir a loja LJ-002. Como proprietário do grupo 0417, ver só as lojas do 0417 e abrir a mesma loja. Tentar abrir uma loja de outro grupo pelo endereço deve dar "não encontrada".

**Acceptance Scenarios**:

1. **Given** a tabela de lojas do grupo ou a lista de Lojas, **When** a pessoa da Farmarcas clica numa loja, **Then** abre a página da loja na aba Dados.
2. **Given** o papel "Proprietário do grupo" do GE 0417, **When** ele entra, **Then** vê só as lojas do GE 0417 e nenhum menu do Backoffice.
3. **Given** o proprietário do GE 0417, **When** ele tenta abrir uma loja do GE 0388 (por exemplo, colando o endereço), **Then** a página responde "Loja não encontrada", sem revelar nenhum dado.
4. **Given** o papel Analista da plataforma, **When** abre a página, **Then** vê tudo em modo só leitura, com os dados pessoais do proprietário pseudonimizados.

---

### User Story 2 — Dados da loja em camadas, com edição e histórico (Priority: P1)

A aba Dados tem quatro seções:

| Seção | Campos | Como muda |
|---|---|---|
| **Identificação na Receita** | CNPJ, inscrição estadual, razão social, CEP, logradouro, número, bairro, cidade, UF | Só por solicitação |
| **Rede e negócio** | Bandeira (marca Farmarcas) e regime tributário | Por solicitação |
| **Rede e negócio** | Tipo de loja (ex.: Conversão), rede filiada, data de inauguração | Em "Editar dados básicos" |
| **Dados básicos e contato** | Apelido, nome fantasia, telefone 1, telefone 2, WhatsApp, telefone delivery, e-mail da loja, celular e e-mail pessoal do proprietário | Em "Editar dados básicos" |
| **Endereço popular** | Como o cliente encontra a loja (pode diferir do endereço da Receita) | Em "Editar dados básicos" |

Regras de edição:
- O grupo edita os dados básicos direto.
- A Farmarcas também pode corrigir, mas com **motivo obrigatório**, e o grupo vê isso no histórico.
- O celular e o e-mail pessoal do proprietário só o grupo edita.

**Why this priority**: é o coração da página e a base de todos os módulos.

**Independent Test**: como grupo, editar o telefone 2 e o apelido e salvar. O histórico mostra "de → para", quem e quando. Como Farmarcas, corrigir um campo sem motivo não salva; com motivo, salva e aparece no histórico do grupo.

**Acceptance Scenarios**:

1. **Given** "Editar dados básicos", **When** o grupo altera campos e salva, **Then** cada campo alterado vira uma linha do histórico com valor anterior, valor novo, autor, origem (grupo) e data. O campo mostra "Alterado em … por …".
2. **Given** a Farmarcas editando, **When** não preenche o motivo, **Then** o botão Salvar fica desabilitado.
3. **Given** um campo de Identificação na Receita, Bandeira ou Regime, **When** alguém tenta editá-lo, **Then** ele aparece bloqueado, com o caminho "Mudar CNPJ", "Mudar endereço", "Trocar bandeira" ou "Mudar regime".
4. **Given** a edição em andamento, **When** a pessoa cancela, **Then** nada muda.

---

### User Story 3 — Solicitações de mudança com etapas (Priority: P1)

Dados sensíveis mudam por quatro tipos de solicitação. Cada tipo tem etapas, e cada etapa tem um dono (grupo, Farmarcas ou sistema):

| Tipo | Etapas | Documentos exigidos | Efeito ao ficar vigente |
|---|---|---|---|
| **Mudança de CNPJ** | Solicitação → Validação na Receita → Análise de documentos → Atualização nos sistemas → Vigente | Cartão CNPJ novo; contrato social ou alteração | Troca CNPJ, razão social e IE; o CNPJ anterior vai para o histórico |
| **Mudança de endereço** | Solicitação → Envio de documentos (grupo) → Análise Farmarcas → Vistoria da nova loja → Vigente | Comprovante do novo endereço; alvará; licença sanitária | Troca o endereço da Receita |
| **Troca de bandeira** | Pedido → Comitê de marcas (Farmarcas) → Ciência do grupo → Implantação da fachada (grupo) → Vigente | — | Troca a marca da loja |
| **Mudança de regime tributário** | Solicitação → Análise contábil (Farmarcas) → Vigente | Termo de opção | Troca o regime |

Quem pode o quê:
- **Os dois lados** podem abrir uma solicitação, informando os valores novos, a data a partir de quando vale e a justificativa.
- **Quem é dono da etapa atual** age:
  - Farmarcas: aprova a etapa, ou reprova com motivo.
  - Grupo: conclui a etapa, ou dá ciência ou contesta com motivo.
  - Etapa "sistema" (Validação na Receita): a Farmarcas conclui manualmente.
- **Quem abriu** pode cancelar.

**Why this priority**: é a regra que garante que o dado oficial nunca muda sem a Farmarcas (M1 RN-CV01) e que o associado tem um caminho para pedir.

**Independent Test**: como grupo, pedir mudança de regime para Simples Nacional, anexando o termo. Como Farmarcas, aprovar a análise contábil. O regime da loja muda, e o histórico mostra a solicitação "Vigente".

**Acceptance Scenarios**:

1. **Given** uma solicitação aberta de um tipo, **When** alguém tenta abrir outra do mesmo tipo na mesma loja, **Then** a opção aparece desabilitada com "Já em andamento" (uma aberta por tipo por loja).
2. **Given** uma solicitação aberta, **When** qualquer pessoa vê a loja, **Then** vale o dado atual, e o campo mostra que há solicitação em andamento.
3. **Given** a etapa "Envio de documentos" com documento faltando, **When** o grupo tenta concluir, **Then** não consegue até anexar todos os documentos.
4. **Given** a última etapa antes de Vigente, **When** o dono aprova, **Then** os valores pedidos passam a valer, e a solicitação vai para o histórico como "Vigente".
5. **Given** "Reprovar" ou "Contestar", **When** o motivo está vazio, **Then** a ação não é enviada. Com motivo, a solicitação fecha como Reprovada ou Contestada e nada muda no dado.
6. **Given** a página, **When** há solicitações abertas, **Then** um painel "Solicitações" mostra cada uma com etapa atual, linha do tempo, documentos e "Aguarda você" quando a vez é de quem está vendo.

---

### User Story 4 — Preenchimento do cadastro e validação semestral (Priority: P1)

Um cartão no topo da página mostra o **% de preenchimento** dos campos que o grupo preenche e a lista do que falta. Entram nessa conta:
- dados básicos e endereço popular;
- área da loja, área de venda e número de colaboradores;
- horário de funcionamento, serviços, sistema de demanda e PBMs;
- estratégias;
- os 4 documentos obrigatórios: alvará, licença sanitária, AFE e CRF.

O cartão também mostra a **validação semestral**: o grupo confirma que tudo está certo, e a confirmação vale por 6 meses. Os estados são "Em dia", "Vence em N dias" (até 30 dias), "Vencida há N dias" e "Nunca validada".
- O grupo só pode validar com 100% preenchido.
- A Farmarcas pode "Cobrar empresário" quando a validação não está em dia. A cobrança fica no histórico, e o grupo vê o aviso na loja.

A lista de **Lojas** do Backoffice ganha:
- as colunas Cadastro (% e quantos campos faltam) e Validação (estado e data);
- filtros por cadastro (Completo / Falta algo / Falta muito) e por validação;
- os indicadores "Preenchimento médio", "Validação vencida ou nunca feita", "Documentos com alerta" e "Solicitações em andamento".

**Why this priority**: é o que mantém o dado vivo, que é o problema central do módulo (M1 §2).

**Independent Test**: uma loja com 2 campos vazios mostra 93% e "Faltam 2 campos", e o botão Validar fica bloqueado. Ao preencher, chega a 100%. O grupo valida, e o estado vira "Em dia" com a próxima data. Na lista de Lojas, o % e a validação aparecem.

**Acceptance Scenarios**:

1. **Given** campos pendentes, **When** o grupo clica em Validar, **Then** nada acontece e o botão explica "Preencha os campos pendentes".
2. **Given** 100% preenchido, **When** o grupo valida, **Then** o histórico registra a validação e a próxima vence em 6 meses.
3. **Given** validação vencida, **When** a Farmarcas clica em "Cobrar empresário", **Then** o botão vira "Cobrança enviada" e o histórico registra.

---

### User Story 5 — Estrutura, funcionamento e serviços (Priority: P2)

Na aba Dados, a seção **Estrutura da loja** tem:
- prédio próprio, área da loja (m²), área de venda (m²) e número de colaboradores;
- **horário de funcionamento** por dia (segunda a domingo e feriado), com aberto ou fechado, 24 horas, plantão e atalhos ("Aplicar de seg a sex", "Aplicar de seg a sáb", "Replicar este dia");
- **serviços oferecidos** (catálogo);
- **sistema de demanda** (um, do catálogo);
- **ferramentas de boas práticas** (catálogo);
- **PBMs aceitos**, agrupados por programa (BSF, ePharma, Funcional, Portal da Drogaria…).

Tudo muda em "Editar dados básicos".

A Farmarcas também pode criar **seções livres de informações**: um título e campos de texto, visíveis para o grupo.

**Why this priority**: o horário alimenta o módulo Escala, e o resto qualifica a loja. Depende da edição da US2.

**Independent Test**: editar o horário, aplicar 08:00–20:00 de segunda a sábado e fechar o domingo. O histórico mostra "Horário de funcionamento" alterado.

**Acceptance Scenarios**:

1. **Given** um dia marcado como 24 horas, **When** a pessoa salva, **Then** o dia não exige hora de abrir e fechar.
2. **Given** o horário de fechar menor que o de abrir em dia não 24 horas, **When** a pessoa salva, **Then** recebe um aviso no campo.

---

### User Story 6 — Estratégias da loja (Priority: P2)

O grupo marca as estratégias da loja, a partir de um catálogo: foco dermocosméticos, expansão de horário, loja de bairro, referência em genéricos, delivery próprio, farmácia clínica. Cada estratégia guarda a data "desde".

A Farmarcas **vê** as estratégias e não edita (M1 RN-C17). O aviso explícito ao grupo diz que a Farmarcas vê.

**Independent Test**: o grupo marca "Delivery próprio" e salva. A Farmarcas vê "desde dd/mm/aaaa" e não consegue alterar.

---

### User Story 7 — Mobiliário (Priority: P2)

O catálogo da Farmarcas tem gôndolas, ponta de gôndola, check-outs, display de check-out, balcões, refrigeração, expositores, salas etc. Para cada item, a loja informa o **total na loja** e quantos ficam **disponíveis para Trade** (ações da Farmarcas).

- Indicadores: total de itens, disponível para Trade, gôndolas e expositores.
- Os dois lados editam, e cada edição entra no histórico.

**Acceptance Scenarios**:

1. **Given** um item, **When** a pessoa informa Trade maior que o total, **Then** o sistema recusa com "Trade não pode passar do total na loja".

---

### User Story 8 — Sistemas e ferramentas externas (Priority: P3)

A Farmarcas mantém um catálogo de ferramentas externas, cada uma com categoria e, quando houver, **condição negociada pela Farmarcas** (valor mensal). Para cada ferramenta, o grupo informa se a loja usa e quanto paga por mês. Ele também pode incluir outras ferramentas ou declarar "a loja não usa ferramentas externas".

Indicadores:
- ferramentas em uso;
- custo mensal e anual;
- negociações Farmarcas em uso;
- **economia possível**: soma, por ano, do que a loja paga acima da condição Farmarcas.

Cada ferramenta acima da condição mostra o alerta "Acima da condição Farmarcas · economia possível de R$ X/ano".

A Farmarcas vê, mas não preenche.

**Independent Test**: o grupo informa Infoprice a R$ 650/mês, com condição de R$ 490. O alerta mostra economia de R$ 1.920/ano.

---

### User Story 9 — Canais de venda e relacionamento (Priority: P3)

- **Canais proprietários**: aplicativo e webcommerce.
- **Canais terceiros**: WhatsApp, Instagram, iFood, Mercado Livre, Shopee, Rappi e outros que o grupo incluir.

Para cada canal, o grupo responde Sim ou Não. Quando é Sim, informa a identificação (número, perfil, nome da loja, link).

Indicadores: canais em uso, proprietários, terceiros e não informados.

A Farmarcas vê.

**Acceptance Scenarios**:

1. **Given** um canal em edição, **When** a pessoa salva sem escolher Sim ou Não, **Then** recebe "Escolha Sim ou Não".

---

### User Story 10 — Documentos da loja (Priority: P3)

Os tipos de documento são:
- Cartão CNPJ;
- Alvará de funcionamento;
- Licença sanitária;
- AFE Anvisa;
- Certidão de regularidade (CRF);
- Contrato de associação Farmarcas.

Para cada tipo, a página mostra o arquivo atual, a validade, quem enviou e o status ("Válido", "Vence em N dias" até 30 dias, "Vencido"). Quem envia:
- o **grupo** envia ou substitui o arquivo e informa a validade;
- a **Farmarcas** vê e baixa, e também envia o Cartão CNPJ e o contrato de associação.

A aba Documentos mostra quantos precisam de atenção. Documentos anexados em solicitações ficam também na solicitação.

**Independent Test**: enviar um PDF de licença sanitária com validade daqui a 20 dias. O status vira "Vence em 20 dias", e a aba mostra o alerta.

**Acceptance Scenarios**:

1. **Given** um arquivo maior que 10 MB ou que não seja PDF, JPG ou PNG, **When** a pessoa envia, **Then** recebe a recusa com o motivo.

---

### User Story 11 — Responsáveis e histórico completo (Priority: P3)

A aba **Responsáveis** mostra:
- o **proprietário do grupo**, com os dados pseudonimizados para o Analista da plataforma, como em 001;
- o **Anjo Farmarcas** e os **responsáveis da loja** (farmacêutico RT e gerente), por enquanto com o aviso de que chegam com os cadastros de funcionários de cada lado.

A aba **Histórico** junta tudo: edições, solicitações, documentos, validações e cobranças. Tem filtro Tudo / Edições / Solicitações / Documentos e mostra "de → para", quem e de qual lado. O histórico nunca é alterado nem apagado.

---

### Edge Cases

- Grupo **suspenso ou arquivado**: o grupo vê as lojas em modo só leitura e não abre solicitação. A Farmarcas continua vendo.
- Loja **inativa**: a página abre, sem cobrança de validação.
- Duas pessoas editando ao mesmo tempo: quem salvar por último vê o aviso "Esta loja mudou desde que você abriu" e recarrega, sem sobrescrever às cegas.
- CNPJ pedido numa solicitação já pertence a outra loja: a solicitação é recusada ao abrir.
- Loja criada em 001 (só com nome, CNPJ, endereço, cidade, UF e marca): os campos novos começam vazios. O nome vira o apelido, e o endereço vira o logradouro da Receita.

## Requirements *(mandatory)*

### Functional Requirements

**Página e acesso**

- **FR-001**: A Farmarcas MUST abrir a página da loja a partir da tabela de lojas do grupo e da lista de Lojas.
- **FR-002**: MUST existir a visão do grupo: área própria com a lista das lojas do grupo e a mesma página da loja, identificada como "Visão do grupo".
- **FR-003**: O papel de demonstração MUST ganhar a opção "Proprietário do grupo", com escolha do grupo. Só funciona no ambiente local, como em 001.
- **FR-004**: Quem é do grupo MUST ver e alterar só as lojas do próprio grupo. O próprio banco impõe isso (isolamento de 001).
- **FR-005**: O Analista da plataforma MUST ver tudo em modo só leitura.

**Dados e edição**

- **FR-010**: Os dados da loja MUST seguir as camadas da US2: sensíveis só por solicitação; básicos por edição direta.
- **FR-011**: Toda alteração de dado básico MUST gerar uma linha de histórico por campo (anterior, novo, autor, lado, data) e marcar o campo com "Alterado em … por …".
- **FR-012**: A Farmarcas MUST informar motivo ao editar dados básicos.
- **FR-013**: Celular e e-mail pessoal do proprietário MUST ser editáveis só pelo grupo, e pseudonimizados para o Analista da plataforma.
- **FR-014**: A edição MUST recusar salvar por cima de uma versão mais nova da loja.

**Solicitações**

- **FR-020**: MUST existir os 4 tipos de solicitação da US3, com etapas, dono de cada etapa e documentos exigidos.
- **FR-021**: MUST haver no máximo uma solicitação aberta por tipo por loja.
- **FR-022**: Só o dono da etapa atual MUST poder avançá-la. Reprovar e contestar MUST exigir motivo. Quem abriu MUST poder cancelar.
- **FR-023**: Ao chegar em Vigente, os valores pedidos MUST passar a valer. Antes disso, vale o dado atual.
- **FR-024**: Toda solicitação e cada passo dela MUST ir para o histórico e para a auditoria do grupo.

**Governança**

- **FR-030**: MUST calcular o % de preenchimento sobre a lista fixa de campos da US4 e listar o que falta.
- **FR-031**: MUST registrar a validação semestral feita pelo grupo (só com 100%), com vencimento em 6 meses.
- **FR-032**: A Farmarcas MUST poder registrar uma cobrança de validação, e o grupo MUST ver que foi cobrado.
- **FR-033**: A lista de Lojas MUST mostrar cadastro e validação, com filtros, e os indicadores da US4. Como no protótipo: os indicadores de validação, documentos com alerta e solicitações filtram a lista ao clicar; o preenchimento aparece em rosca com os níveis Completo, Falta algo e Falta muito (cada nível filtra); cada loja mostra a razão social e, ao passar o mouse no preenchimento, os campos que faltam. (Ajuste de 2026-10-30.)

**Abas**

- **FR-040**: Estrutura, horário, serviços, sistema de demanda, ferramentas de boas práticas, PBMs e seções livres conforme a US5.
- **FR-041**: Estratégias conforme a US6: o grupo define, a Farmarcas vê.
- **FR-041a**: A aba Estratégias segue o protótipo "Loja Detalhe": estrutura, funcionamento, serviços, sistema de demanda, ferramentas de boas práticas, PBMs, estratégias comerciais e seções livres, cada um no seu cartão. A aba Dados fica com identificação, rede, contato e endereço popular. Tudo (inclusive as estratégias, só pelo grupo) muda em "Editar dados básicos", que continua na aba Estratégias quando aberto nela.
- **FR-042**: Mobiliário conforme a US7: Trade nunca maior que o total.
- **FR-043**: Ferramentas externas conforme a US8: o grupo preenche, a Farmarcas mantém o catálogo e a negociação.
- **FR-044**: Canais conforme a US9.
- **FR-045**: Documentos conforme a US10: PDF, JPG ou PNG de até 10 MB, guardados com segurança e baixados só por quem pode ver a loja.
- **FR-046**: Responsáveis e Histórico conforme a US11.

**Catálogos**

- **FR-050**: Os catálogos MUST vir prontos com os itens do protótipo como exemplo: serviços, sistemas de demanda, ferramentas de boas práticas, PBMs, estratégias, mobiliário, ferramentas externas com negociação e canais. Os valores de negociação são exemplos a validar.

### Key Entities

- **Loja** (amplia 001):
  - identificação na Receita, bandeira, regime;
  - dados básicos e contato;
  - endereço popular;
  - estrutura;
  - versão (para conflito de edição).
- **Horário de funcionamento**: por dia da semana e feriado (aberto, abre, fecha, 24 h, plantão).
- **Itens de catálogo da Farmarcas**: serviços, sistemas, ferramentas de boas práticas, PBMs, estratégias, mobiliário, ferramentas externas (com categoria e condição negociada) e canais.
- **Respostas da loja aos catálogos**:
  - serviços, PBMs e ferramentas marcados;
  - estratégias com data "desde";
  - mobiliário (total e Trade);
  - ferramentas externas (usa e custo);
  - canais (usa e identificação);
  - outros itens incluídos pelo grupo.
- **Seção livre**: título e campos, criados pela Farmarcas.
- **Solicitação**:
  - tipo, origem (grupo ou Farmarcas), autor, valores pedidos, data de vigência e justificativa;
  - etapa atual, situação (andamento, vigente, reprovada, contestada, cancelada);
  - documentos anexados e linha do tempo das etapas.
- **Documento da loja**: tipo, arquivo, validade, quem enviou e quando.
- **Validação semestral**: data, quem validou; cobranças registradas.
- **Histórico da loja**: edições, solicitações, documentos, validações e cobranças. Somente acréscimo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O proprietário atualiza o telefone e o horário da loja em menos de 2 minutos.
- **SC-002**: 100% das mudanças em CNPJ, endereço da Receita, bandeira e regime passam por solicitação. Nenhuma tela permite gravá-las direto.
- **SC-003**: Um grupo nunca vê nem altera loja de outro grupo, comprovado por teste automático.
- **SC-004**: Todo campo alterado aparece no histórico com anterior, novo, autor e data.
- **SC-005**: A Farmarcas vê, na lista de Lojas, quais lojas estão com cadastro incompleto ou validação vencida sem abrir loja por loja.
- **SC-006**: As telas cobertas seguem o protótipo: mesmas seções, campos, abas, rótulos e alertas.

## Assumptions

- **Identidade**: a visão do grupo usa o papel de demonstração "Proprietário do grupo", como a Farmarcas em 001, porque login ainda é lacuna. Esse papel corresponde a `TENANT_ADMIN` do grupo escolhido. Outros papéis do grupo (`TENANT_USER`, `REGISTRY_MANAGER`) ficam para o módulo Cadastros do grupo.
- **Área do grupo nesta entrega**: só "Minhas lojas" e a página da loja, com o visual da suíte do tenant (menu escuro e ação azul). O resto da suíte (Cadastros, Verbas, Escala) fica fora.
- **Fora desta entrega**:
  - Anjo Farmarcas e o menu Funcionários do Backoffice, que listará os funcionários **da Farmarcas** (especificação própria; entregue na spec 003);
  - farmacêutico e gerente, que são funcionários **do grupo** (módulo Cadastros do grupo);
  - aba de convites de usuários;
  - integrações reais da aba Sistemas (ERP, Cartão Alelo, Portal Farmarcas);
  - validação automática na Receita (a etapa "sistema" é concluída à mão pela Farmarcas);
  - notificações por e-mail (avisos aparecem só na página e no histórico);
  - situação da loja (Prospecção, Montagem, Inaugurada), bloqueio, filtro por anjo e lojas sem GE da lista do protótipo (etapa, bloqueio e filtro por Anjo entregues na spec 003; lojas sem GE seguem fora);
  - fila geral de solicitações no Backoffice (a lista de Lojas filtra por "com solicitação").
- **Troca de CNPJ**: segue o protótipo (solicitação com etapas). A recomendação do M1 (C-D2) de tratar como encerramento e abertura fica registrada como ponto a validar.
- **Catálogos e valores de negociação**: exemplos do protótipo, a validar com as áreas. Nesta entrega, a Farmarcas não tem tela para editar catálogos; eles vêm prontos.
- **Prazo da fila de solicitações** (C-D5): sem prazo e sem expiração automática.
- **Dados**: fictícios.
