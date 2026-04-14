# Streamers — especificação técnica

Página única (`page_key`: **`streamers`**) que substitui as antigas entradas **`dash_overview`**, **`dash_conversao`** e **`dash_financeiro`**. Três abas internas reutilizam os componentes existentes (Overview executivo, Conversão, Dashboard financeiro). **Overview Influencer** permanece página separada (`dash_overview_influencer`).

## Permissões

- **Uma linha** em `role_permissions`, `operadora_pages` e `gestor_tipo_pages` para `streamers`.
- Regra de produto: **acesso às três abas ou a nenhuma** (desde que o perfil tenha `streamers` e operadora/gestor permitam).
- Valores `can_view`: `sim`, `proprios`, `nao` — mesmo significado global (influencer só dados próprios; agência escopo; operador por `operadora_slug`).
- **Influencer / agência** no modelo atual: `streamers` tende a `nao`; continuam em **Overview Influencer**.

## UI / rotas (frontend)

- `activePage === "streamers"` → shell com `role="tablist"` e painéis `tabpanel`.
- Abas: **Overview** | **Conversão** | **Financeiro** (enum interno; não são `page_key`).
- Montagem **lazy por aba**: só o painel ativo monta o componente correspondente (evita três fetches simultâneos).
- Cada painel continua com o **bloco de filtros** próprio do dashboard (paridade com o código atual). Próxima iteração (opcional): elevar estado de filtros ao shell conforme `docs/streamers-spec.md` discussão de “filtro único”.

## Fetch e cache (evolução)

- Dono único de estado de filtros no shell + `queryKey` estável (ex. React Query) quando/unificar filtros.
- Dependências de `useEffect` estáveis (`serializarFiltros`), evitar duplo fetch ao trocar de aba.

## Migração Supabase

Ver `supabase/migrations/*_streamers_page_key.sql`: agrega `can_view` das três chaves antigas por `role` (prioridade `sim` > `proprios` > `nao`), insere `streamers`, remove chaves antigas; idem união em `operadora_pages` e `gestor_tipo_pages`.

## Deploy

1. Aplicar migration no Supabase.
2. Publicar frontend que já não referencia `dash_overview` / `dash_conversao` / `dash_financeiro`.

## Documentação legada

Atualizar `docs/migration-role-permissions-seed.sql` e referências em `ARQUITETURA-ACESSOS.md` / `ESTRUTURA-DATABASE.md` para novos ambientes usarem `streamers`.
