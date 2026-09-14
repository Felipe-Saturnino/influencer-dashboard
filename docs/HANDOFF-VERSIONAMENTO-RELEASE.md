# Handoff — incluir release no Versionamento

**Uso:** cole este documento (ou anexe `@docs/HANDOFF-VERSIONAMENTO-RELEASE.md`) num **chat novo** do Cursor, preencha a secção **Release desta semana** no final e peça para aplicar.

**Fluxo canónico:** releases **não** se cadastram na UI. Sempre entram por este chat → o Agent edita o conteúdo no repositório. Não usar o modal «Nova Release» do mockup como fonte de verdade (é só visual).

**Commit:** o Agent **não** faz `git commit` / `git push`. Alterações ficam locais.

---

## 1. O que é a página

**Versionamento** é página utilitária (irmã de Ajuda): menu do **avatar** (canto superior), **abaixo de Ajuda** e acima de Sair.

Mostra as **releases semanais** da plataforma Data Intelligence: o que é novo, o que melhorou e o que foi corrigido, em linguagem de produto.

Mockup de referência (contrato visual): `docs/mockups/versionamento-mockup.html` — **não** gravar release no mockup.

| Estado | Ficheiro alvo |
|--------|----------------|
| **Página em código** | `src/pages/geral/Versionamento/releases.ts` — array `VERSIONAMENTO_RELEASES` |
| **Tipos / helpers** | `src/lib/versionamento.ts` — **não** alterar neste fluxo |
| **Mockup** | só consulta visual; **não** editar |

---

## 2. Contrato de UI (não mudar neste fluxo)

O Agent **não** redesenha a página. Só insere conteúdo.

| Peça | Regra |
|------|--------|
| **Destaque** | Só a release mais nova. Tag verde **Recente** + `Release #N` + data `DD/MM/AAAA`. **Título da release** no `h2` abaixo. Resumo (lead) + lista de cards. |
| **Histórico** | Releases anteriores em acordeão, **recolhido por padrão** (`aria-expanded="false"`, sem classe `open`). Título do bloco: `Release #N - [TÍTULO DA RELEASE] - DD/MM/AAAA`. |
| **Número** | Sequencial crescente. A **primeira** publicada é `#1`. Cada nova = último `#` + 1. Ler o `#` do bloco Recente atual antes de inserir. |
| **Data** | Sempre `DD/MM/AAAA` (dia da publicação da release, em geral a sexta da semana). |
| **Cards** | Tipo **Novo** (roxo) · **Melhoria** (azul) · **Correção** (verde). Título curto + 1–2 frases. Chip com o **label do menu** da página. Link «Acesse a página AQUI» só quando houver página clara. |
| **Permissão** | Cada card tem `paginas: "*" \| PageKey[]`. Quem **não** tem permissão de Ver ou Próprios nessa página **não vê o card**. Se todos os cards de uma release ficarem ocultos, a release some para aquele perfil. |
| **Transversal** | Feature de toda a plataforma: `paginas: "*"`. Visível para quem acessa Versionamento. Várias páginas: `paginas: ["agenda", "resultados"]` (vê o card se tiver Ver em **pelo menos uma**). |
| **Busca** | Palavras-chave em título da release, resumo, data (`13/09/2026` e `13092026`), `Release #N`, tipo, seção, título e texto dos cards. Várias palavras = **E** (todas). Ignorar acentos. Campo opcional `palavrasChave` no release e no item. |
| **Histórico após inserir** | Continua recolhido (estado inicial da página). Não forçar acordeões abertos. |

---

## 3. O que o Agent faz (passo a passo)

1. Abrir `src/pages/geral/Versionamento/releases.ts`.
2. Ler o maior `numero` em `VERSIONAMENTO_RELEASES`. Array vazio → a nova é **`1`**. Caso contrário → **`max + 1`**.
3. **Inserir** um objeto `VersionamentoRelease` no **início** do array (mais nova primeiro; a página ordena por `numero` de qualquer forma).
4. Preencher:
   - `numero`, `data` (`DD/MM/AAAA`), `titulo`, `resumo`
   - `itens[]` com `tipo` (`novo` \| `melhoria` \| `correcao`), `paginas` (`"*"` ou `PageKey[]`), `titulo`, `descricao`
   - `linkPagina: true` só quando o humano pediu link «Acesse a página AQUI» e houver página clara (`paginas` não é `"*"`)
   - `palavrasChave` opcional no release e no item (sinónimos que o usuário digitaria)
