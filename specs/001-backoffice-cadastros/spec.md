# Especificação: Backoffice Farmarcas — cadastros de grupos, lojas e marcas

**Feature Branch**: `001-backoffice-cadastros`

**Created**: 2026-10-29

**Status**: Draft

**Input**: Implementar o lado do operador da Radar Suite (Backoffice Farmarcas) a partir do protótipo `Suite Operator.dc.html`, do pacote exportado do Claude Design (`radar-suite-claude-code`). Escolhas da pessoa: começar pelo Backoffice, com os dados salvos de verdade.

Referências do pacote: `project/Suite Operator.dc.html`, `project/Lojas Lista.dc.html`, `project/DE-PARA.md`, `project/uploads/01-product-vision.md` e `project/handoff/` (regras visuais do Alquimia DS).

## Contexto

O Backoffice é a área da Farmarcas que mantém a base de cadastro usada por todos os módulos da Radar Suite. Cada grupo econômico (GE) é o próprio tenant e é identificado por um número emitido pela Farmarcas. As lojas pertencem a um GE e cada loja tem uma marca. Esta primeira entrega cobre o cadastro: marcas, grupos, lojas e o ciclo de vida do grupo. Uso, módulos licenciados, funcionários e Gestão 360 ficam para as próximas entregas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Manter as marcas Farmarcas (Priority: P1)

O administrador da plataforma cadastra, renomeia, desativa, reativa e exclui as marcas Farmarcas. Só as marcas ativas podem ser escolhidas ao cadastrar uma loja.

**Why this priority**: toda loja exige uma marca. Sem marcas não dá para cadastrar loja.

**Independent Test**: abrir "Marcas Farmarcas", adicionar uma marca, renomear, desativar e reativar. Conferir que uma marca sem loja pode ser excluída e uma com loja não pode.

**Acceptance Scenarios**:

1. **Given** a tela de marcas, **When** o administrador digita "Vida Leve" e clica em Adicionar, **Then** a marca aparece como Ativa, com 0 lojas, 0 grupos e a data de hoje.
2. **Given** uma marca ativa com lojas, **When** o administrador clica em Desativar, **Then** ela vira Histórica, continua nas lojas que já a usam e some da lista de escolha de novas lojas.
3. **Given** uma marca com 1 ou mais lojas, **When** a tela é exibida, **Then** não há opção de Excluir para ela.
4. **Given** uma marca com 0 lojas, **When** o administrador clica em Excluir e confirma, **Then** ela sai da lista.
5. **Given** os indicadores do topo, **When** a lista muda, **Then** "Marcas ativas", "Marcas históricas" e "Marcas sem loja" refletem os números atuais.

---

### User Story 2 — Cadastrar e consultar grupos econômicos (Priority: P1)

O administrador cadastra um grupo (nome, razão social, CNPJ da matriz e dados do proprietário). O sistema emite o número do GE ao salvar. Depois disso o número não muda. A lista mostra os grupos com filtros e indicadores do cadastro.

**Why this priority**: o GE é a chave de tudo. Lojas e módulos dependem dele.

**Independent Test**: cadastrar um grupo novo, achar o grupo na lista pela busca, abrir o detalhe e editar o nome.

**Acceptance Scenarios**:

1. **Given** o formulário "Novo grupo econômico", **When** o administrador preenche os campos obrigatórios e salva, **Then** o grupo recebe o próximo número de GE, fica com status Ativo e aparece na lista.
2. **Given** a lista de grupos, **When** a pessoa escolhe Todos / Ativos / Suspensos / Arquivados, busca por número, nome ou proprietário, ou filtra por estado ou marca, **Then** só aparecem os grupos que atendem a todos os filtros, com a contagem "Exibindo X de Y GEs".
3. **Given** a lista, **When** a pessoa clica em uma linha, **Then** abre o detalhe do grupo com o número do GE, o status, o proprietário, a contagem de lojas (PDV, CD, ativas e inativas), as marcas e os estados derivados das lojas.
4. **Given** um grupo sem proprietário cadastrado, **When** ele aparece na lista, **Then** mostra o selo "Sem proprietário" e "Não cadastrado" na coluna do proprietário.
5. **Given** "Editar grupo", **When** o administrador muda nome, razão social ou contato do proprietário, **Then** as mudanças são salvas. O número do GE aparece bloqueado, com a explicação de que não pode ser alterado.
6. **Given** a tela de grupos, **When** ela abre, **Then** mostra os indicadores do cadastro: GEs cadastrados (por status), lojas na rede (PDV e CD, média de PDV por GE e GEs com CD), estados cobertos (com os 3 de maior concentração), grupos com proprietário, GEs multimarca e cadastro desatualizado (GEs com loja em operação sem revisão há mais de 180 dias, com o selo "Lojas desatualizadas" na linha), além dos painéis "Grupos por porte" e "Concentração por estado".

