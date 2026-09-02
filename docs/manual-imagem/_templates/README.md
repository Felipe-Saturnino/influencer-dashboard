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

## Manual (pausado)

Nesta fase **não** iterar HTML nem imagens. Os HTML atuais (`manual-academy-template.html` e manuais por tema) ficam como rascunho.

**Próximo passo, depois das Políticas:** um template **editável** com slots PODE / NÃO PODE para inserir fotos manualmente — não gerar decks com stock.
