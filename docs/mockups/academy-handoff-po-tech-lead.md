## Academy (Formação e Capacitação de Prestadores) — Handoff PO → Tech Lead

### Mockups de referência
- `academy-treinamentos-mockup-v4.html` → Página 1, Gestão de Treinamento
- `academy-turmas-mockup.html` → Página 2, Turmas
- `academy-cursos-livres-mockup.html` → Página 3, Cursos Livres
- `academy-meu-onboarding-mockup.html` → Página 4, Meu Onboarding
- `academy-meus-cursos-mockup.html` → Página 5, Meus Cursos

Os 5 arquivos são HTML/CSS/JS estáticos (sem backend), pensados só pra validar fluxo, hierarquia visual e regra de negócio. Nenhum nome de tabela, coluna ou RPC foi definido — isso é decisão do Tech Lead em cima do schema real.

### Resumo
Academy é um novo conjunto de 5 páginas pra gerir o ciclo de formação dos Prestadores de estúdio (dealers, shufflers etc.): onboarding obrigatório organizado em turmas com trilhas e provas, cursos livres opcionais com gamificação por pontos/badge, e o cockpit do instrutor pra liberar provas, avançar a turma na trilha e registrar avaliação individual. Duas visões: instrutor/admin (Gestão de Treinamento, Turmas, Cursos Livres) e prestador (Meu Onboarding, Meus Cursos), ambas lendo o mesmo dado de origem.

### Problema e objetivo
Hoje não existe, dentro da plataforma, um lugar único pra configurar o cronograma de formação de um Prestador, acompanhar a turma em andamento (quem já fez qual prova, quem foi liberado pra mesa) e dar visibilidade disso pro próprio prestador. Objetivo da v1: padronizar cronograma → trilha → prova → turma → avaliação num fluxo só, e abrir um canal opcional de cursos livres com incentivo por pontuação, sem duplicar nada que já existe em Gestão de Prestadores ou Dados de Cadastro.

### Mapa de páginas

| # | Página (h1) | Subtítulo | PageKey sugerido | Persona principal | Mockup |
|---|---|---|---|---|---|
| 1 | Gestão de Treinamento | Monte as trilhas, os materiais das aulas e as provas dos cronogramas de entrada e atualização. | `academyGestaoTreinamento` | Instrutor, Admin | academy-treinamentos-mockup-v4.html |
| 2 | Turmas | Acompanhe presença, progresso e avaliação de cada turma, do agendamento até a liberação para a mesa. | `academyTurmas` | Instrutor, Admin | academy-turmas-mockup.html |
| 3 | Cursos Livres | Catálogo de cursos livres da empresa, feitos no próprio ritmo do colaborador — com ou sem obrigatoriedade. | `academyCursosLivres` | Admin | academy-cursos-livres-mockup.html |
| 4 | Meu Onboarding | Acompanhe sua turma de formação, dia a dia. | `academyMeuOnboarding` | Prestador | academy-meu-onboarding-mockup.html |
| 5 | Meus Cursos | Cursos livres da Academy Spin — no seu ritmo, quando quiser. | `academyMeusCursos` | Prestador | academy-meus-cursos-mockup.html |

Seção de menu sugerida: dentro de **RH** (ao lado de Gestão de Prestadores, Dados de Cadastro etc.), já que as 5 páginas giram em torno do ciclo de vida do Prestador. Alternativa seria criar uma seção nova "Academy" — deixei como pergunta em aberto (item 1) porque é decisão de informação arquitetural, não fica bem eu travar isso sozinho.

Confirmar os valores reais de `PageKey` contra o enum já existente no repositório antes de cadastrar em `menu.ts` / `App.tsx` / `PAGES`.

### Personas e permissões

**Páginas de gestão (1, 2 e 3 — Gestão de Treinamento, Turmas, Cursos Livres)**

| Perfil | Ver | Criar | Editar | Excluir | Escopo |
|---|---|---|---|---|---|
| Admin | Sim | Sim | Sim | Sim | Global |
| Instrutor* | Sim | Sim (cronograma, turma, avaliação) | Sim (só nas turmas em que é o instrutor) | Não | Turmas/matrículas atribuídas a ele |
| Gestor / Executivo / demais perfis | Não** | — | — | — | — |

