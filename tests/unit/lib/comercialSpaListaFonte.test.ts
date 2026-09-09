import { describe, expect, it } from "vitest";
import {
  DEFAULT_LISTA_PAGE,
  extractAutorizacoesPlanilhaUrl,
  extractListaAtualizadaEm,
  extractPaginasListaAutorizacoes,
  extractSharePointPlanilhaUrl,
  mergeBlocosSpaPorCnpj,
  parseSpaAutorizacoesHtmlTable,
  parseSpaJudicialHtmlTable,
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

/** Duas empresas / 6 marcas — estrutura real da página de determinação judicial. */
const HTML_JUDICIAL = `
<table class="black">
<caption>Empresa explorando … determinação judicial … 5007941-50.2025.4.03.6100.</caption>
<thead>
<tr><th>Empresa</th><th>CNPJ</th><th>Marcas</th><th>Domínio</th><th>Informações Judiciais</th></tr>
</thead>
<tbody>
<tr>
<td><strong>ZEROUMBET PLATAFORMA DIGITAL LTDA</strong></td>
<td>55.997.392/0001-05</td>
<td><ul><li>ZEROUM</li><li>ENERGIA</li><li>SPORTVIP</li></ul></td>
<td>zeroum.bet<br />energia.bet<br />sportvip.bet</td>
<td>5007941-50.2025.4.03.6100, em trâmite na 14ª Vara Federal Cível da Seção Judiciária de São Paulo</td>
</tr>
</tbody>
</table>
<table class="black">
<thead>
<tr><th>Empresa</th><th>CNPJ</th><th>Marcas</th><th>Domínio</th><th>Informações Judiciais</th></tr>
</thead>
<tbody>
<tr>
<td><strong>ZONA DE JOGO NEGÓCIOS E PARTICIPAÇÕES LTDA</strong></td>
<td>57.163.072/0001-77</td>
<td><ul><li>ZONA DE JOGO</li><li>APOSTAONLINE</li><li>ONLYBETS</li></ul></td>
<td>zonadejogo.bet.br<br />apostaonline.bet.br<br />onlybets.bet.br</td>
<td>1096849-60.2025.4.01.3400, em trâmite na 4ª Vara Federal Cível da Seção Judiciária do Distrito Federal</td>
</tr>
</tbody>
</table>
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

  it("descobre a subpágina empresas-autorizadas e ignora determinação judicial no índice lista-de-empresas", () => {
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

  it("interpreta tabelas de determinação judicial (2 empresas / 6 marcas)", () => {
    const blocos = parseSpaJudicialHtmlTable(HTML_JUDICIAL);
    expect(blocos).toHaveLength(2);
    expect(blocos[0]).toMatchObject({
      cnpj: "55.997.392/0001-05",
      razao_social: "ZEROUMBET PLATAFORMA DIGITAL LTDA",
      requerimento_numero: null,
      requerimento_ano: null,
    });
    expect(blocos[0]?.portaria).toMatch(/^Determinação judicial —/);
    expect(blocos[0]?.marcas).toEqual([
      { nome: "ZEROUM", dominio: "https://zeroum.bet" },
      { nome: "ENERGIA", dominio: "https://energia.bet" },
      { nome: "SPORTVIP", dominio: "https://sportvip.bet" },
    ]);
    expect(blocos[1]).toMatchObject({
      cnpj: "57.163.072/0001-77",
      razao_social: "ZONA DE JOGO NEGÓCIOS E PARTICIPAÇÕES LTDA",
    });
    expect(blocos[1]?.marcas).toHaveLength(3);
    expect(blocos[1]?.marcas.map((m) => m.nome)).toEqual([
      "ZONA DE JOGO",
      "APOSTAONLINE",
      "ONLYBETS",
    ]);
  });

  it("une lista por portaria com judicial sem sobrescrever CNPJ já presente", () => {
    const principais = parseSpaAutorizacoesHtmlTable(HTML_TABLE);
    const judiciais = parseSpaJudicialHtmlTable(HTML_JUDICIAL);
    const merged = mergeBlocosSpaPorCnpj(principais, judiciais);
    expect(merged).toHaveLength(4);
    expect(merged.map((b) => b.cnpj)).toEqual([
      "55.590.815/0001-60",
      "55.997.392/0001-05",
      "57.163.072/0001-77",
      "60.828.451/0001-43",
    ]);
    const overlap = mergeBlocosSpaPorCnpj(principais, [
      {
        ...judiciais[0]!,
        cnpj: principais[0]!.cnpj,
        razao_social: "NÃO DEVE PREVALECER",
      },
    ]);
    expect(overlap.find((b) => b.cnpj === principais[0]!.cnpj)?.razao_social).toBe(
      "BPX BETS SPORTS GROUP LTDA",
    );
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
