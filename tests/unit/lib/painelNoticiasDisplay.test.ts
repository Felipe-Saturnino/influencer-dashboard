import { describe, expect, it } from "vitest";
import {
  calcularPainelNoticiasExibicao,
  formatDetalhePainelNoticia,
  idsPainelNoticiasParaPurga,
  PAINEL_NOTICIAS_DETALHE_MAX_CARACTERES,
  prepararExibicaoPainelNoticia,
  type PainelNoticiaRow,
} from "@/lib/painelNoticiasDisplay";
import {
  prepararTextoPainelNoticia,
  removePainelNoticiaBoilerplate,
  sanitizePainelNoticiaHtml,
} from "@/lib/painelNoticiasSanitize";

function row(
  id: string,
  visivel_desde: string,
  visivel_ate: string,
  titulo = id,
  resumo: string | null = null,
): PainelNoticiaRow {
  return { id, titulo, resumo, visivel_desde, visivel_ate };
}

describe("calcularPainelNoticiasExibicao", () => {
  const now = new Date("2026-06-03T12:00:00.000Z");

  it("retorna todas frescas quando >= 5", () => {
    const rows = Array.from({ length: 6 }, (_, i) =>
      row(
        String(i),
        `2026-06-03T${10 + i}:00:00.000Z`,
        "2026-06-03T20:00:00.000Z",
      ),
    );
    expect(calcularPainelNoticiasExibicao(rows, now)).toHaveLength(6);
  });

  it("completa com vencidas até 5", () => {
    const fresca = row("f1", "2026-06-03T11:00:00.000Z", "2026-06-03T20:00:00.000Z");
    const v1 = row("v1", "2026-06-02T10:00:00.000Z", "2026-06-03T08:00:00.000Z");
    const v2 = row("v2", "2026-06-02T09:00:00.000Z", "2026-06-03T07:00:00.000Z");
    const v3 = row("v3", "2026-06-02T08:00:00.000Z", "2026-06-03T06:00:00.000Z");
    const v4 = row("v4", "2026-06-02T07:00:00.000Z", "2026-06-03T05:00:00.000Z");
    const exibir = calcularPainelNoticiasExibicao([v4, v3, v2, v1, fresca], now);
    expect(exibir.map((r) => r.id)).toEqual(["f1", "v1", "v2", "v3", "v4"]);
  });
});

describe("sanitizePainelNoticiaHtml", () => {
  it("remove HTML quebrado de imagem e atributos soltos", () => {
    const html =
      "<p>\"Trabalho duro sempre foi minha essência\", disse o goleiro.</p>" +
      "href='https://static.gazetaesportiva.com/uploads/foto.webp' data-foo='bar'";
    const out = sanitizePainelNoticiaHtml(html);
    expect(out).toContain("Trabalho duro");
    expect(out).not.toContain("href=");
    expect(out).not.toContain("gazetaesportiva.com/uploads");
  });

  it("remove rodapé WordPress do detalhe", () => {
    const titulo = "Veja reação de Luiz Henrique ao ser convocado para a Copa do Mundo";
    const desc =
      `O post ${titulo} apareceu primeiro em Gazeta Esportiva .`;
    const out = removePainelNoticiaBoilerplate(sanitizePainelNoticiaHtml(desc), titulo);
    expect(out).toBe("");
  });

  it("remove galeria de jogadores com HTML quebrado", () => {
    const html =
      "<p>A seleção tem confiança de chegar à final da Copa do Mundo, disse o técnico.</p>" +
      "<ul><li' > Weverton, do Grêmio. (Foto: LUCAS UEBEL/GREMIO FBPA)</li>" +
      "<li' > Ederson, do Fenerbahçe-TUR. (Foto: Rafael Ribeiro/CBF)</li></ul>";
    const out = prepararExibicaoPainelNoticia(
      row("3", "2026-06-03T10:00:00.000Z", "2026-06-03T20:00:00.000Z", "", html),
    );
    expect(out.titulo).toContain("seleção");
    expect(out.detalhe).not.toContain("Weverton");
    expect(out.detalhe).not.toContain("' >");
    expect(out.detalhe).not.toMatch(/\(foto\s*:/i);
  });
});

describe("prepararExibicaoPainelNoticia", () => {
  it("não repete título no detalhe quando só há boilerplate", () => {
    const titulo = "Veja reação de Luiz Henrique ao ser convocado para a Copa do Mundo";
    const exibir = prepararExibicaoPainelNoticia(
      row("1", "2026-06-03T10:00:00.000Z", "2026-06-03T20:00:00.000Z", titulo, `<p>O post ${titulo} apareceu primeiro em Gazeta Esportiva .</p>`),
    );
    expect(exibir.titulo).toBe(titulo);
    expect(exibir.detalhe).toBe("");
  });

  it("deriva título da primeira frase quando o campo título vem vazio", () => {
    const corpo =
      '"Trabalho duro sempre foi minha essência", disse Alisson. Ele falou sobre a seleção brasileira.';
    const exibir = prepararExibicaoPainelNoticia(
      row("2", "2026-06-03T10:00:00.000Z", "2026-06-03T20:00:00.000Z", "", corpo),
    );
    expect(exibir.titulo).toContain("Trabalho duro");
    expect(exibir.detalhe).toContain("Ele falou");
  });
});

describe("formatDetalhePainelNoticia", () => {
  it("preserva quebras de parágrafo do HTML", () => {
    const html = "<p>Primeiro parágrafo.</p><p>Segundo parágrafo com mais contexto.</p>";
    expect(formatDetalhePainelNoticia(html, "Manchete da notícia")).toBe(
      "Primeiro parágrafo.\n\nSegundo parágrafo com mais contexto.",
    );
  });

  it("limita tamanho sem cortar palavra no meio quando possível", () => {
    const long = "a ".repeat(PAINEL_NOTICIAS_DETALHE_MAX_CARACTERES + 40);
    const out = formatDetalhePainelNoticia(long);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(PAINEL_NOTICIAS_DETALHE_MAX_CARACTERES + 1);
  });
});

describe("prepararTextoPainelNoticia", () => {
  it("separa manchete e corpo quando resumo é longo sem título", () => {
    const { titulo, corpo } = prepararTextoPainelNoticia("", "Primeira frase da matéria. Segunda frase com detalhes.");
    expect(titulo).toBe("Primeira frase da matéria.");
    expect(corpo).toBe("Segunda frase com detalhes.");
  });
});

describe("idsPainelNoticiasParaPurga", () => {
  const now = new Date("2026-06-03T12:00:00.000Z");

  it("mantém vencidas usadas no completar e apaga excesso", () => {
    const fresca = row("f1", "2026-06-03T11:00:00.000Z", "2026-06-03T20:00:00.000Z");
    const keep = row("v1", "2026-06-02T10:00:00.000Z", "2026-06-03T08:00:00.000Z");
    const v2 = row("v2", "2026-06-02T09:00:00.000Z", "2026-06-03T07:00:00.000Z");
    const v3 = row("v3", "2026-06-02T08:00:00.000Z", "2026-06-03T06:00:00.000Z");
    const v4 = row("v4", "2026-06-02T07:00:00.000Z", "2026-06-03T05:00:00.000Z");
    const drop = row("v5", "2026-06-02T06:00:00.000Z", "2026-06-03T04:00:00.000Z");
    const ids = idsPainelNoticiasParaPurga([drop, v4, v3, v2, keep, fresca], now);
    expect(ids).toEqual(["v5"]);
  });
});