---

### User Story 3 — Cadastrar lojas de um grupo (Priority: P1)

No detalhe do grupo, o administrador adiciona lojas (nome, tipo PDV ou CD, CNPJ, marca ativa, endereço, cidade e UF) e consulta as lojas do grupo. Existe também uma lista geral de lojas de todos os grupos.

**Why this priority**: as lojas formam a rede. Marcas e estados do grupo são calculados a partir delas.

**Independent Test**: no detalhe de um grupo, adicionar uma loja com marca ativa e ver a loja na tabela do grupo, com a contagem e as marcas atualizadas. Depois achar a mesma loja na lista geral.

**Acceptance Scenarios**:

1. **Given** o formulário "Adicionar loja", **When** o administrador preenche tudo e salva, **Then** a loja recebe um código (ex.: LJ-092) e aparece no grupo com o status "Pendente no grupo".
2. **Given** o campo Marca, **When** a lista é aberta, **Then** só aparecem marcas ativas.
3. **Given** um CNPJ inválido ou já cadastrado em outra loja, **When** o administrador salva, **Then** o sistema recusa e diz o motivo no campo.
4. **Given** as lojas do grupo, **When** a pessoa escolhe Todas / PDV / CD ou busca por CNPJ, nome ou cidade, **Then** a tabela filtra. As colunas são código, loja, tipo, marca, CNPJ, cidade, UF, abertura e status.
5. **Given** o menu "Lojas", **When** a pessoa abre a lista geral, **Then** vê as lojas de todos os grupos (GE, marca, nome, cidade/UF, tipo e status), com busca e filtros por marca, UF, tipo e status.

---

### User Story 4 — Suspender, arquivar e restaurar um grupo, com auditoria (Priority: P2)

O administrador suspende, arquiva ou restaura um grupo. A justificativa é obrigatória. Toda mudança entra na auditoria do grupo.

**Why this priority**: controla o acesso do grupo e deixa rastro. Depende do cadastro já existir.

**Independent Test**: suspender um grupo com justificativa, ver o status mudar e o evento aparecer na aba Auditoria. Depois restaurar.

**Acceptance Scenarios**:

1. **Given** um grupo ativo, **When** o administrador clica em "Suspender tenant", **Then** abre uma confirmação que explica a consequência. O botão só habilita depois de preenchida a justificativa.
2. **Given** a justificativa preenchida, **When** confirma, **Then** o status vira Suspenso e a auditoria registra data/hora, ação, quem fez e a justificativa.
3. **Given** um grupo suspenso ou arquivado, **When** o detalhe abre, **Then** aparece "Restaurar" (com justificativa) e não aparece "Suspender".
4. **Given** qualquer cadastro ou alteração de grupo, loja ou marca, **When** é salvo, **Then** entra na auditoria. Não existe excluir grupo.

---

### User Story 5 — Ver como administrador ou como analista (Priority: P2)

Um seletor "Papel de demonstração" no topo alterna entre Administrador da plataforma e Analista da plataforma. O analista só lê: os botões de criar e alterar somem, aparece o chip "Somente leitura" e o proprietário é mostrado por código (ex.: F-1A0PR), sem nome, e-mail ou telefone.

**Why this priority**: a separação de papéis é regra do produto (pseudonimização). Mas o login ainda não existe no projeto, então o seletor serve para demonstrar.

**Independent Test**: trocar para Analista e conferir que nenhuma ação de escrita aparece e que o proprietário fica por código. Voltar para Administrador e ver tudo de novo.

**Acceptance Scenarios**:

1. **Given** o papel Analista, **When** qualquer tela abre, **Then** não aparecem Novo grupo, Editar grupo, Adicionar loja, Suspender, Arquivar, Restaurar nem as ações de marcas.
2. **Given** o papel Analista, **When** a lista ou o detalhe mostra o proprietário, **Then** aparecem o código pseudonimizado e o texto "Pseudonimizado" no lugar do e-mail e do telefone.
3. **Given** o papel Analista, **When** alguém tenta gravar algo por fora da tela, **Then** o sistema recusa.

---

### Edge Cases

