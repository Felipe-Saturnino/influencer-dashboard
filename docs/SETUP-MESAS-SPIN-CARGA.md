# Mesas Spin — carga diária (um comando)

## Pré-requisitos

- `.env.gp-kpi` ou `.env` com `VITE_SUPABASE_URL` (ou `SUPABASE_URL`) e `SUPABASE_SERVICE_ROLE_KEY`
- Sessão logada no **Daily Commercial Report [BRL]** (dashboard 15)

## Browser do chat (padrão no `/carga-mesas`)

Mantenha o dashboard 15 **logado no Browser lateral do chat** do Cursor. O agent extrai via MCP (`cursor-ide-browser`) usando a sessão já autenticada — **não precisa** de `SUPERSET_MESAS_COOKIE` nem copiar request da aba Network (Network vazio até recarregar a página é normal).

Lei: `.cursor/rules/mesas-spin-carga.mdc` § Browser do chat.

## Cookie Superset (opcional — um comando local)

Só se rodar `node scripts/carga-mesas-spin.mjs` **fora** do Browser do chat (sem CDP):

1. Abra o dashboard 15 logado.
2. DevTools → **Network** → request `/api/v1/…` → header **`Cookie`**.
3. Cole no `.env.gp-kpi` (não commitar):

```env
SUPERSET_MESAS_COOKIE=…
```

Renove em **401/302** (mesmo fluxo do Grafana — `docs/SETUP-GP-KPI-GRAFANA.md`).

## Comando diário (cookie ou `--cdp`)

Atualiza até **D-1** (detecta último dia no Supabase):

```bash
node scripts/carga-mesas-spin.mjs
```

Reload explícito (dias **inclusivos**):

```bash
node scripts/carga-mesas-spin.mjs --de=2026-09-01 --ate=2026-09-06
```

Só gravar (JSON já em `tmp/`):

```bash
node scripts/carga-mesas-spin.mjs --so-gravar --network=tmp/superset-network-2026-09-16.json --dedicado=tmp/superset-dedicado-2026-09-16.json --monthly=tmp/superset-monthly-2026-09.json
```

Validação rápida:

```bash
node tmp/ultimo-dia-supabase.mjs
```

## Alternativa: Chrome com CDP

Sem Browser do chat e sem cookie no `.env`:

1. Feche instâncias do Chrome e abra com depuração remota, por exemplo:

   `"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222`

2. Login no dashboard 15 nessa janela.
3. Execute:

```bash
node scripts/carga-mesas-spin.mjs --cdp
```

## Fallback manual (Console)

```bash
node tmp/make-oneshot-inject.mjs network 2026-09-16 2026-09-17
node tmp/make-oneshot-inject.mjs dedicado 2026-09-16 2026-09-17
node tmp/make-oneshot-inject.mjs monthly 2026-09-01 2026-09-17
```

Console (F12) no dashboard 15: colar cada `tmp/oneshot-*.js` → Enter. Depois `--so-gravar` como acima.

Lei completa: `.cursor/rules/mesas-spin-carga.mdc`.
