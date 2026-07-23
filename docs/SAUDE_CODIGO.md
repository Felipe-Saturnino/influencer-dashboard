# Relatório de Saúde do Código — Data Intelligence (Spin Gaming)

*Última verificação: julho 2026 (Fase 9 — arquitetura pré-i18n + leftovers)*

---

## Resumo executivo

| Aspecto | Status | Observação |
|---------|--------|------------|
| **Carregamento inicial** | ✅ Melhorado | Lazy loading de páginas implementado |
| **Bundle / Code splitting** | ✅ OK | Chunks por vendor e por página |
| **Mobile readiness** | ⚠️ Parcial | Layout fixo; 1 breakpoint em CSS |
| **Otimizações de rede** | ✅ OK | Preconnect para fonts |
| **Build TypeScript** | ✅ OK | `npm run typecheck` no pre-commit; ver Global § TypeScript pré-deploy |
| **Fetch (features novas)** | ✅ Fase 7 | Janela SQL + `fetchAllPages` + colunas explícitas — ver Global § Eficiência de fetch |
| **Listas densas** | ✅ Fase 8 | Prestadores + Escala: paginação de vista + cache de opções — ver Global §6 |
| **Arquitetura / leftovers** | ✅ Fase 9 | Calendário lote; portais Gerenciamento; AppContext split parcial; `npm run check:dead` (knip) |

---

## 1. Performance e carregamento

### O que foi feito

- **Lazy loading das páginas**: Login e TrocarSenha continuam carregados no início; demais páginas são carregadas sob demanda ao navegar.
- **Manual chunks no Vite**: `vendor-react` (inclui lucide + react-icons), `vendor-supabase`, `vendor-charts`, `vendor-jspdf`, `vendor-qrcode` — melhora cache do navegador.
- **Preconnect** no `index.html` para `fonts.googleapis.com` e `fonts.gstatic.com`.

### Efeito esperado

- **Antes**: ~320 KB em um único chunk na carga inicial.
- **Depois**: carregamento inicial menor; chunks de cada página carregados apenas quando o usuário acessa a tela.

### ChunkLoadError — tela em branco após deploy (404)

Com lazy loading + `codeSplitting.groups`, cada página gera chunks com hash no nome (ex.: `index-XbYaTWD5.js`). Após um novo deploy:

- Os hashes mudam e os chunks antigos são removidos.
- Usuários com a app aberta (cache antigo) tentam carregar chunks que não existem mais → **404** → erro.

**Solução implementada:**

- `ErrorBoundary` detecta ChunkLoadError e recarrega a página automaticamente.
- Listener global em `main.tsx` para `unhandledrejection` de chunk também dispara reload.

### HTTP 500 em chunk estático — Cloudflare Pages (ícones)

Sintoma típico: **só** um `.js` em `/assets/` (histórico: `vendor-icons-*.js` / `vendor-ui-icons-*.js`) retorna **500** com corpo vazio; `vendor-react`, `index`, CSS etc. respondem **200**. Retry e renomear o chunk **não** corrigem de forma confiável.

**Correção no projeto (definitiva):** `lucide-react` e `react-icons` no grupo **`vendor-react`** em `vite.config.ts` — sem chunk isolado de ícones. Ver também **`.cursor/rules/global.mdc`** (§ Build Vite) e **`docs/SETUP.md`** (conferência pós-deploy).

**Se voltar com outro chunk:** rollback no Cloudflare → fundir o chunk num vendor que já sobe (ex.: `vendor-react`) → novo deploy.

### Dependência pesada

- **recharts**: isolado em `vendor-charts` e carregado sob demanda no Overview Spin; imports estáticos residuais em dashboards específicos permanecem no backlog.

### Fase 6 — Gargalos críticos de dados (jul/2026)

| Área | Correção |
|------|----------|
| **Calendário RH — Relatório diário** | N+1 de `3N` RPCs → **2 RPCs em lote** (`rh_calendario_ponto_registros_dia_lote` + `rh_calendario_presenca_gestao_dia_lote`); migration `20261003140000_…`. |
| **Financeiro — fechar ciclo** | N+1 perfil+upsert por par → 1× `.in()` de `cache_hora` + **upsert em lote**; `live_resultados` via `fetchLiveResultadosBatched`; fechos expirados com concorrência 3. |
| **Banca de Jogo** | Dump all-time → janela de 13 competências (`solicitado_em`/`liberado_em`); colunas explícitas; catálogos em `Promise.all`. |
| **Portal RH / Academy (leitura)** | SQL com `status = publicado` + `published_at` na janela histórica; join de categoria estreito; receipts/participantes/autores em paralelo. |

