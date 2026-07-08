# API pública — Cadastro de afiliado (Network)

Documento para **agência / site institucional**. Layout e CMS são livres; o obrigatório é enviar um **POST JSON** para o endpoint fornecido pelo TI.

---

## Endpoint

O TI da Spin informa a URL do **proxy** (Cloudflare Pages do dashboard), por exemplo:

```text
https://<domínio-da-plataforma>/api/prospecto-afiliados-network-site
```

- **Método:** `POST`
- **Corpo:** JSON (`Content-Type: application/json`)
- **Autenticação no browser:** nenhum header secreto — o proxy na Cloudflare injeta o segredo internamente.

---

## Corpo da requisição (nomes fixos)

| Campo | Tipo | Obrigatório | Regras |
|--------|------|-------------|--------|
| `nome` | string | sim | nome do candidato |
| `telefone` | string | sim | telefone / WhatsApp |
| `email` | string | sim | formato e-mail válido |
| `live_cassino` | string | sim | exatamente `"sim"` ou `"nao"` |
| `operacao` | string | sim | texto livre (ex.: tipo de operação, casa, modelo de parceria que o candidato descreve) |

### Exemplo de JSON

```json
{
  "nome": "João Silva",
  "telefone": "+55 11 98888-7777",
  "email": "joao@email.com",
  "live_cassino": "nao",
  "operacao": "CPA em cassino ao vivo; experiência com tráfego pago."
}
```

Os **nomes das propriedades** devem ser exatamente estes. Os rótulos exibidos no site podem ser outros.

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
  "error": "<mensagem em português>"
}
```

---

## Comportamento na plataforma Spin

Após sucesso, o registro aparece em **Afiliados → Network** com:

- **Status:** Visualizado  
- **Tipo de contato:** Site Spin  
- **Operadora:** vazio (NULL) para o time preencher depois  

---

## TI Spin (checklist)

1. Deploy da Edge Function **`prospecto-afiliados-network-site`** no Supabase.  
2. Secret **`PROSPECTO_AFILIADOS_NETWORK_FORM_SECRET`** no Supabase (Edge Functions → Secrets).  
3. Mesma variável **`PROSPECTO_AFILIADOS_NETWORK_FORM_SECRET`** no Cloudflare Pages (Functions).  
4. Valor: string longa aleatória (gerada por vocês); **igual** nos dois ambientes.  

*(Esta API é independente do formulário de prospecto Scout; secrets e URLs são diferentes.)*

**Prospecto influencer (Scout):** ver `api-prospecto-scout-site-agencia.md`.

**Formulário de contato (Atendimento):** ver `api-prospecto-cs-atendimento-site-agencia.md`.
