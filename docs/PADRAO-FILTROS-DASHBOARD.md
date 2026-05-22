# Padrão de filtros na barra (FilterBar)

Referência canónica: **`src/pages/dashboards/DashboardOverviewInfluencer/index.tsx`** (barra de filtros).

Este documento define o padrão visual e de ícones que **toda página** deve seguir nos controlos repetíveis da **barra de filtros** transparente.

---

## Helpers partilhados

`src/lib/filterBarStyles.ts`:

| Export | Uso |
|--------|-----|
| `FILTER_BAR_PADDING` | `"12px 20px"` no wrapper |
| `FILTER_BAR_ROW_GAP` | `10` entre carrossel, Histórico, filtros |
| `getFilterBarRowStyle()` | Linha centralizada com `gap: 10` |
| `getFilterBarWrapperStyle(brand)` | Strip transparente Brand §5 |
| `getFiltroCampoInativoStyle(t)` | Estado inativo pill (Operadora + Influencer) |

---

## Ícones (obrigatório: Lucide React)

| Controlo | Ícone | Tamanho | Componente |
|----------|-------|---------|------------|
| **Histórico** (acumulado) | `Calendar` | 15px | `FiltroHistoricoButton` |
| **Influencer(s)** | `User` | 15px | `FiltroInfluencerSelect` |
| **Operadora(s)** | `Shield` | 15px | `FiltroOperadoraSelect` |
| **Modo Mês / Semana / Dia** | `CalendarRange` | 15px | `FiltroModoVisualizacaoSelect` |
| **Hoje** (Agenda) | `History` | 15px | `FiltroHojeButton` |

**Não usar** `GiCalendar`, `GiShield`, etc. nesta barra.

---

## Container da barra de filtros

```tsx
import { getFilterBarRowStyle, getFilterBarWrapperStyle } from "../../lib/filterBarStyles";

<div style={{ marginBottom: 14 }}>
  <div style={getFilterBarWrapperStyle(brand)}>
    <div style={getFilterBarRowStyle()}>
      {/* carrossel, Histórico, FiltroInfluencerSelect, FiltroOperadoraSelect, … */}
    </div>
  </div>
</div>
```

- `useDashboardBrand()` para whitelabel
- **Gap 10** entre todos os controlos da linha (não usar 18)

---

## Visual dos campos Influencer e Operadora

| Propriedade | Valor (inativo) |
|-------------|-----------------|
| `borderRadius` | **999** (pill) |
| `border` | `1px solid t.cardBorder` |
| `background` | `t.inputBg ?? t.cardBg` |
| `color` | **`t.text`** (não `textMuted`) |
| `fontSize` | 13 |
| `minWidth` operadora | **200** (default do componente) |

Estado **ativo** (valor ≠ agregador): borda/fundo marca (`--brand-action` / `brand.accent`, `color-mix` 15%) — já em `FiltroOperadoraSelect` e `FiltroInfluencerSelect`.

```tsx
<FiltroOperadoraSelect
  value={filtroOperadora}
  onChange={setFiltroOperadora}
  operadoras={lista}
  podeVerOperadora={podeVerOperadora}
/>

<FiltroInfluencerSelect mode="single" value={…} onChange={…} influencers={…} />
```

`pill` e `minWidth={200}` são **default** — só omitir props redundantes.

---

## Botão Histórico

`FiltroHistoricoButton` — rótulo do carrossel **`Todo o período`** quando ativo.

---

## Modo de visualização (Agenda)

`FiltroModoVisualizacaoSelect` — pill 999, ícone `CalendarRange`.

---

## Botão Hoje (Agenda)

`FiltroHojeButton` — pill 999, ícone `History` (não confundir com Histórico).

---

## Checklist rápido

- [ ] Wrapper `getFilterBarWrapperStyle` ou equivalente (`12px 20px`, `primaryTransparent*`)
- [ ] Linha com **`gap: 10`**
- [ ] `FiltroOperadoraSelect` + `FiltroInfluencerSelect` com visual Overview Influencer
- [ ] Carrossel: `lib/carouselNavStyles.ts`
- [ ] Sem `gap: 18` na linha principal de filtros

---

## Ficheiros de referência

| Descrição | Caminho |
|-----------|---------|
| Referência visual | `src/pages/dashboards/DashboardOverviewInfluencer/index.tsx` |
| Estilos da barra | `src/lib/filterBarStyles.ts` |
| Operadora | `src/components/FiltroOperadoraSelect.tsx` |
| Influencer | `src/components/FiltroInfluencerSelect.tsx` |
| Histórico | `src/components/dashboard/FiltroHistoricoButton.tsx` |

---

*Última atualização: padronização global (pill 999, cor inativa `t.text`, gap 10, Overview Influencer).*
