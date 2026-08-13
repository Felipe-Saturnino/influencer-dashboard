import { describe, expect, it } from "vitest";
import {
  calcularPainelNoticiasExibicao,
  formatDetalhePainelNoticia,
  idsPainelNoticiasParaPurga,
  PAINEL_NOTICIAS_DETALHE_MAX_CARACTERES,
  PAINEL_NOTICIAS_MAX_EXIBICAO,
  prepararExibicaoPainelNoticia,
  type PainelNoticiaRow,
} from "@/lib/painelNoticiasDisplay";
import {
  itemElegivelPainelNoticia,
  normalizarResumoRssBruto,
  prepararTextoPainelNoticia,
  removePainelNoticiaBoilerplate,
  sanitizePainelNoticiaHtml,
} from "@/lib/painelNoticiasSanitize";

function row(
  id: string,
  visivel_desde: string,
  visivel_ate: string,
  titulo = `Notícia de teste ${id} com título completo`,
  resumo: string | null = "Resumo editorial com contexto suficiente para exibição no painel.",
): PainelNoticiaRow {
  return { id, titulo, resumo, visivel_desde, visivel_ate };
}

describe("calcularPainelNoticiasExibicao", () => {
  const now = new Date("2026-06-03T12:00:00.000Z");

  it("retorna todas frescas quando >= 5 e abaixo do teto", () => {
    const rows = Array.from({ length: 6 }, (_, i) =>
      row(
        String(i),
        `2026-06-03T${10 + i}:00:00.000Z`,
        "2026-06-03T20:00:00.000Z",
      ),
    );
    expect(calcularPainelNoticiasExibicao(rows, now)).toHaveLength(6);
  });

  it("limita frescas ao teto de 15 mais recentes", () => {
    const rows = Array.from({ length: 18 }, (_, i) =>
      row(
        String(i),
        `2026-06-03T${String(i).padStart(2, "0")}:00:00.000Z`,
        "2026-06-03T20:00:00.000Z",
      ),
    );
    const exibir = calcularPainelNoticiasExibicao(rows, now);
    expect(exibir).toHaveLength(PAINEL_NOTICIAS_MAX_EXIBICAO);
    expect(exibir[0]?.id).toBe("17");
    expect(exibir[14]?.id).toBe("3");
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

  it("ignora itens ESPN quebrados (resumo curto e título truncado)", () => {
    const boa = row(
      "ok",
      "2026-06-03T11:00:00.000Z",
      "2026-06-03T20:00:00.000Z",
      "Marquinhos diz o que Ancelotti pediu a atletas",
      "Marquinhos despistou sobre mudanças no treino da Seleção.",
    );
    const quebrada = row(
      "bad",
      "2026-06-03T10:00:00.000Z",
      "2026-06-03T20:00:00.000Z",
      "'Só quero desistir do tênis': Sabalenka desabafa a...",
      null,
    );
    const resumoCurto = row(
      "short",
      "2026-06-03T10:00:00.000Z",
      "2026-06-03T20:00:00.000Z",
      "Título cortado no feed da ESPN...",
      "Volante d",
    );
    const exibir = calcularPainelNoticiasExibicao([quebrada, resumoCurto, boa], now);
    expect(exibir.map((r) => r.id)).toEqual(["ok"]);
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
    const desc = `O post ${titulo} apareceu primeiro em Gazeta Esportiva .`;
    const out = removePainelNoticiaBoilerplate(sanitizePainelNoticiaHtml(desc), titulo);
    expect(out).toBe("");
  });

  it("trata description literal null da ESPN como vazio", () => {
    expect(normalizarResumoRssBruto("null")).toBeNull();
    expect(itemElegivelPainelNoticia("Título truncado no feed...", "null")).toBe(false);
    expect(
      itemElegivelPainelNoticia(
        "Marquinhos diz o que Ancelotti pediu a atletas",
        "Marquinhos despistou sobre mudanças no treino.",
      ),
    ).toBe(true);
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

  it("substitui título truncado da ESPN pelo resumo completo", () => {
    const exibir = prepararExibicaoPainelNoticia(
      row(
        "espn",
        "2026-06-03T10:00:00.000Z",
        "2026-06-03T20:00:00.000Z",
        "Recuperação avança, e Espanha deve ter Yamal e Nic...",
        "Principais jogadores da Fúria ainda se recuperam de lesões musculares",
      ),
    );
    expect(exibir.titulo).not.toMatch(/\.\.\.|…$/);
    expect(exibir.titulo).toContain("Principais jogadores");
    expect(exibir.detalhe).toBe("");
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
