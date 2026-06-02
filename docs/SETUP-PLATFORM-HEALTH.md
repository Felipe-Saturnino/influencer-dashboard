# Diagnóstico operacional — Status Técnico

Leitura de integrações, jobs recentes e presença de secrets — **sem** disparar sync nem e-mails. Resultado gravado em `tech_logs` e visível em **Logs Recentes** na mesma página.

## Deploy

```bash
supabase functions deploy platform-health-check
```

Deploy com **um único ficheiro** `supabase/functions/platform-health-check/index.ts` (o painel do Supabase não envia imports locais). Se alterar regras de diagnóstico, atualize também `src/lib/platformHealthDiagnostics.ts`.

```bash
# Na raiz do repositório (recomendado)
supabase functions deploy platform-health-check
```

A função usa **service role** no servidor para inserir em `tech_logs` (o cliente do browser não precisa de policy de insert).

## Autorização

- **UI:** permissão **Editar** em Status Técnico (`perm.canEditarOk`).
- **Edge:** perfil `admin` ou `role_permissions.can_editar` = `sim` / `proprios` para `status_tecnico`.

## Lógica partilhada

| Caminho | Uso |
|---------|-----|
| `supabase/functions/platform-health-check/index.ts` | Edge Function (lógica de diagnóstico **inline** + handler HTTP) |
| `src/lib/platformHealthDiagnostics.ts` | Fonte para app React e Vitest — manter alinhada com o bloco inline do `index.ts` |
| `tests/unit/lib/platformHealthDiagnostics.test.ts` | Testes unitários |

## Tipos em Logs Recentes

| `tipo` | Significado |
|--------|-------------|
| `diagnostico_plataforma` | Resumo da execução |
| `diagnostico_ok` | Check sem problema |
| `diagnostico_aviso` | Atenção (ex.: sync atrasado) |
| `diagnostico_erro` | Falha (ex.: secret ausente) |

## Relação com Vitest

A suíte `npm test` valida helpers e smoke de rotas no CI — **não** substitui este diagnóstico no ambiente de produção/staging.
