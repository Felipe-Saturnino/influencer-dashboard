# Especificação: Agregação de Múltiplas UTMs (Influencer e Campanha)

**Versão:** 1.0  
**Data:** 2025-03-18  
**Status:** Especificação para implementação

---

## 1. Contexto e Problema

Atualmente, quando múltiplas UTMs são mapeadas para o mesmo **influencer** ou **campanha**, os dados são **sobrescritos** em vez de **somados**. Apenas a última UTM processada permanece nos KPIs. Isso causa divergências entre o Dashboard e a origem (CDA e futuras operadoras).

**Cenário futuro:** Um influencer ou campanha pode ter múltiplas UTMs de **múltiplas operadoras** (CDA, Bet Nacional, Blaze, etc.). Cada operadora terá sua própria integração.

---

## 2. Exemplo de Caso de Uso

### Influencer ZVeio

| UTM                | Operadora     | Mapeamento        |
|--------------------|---------------|-------------------|
| CDA/ZveioCarnaval  | Casa de Apostas | influencer_id    |
| CDA/Zveionatal     | Casa de Apostas | influencer_id    |
| Bet Nacional e ZVeio | Bet Nacional | influencer_id    |
| Blaze com o Zeveio | Blaze        | influencer_id    |

**Operadoras associadas:** 3 (CDA, Bet Nacional, Blaze)  
**UTMs da CDA:** 2  
**UTMs da Bet Nacional:** 1  
**UTMs da Blaze:** 1  

---

## 3. Comportamentos Esperados

### 3.1 Filtro por Influencer (ex.: ZVeio)

- **Comportamento:** Exibir a **soma** de todas as UTMs mapeadas para o influencer.
- **Respeito ao escopo:** Apenas UTMs cujas operadoras estão no escopo do role do usuário.
  - Se o perfil **não tem** a operadora X no escopo → **não** exibe os resultados dessa operadora.
  - Exemplo: usuário com escopo só em CDA vê apenas as 2 UTMs da CDA; usuário com escopo em CDA + Bet Nacional vê as 2 + 1 UTMs.

### 3.2 Filtro por Operadora (ex.: Casa de Apostas)

- **Comportamento:** Exibir apenas influencers/campanhas que possuem **pelo menos uma UTM** da operadora selecionada.
- **Métricas exibidas:** Somente os resultados das UTMs **dessa operadora**, não das demais.
  - Exemplo: ao filtrar por CDA, mostrar ZVeio com a soma de "CDA/ZveioCarnaval" + "CDA/Zveionatal", **sem** incluir Bet Nacional ou Blaze.

### 3.3 Sem filtro (visão geral)

- **Comportamento:** Soma de todas as UTMs que o usuário pode ver conforme seu escopo de operadoras.

---

## 4. Estrutura de Dados

### 4.1 Granularidade Correta

A chave de agregação deve ser:

| Entidade   | Chave de agregação                        | Significado                                      |
|------------|-------------------------------------------|--------------------------------------------------|
| Influencer | `(influencer_id, data, operadora_slug)`   | Uma linha por influencer/dia/operadora         |
| Campanha   | `(campanha_id, data, operadora_slug)`*    | Uma linha por campanha/dia/operadora (se usar) |

\* Campanhas hoje consultam `utm_metricas_diarias` via RPC e agregam em tempo de execução; não há tabela `campanha_metricas`. A lógica deve ser mantida consistente quando essa estrutura for definida.

### 4.2 Agregação por operadora

- **Múltiplas UTMs da MESMA operadora** para o mesmo influencer → **somar** métricas.
- **UTMs de operadoras DIFERENTES** para o mesmo influencer → manter **linhas separadas** (uma por operadora).

**Exemplo ZVeio em 2025-01-15:**

| influencer_id | data       | operadora_slug | visit_count | ftd_count | deposit_total |
|---------------|------------|----------------|-------------|-----------|---------------|
| uuid-zveio    | 2025-01-15 | casa_apostas   | 150         | 8         | 2400          |
| uuid-zveio    | 2025-01-15 | bet_nacional   | 45          | 2         | 600           |
| uuid-zveio    | 2025-01-15 | blaze          | 30          | 1         | 300           |

- `casa_apostas` = soma de CDA/ZveioCarnaval + CDA/Zveionatal  
- `bet_nacional` = Bet Nacional e ZVeio  
- `blaze` = Blaze com o Zeveio  

---

## 5. Componentes a Alterar

### 5.1 sync-metricas-cda (Edge Function — integração CDA)

**Estado atual:** Cada UTM é processada separadamente; o upsert em `influencer_metricas` **sobrescreve** linhas com o mesmo `(influencer_id, data, operadora_slug)`.

**Mudança necessária:**
1. Antes do upsert, agrupar todas as UTMs por `(influencer_id, data, operadora_slug)`.
2. Para cada grupo, **somar** visit_count, registration_count, ftd_count, ftd_total, deposit_count, deposit_total, withdrawal_count, withdrawal_total.
3. Fazer um único upsert por grupo com os totais agregados.
4. Quando houver outras operadoras além da CDA, o sync (ou jobs por operadora) deve preencher `utm_metricas_diarias` e `utm_aliases` com o `operadora_slug` correto.

