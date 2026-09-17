# Ideias — caixa de entrada

**Um ficheiro** para ideias, débitos de UI e features ainda sem chat de implementação.
**Não** é `docs/BACKLOG.md` (esse é só fios longos do agente).

**Chat fixo:** Ideias. Não implementar aqui.
**Escrita:** gravar direto ao receber a ideia. Acrescentar o item; não reescrever o ficheiro inteiro.
**Perguntar** só se a ideia estiver ambígua (não dá para classificar tipo/área nem escrever a nota).
**Leitura:** ao abrir este compositor, ou quando o usuário apontar um ID noutro chat.

Próximo ID livre: **IDEIA-008**.

## Como registrar

1. Usuário manda a ideia (informal ok).
2. Agente grava já na lista viva (ID, tipo, área, título, nota, status `inbox`) e avança o próximo ID livre.
3. Devolve só o ID e o título — sem pedir confirmação.
4. Implementação: chat novo (`/nova-feature`, Ajustes Gerais, …) apontando o ID.
5. Item **feito** sai da lista viva (move para **Feito** ou apaga). Não acumular histórico eterno.

Tipos: `UI` · `feature` · `débito` · `correção`.
Status: `inbox` · `pronto` · `em curso` · `feito`.

## Lista viva

- **IDEIA-001** · 17/09/2026 · UI · transversal (todas as páginas) · inbox
  Revisitar os subtítulos de todas as páginas.
  Varredura do nível 1 (`PageHeader` / `DashboardPageHeader`): uma linha sob o `h1`, propósito em PT-BR, alinhada a Brand §4, `pageCanonicalCopy.ts`, tabela canónica do MDC da secção e Ajuda. Título da página continua = `label` do menu. Exceções já na lei (Home, Configurações, Login; Influencers/Afiliados condicionais). Chat de implementação: Ajustes Gerais ou `/verificacao` por secção.

- **IDEIA-002** · 17/09/2026 · UI · transversal (blocos / `SectionTitle`) · inbox
  Revisitar títulos e subtítulos de todos os blocos nas páginas.
  Varredura do nível 3: `SectionTitle` + prop `sub` (não `<p>` solto, sem ícone no cabeçalho do bloco). Copy de título e subtítulo de cada caixa de informação (KPIs, tabelas, gráficos, funis).   Filtros (nível 2) não entram. Ao fechar, alinhar MDC da secção se o texto canónico do bloco estiver documentado.

- **IDEIA-003** · 17/09/2026 · feature · Geral / Configurações (transversal) · inbox
  Idiomas na plataforma — seletor em Configurações.
  Hoje a UI é PT-BR hardcoded (Global § Linguagem) e Configurações só tem senha + tema. Feature: o usuário escolhe outro idioma nessa página. Escopo grande (`/nova-feature`): catalogar strings, persistir preferência, decidir quais línguas e o que fica de fora (Ajuda, e-mails, dados de negócio). Idiomas concretos ainda não definidos.

- **IDEIA-004** · 17/09/2026 · débito · Geral / Ajuda · inbox
  Mapear as páginas que não têm menu de Ajuda.
  Inventário de páginas logadas sem `AjudaContextualAcoes` (Conheça / Troubleshooting / Tutorial) no header ou na barra. Lei atual (`geral.mdc`): cobertura de produto do menu, exceto Home, Configurações, Ajuda e Versionamento. Chat de implementação: Ajuda — listar o que falta vs o que é exclusão intencional.

- **IDEIA-005** · 17/09/2026 · débito · Geral / Ajuda · inbox
  Mapear páginas, abas e funções sem tutorial.
  Inventário vs catálogo em `tutoriais/catalog.ts` + `relatedPageKey` / `relatedTabId`. Várias páginas já têm Conheça/Troubleshooting mas zero tutorial; outras têm tutorial só numa aba. Chat de implementação: Ajuda — mapa página → aba → função → tutorial (ou «não tem»).

- **IDEIA-006** · 17/09/2026 · feature · RH / Escala Escritório · inbox
  Requisição de ausência prolongada na Escala Escritório.
  Fluxo novo para o prestador de escritório pedir ausência de vários dias e o gestor/RH tratar o efeito na grade (`escala_escritorio`). Hoje: Solicitações RH cobre atestado/reunião/vaga/feedback; «Registrar Ausência» existe no Controle de Turno (estúdio, dia operacional) — não é este pedido. Chat: `/nova-feature` — quem pede, quem aprova, como pinta a célula e se vira tipo em Solicitações.

- **IDEIA-007** · 17/09/2026 · feature · Dashboards / Headcount · inbox
  Listagem de contratações na aba Contratação, no padrão da aba Distratos.
  Hoje a aba Contratação (`HeadcountAbaVagas`) é pipeline de vagas (Abertas / Em andamento / Fechadas + funil + tabela só de vagas abertas/em andamento). Distratos já lista pessoas (nome, time, admissão, término, tipo, permanência; sort + paginação 20). Incluir tabela equivalente das admissões do período/Histórico. Chat: `/nova-feature` ou Ajustes Gerais — `headcountMetrics.ts` + `HeadcountAbaVagas`.

## Feito

- (vazio)

## Modelo

```
- **IDEIA-000** · DD/MM/AAAA · tipo · área · status
  Título numa linha.
  Nota curta (2–4 linhas do pedido).
```
