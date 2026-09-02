# Fontes — Tema 02 Figurino / Uniforme

| Arquivo | Data | Uso |
|---------|------|-----|
| `DRESS-COD-SPIN-GAMING-2026-02-10.pdf` | 10/02/2026 | Dress Code Spin — guias de caimento (traje social + vestido tubinho), zelo com peças delicadas, calçado ao vivo, regras de circulação com figurino |
| `dress-code-2026-02-10-pages/` | — | PNGs extraídos do PDF acima (referência visual para o Manual Academy) |

**Extração de páginas (PDF só-imagem):** usada para **guias por estúdio** e referência interna — o **Manual Academy geral** (`manual-figurino-uniforme.html`) usa fotos de exemplo de stock (Unsplash/Pexels), como o manual de Acessórios e Joias. Ver `media/exemplos/README.md`.

```bash
npx --yes pdf-to-img "fontes/DRESS-COD-SPIN-GAMING-2026-02-10.pdf" --output "fontes/dress-code-2026-02-10-pages" --scale 2
```

(Alternativa local: `node scripts/extract-pdf-pages.mjs` — requer `pdf-to-img` ou ambiente com suporte a render.)

**Escopo do Dress Code vs. Política Interna**

- O PDF de Dress Code cobre também **camisa oficial no treinamento**, vestimentas permitidas/proibidas **fora do ao vivo** e áreas administrativas — isso permanece documento de referência de RH; a **Política Interna de Figurino** concentra regras de **figurino oficial, caimento, calçado ao vivo, conservação e segurança** para quem atua em câmera.
