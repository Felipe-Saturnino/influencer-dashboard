# API pública — Candidatura a vaga (Carreiras / Site Spin)

Documento para **agência / site institucional** (`https://spingaming.com.br/carreiras/`).

**Objetivo:** ao clicar em **Candidatar-se** em uma vaga publicada, o site envia a candidatura para a plataforma Spin (Data Intelligence). O RH acompanha em **RH → Vagas → Candidaturas** (filtro Externo).

**Pré-requisito:** a listagem de vagas já vem do sync diário (`api-sync-vagas-carreiras-site-agencia.md`). Cada vaga publicada tem `codigo_vaga`, `necessario_video_apresentacao` e `necessario_turno` — use esses campos para montar o formulário.

Layout, CMS e estilo são livres. O obrigatório é o **POST** no formato abaixo.

---

## Endpoint

O TI da Spin informa a URL do **proxy** (Cloudflare Pages do dashboard), por exemplo:

```text
https://<domínio-da-plataforma>/api/prospecto-vaga-candidatura-site
```

Exemplo (confirmar com o TI antes de publicar):

```text
https://data-intelligence.spingaming.com.br/api/prospecto-vaga-candidatura-site
```

| Item | Valor |
|------|--------|
| Método | `POST` |
| Corpo | `multipart/form-data` (campos de texto + arquivos) |
| Autenticação no browser | **Nenhum** header secreto — o proxy na Cloudflare injeta o segredo internamente |
| CORS | Habilitado para o domínio do site |

Se a agência enviar **somente pelo servidor** do WordPress (PHP) e o TI autorizar chamada **direta** à Edge Function do Supabase, aí entra o header `x-prospecto-vaga-candidatura-secret` — isso é acordado só com o TI. O fluxo padrão é o **POST no proxy** acima (igual Scout / Network / Atendimento).

---

## Campos do formulário (nomes fixos)

Os **nomes das propriedades** devem ser exatamente estes. Os rótulos na UI podem ser outros.

### Sempre presentes

| Campo | Tipo | Obrigatório | Regras |
|-------|------|-------------|--------|
| `codigo_vaga` | string | **sim** | Código da vaga no sync (ex.: `VAG-000042`). A plataforma valida se a vaga existe, é **externa** e está **aberta** |
| `nome_completo` | string | **sim** | máx. 200 caracteres |
| `email` | string | **sim** | e-mail válido; máx. 200 caracteres |
| `telefone` | string | **sim** | máx. 40 caracteres |
| `cidade` | string | **sim** | máx. 120 caracteres |
| `redes_sociais` | string | não | texto livre; máx. 1000 caracteres. Placeholder sugerido no site: “Instagram, LinkedIn, etc.” |
| `origem` | string | **sim** | um dos valores da tabela abaixo |
| `quem_indicou` | string | **condicional** | obrigatório se `origem` = `indicacao`; máx. 200 caracteres; omitir ou vazio nos demais casos |

### Origem — “Como chegou até nós?”

Enviar **exatamente** um destes valores (minúsculas, snake_case):

| Valor no POST | Rótulo sugerido no site |
|---------------|-------------------------|
| `linkedin` | LinkedIn |
| `indicacao` | Indicação |
| `site_vagas` | Site de Vagas |
| `instagram` | Instagram |
| `site_spin` | Site Spin |

Se `origem` = `indicacao` → exibir e exigir **Quem indicou?** (`quem_indicou`).

### Currículo e portfólio (ambos permitidos)

Pelo menos **um** dos itens abaixo deve ser enviado (arquivo **ou** URL de portfólio):

| Campo | Tipo | Obrigatório | Regras |
|-------|------|-------------|--------|
| `curriculo` | arquivo | condicional | PDF, DOC ou DOCX; máx. **15 MB** |
| `portfolio_arquivo` | arquivo | condicional | PDF, DOC, DOCX, PNG ou JPG; máx. **15 MB** |
| `portfolio_url` | string | condicional | URL `https://…`; máx. 500 caracteres |

Regras:

- Pode enviar **só currículo**, **só portfólio (arquivo ou URL)** ou **combinações**.
- Não enviar os três vazios — a API rejeita com erro em português.

### Condicionais conforme a vaga (dados do sync)

Use os flags que chegaram no sync da vaga:

| Flag na vaga | Campo no formulário | Tipo | Quando |
|--------------|---------------------|------|--------|
| `necessario_video_apresentacao` = `true` | `video_apresentacao` | arquivo | **Obrigatório**. Vídeo (ex.: `video/mp4`, `video/webm`, `video/quicktime`); máx. **100 MB** |
| `necessario_video_apresentacao` = `false` | — | — | **Não** exibir o campo; **não** enviar |
| `necessario_turno` = `true` | `turno_trabalho` | string | **Obrigatório**. Um dos valores da tabela abaixo |
| `necessario_turno` = `false` | — | — | **Não** exibir o campo; **não** enviar |

### Turno de trabalho

Enviar **exatamente** um destes (maiúsculas/acentos conforme a tabela):