\* "Instrutor" não existe hoje como persona formal na matriz de Gestão de Usuários — ver Pergunta 2.
\*\* Default técnico de página nova é Não pra todo mundo exceto Admin; liberar depois em Gestão de Usuários conforme necessidade real (ex.: Gestor com Ver=Sim só pra acompanhar, sem editar).

**Páginas do prestador (4 e 5 — Meu Onboarding, Meus Cursos)**

| Perfil | Ver | Criar | Editar | Excluir | Escopo |
|---|---|---|---|---|---|
| Admin | Sim | Não aplicável | Não aplicável | Não aplicável | Global (visão de qualquer prestador — a confirmar se cabe aqui ou só nas páginas de gestão) |
| Prestador | Sim | Não | Não | Não | Próprios dados (`próprios`) |
| Demais perfis | Não | — | — | — | — |

Em nenhuma das 5 páginas o Prestador edita a própria avaliação — isso é sempre ação do Instrutor/Admin nas páginas de gestão.

### Escopo de dados
Academy é tratada como interna à Spin Gaming (formação do quadro de estúdio), sem filtro por operadora whitelabel nos mockups — presume-se que o Prestador não está amarrado a uma operadora específica pra fins de treinamento. Se isso não for verdade pra todos os casos, precisa entrar um filtro de operadora nas páginas 1 e 2 (ver Pergunta 3). Nas páginas 4 e 5 o escopo é sempre "próprios": o prestador só vê a própria matrícula/turma e os próprios cursos.

### Modelo de dados conceitual (compartilhado entre as 5 páginas)
Sem nome de tabela/coluna real — só as entidades e relações que o produto precisa, pro Tech Lead mapear contra o schema:

- **Cronograma**: agrupador de trilhas (ex.: "Game Presenter", "Shuffler", "Atualização", e outros que o instrutor crie livremente). Guarda nome, descrição, duração prevista e a lista ordenada de trilhas.
- **Trilha**: uma etapa dentro de um cronograma (ex.: "Onboarding Institucional", "Roleta", "Baccarat"). Tem categoria (Institucional / Jogo / Operação / Prática), posição no cronograma, materiais de aula e, opcionalmente, uma prova.
- **Prova**: associada a uma trilha; tem um estado de liberação controlado pelo instrutor (liberada/bloqueada) e um resultado por prestador.
- **Turma**: execução concreta de um Cronograma. Tem instrutor responsável, data/horário de início, status (agendada / em andamento / concluída), código (ex.: GP-14) e a lista de prestadores matriculados.
- **Matrícula** (Prestador × Turma): liga um prestador a uma turma; guarda a trilha atual dele ali, a situação (em dia, prova pendente, faltou etc.) e se foi liberado pra mesa no final.
- **Relatório de Acompanhamento**: por matrícula — avaliação por competência (postura, regras, agilidade, atendimento) + um **log de observações datadas** que o instrutor vai adicionando ao longo da turma. Não é mais um campo único de comentário — é o mesmo dado que aparece, somente-leitura, em Meu Onboarding.
- **Curso Livre**: catálogo de cursos opcionais ou obrigatórios fora do onboarding de turma (ex.: PLD, Ética, Liderança). Guarda obrigatório (sim/não), prazo, pontos concedidos ao concluir, e se emite certificado.
- **Inscrição em Curso** (Prestador × Curso Livre): guarda status (não iniciado / em andamento / concluído) e data de conclusão.
- **Pontuação e Badge do Prestador**: pontuação total = soma dos pontos de todos os Cursos Livres concluídos. O badge não é mais configurado por curso — é derivado automaticamente pela faixa de pontuação em que o prestador está (faixas ainda não definidas — Pergunta 4).

Relações principais: Prestador 1–N Matrícula; Matrícula N–1 Turma; Turma N–1 Cronograma; Cronograma 1–N Trilha (ordenada); Trilha 1–0/1 Prova; Matrícula 1–1 Relatório de Acompanhamento; Prestador 1–N Inscrição em Curso; Inscrição em Curso N–1 Curso Livre.

