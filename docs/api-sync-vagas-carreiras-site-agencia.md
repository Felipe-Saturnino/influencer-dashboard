# Vagas abertas — sincronização diária (Site Spin → WordPress)

Documento **simplificado** para a **agência / admin WordPress** (`https://spingaming.com.br/carreiras/`).

**Objetivo:** substituir a lista **estática** de vagas na página Carreiras por uma listagem **atualizada automaticamente** com as vagas **externas e abertas** cadastradas na plataforma Spin (Data Intelligence).

**Escopo deste documento:** apenas **receber e exibir** vagas. O formulário de candidatura (envio de currículo etc.) será tratado em uma **segunda etapa**.

---

## Como funciona (visão geral)

1. O **TI Spin** dispara, **todos os dias por volta das 06:00 (horário de Brasília)**, uma requisição **POST** para um **endpoint que vocês vão criar** no WordPress.
2. O corpo é um **JSON com a lista completa** de vagas abertas no momento.
3. O site **substitui** a listagem publicada: vagas que não vierem no JSON **somem** da página; vagas novas ou alteradas **aparecem/atualizam**.

Não é necessário o WordPress “buscar” a plataforma — quem **envia** os dados é a Spin.

---

## O que a agência precisa entregar

| # | Entrega | Descrição |
|---|---------|-----------|
| 1 | **Endpoint REST no WordPress** | URL HTTPS que aceita `POST` + JSON (ex.: `https://spingaming.com.br/wp-json/spin/v1/vagas/sync`) |
| 2 | **Autenticação por segredo** | Validar header `x-spin-vagas-sync-secret` (valor fornecido pelo TI Spin) |
| 3 | **Persistência** | Custom Post Type “Vaga”, tabela própria ou opção do WP — o importante é indexar por **`codigo_vaga`** |
| 4 | **Regra de sync** | **Substituição total:** após cada POST bem-sucedido, a lista pública = exatamente o array `vagas` recebido |
| 5 | **Template em `/carreiras/`** | Bloco “Vagas Abertas” dinâmico; se `vagas` vier vazio, mensagem amigável (ex.: “Nenhuma vaga aberta no momento”) |
| 6 | **URL para o TI Spin** | Informar a URL final do endpoint + confirmar que aceita POST de servidor externo (sem bloqueio de firewall) |

Plugin customizado, mu-plugin ou tema-filho: **livre escolha da agência**.

---

## Endpoint (lado WordPress — vocês implementam)

| Item | Valor |
|------|--------|
| Método | `POST` |
| Content-Type | `application/json` |
| Header obrigatório | `x-spin-vagas-sync-secret: <segredo fornecido pelo TI Spin>` |
| Resposta sucesso | HTTP **200** + JSON `{ "success": true, "received": <número de vagas> }` |
| Resposta erro auth | HTTP **401** |
| Resposta erro payload | HTTP **400** + `{ "error": "<mensagem>" }` |

O TI Spin configura no servidor deles a URL que **vocês** passarem (não é um link da plataforma para vocês chamarem).

---

## Corpo do JSON (enviado pela Spin)

### Estrutura

```json
{
  "synced_at": "2026-07-10T09:00:00.000Z",
  "vagas": [
    {
      "codigo_vaga": "VAG-000042",
      "titulo": "Apresentador de Jogos",
      "descricao": "Texto completo da descrição…",
      "responsabilidades": "Texto completo das responsabilidades…",
      "repasse_inicial_centavos": 150000,
      "repasse_inicial_formatado": "R$ 1.500,00",
      "tags": ["noturno", "estúdio"],
      "necessario_video_apresentacao": true,
      "necessario_turno": true,
      "data_fim_inscricoes": "2026-08-15"
    }
  ]
}
```

### Campos de cada item em `vagas`

| Campo | Tipo | Obrigatório | Uso no site |
|-------|------|-------------|-------------|
| `codigo_vaga` | string | sim | **Chave única** — ex.: `VAG-000042`. Usar para criar/atualizar/remover |
| `titulo` | string | sim | Título do card / página da vaga |
| `descricao` | string | sim | Corpo ou modal de detalhes |
| `responsabilidades` | string | sim | Seção “Responsabilidades” |
| `repasse_inicial_centavos` | number | sim | Valor em centavos (150000 = R$ 1.500,00) |
| `repasse_inicial_formatado` | string | sim | Texto pronto para exibir (**exibir este valor** na UI) |
| `tags` | string[] | sim | Pode ser vazio `[]` — chips/filtros opcionais |
| `necessario_video_apresentacao` | boolean | sim | Reservado para o formulário de candidatura (etapa 2); podem guardar no post |
| `necessario_turno` | boolean | sim | Idem |
| `data_fim_inscricoes` | string (ISO date) | sim | Ex.: `2026-08-15` — opcional exibir “Inscrições até DD/MM/AAAA” |