5. **Não** editar `index.tsx`, `src/lib/versionamento.ts` nem o mockup.
6. Copy em **PT-BR** (secção 4). Nomes de página = **label do menu** (`menu.ts`), nunca título legado.
7. Não commit/push. Informar o `#` gravado, a data e quantos cards.

**Não fazer:** apagar histórico; renumerar releases antigas; inventar cards que o humano não listou; citar tabela, RPC, Edge Function, SQL, deploy ou `PageKey` no texto visível ao usuário.

### Forma do catálogo

```ts
{
  numero: 1,
  data: "13/09/2026",
  titulo: "Título da semana",
  resumo: "Uma ou duas frases.",
  palavrasChave: "opcional",
  itens: [
    {
      tipo: "novo", // "melhoria" | "correcao"
      paginas: ["agenda"], // ou "*"
      titulo: "O que mudou",
      descricao: "Efeito para quem usa.",
      linkPagina: true,
      palavrasChave: "opcional",
    },
  ],
}
```

---

## 4. Copy (visível ao usuário)

Seguir Global § Linguagem e copy (PT-BR):

- **usuário**, **seção**, **registrar**, **salvar**, **Carregando…**, **entre em contato com o suporte**
- Permissão: **permissão de Ver / Criar / Editar / Excluir** — nunca `can_view`
- Cassino ao vivo / **Live Cassino**
- Sem infraestrutura no texto do card
- Título da release: uma linha, o tema da semana (não lista de tickets)
- Título do card: o que mudou, em produto. Descrição: efeito para quem usa, não o “como foi feito”
- Tipo **Novo** = capacidade que não existia. **Melhoria** = já existia e ficou melhor. **Correção** = comportamento errado que passou a estar certo

---

## 5. Página da feature (`paginas` / chip)

O chip mostra o **label**. O campo `paginas` é `"*"` ou a **PageKey**. Home (fora do menu lateral) = `home` / chip **Home**. Feature transversal = `"*"`. A própria página Versionamento = `versionamento`.

| Secção | Label (chip) | PageKey |
|--------|----------------|---------|
| Geral | Home | `home` |
| Geral | Configurações | `configuracoes` |
| Geral | Simulador de Login | `simulador_login` |
| Geral | Ajuda | `ajuda` |
| Geral | Versionamento | `versionamento` |
| Dashboards | Overview Spin | `mesas_spin` |
| Dashboards | Streamers | `streamers` |
| Dashboards | Overview Afiliados | `dash_afiliados` |
| Dashboards | Mídias Sociais | `dash_midias_sociais` |
| Dashboards | Overview Influencer | `dash_overview_influencer` |
| Dashboards | Overview Afiliado | `dash_overview_afiliado` |
| Dashboards | Overview Comercial | `comercial_overview` |
| Dashboards | Headcount | `dash_headcount` |
| Dashboards | Overview Prestador | `dash_overview_prestador` |
| Lives | Agenda | `agenda` |
| Lives | Resultados | `resultados` |
| Lives | Feedback | `feedback` |
| Lives | Influencers | `influencers` |
| Lives | Scout | `scout` |
| Afiliados | Afiliados | `afiliados` |
| Afiliados | Network | `afiliados_network` |
| Aquisição | Financeiro | `financeiro` |
| Aquisição | Banca de Jogo | `banca_jogo` |
| Marketing | Campanhas | `campanhas` |
| Marketing | Gestão de Links | `gestao_links` |
| Marketing | Galeria de Fotos | `galeria_fotos` |
| Comercial | Integração | `comercial_integracao` |
| Comercial | Pipeline B2B | `comercial_pipeline_b2b` |
| Comercial | Pipeline Agregadoras | `comercial_pipeline_agregadoras` |
| Customer Success | Atendimento | `cs_atendimento` |
| Estúdio | Gestão de Dealers | `gestao_dealers` |
| Estúdio | Central de Notificações | `central_notificacoes` |
| Estúdio | Figurinos | `rh_figurinos` |
| Estúdio | Roteiro de Mesa | `roteiro_mesa` |
| Estúdio | Incidentes | `incidentes` |
| Estúdio | Controle de Turno | `escala_controle_turno` |
| Academy | Performance Hub | `academy_performance_hub` |
| Academy | Portal da Academy | `academy_portal` |
| Escala | Gestão de Staff | `rh_staff` |
| Escala | Solicitações de Cliente | `escala_solicitacoes` |
| Escala | Escala Estúdio | `rh_gestao_escala` |
| Escala | Calendário | `rh_calendario` |
| Escala | Marketplace | `escala_marketplace_turnos` |
| RH | Gestão de Prestadores | `rh_funcionarios` |
| RH | Dados de Cadastro | `rh_dados_cadastro` |
| RH | Organograma | `rh_organograma` |
| RH | Escala Escritório | `escala_escritorio` |
| RH | Vagas | `rh_vagas` |
| RH | Solicitações de RH | `rh_solicitacoes` |
| RH | Central de Denúncias | `rh_central_denuncias` |
| Conteúdo | Playbook Influencers | `playbook_influencers` |
| Conteúdo | Links e Materiais | `links_materiais` |
| Conteúdo | Spin na Rede | `spin_na_rede` |
| Conteúdo | Portal de RH | `rh_portal` |
| Conteúdo | Informativos | `informativos` |
| Tech Ops | Gestão de Estoque | `tech_ops_estoque` |
| Tech Ops | Ordem de Saída | `tech_ops_ordem_saida` |
| Tech Ops | Itens Alocados | `tech_ops_itens_alocados` |
| Plataforma | Gestão de Usuários | `gestao_usuarios` |
| Plataforma | Gestão de Operadoras | `gestao_operadoras` |
| Plataforma | Gestão de Estúdios | `gestao_mesas` |
| Plataforma | Status Técnico | `status_tecnico` |

