# Edge Functions — alinhamento Git ↔ Supabase (painel)

Cada pasta desta directory é **uma Edge Function** no Supabase. Todos os ficheiros ficam **no mesmo nível** que o `index.ts` — o painel **não suporta subpastas** (+ Add File só cria ficheiros planos).

**Deploy manual:** abra a function → crie/atualize cada ficheiro listado abaixo → **Deploy updates**.

**Secrets:** Supabase → Project Settings → Edge Functions → Secrets.

Ao alterar um template de e-mail, replique o ficheiro em **todas** as functions da secção correspondente.

---

## Inventário por function

### Só `index.ts`

| Pasta |
|-------|
| `aprovar-pagamento` |
| `atualizar-perfil` |
| `monitor-lobby-blaze` |
| `monitor-lobby-cda` |
| `prestador-ponto` |
| `prospecto-afiliados-network-site` |
| `prospecto-scout-site` |
| `sync-metricas-cda` |
| `sync-painel-noticias-rss` |
| `sync-spin-na-rede-rss` |
| `sync-comercial-spa-lista` |
| `trigger-social-kpis` |

**`sync-comercial-spa-lista`:** deploy no painel Supabase com **apenas** `index.ts` (parser inline). Testes locais do parser: `src/lib/comercialSpaCsvParser.ts`.

### `index.ts` + `platformHealthDiagnostics.ts`

**Function:** `platform-health-check` — diagnóstico Status Técnico (secrets CDA, Resend, e-mail transacional/cron, integrações).

| Ficheiro |
|----------|
| `index.ts` |
| `platformHealthDiagnostics.ts` |

Detalhes: `docs/SETUP-PLATFORM-HEALTH.md`.

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

**Function:** `email-agenda-diaria`

| Ficheiro |
|----------|
| `index.ts` |
| `resendMail.ts` |
| `emailBrand.ts` |

Secret: `EMAIL_AGENDA_DESTINATARIOS` · Remetente: `RESEND_FROM_RELATORIOS`

---

### Relatório diário diretoria (cron)

**Function:** `relatorio-diario-diretoria`

| Ficheiro |
|----------|
| `index.ts` |
| `resendMail.ts` |
| `emailBrand.ts` |
| `common.ts` |
| `fetchRelatorioDiretoriaData.ts` |
| `templateRelatorioDiretoria.ts` |

Secret: `RELATORIO_DIRETORIA_DESTINATARIOS` · Remetente: `RESEND_FROM_RELATORIOS`

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
- **Lobby Blaze** → `monitor-lobby-blaze`

E-mails cron (enviam de verdade): botões de teste na mesma página → `relatorio-diario-diretoria`, `email-agenda-diaria` (use destinatário de teste se configurado).

### 5. Logs no Supabase

**Edge Functions** → escolha a function → **Logs**. Após um teste, deve aparecer linha recente sem stack trace de import.

