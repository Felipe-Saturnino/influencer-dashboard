# Migrações Supabase (`supabase/migrations/`)

- **Não apagar nem fundir** ficheiros que **já foram aplicados** em produção — ver `docs/MIGRACOES-E-DOCS.md`.
- **Novas alterações:** um ficheiro por mudança lógica, nome preferencialmente `YYYYMMDDHHMMSS_descricao_curta.sql`.
- Ficheiros **sem** prefixo de data (`add_*.sql`, `create_*.sql`) são legado: na ordenação alfabética aplicam-se **depois** dos prefixos `20...`; evitar novos ficheiros nesse formato.