### 5.2 aplicar_mapeamento_utm (RPC)

**Estado atual:** Copia apenas a UTM mapeada para `influencer_metricas`, sobrescrevendo o que existia.

**Mudança necessária:**
1. Após atualizar `utm_metricas_diarias` com o `influencer_id` da UTM mapeada:
2. Buscar **todas** as UTMs que mapeiam para aquele `influencer_id` na **mesma** `operadora_slug`.
3. Agregar métricas dessas UTMs por `data` (somar).
4. Fazer upsert em `influencer_metricas` com os totais.

### 5.3 Campanhas

**Estado atual:** `get_campanha_funil_totais` e `get_campanhas_performance` já fazem `SUM()` sobre `utm_metricas_diarias` via JOIN com `utm_aliases`. A agregação é feita em tempo de execução.

**Quando houver estrutura de dados própria para campanhas:** aplicar a mesma lógica:
- Agregar por `(campanha_id, data, operadora_slug)`.
- Respeitar escopo de operadoras no frontend.

---

## 6. Escopo e Permissões

### 6.1 Escopo de operadoras (podeVerOperadora)

- O frontend já filtra por operadora via `filtroOperadora`.
- O mapeamento `operadoraInfMap` indica quais influencers pertencem a cada operadora (via `influencer_operadoras`).
- Ao exibir KPIs, considerar apenas `influencer_metricas` cujo `operadora_slug` está no escopo do usuário.
- As queries atuais devem incluir `operadora_slug` no filtro quando:
  - `filtroOperadora !== "todas"`
  - E ao calcular totais globais, respeitar `podeVerOperadora(slug)`.

### 6.2 Influencer sem operadora no escopo

- Se o influencer tem UTMs da operadora X, mas o usuário não pode ver X:
  - Ao filtrar por influencer, **não** incluir métricas da operadora X na soma.
  - Ao filtrar por operadora X, o influencer **não** deve aparecer na lista (ou aparecer com dados zerados dessa operadora).

---

## 7. Resumo de Regras

| Regra | Descrição |
|-------|-----------|
| R1 | Múltiplas UTMs da mesma operadora para o mesmo influencer → **somar** antes de gravar em `influencer_metricas`. |
| R2 | UTMs de operadoras diferentes para o mesmo influencer → linhas **separadas** em `influencer_metricas` (uma por operadora). |
| R3 | Filtro por influencer → soma apenas das operadoras no escopo do usuário. |
| R4 | Filtro por operadora → exibir só influencers/campanhas com UTMs dessa operadora; métricas apenas dessa operadora. |
| R5 | Campanhas → mesma lógica: agregar múltiplas UTMs por campanha/operadora; respeitar escopo. |

---

## 8. Estado Atual do Filtro por Operadora nos Dashboards

| Dashboard | Filtra influencer_metricas por operadora_slug? | Observação |
|-----------|-----------------------------------------------|------------|
| Dashboard Financeiro | ✅ Sim | `qMetricas.eq("operadora_slug", operadoraFiltro)` quando filtro ativo |
| Dashboard Overview | ❌ Não | Busca todas as linhas; filtro de operadora só restringe a lista de influencers (via `operadoraInfMap`), não as métricas |
| Dashboard Overview Influencer | ⚠️ Parcial | Usa `buscarMetricasDeAliases` com `operadora_slug`; `influencer_metricas` precisa verificação |
| Dashboard Conversão | ❌ Não | Mesma lógica do Overview |
| Social Media Dashboard | N/A | Usa `get_campanha_funil_totais` e `get_campanhas_performance` (já passam `p_operadora_slug`) |

**Ação:** Ao implementar a agregação, garantir que todos os dashboards que leem `influencer_metricas` apliquem `.eq("operadora_slug", filtroOperadora)` quando o filtro de operadora estiver ativo. Caso contrário, ao filtrar por CDA, as métricas de Bet Nacional e Blaze ainda seriam somadas.

---

## 9. Próximos Passos (Implementação)

1. **sync-metricas-cda:** ✅ v2.0.0 — agrupa e soma por `(influencer_id, data, operadora_slug)`.
2. **aplicar_mapeamento_utm:** alterar RPC para re-agregar todas as UTMs do influencer naquela operadora.
3. **Dashboards:** aplicar filtro `operadora_slug` nas queries de `influencer_metricas` quando filtro de operadora ativo (Overview, Conversão, Overview Influencer).
4. **Campanhas:** ao finalizar a estrutura de dados, garantir que a agregação siga esta especificação.

---

## 10. Referências

- `docs/FLUXO-UTM-METRICAS-DIARIAS.md` — fluxo atual
- `docs/ANALISE-SYNC-METRICAS.md` — análise do sync
- `supabase/migrations/create_campanhas_schema.sql` — schema de campanhas
- `src/lib/metricasAliases.ts` — fallback que já agrega corretamente por influencer (utms de utm_aliases)