| Valor no POST | Rótulo no site |
|---------------|----------------|
| `Manhã` | Manhã |
| `Tarde` | Tarde |
| `Noite` | Noite |
| `Comercial` | Comercial |

---

## Exemplo (multipart)

Campos de texto (exemplo) + arquivos anexados no mesmo POST:

```text
codigo_vaga=VAG-000042
nome_completo=Maria Souza
email=maria@email.com
telefone=+55 11 98888-7777
cidade=São Paulo
redes_sociais=Instagram @maria / LinkedIn linkedin.com/in/maria
origem=indicacao
quem_indicou=João Silva
portfolio_url=https://behance.net/maria
turno_trabalho=Manhã
curriculo=<arquivo.pdf>
video_apresentacao=<arquivo.mp4>
```

(JSON puro **não** é o fluxo padrão desta API — use `multipart/form-data` por causa dos arquivos.)

---

## Respostas

### Sucesso (HTTP 200)

```json
{
  "success": true,
  "id": "<uuid da candidatura>"
}
```

Mensagem sugerida no site após sucesso: *“Candidatura enviada com sucesso. Nossa equipe entrará em contato.”*

### Erro (HTTP 4xx / 5xx)

```json
{
  "error": "<mensagem em português>"
}
```

Exemplos (podem variar levemente):

- `Código da vaga é obrigatório.`
- `Vaga não encontrada ou não está aberta para candidaturas.`
- `Nome completo é obrigatório.`
- `E-mail inválido.`
- `Informe currículo ou portfólio (arquivo ou URL).`
- `Vídeo de apresentação é obrigatório para esta vaga.`
- `Turno de trabalho é obrigatório para esta vaga.`
- `Turno de trabalho inválido.`
- `Quem indicou é obrigatório quando a origem é Indicação.`
- `Arquivo muito grande.` / `Tipo de arquivo não permitido.`

Exiba `error` de forma amigável no formulário. **Não** mostre detalhes técnicos de infraestrutura.

---

## Comportamento na plataforma Spin

Após sucesso, a candidatura aparece em **RH → Vagas → aba Candidaturas**:

- etapa inicial: **Inscritos**
- tipo: **Externa**
- identificada pelo `codigo_vaga` / título da vaga

**Não** há e-mail automático para o RH nem para o candidato — o time trabalha direto na plataforma.

**Duplicidade:** a API **não** bloqueia a mesma pessoa se candidatando de novo na mesma vaga (e-mail repetido é permitido).

---

## UX sugerida no site

1. Botão **Candidatar-se** na vaga (lista ou detalhe).
2. Formulário com os campos da tabela (sempre + condicionais pelos flags da vaga).
3. Placeholder em **Redes sociais** orientando o formato.
4. Se `origem` = Indicação → mostrar **Quem indicou?**.
5. Indicador de envio (loading) no botão enquanto o POST está em andamento.
6. Tratar timeout em vídeo grande (até 100 MB) — barra de progresso ou aviso “envio pode demorar”.

---

## Segurança e limites (lado Spin — referência)

| Item | Comportamento |
|------|----------------|
| Segredo | Injeta pelo proxy; **não** colocar no HTML do WordPress |
| Validação | Toda no servidor (plataforma); o front só melhora UX |
| Tamanho | Currículo/portfólio arquivo ≤ 15 MB; vídeo ≤ 100 MB |
| Spam | Rate limit básico no servidor; sem ação da agência |

LGPD / aviso de privacidade: já coberto pelo site; este fluxo não exige campo extra de consentimento.

---

## Checklist agência

- [ ] Formulário em `/carreiras/` ligado a cada vaga pelo `codigo_vaga`
- [ ] Campos condicionais de vídeo e turno conforme flags do sync
- [ ] Origem com valores exatos da tabela; `quem_indicou` só em Indicação
- [ ] Currículo e/ou portfólio (arquivo ou URL) — pelo menos um
- [ ] POST `multipart/form-data` para o **URL do proxy** fornecido pelo TI
- [ ] Sucesso / erro tratados com as respostas JSON acima
- [ ] Segredo **não** exposto no front do WordPress

---

## TI Spin (checklist — não é da agência)

1. Migration `20260713120000_rh_vaga_candidaturas_externas_site.sql` aplicada.
2. Deploy Edge Function **`prospecto-vaga-candidatura-site`**.
3. Proxy Cloudflare **`/api/prospecto-vaga-candidatura-site`** (deploy Pages).
4. Secret **`PROSPECTO_VAGA_CANDIDATURA_FORM_SECRET`** no Supabase e no Cloudflare (mesmo valor).
5. Informar à agência a **URL final** do proxy.

Guia TI: `docs/SETUP-PROSPECTO-VAGA-CANDIDATURA.md`.

---

## Relacionados

| Documento | Assunto |
|-----------|---------|
| `api-sync-vagas-carreiras-site-agencia.md` | Spin → WordPress (listagem diária de vagas) |
| `api-prospecto-scout-site-agencia.md` | Formulário influencer (Scout) |
| `api-prospecto-afiliados-network-site-agencia.md` | Formulário afiliado (Network) |
| `api-prospecto-cs-atendimento-site-agencia.md` | Formulário de contato (Atendimento) |