### Páginas — detalhamento

#### 1. Gestão de Treinamento
**Fluxo principal:** instrutor/admin abre a página → filtro "Cronogramas" (seleção única, ordem alfabética) já entra no primeiro item → botão "Novo Cronograma" na mesma linha abre modal (Nome, Descrição, Duração Prevista) → ao salvar, o cronograma aparece no filtro, vazio → abas internas Trilhas / Materiais / Provas editam o cronograma selecionado → bloco "Ordem das Trilhas" inclui/reordena trilhas.

**Mudou nesta rodada:** as 3 abas fixas (Game Presenter, Shuffler, Atualização) viraram esse filtro único e dinâmico; a antiga aba "Turma" saiu inteira da página — agora é a página 2.

**Regras de negócio:** nome do cronograma e duração prevista são obrigatórios pra salvar; cronogramas sempre em ordem alfabética no filtro.

**Estado vazio:** cronograma sem trilha mostra hint "Nenhuma trilha incluída ainda…".

#### 2. Turmas
**Fluxo principal:** tabela com todas as turmas (agendada / em andamento / concluída), filtrável por pills de status → clicar em "Abrir" (👁) numa linha carrega, abaixo da tabela, o cockpit da turma com 2 abas: "Progresso da Turma" e "Avaliação da Turma" → em Progresso, timeline das trilhas com a atual destacada, botão de liberar/bloquear prova e botão de avançar trilha → em Avaliação, lista de prestadores matriculados, cada um com botão "Avaliar" (postura/regras/agilidade/atendimento + relatório de acompanhamento) → botão "Nova Turma" (CTA) abre modal (Nome, Cronograma, Instrutor, Data/Horário) com código sugerido automaticamente → ação "Registrar Presença" por turma abre chamada por dia.

**Decisão de produto pra resolver as duas dúvidas em aberto do pedido original:**
- **Seletor de turma:** não existe um segundo dropdown — a própria tabela já lista todas as turmas, e "Abrir" numa linha seleciona/exibe o cockpit dela. Evita duplicar seleção.
- **Turmas concluídas:** continuam na mesma tabela (filtro "Concluídas") e abrem o mesmo cockpit em **modo somente-leitura** — timeline toda concluída sem ações de liberar/avançar; modal de avaliação com selects desabilitados, sem campo de nova observação, botão "Fechar" no lugar de "Salvar avaliação".

**Regras de negócio:** liberar prova é reversível (dá pra bloquear de novo); avançar trilha marca a atual como concluída e destrava a próxima; resultado final de cada prestador na matrícula é "Liberado p/ mesa" ou "Não liberado" (com motivo, quando houver — ex. desligamento durante o processo).

#### 3. Cursos Livres
**Fluxo principal:** Admin cadastra/edita cursos do catálogo via modal "Novo Curso" (Nome, Obrigatório sim/não, Prazo, Pontos ao concluir, Emite certificado sim/não).

**Mudou nesta rodada:** campo "Selo / badge (opcional)" foi removido do modal — badge deixou de ser configurado por curso individual.

**Regra de negócio:** "Pontos ao concluir" de cada curso alimenta a pontuação acumulada do prestador (ver página 5); é a pontuação total, não mais o curso isolado, que determina o badge.

#### 4. Meu Onboarding
**Fluxo principal:** prestador vê a trilha atual da própria turma, o progresso, e o "Relatório da instrutora" — agora uma lista de observações datadas (mais recente primeiro), o mesmo Relatório de Acompanhamento mantido pelo instrutor na página Turmas, só que somente-leitura aqui. Não é dado duplicado — é a mesma fonte.

#### 5. Meus Cursos
**Fluxo principal:** topo da página com 4 cards de KPI, nesta ordem: **Pontuação** (com o badge atual), **Cursos Obrigatórios** (concluídos/total), **Cursos em Andamento**, **Certificados Emitidos**. Abaixo, o catálogo de cursos disponíveis com progresso individual do prestador.

