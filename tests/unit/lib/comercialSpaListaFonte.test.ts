import { describe, expect, it } from "vitest";
import {
  DEFAULT_LISTA_PAGE,
  extractAutorizacoesPlanilhaUrl,
  extractListaAtualizadaEm,
  extractPaginasListaAutorizacoes,
  extractSharePointPlanilhaUrl,
  parseSpaAutorizacoesHtmlTable,
  pickFonteFromHtml,
  toSharePointDownloadUrl,
} from "../../../src/lib/comercialSpaListaFonte";

const INDEX_HTML = `
<a class="govbr-card-content" href="https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/lista-de-empresas/empresas-autorizadas">Empresas Autorizadas</a>
<a class="govbr-card-content" href="https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/lista-de-empresas/autorizadas-por-determinacao-judicial">Judicial</a>
`;

const LEGACY_PLANILHA_HTML = `
<p>Atualizada em 13/05/2026 |
<a href="https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/lista-de-empresas/planilha-de-autorizacoes.xlsx">Baixar Arquivo CSV</a>
<a href="https://mtegovbr-my.sharepoint.com/:x:/r/personal/beatriz_costato_fazenda_gov_br/_layouts/15/Doc.aspx?sourcedoc=%7B9BF1804C-AA35-4C0D-974B-CDCE72A9E3D8%7D&amp;file=Planilha%20de%20Autoriza%C3%A7%C3%B5es%20(5).xlsx&amp;action=default&amp;mobileredirect=true"></a>
</p>
<p>
<a href="https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/lista-de-empresas/ProcessosjudiciaisSPA04.02.26.csv">CSV judicial</a>
</p>
`;

const HTML_TABLE = `
<table>
<caption>Relação de empresas autorizadas</caption>
<tr>
  <th></th><th>Empresa</th><th>CNPJ</th><th>Marcas</th><th>Domínio</th><th>Portaria</th>
  <th>N° de Requerimento</th><th>Documento</th>
</tr>
<tr>
  <th>1</th>
  <td><strong>BPX BETS SPORTS GROUP LTDA</strong></td>
  <td>55.590.815/0001-60</td>
  <td><strong>•</strong> VAIDEBET<br /><strong>•</strong> BETPIX365<br /><strong>•</strong> OBABET</td>
  <td>vaidebet.bet.br<br /> betpix365.bet.br<br /> obabet.bet.br</td>
  <td>
    <a>SPA/MF nº 797, de 23 de março de 2026</a>
    <a>(Retificada em 26 de março de 2026)</a>
  </td>
  <td>00592024</td>
  <td>PDF</td>
</tr>
<tr>
  <th>2</th>
  <td>NOSSO TIME IGAMING LTDA</td>
  <td>60.828.451/0001-43</td>
  <td>• JOGA JUNTO</td>
  <td>jogajunto.bet.br</td>
  <td><a>SPA/MF nº 604, de 6 de março de 2026</a></td>
  <td>00622025</td>
  <td>PDF</td>
</tr>
</table>
`;

/** Página real 2026: tabela HTML + link morto sob Transparência Ativa. */
const EMPRESAS_AUTORIZADAS_COM_XLSX_404 = `
<p>Atualizado em 04/09/2026 17h01</p>
<p>Além da consulta à lista disponibilizada nesta página,
<a href="https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/transparencia-ativa-processos-de-autorizacao-de-apostas-de-quota-fixa/planilha-de-autorizacoes-1.xlsx">planilha</a>
</p>
${HTML_TABLE}
`;

