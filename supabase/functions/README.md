# Edge Functions — alinhamento Git ↔ Supabase (painel)

Cada pasta desta directory é **uma Edge Function** no Supabase. O conteúdo da pasta = o que deve existir no editor da function (**+ Add File** + `index.ts`).

**Não há pasta `_shared` global.** Ficheiros de e-mail / Resend estão **dentro** de cada function que os usa (cópia local). Ao alterar um template, atualize **todas** as functions listadas na secção correspondente.

**Deploy manual (painel):** abra a function → crie/atualize os ficheiros abaixo → **Deploy updates**.

**Secrets:** Supabase → Project Settings → Edge Functions → Secrets (`RESEND_API_KEY`, `RESEND_FROM_SISTEMA`, etc.).

---

## Inventário por function

### Só `index.ts` (sem ficheiros extra)

| Pasta | Uso |
|-------|-----|
| `aprovar-pagamento` | Aprovar pagamento |
| `atualizar-perfil` | Atualizar perfil |
| `monitor-lobby-blaze` | Monitor lobby Blaze |
| `monitor-lobby-cda` | Monitor lobby CDA |
| `platform-health-check` | Health check |
| `prestador-ponto` | Ponto prestador |
| `prospecto-afiliados-network-site` | Form site afiliados |
| `prospecto-scout-site` | Form site scout |
| `sync-metricas-cda` | Sync métricas CDA |
| `sync-painel-noticias-rss` | RSS painel notícias |
| `sync-spin-na-rede-rss` | RSS Spin na Rede |
| `trigger-social-kpis` | Trigger KPIs sociais |

---

### Boas-vindas (conta nova) — pacote transacional

Functions: **`criar-usuario`**, **`criar-usuario-scout`**, **`criar-afiliado-network`**, **`sync-rh-prestador-auth-user`**

```
<nome-da-function>/
├── index.ts
├── resendMail.ts
├── emailTemplates/
│   ├── emailBrand.ts
│   ├── transacionalShell.ts
│   ├── boasVindasUsuario.ts
│   └── enviarBoasVindas.ts
└── relatorioEmails/
    └── common.ts
```

Imports no `index.ts`: `./emailTemplates/enviarBoasVindas.ts`, `./emailTemplates/transacionalShell.ts`.

---

### Redefinição de senha — pacote transacional

Functions: **`recuperar-senha`**, **`admin-usuario-acao`**

```
<nome-da-function>/
├── index.ts
├── resendMail.ts
├── emailTemplates/
│   ├── emailBrand.ts
│   ├── transacionalShell.ts
│   ├── recuperacaoSenha.ts
│   └── enviarRecuperacaoSenha.ts
└── relatorioEmails/
    └── common.ts
```

Imports no `index.ts`: `./emailTemplates/enviarRecuperacaoSenha.ts`, `./emailTemplates/transacionalShell.ts`.

---

### E-mail de teste (preview)

Function: **`enviar-email-teste`**

```
enviar-email-teste/
├── index.ts
├── resendMail.ts
├── emailTemplates/
│   ├── emailBrand.ts
│   ├── transacionalShell.ts
│   └── boasVindasUsuario.ts
└── relatorioEmails/
    └── common.ts
```

---

### Agenda diária (cron)

Function: **`email-agenda-diaria`**

```
email-agenda-diaria/
├── index.ts
├── resendMail.ts
└── emailTemplates/
    └── emailBrand.ts
```

Secret destinatários: `EMAIL_AGENDA_DESTINATARIOS`. Remetente: `RESEND_FROM_RELATORIOS`.

---

### Relatório diário diretoria (cron)

Function: **`relatorio-diario-diretoria`**

```
relatorio-diario-diretoria/
├── index.ts
├── resendMail.ts
├── emailTemplates/
│   └── emailBrand.ts
└── relatorioEmails/
    ├── common.ts
    ├── fetchRelatorioDiretoriaData.ts
    └── templateRelatorioDiretoria.ts
```

Secret destinatários: `RELATORIO_DIRETORIA_DESTINATARIOS`. Remetente: `RESEND_FROM_RELATORIOS`.

---

## Manutenção de templates

| Alteração | Onde copiar |
|-----------|-------------|
| Texto/layout boas-vindas | `boasVindasUsuario.ts` → 4 functions boas-vindas + `enviar-email-teste` |
| Texto/layout reset senha | `recuperacaoSenha.ts` → `recuperar-senha` + `admin-usuario-acao` |
| Shell / logo / Ajuda | `transacionalShell.ts` → todas as transacionais acima |
| Envio Resend / remetente | `resendMail.ts` → todas as functions com e-mail |
| Marca `Spin Gaming Data Intelligence` | `emailBrand.ts` → todas com `emailTemplates/` |

Referência de copy: `docs/previews/boas-vindas-usuario-preview.html`, `docs/previews/recuperacao-senha-preview.html`.

Regras completas: `.cursor/rules/emails.mdc`.

---

## Configuração (`supabase/config.toml`)

Lista de functions com opções (`verify_jwt`, etc.). Deploy pelo painel **não** lê este ficheiro — use-o como documentação ao replicar settings no Dashboard.
