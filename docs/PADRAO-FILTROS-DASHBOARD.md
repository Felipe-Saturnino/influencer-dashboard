# Padrão de filtros: Histórico, Influencer e Operadora

Este documento define o padrão visual e de ícones que **toda página nova** (ou refatoração) deve seguir quando expuser, na mesma barra:

- um botão **Histórico** (alternar entre período corrente e “todo o período” / equivalente);
- filtro de **Influencer(s)**;
- filtro de **Operadora(s)**.

O padrão de referência é o mesmo usado nos **Dashboards** (ex.: Streamers — Overview Spin e abas). Não reinventar ícones nem estilos divergentes nesses três controlos.

---

## Ícones (obrigatório: Lucide React)

| Controlo            | Ícone Lucide | Notas |
|---------------------|--------------|--------|
| Botão **Histórico** | `Calendar`   | Tamanho típico **15**; `aria-hidden` no ícone decorativo. |
| Filtro **Influencer** | `User`     | Mesmo ícone em select nativo, `SelectComIcone` ou no `InfluencerDropdown` (multi-seleção). |
| Filtro **Operadora**  | `Shield`   | À esquerda do `<select>` ou dentro de `SelectComIcone`. |

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

Referência de implementação: `src/pages/dashboards/Streamers/index.tsx` (wrapper do bloco de filtros + botão Histórico + `SelectComIcone`).

---

## Botão Histórico

- `type="button"`
- Estado ativo: `aria-pressed={true}` quando o modo histórico estiver ligado.
- `aria-label` descritivo (ex.: ativar/desativar modo histórico).
- Estilo pill: borda com `brand.accent` quando ativo; fundo com `color-mix` em whitelabel ou `rgba(124,58,237,0.15)` no fallback Spin; texto em `brand.accent` quando ativo.
- Ícone: `<Calendar size={15} aria-hidden />` imediatamente antes do texto “Histórico”.

---

## Filtro Influencer

- **Select simples (um valor):** preferir o componente `SelectComIcone` de `src/components/dashboard` com `icon={<User size={15} aria-hidden />}` e `label` acessível (ex. “Filtrar por influencer”).
- **Multi-seleção:** usar `InfluencerDropdown` (`src/components/InfluencerDropdown.tsx`) ou `InfluencerMultiSelect` (`src/components/InfluencerMultiSelect.tsx`); ambos usam o ícone **`User`** no controlo do filtro.

Opções: “Todos os influencers” + lista; respeitar `useDashboardFiltros()` (`showFiltroInfluencer`, escopos) quando aplicável.

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

- Botões anterior/próximo: `ChevronLeft` / `ChevronRight`, estilo circular 44×44 alinhado aos dashboards.
- Desabilitar navegação quando `historico === true` ou nos extremos do intervalo disponível.

---

## Checklist rápido (nova página)

- [ ] `Calendar` + `User` + `Shield` só do **lucide-react** nestes três controlos.
- [ ] Barra dentro do wrapper `primaryTransparentBorder` / `primaryTransparentBg`.
- [ ] Botão Histórico com `aria-pressed` e labels acessíveis.
- [ ] Filtros condicionados a `showFiltroInfluencer` / `showFiltroOperadora` quando usar `useDashboardFiltros`.
- [ ] Nenhum `GiCalendar` / `GiShield` / `GiStarMedal` nesta barra.
- [ ] Operadora: `FiltroOperadoraSelect` + opção agregadora **Todas Operadoras** (sem label lateral).

---

## Ficheiros de referência

| Descrição | Caminho |
|-----------|---------|
| Barra completa (Histórico + selects com ícones) | `src/pages/dashboards/Streamers/index.tsx` |
| Dropdown multi-influencer (ícone User) | `src/components/InfluencerDropdown.tsx` |
| Select com ícone à esquerda | `src/components/dashboard` (`SelectComIcone`) |
| Filtro de operadora (canónico) | `src/components/FiltroOperadoraSelect.tsx` |
| Marca / fundo do bloco | `useDashboardBrand` + regras em `.cursor/rules/global.mdc` |

---

*Última atualização: documento alinhado ao padrão dos Dashboards Streamers (Overview Spin). Alterações globais de ícone devem atualizar este ficheiro e, se necessário, os ficheiros de referência acima.*
