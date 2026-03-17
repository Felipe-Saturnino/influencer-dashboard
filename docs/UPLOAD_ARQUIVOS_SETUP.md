# Configuração da página Upload de Arquivos

A página **Upload de Arquivos** (Plataforma) permite fazer upload de imagens do relatório PLS Daily Commercial Report. Cada imagem é enviada para uma Edge Function do Supabase que processa com Claude Vision e salva os dados extraídos no banco.

## O que já está configurado

- ✅ Página criada em `src/pages/plataforma/UploadArquivos/`
- ✅ Menu e rotas configurados
- ✅ Permissões integradas (Gestão de Usuários > Permissões)
- ✅ PageKey: `upload_arquivos`
- ✅ Edge Function `processar-email-relatorio` em `supabase/functions/processar-email-relatorio/`
- ✅ Logs exibidos na seção "Processamento de Relatórios" do Status Técnico

## O que você precisa configurar

### 1. Permissões (role_permissions)

Acesse **Gestão de Usuários** > aba **Permissões** e configure quais roles podem ver/usar o Upload de Arquivos:
- Defina `can_view: sim` (e opcionalmente `can_criar: sim`) para os roles desejados (ex: admin, gestor, executivo, operador).
- Salve as alterações.

### 2. Edge Function: processar-email-relatorio

A página chama a URL:
```
{SUPABASE_URL}/functions/v1/processar-email-relatorio
```

**Essa Edge Function ainda não existe no projeto.** Você precisa criá-la.

#### Contrato esperado da função

**Request (POST):**
```json
{
  "subject": "nome-do-arquivo.png",
  "from": "upload_manual",
  "image_base64": "string_base64_da_imagem"
}
```

**Response (sucesso):**
```json
{
  "success": true,
  "inserted": {
    "daily": 5,
    "monthly": 2,
    "por_tabela": 12
  },
  "data_relatorio": "2025-03-17"
}
```

**Response (erro):**
```json
{
  "success": false,
  "error": "Mensagem de erro"
}
```

#### Exemplo de implementação (Deno/TypeScript)

A função deve:
1. Validar o token JWT no header `Authorization: Bearer <token>`
2. Decodificar a imagem base64
3. Enviar para Claude Vision (ou outro modelo) para extrair os dados do relatório
4. Fazer upsert nas tabelas `relatorio_daily_summary`, `relatorio_monthly_summary` e `relatorio_por_tabela`
5. Retornar o objeto `inserted` e `data_relatorio`

Crie a pasta:
```
supabase/functions/processar-email-relatorio/index.ts
```

### 3. Tabelas no banco de dados

A Edge Function espera salvar em três tabelas. A estrutura exata depende do formato do relatório PLS. Exemplo genérico:

- **relatorio_daily_summary** – resumo diário
- **relatorio_monthly_summary** – resumo mensal  
- **relatorio_por_tabela** – dados por tabela/jogo

Você precisará criar migrations no Supabase para essas tabelas conforme o schema definido para o relatório PLS.

### 4. Variáveis de ambiente (Edge Function)

Para processar com Claude Vision, a função precisará de:
- `ANTHROPIC_API_KEY` (ou similar) – chave da API Anthropic

Configure no Supabase: **Project Settings** > **Edge Functions** > **Secrets**.

---

## Fluxo resumido

1. Usuário arrasta/seleciona imagens na página.
2. Cada imagem é convertida para base64 e enviada via POST para `processar-email-relatorio`.
3. A Edge Function extrai os dados e grava nas tabelas.
4. A página exibe o resultado (quantidade de registros inseridos por tabela).

Se a Edge Function ou as tabelas não existirem, a página mostrará erro ao processar os arquivos.
