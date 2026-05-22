# Padrão de filtros: Histórico, Influencer e Operadora

Este documento define o padrão visual e de ícones que **toda página nova** (ou refatoração) deve seguir quando expuser, na mesma barra:

- um botão **Histórico** (alternar entre período corrente e “todo o período” / equivalente);
- filtro de **Influencer(s)**;
- filtro de **Operadora(s)**.

O padrão de referência é o mesmo usado nos **Dashboards** (ex.: Streamers — Overview Spin e abas). Não reinventar ícones nem estilos divergentes nesses três controlos.

**Pill na barra:** controles repetíveis na strip usam `borderRadius: 999` (Histórico, Operadora, Influencer e filtros futuros da barra) — ver `brand-css-variables.mdc` §5.

---

## Ícones (obrigatório: Lucide React)

| Controlo            | Ícone Lucide | Notas |
|---------------------|--------------|--------|
| Botão **Histórico** | `Calendar`   | Tamanho típico **15**; `aria-hidden` no ícone decorativo. |
| Filtro **Influencer** | `User`     | **15px** no trigger do `FiltroInfluencerSelect` (sempre visível). |
| Filtro **Operadora**  | `Shield`   | À esquerda do `<select>` ou dentro de `FiltroOperadoraSelect`. |

**Não usar** para estes três elementos: `GiCalendar`, `GiShield`, `GiStarMedal` nem outros ícones de bibliotecas alternativas — mantém consistência com Overview Spin / Overview Influencer.

Importação de exemplo:

```tsx
import { Calendar, Shield, User } from "lucide-react";
```

---

## Container da barra de filtros

Alinhar ao bloco dos dashboards:

- `borderRadius: 14`
- `border: brand.primaryTransparentBorder`
- `background: brand.primaryTransparentBg`
- `padding: "12px 20px"` (ou equivalente já usado na secção, sem fundo sólido opaco no lugar do padrão transparente de marca)

Usar `useDashboardBrand()` para `brand` e respeitar whitelabel (`useBrand`, `var(--brand-accent)`, etc.), como em `global.mdc` / `brand-css-variables.mdc`.

Referência de implementação: `src/pages/dashboards/Streamers/index.tsx` (wrapper do bloco de filtros).

---

## Botão Histórico

**Componente obrigatório:** `FiltroHistoricoButton` (`src/components/dashboard/FiltroHistoricoButton.tsx`). Referência visual: **Overview Influencer**.

- Pill `borderRadius: 999`, ícone **`Calendar` 15px** + texto “Histórico”.
- Ativo: `aria-pressed={true}`; borda/texto `brand.accent`; fundo `color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)`.
- `aria-label` padrão (modo período): `HISTORICO_FILTRO_ARIA_LABEL_INACTIVE` / `HISTORICO_FILTRO_ARIA_LABEL_ACTIVE` — usar constantes; só customizar `ariaLabelInactive` / `ariaLabelActive` se o produto exigir copy diferente (não confundir com filtro de status).
- Carrossel com histórico ligado: rótulo central **`Todo o período`**; setas desabilitadas (`getCarouselBtnNavStyle(t, true)`).
- **Portal RH (regra de negócio):** abas Comunicados / Políticas / RH Talks — nunca listar arquivados; Histórico = todo o período por `published_at`. Gerenciamento — arquivadas na tabela via filtro **Status**; mesmo botão e carrossel por data de publicação.

```tsx
import { FiltroHistoricoButton } from "../../components/dashboard";

<FiltroHistoricoButton active={historico} onClick={toggleHistorico} />
```

---

## Filtro Influencer

**Componente obrigatório:** `FiltroInfluencerSelect` (`src/components/FiltroInfluencerSelect.tsx`, reexport em `components/dashboard`).

| Regra | Valor |
|--------|--------|
| Modos | `mode="single"` (`value`: `todos` \| id) ou `mode="multiple"` (`value`: `[]` = agregador) — a página escolhe; o componente só padroniza layout |
| Ícone | `User` **15px** no trigger (vazio ou com 1+ selecionados) |
| Agregadora | Rótulo **`Todos Influencers`** (`INFLUENCER_FILTRO_TODOS_LABEL`); single: valor `todos` (`INFLUENCER_FILTRO_TODOS_VALUE`) |
| Estilo | Pill **999**; destaque ativo com `--brand-action` 15% |
| Pesquisa | Automática no painel quando `influencers.length > 5` |
| Escopo | `showFiltroInfluencer` / `useDashboardFiltros()` — regras de negócio na página |

