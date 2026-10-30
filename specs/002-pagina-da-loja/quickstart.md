# Quickstart — validar a página da loja

## Subir
`docker compose up -d --build --wait`. A API aplica as migrations, prepara o usuário da aplicação e carrega os catálogos e os exemplos, sem apagar nada. Depois, abra http://localhost:3000.

## Roteiro P1
1. **Farmarcas (Administrador):**
   - Abra Grupos › 0417 › clique em LJ-002: a página abre na aba Dados, com o cartão de preenchimento.
   - Clique em "Editar dados básicos". Sem motivo, Salvar fica desabilitado; com motivo, salva.
   - Confira no Histórico: aparece "Pela Farmarcas", com o motivo.
2. **Grupo:**
   - Troque o papel para "Proprietário do grupo" › Grupo Aurora Norte (0417). A tela vai para "Minhas lojas", só com lojas do 0417.
   - Abra LJ-002, edite o apelido e o telefone 2. O histórico mostra "Pelo grupo".
   - Cole o endereço de uma loja do grupo 0388: aparece "Loja não encontrada".
3. **Solicitação:**
   - Como grupo, peça "Mudar regime" para Simples Nacional, anexando um PDF como termo de opção.
   - Como Farmarcas, abra a mesma loja: o painel mostra "Aguarda você". Aprove: o regime muda, e o histórico mostra "Vigente".
   - Tente abrir outra solicitação de regime com uma já aberta: a opção aparece desabilitada.
4. **Validação:**
   - Numa loja incompleta, "Validar dados" fica bloqueado. Complete os campos e valide: o estado vira "Em dia".
   - Numa loja vencida, como Farmarcas, use "Cobrar empresário": o histórico registra.
   - Na lista de Lojas, filtre por "Falta muito" e por "Validação vencida".
5. **Analista:** a página fica só leitura, e o celular e o e-mail pessoal do proprietário aparecem mascarados.

## Roteiro P2 e P3
- **Horário:** aplique de segunda a sábado, das 08:00 às 20:00, e marque domingo como fechado. Hora de fechar antes da de abrir dá erro.
- **Mobiliário:** informe Trade maior que o total: é recusado.
- **Ferramentas:** informe Infoprice a R$ 650: aparece o alerta de economia de R$ 1.920/ano.
- **Canais:** salvar sem escolher Sim ou Não dá erro.
- **Documentos:** envie uma licença com validade daqui a 20 dias: aparece "Vence em 20 dias", e a aba mostra o alerta. Um arquivo .exe renomeado para .pdf é recusado.

## Automático
- API: `npm run lint`, `npm test` e `npm run test:integration`. Os testes de isolamento cobrem as tabelas novas e os dois caminhos.
- Tela: `scripts/validar-frontend.sh`.
