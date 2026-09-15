# Campanha Verificação 2.0 — memória de ciclos

Histórico da varredura **completa da plataforma**. O fluxo padrão de `/verificacao` é **um item** — este ficheiro só quando o usuário nomear um ciclo desta campanha.

P1 = paginação de vista 20. P2 = uma linha por período.

| Ciclo | Escopo | P1 paginação 20 | P2 uma linha/período |
|-------|--------|-----------------|----------------------|
| 1 | Login + Home | N/A | N/A |
| 2 | Configurações + Ajuda (+ Homes) | N/A | N/A |
| 3 | Simulador + Gestão de Usuários | Feito (lista 20/página) | N/A |
| 4 | Canal de Denúncias | N/A | N/A |
| 5 | Painel de Notícias | N/A (TV, não tabela 20) | N/A |
| 6 | Torneio CDA | Ignorado | Ignorado |
| 7 | Overview Spin | OK no recheck (`1e22c12e`: Ranking Blaze/Network = 20 itens + «1–20 de 269») | OK no recheck (Overview Blaze: 13 dias únicos; hotfix `e40a4baa`) |
| 8 | Streamers | OK (Ranking/Taxas/Financeiro 20) | N/A (por influencer) |
| 9 | Dash Afiliados | OK (código 4 tabelas; smoke N=1) | N/A (por afiliado) |
| 10 | Mídias Sociais | OK (código 4 tabelas densas; smoke N≤13) | OK (Overview Detalhamento: 13 dias únicos Set/2026) |
| 11 | Overview Influencer + Overview Afiliado | OK (código TabelaComPaginacao; smoke N=14 / N=1) | OK no recheck (`508a36a3`: Influencer Detalhamento 14 dias únicos) |
| 12 | Headcount + Overview Prestador + Overview Comercial | OK no recheck (`ec5ec75f`: Escala «1–20 de 625»; Mesa «1–20 de 93») | OK no recheck (HC Histórico 13 meses únicos; Mesa Detalhe 14 dias) |
| 13 | Agenda | Aguarda commit + recheck | N/A (calendário) |

Alimentar quando um ciclo **desta campanha** revelar gap de processo. P1/P2 permanentes estão no MDC `saude-da-plataforma.mdc`.
