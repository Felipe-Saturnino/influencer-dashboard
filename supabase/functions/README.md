# Edge Functions — alinhamento Git ↔ Supabase (painel)

Cada pasta desta directory é **uma Edge Function** no Supabase. Todos os ficheiros ficam **no mesmo nível** que o `index.ts` — o painel **não suporta subpastas** (+ Add File só cria ficheiros planos).

**Deploy manual:** abra a function → crie/atualize **cada** ficheiro listado abaixo → **Deploy updates**.

**Ficheiro novo no Git que não aparece no painel:** o Dashboard **não sincroniza** com o repositório. Use **+ Add File** com o mesmo nome do ficheiro em `supabase/functions/<nome-da-function>/`, cole o conteúdo do Git, depois **Deploy updates**. Alternativa: `supabase functions deploy <nome-da-function>` na CLI (envia a pasta inteira).

**Não existe pasta no painel** — só ficheiros planos ao lado do `index.ts`. `_shared/` ou subpastas **nunca** entram no deploy manual.

**Secrets:** Supabase → Project Settings → Edge Functions → Secrets.

Ao alterar um template de e-mail, replique o ficheiro em **todas** as functions da secção correspondente.

---

## Inventário por function

### Só `index.ts`

| Pasta |
|-------|
| `aprovar-pagamento` |
| `atualizar-perfil` |
| `monitor-lobby-cda` |
| `monitor-lobby-esportiva` |
| `prestador-ponto` |
| `prospecto-afiliados-network-site` |
| `prospecto-cs-atendimento-site` |
| `prospecto-vaga-candidatura-site` |
| `prospecto-scout-site` |
| `sync-vagas-carreiras-site` |
| `sync-metricas-cda` |
| `sync-painel-noticias-rss` |
| `sync-spin-na-rede-rss` |
| `sync-comercial-spa-lista` |
| `validate-comercial-dominios` |
| `enrich-comercial-cnpj` |
| `trigger-social-kpis` |
| `purge-academy-performance-hub-videos` |

**`sync-painel-noticias-rss`:** ingestão RSS → `painel_noticia` (TV `/painel-noticias`). Secret **`PAINEL_NOTICIAS_INGEST_SECRET`** (mesmo valor no GitHub Actions e nos Secrets da Edge). Cron envia o header `x-painel-noticias-ingest-secret`. Status Técnico → Sync usa a sessão logada (JWT). Feeds só de `PAINEL_NOTICIAS_RSS_URLS` — o body **não** substitui a lista. Sem o secret, o job horário falha com 401.