Pendências conscientes (ondas futuras): split completo de monólitos restantes (Calendário ~4k, Prestadores index, Status Técnico, Escala); AppContext ainda concentra escopos/auth; knip ainda **não** bloqueia CI (usar `npm run check:dead` localmente).

### Fase 7 — Features novas (jul/2026)

| Área | Correção |
|------|----------|
| **Ordem de Saída** | Fetch com janela 13 competências + OS abertas; colunas explícitas; catálogo lean para Nova OS; estúdios no `Promise.all`; histórico de ações com `.limit(200)`. Histórico alinhado ao Global (13 competências). |
| **Relatório de Turno** | `dataIni`/`dataFim` = `getPeriodoHistoricoCompetencias()` no load. |
| **Performance Hub** | Avaliações com janela 13 competências + `fetchAllPages`. |
| **Headcount** | `fetchAllPages` (evita truncamento ~1000); vagas na janela + abertas; candidaturas filtradas aos IDs; organograma com colunas explícitas. |
| **Portal Academy / Portal RH** | Colunas explícitas; receipts via `.in(content_id)` do conjunto carregado. |

Padrão transversal documentado em **`.cursor/rules/global.mdc` § Eficiência de fetch**.

### Fase 8 — Listas e grades densas (jul/2026)

| Área | Correção |
|------|----------|
| **Gestão de Prestadores** | `fetchAllPages` (substitui `.limit(5000)` truncado); tabela com paginação client-side 50/página (`TabelaPaginacaoBar`); KPIs/filtros no conjunto completo. |
| **Gestão de Escala** | Escala Diária pagina 40 linhas na vista (save/sugestão inalterados); cache de opções do `<select>` por tipo de turno. |

Helpers: `lib/tablePagination.ts`, `components/TabelaPaginacaoBar.tsx`. Contrato em Global § Eficiência de fetch §6.

### Fase 9 — Arquitetura pré-i18n + leftovers (jul/2026)

| Área | Correção |
|------|----------|
| **Calendário — aprovação mensal** | N+1 de `salvarPresencaGestaoDia` → RPC `rh_calendario_presenca_gestao_salvar_lote` (migration `20261025120000_…`) + `salvarPresencaGestaoDiaLote`. |
| **Portal RH / Academy Gerenciamento** | `fetchAllPages` + janela 13 competências em `created_at`; paginação de vista 50/página. |
| **AppContext** | `ALL_PAGE_KEYS` → `lib/allPageKeys.ts`; brand CSS/sync → `lib/operadoraBrandApply.ts` (`useApp` API inalterada). |
| **Código morto** | `knip` + `npm run check:dead` (não falha o CI ainda); removidos shims órfãos Overview Spin + `useHomeInvestidorInformativos`. |

Residual consciente: partir ficheiros >2k linhas (Calendário, Prestadores `index`, Status Técnico, Escala) em ondas dedicadas pré-i18n; extrair modal CIDR do Status Técnico.

### Carga em duas fases (padrão para janelas históricas pesadas)

Aplicado na aba **Posicionamento** do Overview Spin (`useLobbyPosicionamentoData.ts`) e documentado como padrão transversal em `.cursor/rules/global.mdc` (§ Carga de dados em duas fases):

- **Fase 1 (essencial):** só hoje + ontem, colunas completas — KPIs, snapshot, alertas e heatmap «Dia» renderizam de imediato.
- **Fase 2 (background):** janela do heatmap 7d/30d (`refDate − 29`, sem margem extra) com colunas mínimas (`execucao_id, mesa_identificacao, posicao` — sem o JSON `concorrentes_a_frente`), lotes com concorrência 4 (`fetchInBatched`).
- Visão consolidada («todas»), que não tem heatmap, usa `{ historico: false }` e não baixa a janela histórica.
- Consultas independentes (período atual vs anterior, tabelas paralelas) sempre em `Promise.all` — aplicado também no Social Media (abas Alcance e Impulsionamento) e no filtro de influencers dos Streamers.

