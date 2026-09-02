# Templates de entrega — Imagem

## Política Interna (PDF)

**Layout canônico:** *Política de Descumprimentos Contratuais – Manual Gestão* (não o PDF de atividades/Academy).

| Elemento | Spec |
|----------|------|
| Gerador | `scripts/generate-politica-imagem-pdf.mjs` |
| Header | Faixa `#1E36F8` + logo Spin preta + `POLÍTICA INTERNA` em azul |
| Corpo | Título + subtítulo itálico + tabela Área/Aprovado + seções `N. TÍTULO` |
| Rodapé | `Spin Gaming • Documento Interno • Política Interna • Confidencial` + Página X de Y |

```bash
node scripts/generate-politica-imagem-pdf.mjs acessorios
```

Saída: `Downloads/` e `docs/manual-imagem/01-acessorios-e-joias/`.

Fonte editável: `politica-v1.md` (decisões abertas só no MD).

## Manual Academy (HTML → PDF)

**Template:** `manual-academy-template.html`

Estrutura de slides por tema (inspirada nos decks de piercing + Brand MDC):

1. **Capa** — fundo escuro, barra lateral clara, título uppercase, audiência
2. **Regras principais** — 2 cards (vermelho / roxo marca)
3. **Referência visual** — pares Permitido × Não permitido com foto
4. **Pode × Não pode** — duas colunas semântica
5. **Checklist** — fundo escuro, 01 / 02 / 03

Cores: Brand Spin + semântica Global (verde = pode, vermelho = não pode). **Não** usar identidade por jogo nestes manuais.

Para gerar PDF do Manual: abrir o HTML no Chrome → Imprimir → Salvar como PDF.