describe("comercialSpaListaFonte", () => {
  it("aponta DEFAULT_LISTA_PAGE para empresas-autorizadas", () => {
    expect(DEFAULT_LISTA_PAGE).toContain("/empresas-autorizadas");
  });

  it("extrai XLSX legado no gov.br e ignora CSV judicial", () => {
    expect(extractAutorizacoesPlanilhaUrl(LEGACY_PLANILHA_HTML)).toBe(
      "https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/lista-de-empresas/planilha-de-autorizacoes.xlsx",
    );
  });

  it("ignora planilha sob Transparência Ativa (URL 404)", () => {
    expect(extractAutorizacoesPlanilhaUrl(EMPRESAS_AUTORIZADAS_COM_XLSX_404)).toBeNull();
  });

  it("prefere tabela HTML ao link .xlsx morto na mesma página", () => {
    const picked = pickFonteFromHtml(EMPRESAS_AUTORIZADAS_COM_XLSX_404, DEFAULT_LISTA_PAGE);
    expect(picked?.kind).toBe("html");
    expect(picked?.url).toBe(DEFAULT_LISTA_PAGE);
  });

  it("usa planilha legado só quando não há tabela HTML", () => {
    const picked = pickFonteFromHtml(LEGACY_PLANILHA_HTML, DEFAULT_LISTA_PAGE);
    expect(picked).toEqual({
      kind: "arquivo",
      url: "https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/lista-de-empresas/planilha-de-autorizacoes.xlsx",
      listaAtualizadaEm: "13/05/2026",
    });
  });

  it("converte link SharePoint de partilha em download.aspx", () => {
    const sharing =
      "https://mtegovbr-my.sharepoint.com/:x:/r/personal/beatriz_costato_fazenda_gov_br/_layouts/15/Doc.aspx?sourcedoc=%7B9BF1804C-AA35-4C0D-974B-CDCE72A9E3D8%7D&file=Planilha%20de%20Autoriza%C3%A7%C3%B5es%20(5).xlsx&action=default&mobileredirect=true";
    expect(toSharePointDownloadUrl(sharing)).toBe(
      "https://mtegovbr-my.sharepoint.com/personal/beatriz_costato_fazenda_gov_br/_layouts/15/download.aspx?UniqueId=9BF1804C-AA35-4C0D-974B-CDCE72A9E3D8",
    );
    expect(extractSharePointPlanilhaUrl(LEGACY_PLANILHA_HTML)).toBe(
      "https://mtegovbr-my.sharepoint.com/personal/beatriz_costato_fazenda_gov_br/_layouts/15/download.aspx?UniqueId=9BF1804C-AA35-4C0D-974B-CDCE72A9E3D8",
    );
  });

  it("descobre a subpágina empresas-autorizadas e ignora determinação judicial", () => {
    const pages = extractPaginasListaAutorizacoes(
      INDEX_HTML,
      "https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/lista-de-empresas",
    );
    expect(pages).toEqual([
      "https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/lista-de-empresas/empresas-autorizadas",
    ]);
  });

  it("interpreta a tabela HTML oficial com marcas, domínios, retificação e SIGAP", () => {
    const blocos = parseSpaAutorizacoesHtmlTable(HTML_TABLE);
    expect(blocos).toHaveLength(2);
    expect(blocos[0]).toMatchObject({
      cnpj: "55.590.815/0001-60",
      razao_social: "BPX BETS SPORTS GROUP LTDA",
      portaria: "SPA/MF nº 797, de 23 de março de 2026",
      portaria_retificacoes: ["(Retificada em 26 de março de 2026)"],
      requerimento_numero: "0059",
      requerimento_ano: "2024",
    });
    expect(blocos[0]?.marcas).toEqual([
      { nome: "VAIDEBET", dominio: "https://vaidebet.bet.br" },
      { nome: "BETPIX365", dominio: "https://betpix365.bet.br" },
      { nome: "OBABET", dominio: "https://obabet.bet.br" },
    ]);
    expect(blocos[1]).toMatchObject({
      cnpj: "60.828.451/0001-43",
      requerimento_numero: "0062",
      requerimento_ano: "2025",
    });
    expect(blocos[1]?.marcas).toEqual([
      { nome: "JOGA JUNTO", dominio: "https://jogajunto.bet.br" },
    ]);
  });

  it("lê data de atualização no texto legado e no HTML Plone", () => {
    expect(extractListaAtualizadaEm("Atualizada em 13/05/2026 |")).toBe("13/05/2026");
    expect(
      extractListaAtualizadaEm(
        `<span>Atualizado em</span>\n        <span class="value">17/08/2026 15h38</span>`,
      ),
    ).toBe("17/08/2026");
  });
});