A seção do chip vem do menu (`secaoPaginaVersionamento`); transversal = **Geral**.

---

## 6. `palavrasChave` (busca)

A página monta o haystack sozinha (número, data com e sem barras, título, resumo, tipo, label). Use `palavrasChave` só para **sinónimos** que o usuário digitaria e que não estão no texto (`e-mail`, `ciencia`, `atalhos`).

---

## 7. Referência visual

Contrato visual no mockup `docs/mockups/versionamento-mockup.html`. O Agent **não** replica HTML — só preenche `VERSIONAMENTO_RELEASES`.

---

## 8. Catálogo atual

`VERSIONAMENTO_RELEASES` começa **vazio**. A primeira release verdadeira é **`#1`**. Não copiar os exemplos `#1`–`#4` do mockup.

---

## 9. Release desta semana (preencher no chat)

Copie o bloco abaixo, preencha e envie **junto** com este handoff.

```
Incluir release no Versionamento. Seguir docs/HANDOFF-VERSIONAMENTO-RELEASE.md. Não fazer commit.

Data (DD/MM/AAAA):
Título da release:
Resumo (1–2 frases):

Itens (um por linha):
Tipo | Página (label do menu, ou * se transversal) | Título do card — descrição
[opcional] Link para a página: sim / não

1.
2.
3.
```

### Exemplo (não copiar à letra na release real)

```
Data: 20/09/2026
Título da release: Tutoriais na Ajuda e ciência no Portal de RH
Resumo: A semana libera tutoriais por perfil na Ajuda e o registro de quem leu as políticas no Portal de RH.

Itens:
Novo | Ajuda | Aba Tutoriais na Ajuda, por perfil — Passos ilustrados para fluxos da operação. O administrador define quais perfis veem cada tutorial. Link: sim
Novo | Portal de RH | Registro de ciência nas políticas — Quem tem permissão de Editar consulta quem leu cada documento. Link: sim
Melhoria | Incidentes | Scripts de incidente com descrição mais clara — Os textos de apoio descrevem o procedimento em linguagem de operação. Link: sim
Correção | Calendário | Presença deixa de duplicar justificativa no mesmo dia — Uma justificativa já registrada não gera um segundo lançamento ao salvar de novo. Link: sim
```

---

## 10. Checklist do Agent (antes de devolver)

- [ ] Maior `numero` lido; nova release = `max + 1` (ou `1` se o array estiver vazio)
- [ ] Objeto inserido no início de `VERSIONAMENTO_RELEASES`
- [ ] Cada item: `tipo` certo, `paginas` da tabela (`"*"` ou `PageKey[]`), `linkPagina` só se pedido
- [ ] Texto visível em PT-BR, sem infraestrutura
- [ ] Sem commit/push
- [ ] Resposta ao humano: `#` gravado, data, lista curta dos cards