**Regra de negócio:** Pontuação = soma dos pontos de todos os cursos concluídos; badge é automático por faixa de pontuação (faixas ainda não definidas — Pergunta 4); "Cursos Obrigatórios" conta só os marcados como obrigatório=sim no catálogo; os 4 KPIs recalculam ao concluir um curso.

### Estados padrão (valem pras 5 páginas)
Sem permissão: **"Você não tem permissão para visualizar este dashboard."** · Vazio analítico: **"Sem dados para o período selecionado."** (quando aplicável) · Valor impossível: **—** · Confirmações sempre em modal, nunca `window.confirm`/`alert`.

### Integrações
Nada de integração externa nova nos mockups. Pontos técnicos pro Tech Lead avaliar: geração de PDF de certificado (já existe jsPDF no stack); onde calcular pontuação/badge (view, função no banco, ou client-side); notificação ao prestador quando entra observação nova no relatório (não confirmado como requisito v1).

### Fora de escopo (v1)
- Emissão real do PDF de certificado (mockup só sinaliza "emite certificado = sim/não").
- Configuração fina das faixas de pontuação por badge — ficou como placeholder.
- Notificações automáticas (push/e-mail) sobre observação nova, prova liberada ou turma concluída.
- Mais de um instrutor responsável pela mesma turma.
- Relatório agregado/exportável de desempenho por turma ou por prestador (candidato a um Overview de Academy futuro).

### Critérios de aceite (checklist)
- [ ] As 5 páginas aparecem na seção de menu definida, com h1/subtítulo exatamente como especificado.
- [ ] Todas nascem com Ver/Criar/Editar/Excluir = Não pra todo perfil exceto Admin, até liberação em Gestão de Usuários.
- [ ] Filtro "Cronogramas" sempre em ordem alfabética, abrindo no primeiro item.
- [ ] "Novo Cronograma" cria um cronograma vazio, disponível no filtro.
- [ ] Em Turmas, abrir uma linha da tabela carrega o cockpit certo, sem seletor duplicado.
- [ ] Turma concluída abre em modo somente-leitura (sem liberar/avançar, sem nova observação).
- [ ] Relatório de Acompanhamento é sempre log de múltiplas entradas datadas — nunca campo único — tanto na edição (Turmas) quanto na leitura (Meu Onboarding).
- [ ] Modal de Novo Curso não tem mais campo de Selo/badge.
- [ ] Meus Cursos mostra os 4 KPIs, nesta ordem: Pontuação, Cursos Obrigatórios, Cursos em Andamento, Certificados Emitidos.
- [ ] Pontuação e badge recalculam corretamente ao concluir um curso.
- [ ] Nenhuma mensagem de erro expõe nome de tabela, RPC ou stack trace.

### Impacto em Ajuda/glossário
Criar entradas em Ajuda pras 5 páginas, usando exatamente os nomes do menu: Gestão de Treinamento, Turmas, Cursos Livres, Meu Onboarding, Meus Cursos. Adicionar ao glossário: Cronograma, Trilha, Turma, Relatório de Acompanhamento, Pontuação/Badge da Academy.

### Perguntas em aberto para o PO
1. Seção de menu definitiva: essas 5 páginas entram dentro de **RH** (proposta deste handoff) ou crio uma seção nova "Academy" no menu lateral?
2. "Instrutor" vira uma persona nova na matriz de Gestão de Usuários, ou é um Gestor com escopo restrito às turmas que ele ministra? Isso muda a permissão/escopo das páginas 1 e 2.
3. Academy é sempre global (Spin Gaming), ou existe caso de prestador vinculado a uma operadora específica que exigiria filtro de operadora?
4. Faixas de pontuação de cada badge (quantos pontos = Bronze/Prata/Ouro etc.) ainda não foram definidas — preciso fechar isso antes do Tech Lead implementar a regra de cálculo.
5. Cronograma sem nenhuma trilha pode gerar uma Turma mesmo vazio, ou bloqueamos "Nova Turma" até existir pelo menos 1 trilha?
6. Certificado (Curso Livre e, futuramente, onboarding): a geração real do PDF entra na v1 ou fica pra depois?