Candidatos futuros: qualquer aba/vista com matriz densa ou janela histórica que hoje bloqueie o primeiro paint.

### Contrato do modo Histórico

- Janela padrão: **13 competências mensais inclusivas** (competência atual + 12 anteriores), centralizada em `getPeriodoHistoricoCompetencias`.
- O contrato substitui datas iniciais fixas e permite a futura comparação Year over Year.
- O rótulo visual permanece **Todo o período**.

---

## 2. Mobile e responsividade

### Situação atual

- `viewport` configurado corretamente.
- Sidebar fixa em 240px e `marginLeft` fixo no `main` — em mobile o layout quebra.
- Um único `@media (max-width: 900px)` em `global.css` para `.operadora-secoes-grid`.

### Para Capacitor / PWA mobile

- Adaptar Sidebar para drawer em telas pequenas.
- Introduzir breakpoints para o layout principal (ex.: 768px, 1024px).
- Garantir alvos de toque adequados (~44px mín.).

---

## 3. Arquivos grandes

| Arquivo | Linhas (approx.) | Status |
|---------|------------------|--------|
| `DashboardOverview/index.tsx` | ~880 | ✅ KPIs, Funil, helpers extraídos |
| `DashboardOverviewInfluencer/index.tsx` | ~620 | ✅ Usa componentes compartilhados |
| `DashboardConversao/index.tsx` | ~850 | Pendente extração |
| `OverviewSpin/index.tsx` | ~3 100 | ✅ Lógica em `overviewSpinLogic.ts` (~1 230 linhas); abas em `OverviewSpinAbaNav.tsx` |
| `GestaoPrestador/index.tsx` | ~3 900 | ✅ Helpers em `gestaoPrestadorHelpers.ts`; KPIs em `PrestadorKpiResumo.tsx` |

Componentes compartilhados criados:
- `src/components/dashboard/` — KpiCard, KpiCardDepositos, SectionTitle, FunilVisual
- `src/lib/dashboardConstants.ts` — BRAND, MESES_PT, STATUS_ORDEM, etc.
- `src/lib/dashboardHelpers.ts` — fmtBRL, fmtHorasTotal, getStatusROI, getMesesDisponiveis, etc.

---

## 4. Duplicação entre dashboards

**Resolvido** para `DashboardOverview` e `DashboardOverviewInfluencer`:
- `KpiCard`, `SectionTitle`, `FunilVisual`, `KpiCardDepositos` em `components/dashboard/`
- Helpers e constantes em `lib/dashboardHelpers.ts` e `lib/dashboardConstants.ts`

---

## 5. Checklist para Capacitor

- [ ] Layout responsivo (Sidebar + main)
- [ ] Breakpoints e ajustes de grid em telas pequenas
- [ ] Tamanhos mínimos de botões para toque
- [ ] Testes em device físico (Android)
- [ ] `public/_redirects` para SPA (se houver deploy web)

---

## 6. Manutenção contínua

- Revisar `useEffect` e dependências para evitar loops e re-fetches desnecessários.
- Adicionar tratamento de erro em fetches críticos (ex.: Supabase).
- Expandir o uso de TanStack Query já implantado para as páginas de alto volume que ainda fazem cargas locais sem cache.

### Testes automatizados (Vitest)

| Aspecto | Status | Observação |
|---------|--------|------------|
| **CI** | ✅ | `npm test` + `npm run test:coverage` em `.github/workflows/ci.yml` |
| **Pre-commit** | ✅ | Hook roda suíte completa após lint-staged |
| **Cobertura** | ⚠️ Em expansão | Foco em `src/lib/**` e helpers de páginas decompostas; ver `tests/README.md` |

Suíte atual: testes unitários de lib + smoke de import lazy (rotas core e páginas modularizadas). Regressões de UI/filtros ainda dependem de revisão manual até ampliar RTL nos componentes compartilhados.

**Diagnóstico em produção:** botão **Executar diagnóstico** em Status Técnico → Edge `platform-health-check` → `tech_logs`. Deploy e tipos de log: `docs/SETUP-PLATFORM-HEALTH.md`. Complementa o Vitest; não o substitui.
