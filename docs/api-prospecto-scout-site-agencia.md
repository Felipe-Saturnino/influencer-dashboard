# API pública — Cadastro de prospecto (Scout)

Documento para **agência / site institucional**. Layout, CMS e estilo são livres; o obrigatório é enviar um **POST JSON** para o endpoint fornecido pelo TI.

---

## Endpoint

O TI da Spin informa a URL base do **proxy** (Cloudflare Pages do dashboard), por exemplo:

```text
https://<domínio-da-plataforma>/api/prospecto-scout-site
```

- **Método:** `POST`
- **Corpo:** JSON (`Content-Type: application/json`)
- **Autenticação:** nenhum header especial no browser — o proxy no servidor da Spin acrescenta o segredo internamente.
- **CORS:** habilitado para chamadas a partir do site de vocês.

Se a agência implementar envio **somente pelo servidor** do site (PHP, Node, etc.) e o TI autorizar chamada **direta** à Edge Function do Supabase, aí entra header `x-prospecto-scout-secret` ou campo `secret` no JSON — isso é acordado só com o TI; o fluxo padrão é **POST no endpoint acima**.

---

## Corpo da requisição (campos fixos)

| Campo | Tipo | Obrigatório | Regras |
|--------|------|-------------|--------|
| `nome_artistico` | string | sim | máx. ~300 caracteres |
| `telefone` | string | sim | máx. ~80 caracteres |
| `email` | string | sim | formato e-mail válido |
| `live_cassino` | string | sim | exatamente `"sim"` ou `"nao"` |
| `canais` | array | sim | 1 a 12 itens; cada item com `plataforma`, `link`, `metrica` |

Cada item de `canais`:

| Campo | Tipo | Obrigatório | Regras |
|--------|------|-------------|--------|
| `plataforma` | string | sim | uma das plataformas listadas abaixo (maiúsc/minúsc ignorados) |
| `link` | string | sim | URL do perfil/canal |
| `metrica` | number | sim | inteiro ≥ 0 (seguidores ou média de views, conforme o canal) |

### Plataformas permitidas em `plataforma`

`Twitch`, `YouTube`, `Kick`, `Instagram`, `TikTok`, `Discord`, `WhatsApp`, `Telegram`

### Exemplo de JSON

```json
{
  "nome_artistico": "Nome do Creator",
  "telefone": "+55 11 99999-9999",
  "email": "creator@email.com",
  "live_cassino": "sim",
  "canais": [
    {
      "plataforma": "Twitch",
      "link": "https://www.twitch.tv/exemplo",
      "metrica": 1200
    },
    {
      "plataforma": "Instagram",
      "link": "https://www.instagram.com/exemplo",
      "metrica": 50000
    }
  ]
}
```

**Importante:** os **nomes das propriedades** (`nome_artistico`, `telefone`, etc.) devem ser exatamente estes. Textos exibidos no site para o usuário podem ser quaisquer.

---

## Respostas

### Sucesso (HTTP 200)

```json
{
  "success": true,
  "id": "<uuid do registro criado>"
}
```

### Erro (HTTP 4xx / 5xx)

```json
{
  "error": "<mensagem em português descrevendo o problema>"
}
```

Exemplos de mensagens: validação de e-mail, canal sem link, `live_cassino` inválido, plataforma desconhecida, etc.

---

## Comportamento no sistema Spin (referência)

Após sucesso, o cadastro aparece na plataforma em **Lives → Scout** com:

- status **Visualizado**
- tipo de contato **Site Spin**
- operadora e cachê negociado vazios para o time comercial preencher depois

---

## Pré-requisito de infra (TI Spin — não é da agência)

Migration no banco, deploy da Edge Function `prospecto-scout-site`, secrets no Supabase e no Cloudflare alinhados. A agência só precisa do **URL final** do `POST`.
