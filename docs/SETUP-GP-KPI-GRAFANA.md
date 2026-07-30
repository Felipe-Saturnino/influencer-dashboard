# GP KPI — carga do ClickHouse (Grafana) para o Supabase

KPIs operacionais de Game Presenters (tempo de distribuição, tempo de reação, rodadas,
cooperação de velocidade e roda) por **dia de Brasília**, **mesa** e **Game Presenter**.
O jogo canônico vem do cadastro da mesa; `game_type` é usado apenas internamente para
selecionar as métricas corretas no ClickHouse.

| Item | Valor |
|---|---|
| Origem | ClickHouse, datasource Grafana `risk_integrity_ch_live_sg` |
| Dashboard de referência | `GP KPI` (`/d/n80wq82Vs/gp-kpi`) |
| Endpoint | `POST /api/ds/query` |
| Destino | `public.gp_kpi_diario` |
| Script | `scripts/grafana-gp-kpi-run.mjs` |
| Wrapper Windows | `scripts/run-gp-kpi-grafana.ps1` |

## Autenticação — limitação conhecida

O Grafana está atrás do **Pomerium**. Uma chamada sem credencial responde `302` para
`authenticate-sg.global.proxylive.tech`, e `/api/user` responde `Unauthorized` mesmo com o
dashboard aberto (o Grafana trata o acesso como usuário anônimo depois que o proxy libera).

Consequências:

- a carga usa o **cookie de uma sessão humana**, capturado no DevTools;
- o cookie **expira** — quando isso ocorre, o script aborta pedindo renovação;
- **não** existe cron confiável até obter credencial institucional: usuário ClickHouse
  read-only, service account exposta pelo proxy ou API oficial do fornecedor;
- o cookie é segredo pessoal: fica só no `.env.gp-kpi` (ignorado pelo git), nunca no
  frontend, em commit, e-mail ou chat.

## Modo 1 — navegador do agente (preferido)

Nenhum cookie é copiado: a sessão é a do navegador onde você fez login.

1. O agente abre o Grafana numa aba controlada pelo Cursor.
2. Você faz login (Pomerium/SSO) nessa aba.
3. O agente executa a consulta a partir da própria página (mesma origem, cookie automático)
   e salva a resposta bruta em `tmp/gp-kpi-*.json`.
4. A carga roda com o arquivo:

```powershell
.\scripts\run-gp-kpi-grafana.ps1 --arquivo=tmp/gp-kpi-2026-07.json --dry-run
.\scripts\run-gp-kpi-grafana.ps1 --arquivo=tmp/gp-kpi-2026-07.json
```

Nesse modo, o `.env.gp-kpi` precisa apenas de `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
Enquanto a aba continuar logada, o agente repete a extração de outros períodos sem novo login.

Limite: exige você presente para o login. Não substitui um cron.

## Modo 2 — cookie no `.env` (fallback)

1. Copie `scripts/env.gp-kpi-grafana.example` para `.env.gp-kpi` na raiz do repositório.
2. Preencha `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
3. Capture o cookie:
   - abra o dashboard GP KPI logado;
   - DevTools → **Network** → filtre `ds/query`;
   - clique num request → **Headers** → **Request Headers** → copie o valor de `Cookie`;
   - cole em `GRAFANA_GP_KPI_COOKIE=` (linha única, sem aspas).
4. Aplique a migração `supabase/migrations/20261105220000_gp_kpi_diario.sql`.

## Uso

```powershell
# Só imprime a SQL consolidada (para colar no Grafana Explore e validar)
node scripts/grafana-gp-kpi-run.mjs --sql

# Simula: consulta o ClickHouse e mostra o volume, sem gravar
.\scripts\run-gp-kpi-grafana.ps1 --de=2026-07-01 --ate=2026-07-30 --dry-run

# Carga real
.\scripts\run-gp-kpi-grafana.ps1 --de=2026-07-01 --ate=2026-07-30
```

| Parâmetro | Default | Uso |
|---|---|---|
| `--arquivo=caminho.json` | — | Carrega a resposta salva pelo navegador (modo 1) |
| `--de=AAAA-MM-DD` | hoje | Primeiro dia de Brasília do período (modo 2) |
| `--ate=AAAA-MM-DD` | igual a `--de` | Último dia (inclusivo) |
| `--lote=N` | 7 | Dias por request ao Grafana |
| `--dry-run` | — | Consulta e reporta, sem gravar |
| `--sql` | — | Imprime a SQL e sai |

A carga é **idempotente**: o upsert usa a chave
`dia_brt, ambiente, table_id, game_presenter_id`. Rodar o mesmo período
duas vezes atualiza as linhas, não duplica.

