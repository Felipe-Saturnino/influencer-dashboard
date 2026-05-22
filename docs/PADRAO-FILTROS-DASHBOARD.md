# Padrão de filtros na barra (FilterBar)

Este documento define o padrão visual e de ícones que **toda página nova** (ou refatoração) deve seguir nos controlos repetíveis da **barra de filtros** transparente.

**Pill na barra:** `borderRadius: 999` — Histórico, Influencer, Operadora, modo de visualização (Mês/Semana/Dia), Hoje (Agenda) e filtros futuros — ver `brand-css-variables.mdc` §5.

---

## Ícones (obrigatório: Lucide React)

| Controlo | Ícone | Tamanho | Componente |
|----------|-------|---------|------------|
| **Histórico** (acumulado) | `Calendar` | 15px | `FiltroHistoricoButton` |
| **Influencer(s)** | `User` | 15px | `FiltroInfluencerSelect` |
| **Operadora(s)** | `Shield` | 15px | `FiltroOperadoraSelect` |
| **Modo Mês / Semana / Dia** | `CalendarRange` | 15px | `FiltroModoVisualizacaoSelect` |
| **Hoje** (Agenda) | `History` | 15px | `FiltroHojeButton` |

**Não confundir:** `Calendar` = Histórico dos dashboards · `CalendarRange` = granularidade de calendário · `History` = atalho Hoje na Agenda.

**Não usar** `GiCalendar`, `GiShield`, etc. nesta barra.

---

## Container da barra de filtros

- `borderRadius: 14`
- `border: brand.primaryTransparentBorder`
- `background: brand.primaryTransparentBg`
- `padding: "12px 20px"`
- `useDashboardBrand()` para whitelabel

Referências: `Streamers/index.tsx`, `lives/Agenda/index.tsx`.

---

## Botão Histórico

`FiltroHistoricoButton` — modo período acumulado nos dashboards; rótulo do carrossel **`Todo o período`** quando ativo.

```tsx
import { FiltroHistoricoButton } from "../../components/dashboard";

<FiltroHistoricoButton active={historico} onClick={toggleHistorico} />
```

---

## Filtro Influencer

`FiltroInfluencerSelect` — agregadora **Todos Influencers**; `mode="single"` ou `"multiple"`.

```tsx
import { FiltroInfluencerSelect } from "../../components/dashboard";
```

Ver `global.mdc` § Filtro de influencer.

---

## Filtro Operadora

`FiltroOperadoraSelect` — agregadora **Todas Operadoras**.

```tsx
import { FiltroOperadoraSelect } from "../../components/dashboard";

<FiltroOperadoraSelect value={filtroOperadora} onChange={setFiltroOperadora} operadoras={lista} pill />
```

---

## Modo de visualização (Mês / Semana / Dia)

`FiltroModoVisualizacaoSelect` — seleção única com dropdown custom (radio no painel).

- Ícone **`CalendarRange` 15px** no trigger
- Opções definidas pela página (`mes`, `semana`, `dia` na Agenda)
- Carrossel da página deve adaptar passo e rótulo ao modo (`carouselNavStyles`)

```tsx
import { FiltroModoVisualizacaoSelect } from "../../components/dashboard";

<FiltroModoVisualizacaoSelect
  value={view}
  onChange={setView}
  options={[
    { value: "mes", label: "Mês" },
    { value: "semana", label: "Semana" },
    { value: "dia", label: "Dia" },
  ]}
/>
```

**Uso actual:** Agenda de Lives. **Legado proibido:** `SingleDropdown` local ou em `dashboard/SingleDropdown.tsx`.

---

## Botão Hoje (Agenda)

`FiltroHojeButton` — vai para a data de hoje e força modo **Dia**; `aria-pressed` quando já está nesse estado.

```tsx
import { FiltroHojeButton } from "../../components/dashboard";

<FiltroHojeButton active={filtroHojeAtivo} onClick={aplicarFiltroHoje} />
```

**Não** usar na Agenda o `FiltroHistoricoButton` dos dashboards.

---

## Barra da Agenda de Lives (referência completa)

```
[ ◀ período ▶ ]  [ Hoje ]  [ 📅 Mês ▾ ]  [ Influencers ]  [ Operadoras ]
        ↑              ↑           ↑
   carouselNav    FiltroHoje   FiltroModoVisualizacao
```

Segunda linha: chips Status e Plataforma (regras em `lives.mdc`).

---

## Checklist rápido (nova página)

- [ ] Barra com `primaryTransparentBorder` / `primaryTransparentBg`
- [ ] Pill **999** nos controlos da strip
- [ ] Histórico: `FiltroHistoricoButton` + `Calendar` 15px (se aplicável)
- [ ] Influencer: `FiltroInfluencerSelect` + **Todos Influencers**
- [ ] Operadora: `FiltroOperadoraSelect` + **Todas Operadoras**
- [ ] Mês/Semana/Dia: `FiltroModoVisualizacaoSelect` + `CalendarRange` (se aplicável)
- [ ] Agenda: `FiltroHojeButton` + `History` (não Histórico acumulado)
- [ ] Carrossel: `lib/carouselNavStyles.ts`

---

## Ficheiros de referência

| Descrição | Caminho |
|-----------|---------|
| Agenda (barra completa) | `src/pages/lives/Agenda/index.tsx` |
| Modo Mês/Semana/Dia | `src/components/FiltroModoVisualizacaoSelect.tsx` |
| Botão Hoje | `src/components/dashboard/FiltroHojeButton.tsx` |
| Influencer | `src/components/FiltroInfluencerSelect.tsx` |
| Operadora | `src/components/FiltroOperadoraSelect.tsx` |
| Histórico | `src/components/dashboard/FiltroHistoricoButton.tsx` |
| Carrossel | `src/lib/carouselNavStyles.ts` |

---

*Última atualização: barra unificada (Influencer, Operadora, Modo visualização, Hoje na Agenda, Histórico).*
