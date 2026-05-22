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

## Ícone `Plus` (obrigatório)

O ícone **não** vai no `children` — é renderizado **só** dentro de `CtaCriarButton` (`Plus` 14px; em `loading`, `Loader2` 14px). **Proibido** duplicar `+` no texto ou montar outro `<Plus>` ao lado do componente.

Inventário: `node scripts/list-cta-criar.mjs`

## Rótulos canónicos (`children` = texto na tela)

Preferir **Novo/Nova** + entidade do domínio (igual ao menu quando fizer sentido). `aria-label` = mesmo texto visível, salvo exceção documentada na secção.

| Página (menu) | Texto do botão |
|---------------|----------------|
| Agenda | Nova Live |
| Banca de Jogo | Solicitar Banca |
| Campanhas | Nova Campanha |
| Figurinos | Cadastrar peça |
| Gestão de Mesas | Nova mesa |
| Gestão de Operadoras | Nova Operadora |
| Gestão de Prestadores | Novo Prestador |
| Gestão de Usuários | Novo Usuário |
| Network | Novo Afiliado |
| Organograma | Nova diretoria |
| Portal de RH | Nova Postagem |
| Scout | Novo Influencer |
| Status Técnico | Nova Rede |
| Vagas | Nova vaga |

## Exemplo

```tsx
import { CtaCriarButton } from "../components/CtaCriarButton";

<CtaCriarButton onClick={abrirNovo}>Novo Afiliado</CtaCriarButton>

<CtaCriarButton loading={checando} loadingLabel="Verificando...">
  Nova Live
</CtaCriarButton>
```

---

*Regras: `brand-css-variables.mdc` §3 · `global.mdc` componentes.*