## Vínculo com mesa e estúdio

O `table_id` do ClickHouse é igual ao **ID Spin** do cadastro:

```text
ClickHouse game_presenter.table_id  =  mesas_spin_cadastro.mesa_identificacao
                                       → estudio_slug → estúdio (ex.: Sports Club)
                                       → operadora_slug
```

Exemplo validado: `bac-cmuSG6116` → Futebol Brasileiro, mesa 6116, estúdio Sports Club.

Mesas sem cadastro entram na tabela com `mesa_id`, `estudio_slug` e `operadora_slug` nulos, e
o script lista os `table_id` órfãos no fim da execução. Cadastre em
**Plataforma → Gestão de Estúdios → Mesas** e rode o período de novo para preencher o vínculo.

O filtro **Studio** do Grafana **não** é fonte de estúdio: é apenas um regex sobre o
`table_id` (`Brazil : \D+6\d*`). O estúdio canônico vem do cadastro Spin.

## Vínculo com Game Presenter (Work ID ↔ ID operacional)

No Grafana/ClickHouse o apresentador vem como **Work ID** (`game_presenter_id`,
ex.: `SG000191`). Na plataforma Data Intelligence esse mesmo código é o
**ID operacional** do staff:

```text
ClickHouse game_presenter.game_presenter_id  =  Work ID (Grafana)
                                             =  rh_funcionarios.staff_id_operacional
                                             =  campo «ID operacional» em RH → Gestão de Staff
                                             → funcionario_id (UUID do registro)
```

A carga resolve `funcionario_id` por igualdade (trim, sem diferenciar maiúsculas). Se o
Work ID não existir em Gestão de Staff, a linha entra com `funcionario_id` nulo e o
script lista os códigos órfãos — preencha o ID operacional no cadastro do staff e rode
o período de novo.

## Médias — por que a tabela guarda soma e amostras

`gp_kpi_diario` grava `*_ms_soma` e `*_amostras` em vez de média pronta. Assim qualquer
agregação (por GP, mesa, estúdio, mês) calcula a média correta no momento da leitura:

```sql
SELECT
  game_presenter_id,
  SUM(rodadas) AS rodadas,
  SUM(dealing_ms_soma) / NULLIF(SUM(dealing_amostras), 0) / 1000 AS dealing_time_s,
  SUM(reaction_ms_soma) / NULLIF(SUM(reaction_amostras), 0) / 1000 AS reaction_time_s
FROM public.gp_kpi_diario
WHERE dia_brt BETWEEN '2026-07-01' AND '2026-07-31'
GROUP BY game_presenter_id;
```

Média de médias (o que aconteceria se guardássemos o valor já dividido) distorce o número
quando o volume de rodadas varia entre dias e mesas.

`dia_brt` é a referência temporal única. A consulta delimita cada período pela
meia-noite de `America/Sao_Paulo`, evitando dividir um dia operacional entre duas datas UTC.

## Validação

- Para conferir contra o dashboard: filtre o mesmo período em Brasília e compare
  `SUM(rodadas)` por `game_presenter_id` com a coluna `TOTAL GR`.

## Troubleshooting

| Sintoma | Causa | Ação |
|---|---|---|
| `Grafana HTTP 302 — sessão Pomerium expirada` | Cookie venceu | Recapturar o `Cookie` no DevTools e atualizar `.env.gp-kpi` |
| `Grafana HTTP 401/403` | Sessão inválida ou sem acesso ao datasource | Reautenticar no navegador e recapturar |
| `ClickHouse: ...` | Erro de SQL ou coluna inexistente | Rodar `--sql` e testar no Grafana Explore |
| `Erro upsert gp_kpi_diario` | Migração não aplicada ou chave divergente | Conferir a migração e a constraint `gp_kpi_diario_chave` |
| Muitas mesas sem cadastro | `table_id` novo no ClickHouse | Cadastrar em Gestão de Estúdios → Mesas |
| Muitos GPs sem `funcionario_id` | Work ID sem ID operacional no staff | Preencher **ID operacional** em Gestão de Staff com o mesmo código do Grafana |

## Pendências para automação definitiva

1. Credencial institucional (ClickHouse read-only ou identidade de máquina no Pomerium).
2. Cobertura do cadastro: todo GP ativo no Grafana precisa ter o **mesmo** Work ID no
   campo **ID operacional** (`staff_id_operacional`) em Gestão de Staff — sem isso o
   dashboard de performance fica por código, não por pessoa.
3. Definição de produto para a página de Performance de Game Presenters: `PageKey`, menu,
   `ALL_PAGE_KEYS`, permissões e MDC da seção.