- Busca sem resultado: a tabela mostra a mensagem "Nenhum grupo encontrado" com um atalho para limpar os filtros.
- Desativar uma marca que tem lojas: as lojas mantêm a marca, que aparece como Histórica.
- Tentar excluir uma marca que ganhou loja enquanto a tela estava aberta: o sistema recusa e avisa.
- Nome de marca repetido (ignorando maiúsculas e acentos): recusado.
- Grupo arquivado: continua na lista no filtro Arquivados, com aparência esmaecida. Não aceita loja nova até ser restaurado.
- CNPJ: aceito com ou sem máscara e exibido sempre com máscara.
- Grupo sem lojas: o detalhe mostra 0 lojas, sem marcas e sem estados, e convida a adicionar a primeira loja.

## Requirements *(mandatory)*

### Functional Requirements

**Estrutura**

- **FR-001**: O Backoffice MUST ter menu lateral recolhível com Visão geral, Grupos econômicos, Lojas e Marcas Farmarcas. Funcionários e Parceiros aparecem como "Em desenvolvimento", sem ação.
- **FR-002**: "Visão geral" MUST seguir o layout do protótipo: período, "Ver grupos econômicos", "Novo tenant", filtros por marca, UF e departamento, os 6 indicadores, Pontos de atenção e Adoção por módulo. O que o cadastro já tem vem do banco (GEs ativos e pontos de atenção do cadastro: sem proprietário, validação vencida, solicitações aguardando a Farmarcas, documentos com alerta, lojas pendentes), com filtro por marca e UF da loja. Uso, funcionários, módulos licenciados, período, departamento e "Novo tenant" aparecem como "—" ou desabilitados, com o aviso do que falta. (Ajuste pedido em 2026-10-30.)
- **FR-003**: Todas as telas MUST ocupar toda a largura ao lado do menu (layout fluido) e seguir as regras visuais do Alquimia DS do pacote.
- **FR-004**: O topo MUST mostrar o caminho da tela (breadcrumb) e o papel atual, com o seletor de papel de demonstração.

**Marcas**

- **FR-010**: O administrador MUST conseguir adicionar, renomear, desativar e reativar marcas. O nome é obrigatório e único.
- **FR-011**: Excluir uma marca MUST ser possível só quando ela não tem nenhuma loja.
- **FR-012**: A lista de marcas MUST mostrar marca, situação, número de lojas, número de grupos e data de criação, além dos indicadores Ativas, Históricas e Sem loja.

**Grupos econômicos**

- **FR-020**: O número do GE MUST ser emitido pelo sistema ao salvar (sequencial, exibido com 4 dígitos, sem prefixo), ser único e nunca mudar.
- **FR-021**: O cadastro do grupo MUST ter nome do grupo, razão social da matriz, CNPJ da matriz e proprietário (nome, e-mail, telefone). O proprietário é opcional. Sem ele, o grupo leva o selo "Sem proprietário". Depois de cadastrado, o proprietário não é trocado por "Editar grupo" (campos travados): a troca é "Transferir titularidade", que pede justificativa e gera código novo para a nova pessoa (ajuste de 2026-10-30).
- **FR-022**: O status do grupo MUST ser Ativo, Suspenso ou Arquivado. Grupo novo nasce Ativo.
- **FR-023**: A lista MUST ter filtro de status com contagem, busca (número, nome, proprietário), filtros por estado e por marca, e colunas GE, grupo (com razão social e selos), proprietário, telefone, lojas (total e PDV/CD), marcas das lojas, estados e status.
- **FR-024**: Marcas e estados do grupo MUST ser calculados a partir das lojas, não digitados.
- **FR-025**: O detalhe do grupo MUST ter as abas Lojas e Auditoria.

**Lojas**

- **FR-030**: A loja MUST pertencer a exatamente um grupo e ter nome, tipo (PDV ou CD), CNPJ válido e único, marca ativa, endereço, cidade e UF.
- **FR-031**: O código da loja MUST ser gerado no cadastro, no formato LJ-NNN.
- **FR-032**: Loja nova MUST nascer com status "Pendente no grupo". Os status possíveis são Pendente no grupo, Ativa e Inativa.
- **FR-033**: O administrador MUST poder mudar o status de uma loja entre Ativa e Inativa, com confirmação e justificativa escrita (vai para a auditoria do grupo). Loja de grupo arquivado não muda de status. (Ajuste de 2026-10-30.)
- **FR-034**: MUST existir a lista geral de lojas de todos os grupos, com busca e filtros por marca, UF, tipo e status.

**Ciclo de vida e auditoria**

