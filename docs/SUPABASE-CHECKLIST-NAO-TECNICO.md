# Checklist Supabase — passo a passo (quem não é da área técnica)

Use quando quiser **confirmar** que a base está alinhada ao projeto, **sem apagar nada** (só consultas seguras).

**Onde ir:** site do Supabase → entrar no **projeto** → menu **SQL** (ou **SQL Editor**) → **New query**.

**Como usar:** copie **um bloco de cada vez**, cole na caixa grande de texto, clique em **Run** (ou **Executar**). Guarde o resultado (ou tire um print) se quiser mostrar a alguém da equipa.

---

## Passo A — Políticas que usam `get_my_role` ou `is_admin`

Isto mostra **em que tabelas** o Postgres usa essas funções nas regras de acesso (RLS).  
Se sair **vazio**, pode ser que essas funções não estejam nas políticas (página **Authentication** / políticas antigas).

```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    coalesce(qual::text, '') ILIKE '%get_my_role%'
    OR coalesce(with_check::text, '') ILIKE '%get_my_role%'
    OR coalesce(qual::text, '') ILIKE '%is_admin%'
    OR coalesce(with_check::text, '') ILIKE '%is_admin%'
  )
ORDER BY tablename, policyname;
```

**O que fazer depois:** nada obrigatório. Se tiver dúvida, envie o resultado à equipa.

---

## Passo B — Funções “sensíveis” (SECURITY DEFINER) e configuração

Lista funções que rodam com **permissões especiais**. A coluna `config_funcao`:

- se mostrar algo como `search_path=public` em algum sítio, está **com caminho fixo** (bom);
- se estiver **vazia** (`null`), a equipa técnica pode querer ajustar no futuro (não altere sozinho).

```sql
SELECT
  p.proname AS nome_funcao,
  pg_get_function_identity_arguments(p.oid) AS argumentos,
  p.proconfig AS config_funcao
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND p.prosecdef = true
ORDER BY p.proname;
```

**O que fazer depois:** só arquivar o resultado ou enviar à equipa se estiverem a auditar segurança.

---

## Passo C — Atualizar estatísticas do Postgres (recomendado, seguro)

Ajuda o banco a estimar tamanhos/linhas com mais precisão. **Não apaga dados.**

```sql
ANALYZE;
```

Um comando só. Quando terminar, pode fechar o separador.

---

## Passo D — Olhar a tabela `alert_config`

Só para ver se há linhas de configuração ou se está “livro raso”.

```sql
SELECT * FROM public.alert_config;
```

**O que fazer depois:** se estiver vazio e ninguém usar alertas, a equipa pode decidir remover a tabela **numa migração**; não é obrigatório apagar à mão.

---

## Passo E — Avisos automáticos do Supabase (sem SQL)

**Importante:** no menu **Database** às vezes aparece um texto longo com `CREATE TABLE` — isso é só o **desenho do schema** (referência), **não** são avisos nem erros.

Para procurar avisos de verdade, tente (o menu muda entre versões do site):

1. Barra lateral do projeto: **Advisors** (ou **AI Advisors**), ou
2. **Database** → separador **Advisors** / **Linter** / **Security**, ou
3. Ícone de **campainha** / **Notifications** no topo.

Se não encontrar, pode saltar este passo; o essencial já cobre com os SQL acima.

---

## Security Advisor (avisos do Supabase) — o que significa

| Nível | Significado simples |
|--------|---------------------|
| **ERROR** | Vale a pena corrigir; o projeto inclui migração que trata a view `v_influencer_metricas_mensal` e funções `search_path`. |
| **WARN** | Aviso: políticas RLS “abertas demais” ou extensão `http` no schema `public` — exige decisão técnica; **não** é botão para carregar sem equipa. |
| **INFO** | Informativo; `utm_metricas_diarias` sem políticas era **proposital** antes; a migração `20260423200000_security_advisor_fixes.sql` adiciona negação explícita. |

**Proteção de passwords vazadas (Auth):** no painel Supabase → **Authentication** → **Providers** (ou **Policies** / **Password**) → ativar **Leaked password protection** (HaveIBeenPwned), conforme a documentação do Supabase.

---

## O que **não** precisa de fazer agora

- Não apague tabelas nem funções sem orientação.
- Não partilhe **chave secreta** (service role), só links ou resultados de consultas sem dados pessoais sensíveis.

Para um **pacote completo de SQL** num só ficheiro (incluindo inventário de tabelas), use também `docs/database-health-check.sql` — normalmente quem é técnico corre por blocos.