**`purge-academy-performance-hub-videos`:** retenção dos vídeos do Performance Hub (cron semanal). Sem secrets próprios — usa `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, e só aceita chamada cujo `Authorization` seja a service role key. Simulação: `{"dry_run": true}` no body. Regras: `.cursor/rules/academy.mdc` § Vídeo — limite e retenção.

**`sync-comercial-spa-lista`:** deploy no painel Supabase com **apenas** `index.ts` (parser CSV/XLSX/HTML inline). Testes locais: `src/lib/comercialSpaCsvParser.ts` + `src/lib/comercialSpaXlsx.ts` + `src/lib/comercialSpaListaFonte.ts`. A Edge abre a página-índice gov.br, segue **Empresas Autorizadas** (tabela HTML) e, se existir, a planilha legado `planilha-de-autorizacoes.xlsx`. SharePoint (`:x:/r/`) só entra se não houver tabela nem ficheiro no gov.br.

**`validate-comercial-dominios`:** deploy com **apenas** `index.ts`. Lógica HTTP espelhada em `src/lib/comercialDominioValidation.ts`.

**`enrich-comercial-cnpj`:** deploy com **apenas** `index.ts`. Parser/localidade espelhado em `src/lib/comercialCnpjEnrichment.ts`.

### `index.ts` + `platformHealthDiagnostics.ts`

**Function:** `platform-health-check` — diagnóstico Status Técnico (secrets CDA, Resend, e-mail transacional/cron, integrações).

| Ficheiro |
|----------|
| `index.ts` |
| `platformHealthDiagnostics.ts` |

Detalhes: `docs/SETUP-PLATFORM-HEALTH.md`.

---

### `index.ts` + `softswissScan.ts`

**Functions:** `monitor-lobby-blaze`, `monitor-lobby-jonbet` — paginação SoftSwiss até achar todos os IDs cadastrados.

| Ficheiro |
|----------|
| `index.ts` |
| `softswissScan.ts` |

Espelho Telecom: `scripts/lib/monitorLobbySoftSwissScan.mjs`.

---

### Boas-vindas (conta nova)

**Functions:** `criar-usuario`, `criar-usuario-scout`, `criar-afiliado-network`, `sync-rh-prestador-auth-user`

| Ficheiro | Obrigatório |
|----------|-------------|
| `index.ts` | Sim |
| `resendMail.ts` | Sim |
| `emailBrand.ts` | Sim |
| `transacionalShell.ts` | Sim |
| `boasVindasUsuario.ts` | Sim |
| `enviarBoasVindas.ts` | Sim |
| `common.ts` | Sim |
| `common.ts` | Sim — inclui `accessGrantedByPayload` (**só `criar-usuario`**) para auditoria `access_granted_by` na criação manual |

**Nota:** cada function tem ficheiros **no mesmo nível** que o `index.ts`. Não usar pasta `_shared` — o painel Supabase não a inclui no deploy.

**Painel Supabase — ficheiros que “somem” após Deploy updates:** o editor **só persiste ficheiros importados** (directa ou indirectamente) a partir de `index.ts`. Ficheiros criados com **+ Add File** mas **sem** `import` no `index.ts` (ou sem gravar o `index.ts` antes do deploy) são **omitidos do bundle** e desaparecem da lista. **Não criar ficheiro novo** para lógica de `criar-usuario` — colocar helpers em `common.ts` (já listado) e importar de `./common.ts` no `index.ts`.

---

### Redefinição de senha

**Functions:** `recuperar-senha`, `admin-usuario-acao`

| Ficheiro | Obrigatório |
|----------|-------------|
| `index.ts` | Sim |
| `resendMail.ts` | Sim |
| `emailBrand.ts` | Sim |
| `transacionalShell.ts` | Sim |
| `recuperacaoSenha.ts` | Sim |
| `enviarRecuperacaoSenha.ts` | Sim |
| `common.ts` | Sim |

---

### Agenda diária (cron)

**Function:** `email-agenda-diaria` · **Agendamento:** pg_cron (`daily-email-agenda-diaria`) — `scripts/COLE-NO-SUPABASE-daily-edge-jobs-pg-cron.sql`

| Ficheiro |
|----------|
| `index.ts` |
| `resendMail.ts` |
| `emailBrand.ts` |

Secret: `EMAIL_AGENDA_DESTINATARIOS` · Remetente: `RESEND_FROM_RELATORIOS`

---

### Relatório diário diretoria (cron)

**Function:** `relatorio-diario-diretoria` · **Agendamento:** pg_cron (`daily-relatorio-diario-diretoria`) — mesmo script COLE acima

| Ficheiro |
|----------|
| `index.ts` |
| `resendMail.ts` |
| `emailBrand.ts` |
| `common.ts` |
| `fetchRelatorioDiretoriaData.ts` |
| `templateRelatorioDiretoria.ts` |

Secret: `RELATORIO_DIRETORIA_DESTINATARIOS` · Remetente: `RESEND_FROM_RELATORIOS`

**Investimento (bloco Streamers):** RPC `get_investimento_pago` com service role — a função deve aceitar `auth.role() = service_role` (migração `get_investimento_pago_service_role`). Sem isso o e-mail imprime R$ 0. Janela alinhada ao Overview Streamers (mês do consolidado até hoje BRT no mês civil atual).

---

### Atendimento CS — ingestão Outlook (cron)

**Function:** `ingest-cs-atendimento-outlook`

| Ficheiro |
|----------|
| `index.ts` |
| `common.ts` |
| `graphOutlook.ts` |
| `auth.ts` |

Secrets: `CS_OUTLOOK_TENANT_ID`, `CS_OUTLOOK_CLIENT_ID`, `CS_OUTLOOK_CLIENT_SECRET`, `CS_OUTLOOK_MAILBOX` (opcional), `CS_ATENDIMENTO_OUTLOOK_INGEST_SECRET` (recomendado — teste no Dashboard via body)

Detalhes: `docs/SETUP-CS-ATENDIMENTO-OUTLOOK.md`.

---

### Vagas Carreiras — sync WordPress (cron)

**Function:** `sync-vagas-carreiras-site`

| Ficheiro |
|----------|
| `index.ts` |

Secrets: `WORDPRESS_VAGAS_SYNC_URL`, `SPIN_VAGAS_SYNC_SECRET` · opcional `SPIN_VAGAS_CARREIRAS_INGEST_SECRET`

Detalhes: `docs/SETUP-SYNC-VAGAS-CARREIRAS.md` · contrato agência: `docs/api-sync-vagas-carreiras-site-agencia.md`.

---

### Candidatura Carreiras — formulário site (multipart)

**Function:** `prospecto-vaga-candidatura-site`

| Ficheiro |
|----------|
| `index.ts` |

Secret: `PROSPECTO_VAGA_CANDIDATURA_FORM_SECRET` · Proxy: `/api/prospecto-vaga-candidatura-site`

Detalhes: `docs/SETUP-PROSPECTO-VAGA-CANDIDATURA.md` · contrato agência: `docs/api-prospecto-vaga-candidatura-site-agencia.md`.

---

## Manutenção de templates

| Alteração | Replicar em |
|-----------|-------------|
| Boas-vindas | `boasVindasUsuario.ts` → 4 functions boas-vindas |
| Reset senha | `recuperacaoSenha.ts` → `recuperar-senha` + `admin-usuario-acao` |
| Shell / logo / Ajuda | `transacionalShell.ts` → todas as transacionais |
| Envio Resend | `resendMail.ts` → todas com e-mail |
| Marca | `emailBrand.ts` → todas com e-mail |

Previews: `docs/previews/boas-vindas-usuario-preview.html`, `docs/previews/recuperacao-senha-preview.html`.

Regras: `.cursor/rules/emails.mdc`.

---

## Configuração (`supabase/config.toml`)

Opções por function (`verify_jwt`, etc.). O deploy pelo painel **não** lê este ficheiro — use como referência ao replicar settings no Dashboard.

---

## Testes após deploy manual

### 1. Smoke rápido (PowerShell)

Confirma que **cada function responde** (não testa lógica de negócio):

```powershell
$env:VITE_SUPABASE_URL = "https://SEU_PROJETO.supabase.co"
$env:VITE_SUPABASE_ANON_KEY = "sua-anon-key"
.\scripts\test-edge-functions-smoke.ps1
```

`[OK]` = deploy ok · `[404]` = function ausente · `[502/500]` = erro ao carregar (ficheiro `.ts` em falta ou import errado — ver **Logs** no Supabase).

### 2. Diagnóstico na plataforma (recomendado)

Login como **admin** → **Status Técnico** → linha **Diagnóstico da Plataforma** → **Executar**.

Verifica CDA, GitHub social, **RESEND_API_KEY**, **RESEND_FROM_SISTEMA**, **RESEND_FROM_RELATORIOS**, **SENHA_PADRAO**, listas de destinatários dos crons e estado das integrações. Resultado em **Logs Recentes** (tipos `diagnostico_ok` / `diagnostico_aviso` / `diagnostico_erro`).

**Importante:** a function precisa de **`index.ts` + `platformHealthDiagnostics.ts`** no Supabase (ver `docs/SETUP-PLATFORM-HEALTH.md`).

### 3. E-mails transacionais

| Teste | Onde | Resultado esperado |
|-------|------|-------------------|
| Reset senha | Tela de **Login** → Esqueci minha senha | E-mail «Senha redefinida…» na caixa de entrada |
| Reset admin | **Gestão de Usuários** → reset de senha de um usuário de teste | Mesmo e-mail + mensagem na UI (`emailEnviado`) |
| Boas-vindas | **Gestão de Usuários** → criar usuário de teste (e-mail seu) | E-mail «Conta criada…» |

Se falhar: Supabase → Edge Functions → **Logs** da function (`recuperar-senha`, `criar-usuario`, …) — erro típico: `Module not found` = falta colar `resendMail.ts` ou template.

### 4. Sync e crons (Status Técnico)

Com permissão **Editar** em Status Técnico, use **Executar** (com confirmação) em:

- **Sync CDA** → `sync-metricas-cda`
- **Social KPIs** → `trigger-social-kpis`
- **Spin na Rede RSS** → `sync-spin-na-rede-rss`
- **Painel de Notícias RSS** → `sync-painel-noticias-rss` (secret `PAINEL_NOTICIAS_INGEST_SECRET` no cron; TV em `/painel-noticias`)
- **Lobby Blaze** → `monitor-lobby-blaze`

E-mails cron (enviam de verdade): botões de teste na mesma página → `relatorio-diario-diretoria`, `email-agenda-diaria` (use destinatário de teste se configurado).

### 5. Logs no Supabase

**Edge Functions** → escolha a function → **Logs**. Após um teste, deve aparecer linha recente sem stack trace de import.