- **FR-040**: Suspender, arquivar e restaurar MUST exigir justificativa escrita.
- **FR-041**: Toda criação ou mudança de grupo, loja ou marca MUST gerar um registro de auditoria com data/hora, ação, papel de quem fez e justificativa (quando houver). Os registros não podem ser editados nem apagados.

**Papéis**

- **FR-050**: O sistema MUST ter dois papéis: Administrador da plataforma (lê e escreve) e Analista da plataforma (só lê).
- **FR-051**: Para o Analista, o proprietário MUST aparecer só pelo código pseudonimizado, estável por pessoa.
- **FR-052**: As regras de papel MUST valer também quando a gravação chega por fora da tela, não só escondendo botões.

**Multi-tenant**

- **FR-055**: Cada grupo econômico MUST ser um tenant isolado. Todo dado que pertence a um grupo (lojas, proprietário, auditoria) é marcado com o grupo, e o próprio banco só entrega a quem é do grupo os dados daquele grupo.
- **FR-056**: A Farmarcas MUST acessar os grupos por um caminho exclusivo do operador, separado do acesso de quem é do grupo, e só com papel de plataforma.
- **FR-057**: O papel de demonstração MUST funcionar só no ambiente local. Em produção, papel e tenant vêm do provedor de identidade, nunca do que a tela envia.
- **FR-058**: MUST existir teste automático que prova o isolamento: um grupo não lê nem altera dados de outro, e o analista não recebe dado pessoal do proprietário.

**Dados de exemplo**

- **FR-060**: O ambiente local MUST vir com os dados fictícios do protótipo (as 11 marcas, os grupos e as lojas de exemplo), para dar para demonstrar logo depois de subir.

### Key Entities

- **Grupo econômico (tenant)**: número do GE (emitido, imutável), nome, razão social, CNPJ da matriz, status, proprietário (opcional) e datas de criação e atualização.
- **Proprietário**: nome, e-mail, telefone e código pseudonimizado (ex.: F-1A0PR). Pertence a um grupo.
- **Loja**: código, grupo, nome, tipo (PDV/CD), CNPJ, marca, endereço, cidade, UF, data de abertura (opcional) e status.
- **Marca Farmarcas**: nome, situação (Ativa/Histórica) e data de criação. Contagens de lojas e grupos são calculadas.
- **Registro de auditoria**: grupo (quando houver), data/hora, ação, papel de quem fez e justificativa.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um administrador cadastra um grupo novo com uma loja em menos de 3 minutos.
- **SC-002**: Encontrar um grupo pelo número ou pelo nome leva menos de 10 segundos numa base de 500 grupos.
- **SC-003**: 100% das mudanças de status de grupo têm justificativa registrada na auditoria.
- **SC-004**: No papel Analista, nenhuma tela mostra nome, e-mail ou telefone de proprietário, e nenhuma gravação é aceita.
- **SC-005**: Os dados cadastrados continuam lá depois de reiniciar o ambiente.
- **SC-006**: As telas seguem o protótipo: mesmas colunas, filtros, selos e textos das telas cobertas.

## Assumptions

- **Escopo desta entrega**: Marcas, Grupos econômicos, Lojas (cadastro básico e lista geral), ciclo de vida do grupo e auditoria. **Ficam para depois**: indicadores de uso e "saúde de uso", módulos licenciados (liberar e revogar), funcionários, convite e ativação do proprietário, transferência de titularidade, Cartão Alelo, carga inicial por arquivo, exportação em CSV, o detalhe completo da loja (governança, documentos, mobiliário, sistemas, canais, solicitações) e o módulo Gestão 360. Motivo: começar pelo menor pedaço que funciona (constituição, VII).
- **Login**: o projeto ainda não tem login, que é uma lacuna conhecida. Decisão: usar o seletor "Papel de demonstração", como no protótipo. Por quê: dá para demonstrar a regra de papéis agora e trocar pelo login de verdade depois, sem mudar as telas.
- **Cor de ação do Backoffice**: decisão: laranja `#F25C05`, como na versão mais recente do protótipo. O azul `#006FF7` fica para a suíte do associado. Por quê: é o que o protótipo atual mostra (divergência 1 do `DE-PARA.md`).
- **"Aguardando ativação"**: depende do convite do proprietário, que está fora desta entrega. O selo não aparece agora.
- **Código da loja** (LJ-NNN): segue o protótipo. O código oficial ainda está "a validar" com a Farmarcas.
- **Dados**: todos os exemplos são fictícios.
