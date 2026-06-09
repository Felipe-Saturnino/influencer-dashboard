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
| `platform-health-check` |
| `prestador-ponto` |
| `prospecto-afiliados-network-site` |
| `prospecto-scout-site` |
| `sync-metricas-cda` |
| `sync-painel-noticias-rss` |
| `sync-spin-na-rede-rss` |
| `trigger-social-kpis` |

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

### E-mail de teste (preview)

**Function:** `enviar-email-teste`

| Ficheiro |
|----------|
| `index.ts` |
| `resendMail.ts` |
| `emailBrand.ts` |
| `transacionalShell.ts` |
| `boasVindasUsuario.ts` |
| `common.ts` |

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
| Boas-vindas | `boasVindasUsuario.ts` → 4 functions boas-vindas + `enviar-email-teste` |
| Reset senha | `recuperacaoSenha.ts` → `recuperar-senha` + `admin-usuario-acao` |
| Shell / logo / Ajuda | `transacionalShell.ts` → todas as transacionais |
| Envio Resend | `resendMail.ts` → todas com e-mail |
| Marca | `emailBrand.ts` → todas com e-mail |

Previews: `docs/previews/boas-vindas-usuario-preview.html`, `docs/previews/recuperacao-senha-preview.html`.

Regras: `.cursor/rules/emails.mdc`.

---

## Configuração (`supabase/config.toml`)

Opções por function (`verify_jwt`, etc.). O deploy pelo painel **não** lê este ficheiro — use como referência ao replicar settings no Dashboard.
