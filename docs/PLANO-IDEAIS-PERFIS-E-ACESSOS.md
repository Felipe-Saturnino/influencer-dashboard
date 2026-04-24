# Plano ideal: Perfis e Acessos

> **Status:** Aguardando aprovação. Nenhum arquivo de implementação será gerado até o plano ser aprovado.

---

## 1. Visão geral

Uma única página **Gestão de Usuários** comanda todo o acesso à plataforma. O que o administrador configura ali é exatamente o que cada usuário pode ver e fazer — sem exceções, sem regras implícitas espalhadas pelo código.

---

## 2. Estrutura da Gestão de Usuários

### 2.1 Aba "Usuários"

Lista de usuários cadastrados. Ao criar ou editar um usuário:

| Campo | Descrição |
|-------|-----------|
| **Nome** | Nome do usuário |
| **E-mail** | (apenas na criação) |
| **Perfil** | Dropdown: Administrador, Gestor, Executivo, Operador, Agência, Influencer |
| **Influencers visíveis** | Quais influencers este usuário pode ver (multi-seleção; vazio = depende do perfil) |
| **Operadoras visíveis** | Quais operadoras este usuário pode ver (multi-seleção; vazio = depende do perfil) |

Para **Agência**, em vez de duas listas separadas: pares **[Influencer] × [Operadora]** (ex.: "João × Bet365", "Maria × Casa de Apostas").

### 2.2 Aba "Permissões"

Configura **o que cada perfil pode fazer em cada página**. Matriz:

| Seção | Página | Ver | Criar | Editar | Excluir |
|-------|--------|-----|-------|--------|---------|
| Lives | Agenda | Sim/Não/Próprios | … | … | … |
| Lives | Resultados | … | … | … | … |
| Lives | Feedback | … | … | … | … |
| Dashboards | Overview | … | — | — | — |
| Dashboards | Conversão | … | — | — | — |
| Dashboards | Financeiro | … | — | — | — |
| Dashboards | Overview Influencer | … | — | — | — |
| Lives | Influencers | … | … | … | … |
| … | … | … | … | … | … |

- **Ver:** Sim = vê tudo na página | Não = não acessa | Próprios = vê só o que está no seu escopo
- **Criar/Editar/Excluir:** mesma lógica onde fizer sentido.

---

## 3. Regras de escopo (quem vê quais dados)

Cada usuário tem um **escopo** definido na Aba Usuários (influencers e operadoras atribuídos).

| Perfil | Como funciona o escopo |
|--------|------------------------|
| **Administrador** | Sempre vê tudo. Ignora escopo. |
| **Gestor** | Sempre vê **todas** as operadoras e influencers. Ignora escopo. Mas só acessa as **páginas** configuradas na Aba Permissões (não vê/age em páginas não liberadas). |
| **Executivo** | Sempre segue escopo. Só vê os influencers e operadoras atribuídos. |
| **Operador** | Sempre segue escopo. Só vê os influencers e operadoras atribuídos. |
| **Agência** | Sempre segue escopo. Só vê os pares influencer×operadora atribuídos. |
| **Influencer** | Sempre segue escopo. Só vê o próprio perfil + operadoras atribuídas. |

**Resumo:** Admin e Gestor veem todos os dados (Gestor respeitando as páginas da Aba Permissões). Executivo, Influencer, Operador e Agência **sempre** seguem escopo — só veem os influencers e operadoras que lhes foram atribuídos.

---

## 4. Onde o escopo se aplica

O escopo filtra os dados em **todas** as telas que mostram dados de influencers ou operadoras:

- Agenda (lives)
- Resultados
- Feedback
- Cadastro de Influencers
- Overview (dashboard)
- Conversão (dashboard)
- Financeiro (dashboard)
- Overview Influencer
- Financeiro (página em Aquisição no menu)
- Gestão de Links
- Qualquer outra página que liste ou detalhe influencers/operadoras

---

## 5. Fluxo de decisão (resumo)

1. Usuário faz login → sistema identifica **perfil** e **escopo** (influencers/operadoras atribuídos).
2. Para cada página: consulta a **Aba Permissões** → se Ver = Não, bloqueia acesso.
3. Para cada dado (live, influencer, operadora, métrica, etc.): consulta o **escopo** do usuário → se o dado não estiver no escopo, não mostra.

---

## 6. Fonte única da verdade

| O que | Onde fica | O que define |
|-------|-----------|--------------|
| Perfil do usuário | Aba Usuários | Qual role ele tem |
| Escopo do usuário | Aba Usuários | Quais influencers/operadoras ele vê |
| O que cada perfil pode fazer | Aba Permissões | Matriz perfil × página × ações |

Não há regras "escondidas" em código. Tudo vem dessas configurações.

---

## 7. Implementação prevista (após aprovação)

1. **Banco de dados**
   - Tabela `role_permissions`: perfil, página, can_view, can_criar, can_editar, can_excluir
   - Tabela `user_scopes`: user_id, tipo (influencer/operadora/par), referência
   - Migrations/seed conforme o plano

2. **Backend / RLS**
   - Políticas que permitam leitura/escrita de acordo com perfil e escopo (ou, como alternativa, políticas amplas para autenticados e filtragem no app)

3. **Frontend**
   - Carregar permissões e escopo no login
   - Em cada página: checar permissão antes de renderizar
   - Em cada listagem/query: filtrar por escopo antes de exibir

---

## 8. Confirmação

Se este plano reflete o que você quer, responda **"Aprovado"** e serão gerados os arquivos necessários (migrations SQL, alterações em código, etc.) para implementar e deploy.

Se algo estiver diferente do ideal, descreva as mudanças e o plano será ajustado antes de qualquer implementação.
