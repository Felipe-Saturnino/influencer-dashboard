# Landing Pages — Performance de Conversão (estrutura proposta)

Este doc descreve como estruturar o mapeamento UTM → Landing Pages para alimentar o Dashboard de Mídias Sociais (Funil de Conversão e tabela Landing Pages — Performance de Conversão).

---

## Contexto atual

- **utm_aliases** e **utm_metricas_diarias**: mapeiam `utm_source` → influencer (Gestão de Links).
- A CDA/Reporting API retorna métricas por `utm_source`: visit_count, registration_count, ftd_count, deposit_total, etc.
- O sync-metricas grava em `utm_metricas_diarias` (por dia) e `utm_aliases` (totais acumulados).

---

## Onde vem cada métrica do funil

| Etapa        | Fonte possível                                   | Observação |
|-------------|---------------------------------------------------|------------|
| **Cliques** | (a) `kpi_daily.link_clicks` (Meta/Facebook) ou (b) CDA, se registrar evento de clique | Meta entrega cliques em links de posts. A CDA pode ou não ter evento de "clique" antes do acesso à LP. |
| **Acessos** | `utm_metricas_diarias.visit_count` / `utm_aliases.total_visits` | Visitas à LP (ou ao site com UTM). |
| **Registros** | `utm_metricas_diarias.registration_count` / `utm_aliases.total_registrations` | Registros com UTM. |
| **FTDs**    | `utm_metricas_diarias.ftd_count` / `utm_aliases.total_ftds` | First time deposits. |

**Sobre "Cliques":**
- **Opção A:** Usar `link_clicks` do `kpi_daily` (soma Meta) como proxy de cliques de rede social.
- **Opção B:** Se a CDA/operadora rastrear o evento de clique (ex.: pixel, redirect com UTM antes da LP), esse valor pode ser usado.
- **Opção C:** Considerar o funil sem Cliques, iniciando em **Acessos** → Registros → FTDs.

---

## Estrutura proposta: mapeamento UTM → Landing Page

### 1. Tabela `landing_pages`

Cadastro das Landing Pages com identificador e nome:

```sql
create table if not exists landing_pages (
  id          uuid primary key default uuid_generate_v4(),
  nome        text not null,
  operadora_slug text references operadoras(slug),
  utm_content text,   -- ex: 'boas-vindas', 'live-dealer'
  utm_campaign text,  -- ex: 'spin', 'promo-jul'
  ativo       boolean default true,
  created_at  timestamptz default now(),
  unique (operadora_slug, utm_content, utm_campaign)
);
```

- **utm_content** e **utm_campaign** definem o “padrão” UTM que identifica a LP.
- Um UTM da CDA (utm_source) pode ser mapeado a uma LP ou a um influencer.

### 2. Opção A: Mapear via `utm_content` / `utm_campaign`

Se a CDA retorna `utm_content` e `utm_campaign` na dimensão de split/agregação:

- `utm_metricas_diarias` (ou similar) teria colunas: `utm_content`, `utm_campaign`, `utm_source`, `visit_count`, `registration_count`, etc.
- Agregação: `GROUP BY landing_page_id` (via join com `landing_pages` onde `utm_content` e `utm_campaign` batem).

### 3. Opção B: Mapear `utm_source` → Landing Page (igual Gestão de Links)

Criar uma tabela análoga a `utm_aliases`, mas para LPs:

```sql
create table if not exists utm_landing_page_aliases (
  id              uuid primary key default uuid_generate_v4(),
  utm_source      text not null,
  landing_page_id uuid references landing_pages(id),
  operadora_slug  text not null,
  status          text not null default 'pendente',  -- pendente | mapeado | ignorado
  total_visits    bigint,
  total_registrations bigint,
  total_ftds      integer,
  total_deposit   numeric,
  total_withdrawal numeric,
  primeiro_visto  date,
  ultimo_visto    date,
  mapeado_por     uuid references auth.users(id),
  mapeado_em      timestamptz,
  created_at      timestamptz default now(),
  unique (utm_source, operadora_slug)
);
```

- Fluxo igual à Gestão de Links: UTMs órfãos entram como `pendente`, usuário mapeia para uma LP (`mapeado`).
- Métricas diárias podem vir de `utm_metricas_diarias` agregadas por `landing_page_id` (via join com aliases mapeados).

### 4. Funil e tabela de performance

- **Funil de Conversão:** Totais do período (com filtros) de: Cliques (se houver) → Acessos → Registros → FTDs.
- **Landing Pages — Performance:** Uma linha por LP com acessos, registros, FTDs, R$ FTDs, depósitos, saques, GGR.

Ambos consumiriam uma view ou função que agrega `utm_metricas_diarias` (e eventualmente `utm_aliases`) por `landing_page_id`, aplicando os filtros de período e operadora.

---

## Próximos passos

1. **Validar com a CDA** se há `utm_content`, `utm_campaign` ou outra dimensão que identifique a LP.
2. **Definir fonte de "Cliques"**: CDA, Meta `link_clicks` ou omitir do funil.
3. **Escolher modelo:** mapeamento por dimensão UTM (Opção A) ou por `utm_source` → LP (Opção B).
4. **Migração:** criar `landing_pages` e, se for Opção B, `utm_landing_page_aliases`.
5. **Ajustar sync-metricas** ou criar job dedicado para popular métricas diárias por LP.
6. **UI:** tela de Gestão de Landing Pages (cadastro de LPs e mapeamento de UTMs, similar à Gestão de Links).
