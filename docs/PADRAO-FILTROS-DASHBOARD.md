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
| `FILTRO_BAR_PILL_PADDING` | `"6px 14px"` em cada pill |
| `FILTRO_BAR_PILL_GAP` | `6` entre ícone e texto no pill |
| `getFilterBarRowStyle()` | Linha centralizada com `gap: 10` |
| `getFilterBarWrapperStyle(brand)` | Strip transparente Brand §5 |
| `getFiltroCampoInativoStyle(t)` | Estado inativo |
| `getFiltroCampoAtivoStyle(brand)` | Estado ativo |
| `getFiltroBarPillStateStyle(t, brand, active)` | Toggle inativo/ativo |

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

- **Gap 10** entre todos os controlos da linha (não usar 18)

---

## Visual unificado dos pills (Operadora, Influencer, Histórico, Hoje)

| Propriedade | Inativo | Ativo |
|-------------|---------|-------|
| `borderRadius` | **999** | **999** |
| `padding` | **6px 14px** | **6px 14px** |
| `border` | `t.cardBorder` | marca (`--brand-action` ou `brand.accent`) |
| `background` | `t.inputBg ?? t.cardBg` | `color-mix` 15% marca |
| `color` | **`t.text`** | cor de destaque marca |
| `fontWeight` | 400 | 700 |

Implementação: `getFiltroBarPillStateStyle(t, brand, active)` — **não** duplicar inline.

```tsx
<FiltroHistoricoButton active={historico} onClick={toggleHistorico} />

<FiltroOperadoraSelect value={filtroOperadora} onChange={setFiltroOperadora} operadoras={lista} />

<FiltroInfluencerSelect mode="single" value={…} onChange={…} influencers={…} />

<FiltroHojeButton active={filtroHojeAtivo} onClick={aplicarFiltroHoje} />
```

Rótulo do carrossel com Histórico ligado: **`Todo o período`**.

---

## Legado removido (não usar)

- Histórico inativo com `background: transparent` ou `color: t.textMuted`
- Histórico ativo só com `brand.accent` sem ramo `useBrand` / `--brand-primary`
- Markup inline de botão Histórico na barra (usar sempre `FiltroHistoricoButton`)
- `gap: 18` na linha principal da barra

---

## Checklist rápido

- [ ] Wrapper `getFilterBarWrapperStyle` (`12px 20px`, `primaryTransparent*`)
- [ ] Linha com **`gap: 10`**
- [ ] Histórico: `FiltroHistoricoButton` (estados partilhados)
- [ ] Operadora + Influencer nos componentes canónicos
- [ ] Carrossel: `lib/carouselNavStyles.ts`

---

## Ficheiros de referência

| Descrição | Caminho |
|-----------|---------|
| Referência visual | `src/pages/dashboards/DashboardOverviewInfluencer/index.tsx` |
| Estilos da barra | `src/lib/filterBarStyles.ts` |
| Histórico | `src/components/dashboard/FiltroHistoricoButton.tsx` |
| Operadora | `src/components/FiltroOperadoraSelect.tsx` |
| Influencer | `src/components/FiltroInfluencerSelect.tsx` |
| Hoje | `src/components/dashboard/FiltroHojeButton.tsx` |

---

*Última atualização: Histórico/Hoje alinhados a Operadora/Influencer via `getFiltroBarPillStateStyle`.*
