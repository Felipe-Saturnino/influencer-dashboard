# Conceito: Perfis e Acessos — O que você configura = O que acontece

Este documento descreve de forma direta o que cada tela da Gestão de Usuários faz e como isso se reflete no acesso real dos usuários.

---

## 1. Aba Permissões

**O que você configura:** Para cada perfil (Administrador, Gestor, Executivo, etc.), quais páginas podem ser acessadas e quais ações (Ver, Criar, Editar, Excluir) estão liberadas.

**Onde fica:** Tabela `role_permissions` no Supabase.

**O que acontece:** Quando um usuário faz login, o sistema carrega as permissões do **perfil** dele. O menu e as páginas mostram apenas o que está como "Sim" ou "Próprios" na Aba Permissões.

| Se você configura…        | O usuário consegue…                         |
|--------------------------|---------------------------------------------|
| Gestor + Agenda: Ver=Sim | Ver a página Agenda                         |
| Gestor + Agenda: Ver=Não | Não ver a página Agenda (nem no menu)       |
| Influencer + Influencers: Ver=Próprios | Ver só o próprio cadastro |

---

## 2. Aba Usuários — Perfil

**O que você configura:** Qual perfil (role) cada usuário tem (Administrador, Gestor, Executivo, etc.).

**Onde fica:** Tabela `profiles`, coluna `role`.

**O que acontece:** O usuário herda todas as permissões da Aba Permissões daquele perfil.

---

## 3. Aba Usuários — Escopo (quem vê quais dados)

**O que você configura:** Para perfis que têm escopo (Executivo, Operador, Agência, Influencer), quais influencers e operadoras cada usuário pode ver.

**Onde fica:** Tabela `user_scopes`.

**O que acontece:** O usuário vê apenas os dados (lives, métricas, cadastros) dos influencers e operadoras atribuídos. Se não atribuir nada para Executivo, ele vê tudo. Operador e Agência precisam ter escopo definido.

| Perfil     | Escopo na interface        | Comportamento |
|------------|----------------------------|----------------|
| Admin      | Bloqueado ("Todos")         | Sempre vê tudo |
| Gestor     | Bloqueado ("Todos")         | Sempre vê tudo |
| Executivo  | Influencers/Operadoras opcional | Vazio = tudo. Preenchido = só os selecionados |
| Operador   | Influencers/Operadoras obrigatório | Só vê os selecionados |
| Agência    | Pares Influencer×Operadora obrigatório | Só vê os pares selecionados |
| Influencer | Operadoras obrigatório      | Só vê o próprio perfil + operadoras selecionadas |

---

## Resumo: Gestor

- **Aba Permissões:** Gestor com Ver=Sim nas páginas (Overview, Conversão, Financeiro, Agenda, Feedback, etc.) → pode acessar essas páginas.
- **Aba Usuários:** Escopo bloqueado com "Todos os influencers e operadoras" → Gestor vê todos os dados.
- **Nada de atribuição manual:** Gestor não precisa e não tem campos para atribuir influencers/operadoras.

---

## O que estava impedindo o Gestor de ver dados

O conceito acima estava certo. O problema era na base de dados:

1. **role_permissions vazia para Gestor**  
   A tabela não tinha linhas para `gestor` nas páginas de dashboard/agenda, etc.  
   **Correção:** `docs/migration-role-permissions-seed.sql`

2. **RLS bloqueando leitura**  
   As tabelas de dados (lives, influencer_perfil, etc.) tinham RLS que impedia usuários não-admin de ler.  
   **Correção:** `docs/migration-data-tables-rls-authenticated-read.sql`

Com essas duas migrations executadas no Supabase, o Gestor passa a ver exatamente o que está configurado: todas as páginas liberadas na Aba Permissões e todos os dados (todos os influencers e operadoras).

---

## Checklist para funcionar

1. [ ] Executar `migration-role-permissions-seed.sql` no Supabase
2. [ ] Executar `migration-data-tables-rls-authenticated-read.sql` no Supabase
3. [ ] Conferir na Aba Permissões se Gestor tem Ver=Sim nas páginas desejadas
4. [ ] Fazer logout e login novamente como Gestor
