# Testes automatizados

Suíte **Vitest** + **Testing Library** — lógica pura, componentes isolados e smoke de rotas lazy. Não substitui diagnóstico operacional em produção (Status Técnico); complementa o CI.

## Comandos

| Comando | Uso |
|--------|-----|
| `npm test` | Roda toda a suíte uma vez (CI e pre-commit). |
| `npm run test:watch` | Reexecuta ao salvar (desenvolvimento). |
| `npm run test:coverage` | Cobertura em `coverage/` + validação de thresholds em `src/lib/**`. |
| `npm run test:related` | Só testes afetados pelos ficheiros em stage (git). |
| `npm run ci` | lint + test + build (espelha CI sem coverage). |

## Estrutura

```
tests/
  README.md
  setup.ts              ← jest-dom global
  mocks/                ← factories e vi.mock
  smoke/
    lazy-pages-import.test.ts   ← rotas lazy resolvem (core + páginas decompostas)
  unit/
    lib/                  ← helpers transversais (sort, datas, identidade jogo, …)
    aquisicao/            ← Financeiro, Banca de Jogo
    plataforma/           ← Status Técnico helpers
    components/           ← ErrorBoundary, etc.
```

Co-localização em `src/**/*.test.ts(x)` também é válida.

## Automação

| Momento | O quê |
|---------|--------|
| **Pre-commit** | `lint-staged` + `npm test` (suíte completa) |
| **Push / PR** | `.github/workflows/ci.yml` — lint, test, **coverage**, build |
| **Semanal** | `quality-periodic.yml` — mesma bateria base |

Artefacto HTML de cobertura: job CI → **coverage-report** (14 dias).

## Prioridade ao adicionar testes

1. **`src/lib/**`** e helpers extraídos na decomposição de páginas (`*Helpers.ts`, `*filtros.ts`, `*Ciclos.ts`).
2. **Hooks** — `renderHook` + mock de Supabase/contexto.
3. **Componentes de filtro** — RTL (Operadora, Influencer, SortTableTh).
4. **Smoke lazy** — incluir nova rota em `lazy-pages-import.test.ts` ao registrar página no `App.tsx`.

## Metas de cobertura (incremental)

| Área | Meta Fase 1 | Threshold CI (`vitest.config.ts`) |
|------|-------------|-----------------------------------|
| `src/lib/**` | 25% lines | 10% (subir ~2 p.p. por sprint) |
| Projeto global | 5% lines | sem gate global ainda |

Variáveis `VITE_*` no CI são placeholders; testes atuais não chamam Supabase real.

## Próxima frente (produto)

Diagnóstico operacional na **Status Técnico** (edge function + `tech_logs`) — separado desta suíte Vitest.
