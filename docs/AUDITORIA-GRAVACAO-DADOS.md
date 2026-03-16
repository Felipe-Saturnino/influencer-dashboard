# Auditoria — Gravação de Dados na Plataforma

Relatório de verificação sobre se os dados preenchidos na plataforma são gravados corretamente no Supabase.

---

## 1. Agenda de Lives

| Campo | Tabela | Operação | Status |
|-------|--------|----------|--------|
| data, horario, plataforma, status, link, influencer_id | `lives` | INSERT (novo) / UPDATE (editar) | ✅ Correto |
| created_by | `lives` | INSERT (apenas novo) | ✅ Correto |

**Observações:**
- O modal da Agenda **não inclui o campo observação**. A observação é preenchida nas páginas **Resultados** ou **Feedback** — proposital.
- **Exclusão:** Ao excluir uma live pela Agenda, só é chamado `lives.delete()`. Se a live tiver `live_resultados` (foi validada como "realizada"), a exclusão pode falhar por FK ou depender de CASCADE no banco. A página **Feedback** exclui `live_resultados` primeiro e depois `lives`, em ordem correta.
- **Recomendação:** Ao excluir pela Agenda, considerar deletar `live_resultados` antes de `lives` (igual ao Feedback), para evitar erro de FK ou órfãos.

---

## 2. Resultados (Validar Live)

| Campo | Tabela | Operação | Status |
|-------|--------|----------|--------|
| status, observacao, horario (se realizada) | `lives` | UPDATE | ✅ Correto |
| duracao_horas, duracao_min, media_views, max_views | `live_resultados` | INSERT / UPDATE | ✅ Correto |

**Bug identificado:**
- O campo **observação** no modal de validação é inicializado com `useState("")` em vez de `useState(live.observacao ?? "")`.
- Efeito: ao editar uma live que já tem observação, o campo vem vazio e, ao salvar, a observação existente é sobrescrita.

**Recomendação:** Inicializar com `useState(live.observacao ?? "")` para preservar o valor ao editar.

---

## 3. Feedback de Lives

| Campo | Tabela | Operação | Status |
|-------|--------|----------|--------|
| status, observacao | `lives` | UPDATE | ✅ Correto |
| duracao_horas, duracao_min, media_views, max_views | `live_resultados` | INSERT / UPDATE | ✅ Correto |

**Observações:**
- A observação é corretamente inicializada com `live.observacao ?? ""`.
- Ao excluir: `live_resultados` é deletado primeiro, depois `lives` — ordem correta.
- Ao mudar status de "realizada" para "não realizada", os `live_resultados` não são apagados. Isso mantém histórico, mas a live passa a constar como "não realizada" mesmo com dados de duração/views. É uma decisão de design aceitável se a intenção for manter histórico.

---

## 4. Dados Cadastrais (Página Influencers)

| Campo | Tabela | Operação | Status |
|-------|--------|----------|--------|
| name (nome artístico) | `profiles` | UPDATE | ✅ Correto |
| nome_artistico, nome_completo, status, telefone, cpf | `influencer_perfil` | INSERT / UPDATE | ✅ Correto |
| canais, link_twitch, link_youtube, link_kick, link_instagram, link_tiktok | `influencer_perfil` | INSERT / UPDATE | ✅ Correto |
| cache_hora, banco, agencia, conta, chave_pix | `influencer_perfil` | INSERT / UPDATE | ✅ Correto |
| operadoras (id_operadora por slug) | `influencer_operadoras` | DELETE todos + INSERT | ✅ Correto |

**Observações:**
- Operadoras: primeiro apaga todos os vínculos e depois insere apenas os ativos — padrão adequado.
- O payload inclui `updated_at`; a tabela `influencer_perfil` deve ter essa coluna.
- `canais` é enviado como array; o PostgreSQL precisa do tipo `text[]` ou equivalente.

---

## 5. Financeiro

| Dado | Tabela | Operação | Status |
|------|--------|----------|--------|
| Ciclos de pagamento | `ciclos_pagamento` | Nenhum INSERT no frontend | ⚠️ Manual |
| Pagamentos de influencers | `pagamentos` | UPSERT (ao fechar ciclo) / UPDATE (status) | ✅ Correto |
| Pagamentos de agentes | `pagamentos_agentes` | INSERT (manual) / UPDATE (status) | ✅ Correto |
| Fechamento de ciclo | `ciclos_pagamento` | UPDATE (fechado_em) | ✅ Correto |

**Observações:**
- Ciclos são criados fora do app (Supabase ou outro meio). O frontend apenas lê, fecha e atualiza.
- Fechamento de ciclo: calcula horas a partir de `lives` + `live_resultados`, aplica `cache_hora` de `influencer_perfil` e faz upsert em `pagamentos`.
- Ajustes de valor e pagamento atualizam corretamente `pagamentos` e `pagamentos_agentes`.

---

## 6. Resumo de Consistência

| Fluxo | Gravação | Observações |
|-------|----------|-------------|
| Agenda | ✅ | Não inclui observação; exclusão pode depender de CASCADE |
| Resultados | ⚠️ | Bug: observação não é carregada no modal de edição |
| Feedback | ✅ | Fluxo de exclusão e preenchimento corretos |
| Influencers | ✅ | Campos cadastrais, canais e operadoras OK |
| Financeiro | ✅ | Pagamentos, status e ciclos conforme esperado |

---

## Correção Recomendada

**Arquivo:** `src/pages/lives/Resultados/index.tsx`  
**Linha:** ~180  

**Antes:**
```tsx
const [observacao, setObservacao] = useState("");
```

**Depois:**
```tsx
const [observacao, setObservacao] = useState(live.observacao ?? "");
```

Isso evita a perda da observação ao reabrir uma live já validada para edição.
