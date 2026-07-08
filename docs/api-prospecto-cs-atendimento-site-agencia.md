# API pública — Formulário de contato (Atendimento / Site Spin)

Documento para **agência / site institucional**. Layout, CMS e estilo são livres; o obrigatório é enviar um **POST JSON** para o endpoint fornecido pelo TI.

---

## Endpoint

O TI da Spin informa a URL do **proxy** (Cloudflare Pages do dashboard), por exemplo:

```text
https://<domínio-da-plataforma>/api/prospecto-cs-atendimento-site
```

Exemplo em produção (confirmar com o TI antes de publicar):

```text
https://influencer-dashboard-c5r.pages.dev/api/prospecto-cs-atendimento-site
```

- **Método:** `POST`
- **Corpo:** JSON (`Content-Type: application/json`)
- **Autenticação no browser:** nenhum header secreto — o proxy na Cloudflare injeta o segredo internamente.
- **CORS:** habilitado para chamadas a partir do site de vocês.

Se a agência implementar envio **somente pelo servidor** do site (PHP, Node, etc.) e o TI autorizar chamada **direta** à Edge Function do Supabase, aí entra header `x-cs-atendimento-secret` ou campo `secret` no JSON — isso é acordado só com o TI; o fluxo padrão é **POST no endpoint acima**.

---

## Corpo da requisição (nomes fixos)

| Campo | Tipo | Obrigatório | Regras |
|--------|------|-------------|--------|
| `nome_completo` | string | sim | nome do solicitante (máx. 200 caracteres). Aceita alias `nome` |
| `telefone` | string | não | telefone / WhatsApp (máx. 40 caracteres) |
| `email` | string | sim | formato e-mail válido (máx. 200 caracteres) |
| `atuacao` | string | sim | uma das opções abaixo |
| `empresa` | string | condicional | obrigatório para `operador`, `provedor`, `parceria` e `agregador`; omitir ou enviar vazio para `jogador` e `outros` |
| `mensagem` | string | sim | texto da solicitação (máx. 4000 caracteres) |

### Valores permitidos em `atuacao`

Enviar **exatamente** um destes (minúsculas):

| Valor no JSON | Significado no site (exemplo de rótulo) | Empresa |
|---------------|----------------------------------------|---------|
| `operador` | Operador / casa de apostas | obrigatória |
| `provedor` | Provedor de sinal ou tecnologia | obrigatória |
| `parceria` | Parceria comercial | obrigatória |
| `agregador` | Agregador | obrigatória |
| `jogador` | Jogador | não enviar |
| `outros` | Outros | não enviar |

Aliases aceitos pelo servidor (preferir os valores da tabela): `operadora` → `operador`; `provider` → `provedor`; `parceiro` / `parcerias` → `parceria`; `aggregator` → `agregador`; `player` → `jogador`; `outro` / `other` → `outros`.

### Exemplo de JSON (com empresa)

```json
{
  "nome_completo": "Maria Souza",
  "telefone": "+55 11 98888-7777",
  "email": "maria@empresa.com",
  "atuacao": "operador",
  "empresa": "Casa de Apostas Exemplo",
  "mensagem": "Gostaria de entender o processo de integração de mesas dedicadas no lobby."
}
```

### Exemplo de JSON (Jogador — sem empresa)

```json
{
  "nome_completo": "João Silva",
  "telefone": "+55 21 99999-8888",
  "email": "joao@email.com",
  "atuacao": "jogador",
  "mensagem": "Tenho dúvida sobre como acessar as mesas ao vivo na operadora."
}
```

Os **nomes das propriedades** devem ser exatamente estes (exceto o alias opcional `nome` no lugar de `nome_completo`). Os rótulos exibidos no site podem ser outros.

---

## Respostas

### Sucesso (HTTP 200)

```json
{
  "success": true,
  "id": "<uuid do chamado criado>"
}
```

O protocolo legível (`SITE-2026/0042`, etc.) é gerado no servidor e aparece na plataforma Spin — **não** é retornado nesta API.

### Erro (HTTP 4xx / 5xx)

```json
{
  "error": "<mensagem em português>"
}
```

Exemplos: `Nome completo é obrigatório.`, `E-mail inválido.`, `Atuação inválida.`, `Empresa é obrigatória para esta atuação.`, `Mensagem é obrigatória.`, `Não foi possível registrar o chamado.`

---

## Comportamento na plataforma Spin

Após sucesso, o registro aparece em **Customer Success → Atendimento** (aba **Site Spin**) com:

- **Status:** Aberto
- **Protocolo:** `SITE-[ANO]/[NNNN]` (4 dígitos sequenciais por ano)
- **Origem:** Site Spin

A equipe de Customer Service atende na plataforma (status, anotações e arquivamento).

---

## TI Spin (checklist)

1. Aplicar migration **`20260707160000_cs_atendimento.sql`** no Supabase.
2. Deploy da Edge Function **`prospecto-cs-atendimento-site`** no Supabase.
3. Secret **`CS_ATENDIMENTO_FORM_SECRET`** no Supabase (Edge Functions → Secrets).
4. Mesma variável **`CS_ATENDIMENTO_FORM_SECRET`** no Cloudflare Pages (Functions / Environment variables).
5. Valor: string longa aleatória (gerada por vocês); **igual** nos dois ambientes.
6. Liberar permissão **Ver** / **Editar** em Gestão de Usuários → **Atendimento** para os perfis da equipe CS.

*(Esta API é independente dos formulários Scout e Afiliados Network; secrets e URLs são diferentes.)*

**Outros formulários públicos:**

- Prospecto influencer (Scout): `api-prospecto-scout-site-agencia.md` — `/api/prospecto-scout-site`
- Afiliados Network: `api-prospecto-afiliados-network-site-agencia.md` — `/api/prospecto-afiliados-network-site`

**Versão curta para repasse à agência:** `Integração Forms - Atendimento Site Spin.txt`