**Nomes das propriedades:** manter **exatamente** como na tabela (snake_case).

### Regra de substituição

- Para cada `codigo_vaga` no array → **criar ou atualizar** o registro no WordPress.
- Qualquer vaga publicada anteriormente pelo sync cujo `codigo_vaga` **não** estiver no array → **remover da listagem pública** (ou marcar como rascunho/inativa).

Assim, vagas encerradas na plataforma **somem** no próximo sync da manhã.

---

## O que entra na listagem (regra de negócio — lado Spin)

A Spin envia **somente**:

- vagas com tipo **Externa**;
- status **Aberta** (inscrições ainda abertas).

Vagas internas, encerradas, em andamento, canceladas ou concluídas **não** são enviadas.

---

## Sugestão de layout na página Carreiras

Referência atual: seção **“Vagas Abertas”** em `/carreiras/`.

Por card (sugestão mínima):

- **Título** (`titulo`)
- **Repasse inicial** (`repasse_inicial_formatado`)
- **Tags** (`tags`), se houver
- **Inscrições até** (`data_fim_inscricoes`), se quiserem exibir
- Botão **“Candidatar-se”** — na etapa 1 pode ser placeholder ou âncora; na etapa 2 abrirá o formulário

Detalhes longos (`descricao`, `responsabilidades`): expandir no card, modal ou página filha — decisão de UX da agência.

---

## Frequência e atraso

| Item | Valor acordado |
|------|----------------|
| Sync automático | **1× por dia**, ~**06:00 horário de Brasília** |
| Conteúdo | Snapshot completo (lista inteira) |
| Atraso máximo | Até ~24 h para vaga nova aparecer (até o próximo sync), salvo sync manual futuro |

---

## Checklist antes de ir para produção

- [ ] Endpoint POST criado e acessível pela internet
- [ ] Segredo validado no header (recusar sem segredo ou segredo errado)
- [ ] Sync testado com JSON de exemplo (abaixo)
- [ ] `/carreiras/` lê só vagas vindas do sync (não conteúdo fixo antigo)
- [ ] Lista vazia tratada com mensagem amigável
- [ ] URL do endpoint + confirmação de firewall/CDN repassadas ao **TI Spin**

---

## JSON de exemplo para teste local

```json
{
  "synced_at": "2026-07-10T09:00:00.000Z",
  "vagas": [
    {
      "codigo_vaga": "VAG-000001",
      "titulo": "Apresentador de Jogos",
      "descricao": "Atuação ao vivo em mesas de live cassino, interação com jogadores e condução do jogo conforme roteiro.",
      "responsabilidades": "Apresentar jogos ao vivo; seguir roteiro e compliance; participar de treinamentos da Spin Academy.",
      "repasse_inicial_centavos": 177500,
      "repasse_inicial_formatado": "R$ 1.775,00",
      "tags": ["estúdio", "presencial"],
      "necessario_video_apresentacao": true,
      "necessario_turno": true,
      "data_fim_inscricoes": "2026-09-30"
    },
    {
      "codigo_vaga": "VAG-000002",
      "titulo": "Embaralhador de Cartas",
      "descricao": "Operação técnica de embaralhamento em mesas de blackjack ao vivo.",
      "responsabilidades": "Executar procedimentos de embaralhamento; apoiar o fluxo da mesa; seguir normas de estúdio.",
      "repasse_inicial_centavos": 137500,
      "repasse_inicial_formatado": "R$ 1.375,00",
      "tags": ["operação"],
      "necessario_video_apresentacao": false,
      "necessario_turno": true,
      "data_fim_inscricoes": "2026-08-31"
    }
  ]
}
```

Teste sugerido (substituir URL e segredo):

```bash
curl -X POST "https://spingaming.com.br/wp-json/spin/v1/vagas/sync" \
  -H "Content-Type: application/json" \
  -H "x-spin-vagas-sync-secret: SEGREDO_DE_TESTE" \
  -d @payload-vagas-exemplo.json
```

---

## O que o TI Spin entrega para vocês

| Item | Quem |
|------|------|
| Valor do header `x-spin-vagas-sync-secret` (produção e homologação) | TI Spin |
| Confirmação de horário do cron (~06:00 BRT) | TI Spin |
| Aviso antes do primeiro sync em produção | TI Spin |
| Payload real assim que a Edge Function estiver publicada | TI Spin |

---

## Fora de escopo (etapa 2 — candidaturas)

- Formulário “Candidatar-se” enviando dados para a plataforma
- Upload de currículo, vídeo ou portfólio
- Integração com e-mail ou notificações

Será documentado separadamente quando a listagem estiver estável.

---

## Contato / dúvidas técnicas

Encaminhar ao **TI Spin** (time da plataforma Data Intelligence):

- URL final do endpoint WordPress
- Dúvidas sobre campos ou formato JSON
- Pedido de ambiente de **homologação** (endpoint de teste + segredo de teste)
