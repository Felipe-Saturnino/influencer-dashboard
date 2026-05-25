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
| `getFiltroBarPillStateStyle(t, brand, active)` | Toggle inativo/ativo (marca) |
| `FILTRO_STATUS_SEMANTICO_PILL` | Dimensões dos chips semânticos (10px radius, 44px altura) |
| `getFiltroStatusSemanticoPillStyle(t, active, semanticColor)` | Chips Status / Plataforma (cor de domínio) |
| `FILTRO_BAR_TAB_BUTTON` / `getFiltroBarTabButtonStyle` | Botões de **aba** (`role="tab"`) — referência Organograma |
| `FILTRO_BAR_TAB_ICON_PROPS` | Ícone Lucide **16px** em cada aba |
| `onFiltroBarTabsKeyDown` / `handleFiltroBarTabsArrowKeyDown` | Setas ← → no `tablist` |

**Componente:** `FiltroBarTabButton` — uma aba = um ícone único + rótulo; ver Brand MDC §6 (Abas de navegação).

---

## Ícones (obrigatório: Lucide React)

**Fonte de verdade:** `src/lib/filterBarIconCatalog.tsx` — `FilterBarIcons` + `FILTRO_BAR_ICON_PROPS` (15px, `strokeWidth` 2). Brand MDC §6 tem a tabela completa e exceções de domínio.

| Controlo | Ícone | `FilterBarIcons` | Componente |
|----------|-------|------------------|------------|
| **Histórico** (acumulado) | `Calendar` | `.historico` | `FiltroHistoricoButton` |
| **Influencer(s)** | `User` | `.influencer` | `FiltroInfluencerSelect` |
| **Operadora(s)** | `Shield` | `.operadora` | `FiltroOperadoraSelect` |
| **Status** (`<select>`) | **`ShieldAlert`** | `.status` | `FiltroBarCampoSelect` — agregadora **Todos Status** |
| **Time** | `UsersRound` | `.time` | `FiltroCalendarioTimeSelect`, `FiltroTodosTimesButton` |
| **Staff** | `IdCard` | `.staff` | `FiltroCalendarioStaffSelect` |
| **Turno** | `Clock` | `.turno` | `FiltroTurnoSelect` |
| **Modo Mês / Semana / Dia** | `CalendarRange` | `.modoVisualizacao` | `FiltroModoVisualizacaoSelect` |
| **Hoje** (Agenda) | `History` | `.hoje` | `FiltroHojeButton` |

**Não usar** `GiCalendar`, `GiShield`, `ListFilter` / `CircleDot` / `ShieldEllipsis` para status em `<select>` na barra.

**Status semântico (chips):** `FiltroStatusSemanticoPill` com bolinha 8px — **não** `ShieldAlert` (Lives, Afiliados, etc.).

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

## Filtros semânticos (Status e Plataforma)

Chips com **cor de negócio** no estado ativo — **distintos** dos pills 999 de marca (Histórico, Operadora, Influencer).

| Propriedade | Inativo | Ativo |
|-------------|---------|-------|
| `borderRadius` | **10** | **10** |
| `padding` | **10px 18px** | **10px 18px** |
| `minHeight` | **44** | **44** |
| `fontSize` | **13** | **13** |
| `border` | `t.cardBorder` | cor semântica (`semanticColor`) |
| `background` | `t.inputBg` | `color-mix` 15% cor semântica |
| `color` | `t.textMuted` | cor semântica |
| `fontWeight` | 500 | 700 |

| Componente | Conteúdo do chip |
|------------|------------------|
| `FiltroStatusSemanticoPill` | Bolinha 8px + rótulo; `<X>` ao desmarcar (default) |
| `FiltroPlataformaSemanticoPill` | `PlatLogo` 13px + rótulo; prop opcional `count` (Influencers, Scout) |

```tsx
import { FiltroStatusSemanticoPill, FiltroPlataformaSemanticoPill } from "../components/dashboard";
```

**Páginas:** status — Agenda, Feedback, Influencers, Scout, Afiliados, Network; plataforma — Agenda, Influencers, Scout.

---

## Visual unificado dos pills (Operadora, Influencer, Histórico, Hoje, Mês/Semana/Dia)

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

<FiltroModoVisualizacaoSelect
  value={view}
  defaultValue="mes"
  onChange={setView}
  options={[
    { value: "mes", label: "Mês" },
    { value: "semana", label: "Semana" },
    { value: "dia", label: "Dia" },
  ]}
/>
```

- **Hoje:** `aria-pressed` quando dia corrente em modo Dia; ativo = estilo marca.
- **Modo:** inativo com valor `defaultValue` (**Mês** na Agenda); Semana/Dia = ativo.
- Histórico (dashboards): rótulo do carrossel **`Todo o período`** quando ligado.

---

## CTA de criação na barra (distinto dos pills)

Quando **Adicionar / Criar / Nova …** ficar na **mesma strip** de filtros:

| Item | Pills de filtro | CTA de criação |
|------|-----------------|----------------|
| Componente | `FiltroHistoricoButton`, `FiltroOperadoraSelect`, … | **`CtaCriarButton`** |
| `borderRadius` | **999** | **10** (abas Overview Spin) |
| `padding` | **6px 14px** | **10px 20px** |
| Ícone | conforme tipo (Calendar, Shield, …) | **`Plus` 14px** |
| Fundo | `color-mix` quando ativo | gradiente cheio (ver `PADRAO-CTA-CRIAR.md`) |

Na linha: `getFilterBarRowStyle()` (`gap: 10`) — CTA na mesma fileira que carrossel e selects.

---

## Legado removido (não usar)

- Chips status/plataforma na barra com `borderRadius: 999`, `padding: 5px 12px`, ativo só `${cor}22` inline (usar `FiltroStatusSemanticoPill` / `FiltroPlataformaSemanticoPill`)
- Histórico inativo com `background: transparent` ou `color: t.textMuted`
- Histórico ativo só com `brand.accent` sem ramo `useBrand` / `--brand-primary`
- Markup inline de botão Histórico na barra (usar sempre `FiltroHistoricoButton`)
- `gap: 18` na linha principal da barra

---

## Agenda — barra de referência

`src/pages/lives/Agenda/index.tsx` — carrossel + **Hoje** + **Mês/Semana/Dia** + Influencer + Operadora na mesma linha (`getFilterBarRowStyle`). Sem `FiltroHistoricoButton`.

---

## Checklist rápido

- [ ] Wrapper `getFilterBarWrapperStyle` (`12px 20px`, `primaryTransparent*`)
- [ ] Linha com **`gap: 10`**
- [ ] Histórico: `FiltroHistoricoButton` (estados partilhados)
- [ ] Agenda: `FiltroHojeButton` + `FiltroModoVisualizacaoSelect` com `defaultValue="mes"`
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
| Modo Mês/Semana/Dia | `src/components/FiltroModoVisualizacaoSelect.tsx` |
| Status semântico | `src/components/FiltroStatusSemanticoPill.tsx` |
| Plataforma semântica | `src/components/FiltroPlataformaSemanticoPill.tsx` |
| Agenda (barra completa) | `src/pages/lives/Agenda/index.tsx` |

---

*Última atualização: chips Status/Plataforma (`FiltroStatusSemanticoPill`, `FiltroPlataformaSemanticoPill`) — estilo abas Overview Spin + cor semântica ativa.*
