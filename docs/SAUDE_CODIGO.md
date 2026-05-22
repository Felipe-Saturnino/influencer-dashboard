# Relatório de Saúde do Código — Data Intelligence (Spin Gaming)

*Última verificação: março 2025*

---

## Resumo executivo

| Aspecto | Status | Observação |
|---------|--------|------------|
| **Carregamento inicial** | ✅ Melhorado | Lazy loading de páginas implementado |
| **Bundle / Code splitting** | ✅ OK | Chunks por vendor e por página |
| **Mobile readiness** | ⚠️ Parcial | Layout fixo; 1 breakpoint em CSS |
| **Otimizações de rede** | ✅ OK | Preconnect para fonts |
| **Estrutura de código** | ✅ Melhorado | Componentes compartilhados extraídos |

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

- **recharts** (~494 KB minificado): usado em dashboards. Considerar troca por lib mais leve ou lazy load apenas nas páginas que usam gráficos.

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
- Considerar React Query ou similar para cache e estado de requisições.
