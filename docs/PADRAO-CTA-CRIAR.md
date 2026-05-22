# Padrão — CTA de criação (`CtaCriarButton`)

Botões de fluxo **criar/adicionar** na página (não confundir com **Salvar** em modais — migração em fase seguinte).

## Implementação

| Ficheiro | Papel |
|----------|--------|
| `src/components/CtaCriarButton.tsx` | Componente |
| `src/lib/ctaCriarStyles.ts` | `getCtaCriarGradient`, `getCtaCriarButtonStyle`, constantes |

## Visual

| Item | Valor |
|------|--------|
| Forma | `borderRadius: 10` (referência: abas Overview / Posicionamento em Overview Spin) |
| Tamanho | `padding: 10px 20px`, `fontSize: 13`, `fontWeight: 700`, `gap: 6` |
| Ícone | `Plus` Lucide **14px**, `aria-hidden` |
| Texto | Branco `#fff` — **sem** `+` no label |

## Gradiente

- **Spin** (qualquer perfil, `useBrand === false`): Scout — `var(--brand-primary, #4a2082)` → `var(--brand-secondary, #1e36f8)`.
- **Operadora** (`useBrand === true`): `var(--brand-action)` → `var(--brand-contrast)`.

## Posição na UI

| Contexto | Onde colocar |
|----------|----------------|
| **Dentro do bloco de filtros** | Mesma linha (`getFilterBarRowStyle`, `gap: 10`) — Scout, Network, Figurinos, Gerenciamento Portal RH, etc. Ver `PADRAO-FILTROS-DASHBOARD.md` § CTA na barra |
| **Fora do bloco** | Card (Agenda), `PageHeader`, toolbar acima da tabela — **mesmo** `CtaCriarButton` |

## Rótulo visível vs modal (inventário)

| Superfície | Onde identificar | Rótulo para varredura / docs |
|------------|------------------|------------------------------|
| **Página** | `CtaCriarButton` + `data-cta-surface="page"` | Texto **`children`** do componente (ex.: `Nova Live`, `Solicitar`) — é o que o usuário vê |
| **Modal** | `<button>` com gradiente no rodapé do modal | Texto do botão **dentro do modal** (ex.: `Criar Live`, `Adicionar`, `Salvar`) — fase de migração à parte |

**Regra:** não usar `+` no `children` de `CtaCriarButton` — o ícone `Plus` já substitui o prefixo.

**Varredura:** `node scripts/scan-cta-legacy.mjs` — secções `PÁGINA (migrado)` e `MODAL (legado)`.

## Páginas migradas (CTA na página — `CtaCriarButton`)

Agenda (Nova Live), Scout, Network, Campanhas (Nova Campanha), Figurinos, Gestão de Prestadores, Organograma, Vagas, Portal RH (Gerenciamento), Gestão de Usuários (Novo Usuário), Gestão de Operadoras (Nova Operadora), Gestão de Mesas (Nova mesa), Status Técnico (Adicionar CIDR), Banca de Jogo (Solicitar).

## Exemplo

```tsx
import { CtaCriarButton } from "../components/CtaCriarButton";

<CtaCriarButton onClick={abrirNovo}>Adicionar</CtaCriarButton>

<CtaCriarButton loading={checando} loadingLabel="Verificando...">
  Nova Live
</CtaCriarButton>
```

---

*Regras: `brand-css-variables.mdc` §3 · `global.mdc` componentes.*