```tsx
import { FiltroInfluencerSelect } from "../../components/dashboard";

<FiltroInfluencerSelect
  mode="single"
  value={filtroInfluencer}
  onChange={setFiltroInfluencer}
  influencers={lista.map((r) => ({ id: r.id, name: r.nome }))}
/>

<FiltroInfluencerSelect
  mode="multiple"
  value={filterInfluencers}
  onChange={setFilterInfluencers}
  influencers={lista}
/>
```

**Proibido na barra:** `SelectComIcone` + `User` para influencers; `InfluencerDropdown` / `InfluencerMultiSelect` (removidos); agregadora “Todos os influencers”; `<select>` nativo para este filtro.

**Exceção:** outro formato só com autorização explícita de produto.

---

## Filtro Operadora

- **Sempre** o componente **`FiltroOperadoraSelect`** (`src/components/FiltroOperadoraSelect.tsx`, reexport em `components/dashboard`) — encapsula `SelectComIcone` + ícone **Shield** 15px.
- Opção agregadora: valor `todas`, rótulo visível **`Todas Operadoras`** (`OPERADORA_FILTRO_TODAS_LABEL`); `aria-label` do controlo **`Operadoras`** (`OPERADORA_FILTRO_ARIA_LABEL`). **Nunca** “Todas as operadoras”, “Operadoras” só na agregadora, label lateral “Operadora”.
- Lista filtrada por `podeVerOperadora` quando existir permissão; `extraOptions` (ex. “Nenhuma”) só em domínios que exigem — ver `global.mdc` § Filtro de operadora.

```tsx
import { FiltroOperadoraSelect } from "../../components/dashboard";

<FiltroOperadoraSelect
  value={filtroOperadora}
  onChange={setFiltroOperadora}
  operadoras={operadorasList}
  podeVerOperadora={podeVerOperadora}
  pill
/>
```

---

## Navegação de período (quando existir)

Se a página tiver carrossel mês/semana junto aos filtros:

- Botões anterior/próximo: `ChevronLeft` / `ChevronRight`, estilo circular 32×32 via `lib/carouselNavStyles.ts`.
- Desabilitar navegação quando `historico === true` ou nos extremos do intervalo disponível.

---

## Checklist rápido (nova página)

- [ ] `Calendar` + `User` + `Shield` só do **lucide-react** nestes três controlos.
- [ ] Barra dentro do wrapper `primaryTransparentBorder` / `primaryTransparentBg`.
- [ ] Pill **999** em Histórico, Influencer, Operadora e novos filtros da barra.
- [ ] Botão Histórico: `FiltroHistoricoButton` + `aria-pressed` + rótulo `Todo o período` no carrossel.
- [ ] Influencer: `FiltroInfluencerSelect` + **Todos Influencers** + modo single/multi conforme a página.
- [ ] Filtros condicionados a `showFiltroInfluencer` / `showFiltroOperadora` quando usar `useDashboardFiltros`.
- [ ] Nenhum `GiCalendar` / `GiShield` / `GiStarMedal` nesta barra.
- [ ] Operadora: `FiltroOperadoraSelect` + opção agregadora **Todas Operadoras** (sem label lateral).

---

## Ficheiros de referência

| Descrição | Caminho |
|-----------|---------|
| Barra completa (referência) | `src/pages/dashboards/DashboardOverviewInfluencer/index.tsx` |
| Streamers (filtros partilhados) | `src/pages/dashboards/Streamers/index.tsx` |
| Botão Histórico | `src/components/dashboard/FiltroHistoricoButton.tsx` |
| Filtro influencer (canónico) | `src/components/FiltroInfluencerSelect.tsx` |
| Filtro de operadora (canónico) | `src/components/FiltroOperadoraSelect.tsx` |
| Marca / fundo do bloco | `useDashboardBrand` + regras em `.cursor/rules/global.mdc` |

---

*Última atualização: padrão unificado Histórico + Influencer (pill 999, Todos Influencers) + Operadora.*
