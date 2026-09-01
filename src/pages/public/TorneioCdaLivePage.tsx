import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { fmtBRL } from "../../lib/dashboardHelpers";
import {
  TORNEIO_CDA_BG,
  TORNEIO_CDA_POLL_MS,
  TORNEIO_CDA_SLUG,
  fmtTorneioPontos,
  fmtTorneioSyncRelativo,
  torneioCdaGameTagClass,
  torneioCdaGameTypeLabel,
  type TorneioCdaAtividadeRow,
  type TorneioCdaConsolidadoRow,
  type TorneioCdaRankingRow,
  type TorneioCdaRow,
} from "../../lib/torneioCdaLive";
import "../../styles/torneioCdaLive.css";

const LOGO_CDA = `${import.meta.env.BASE_URL}torneio-cda/logo-casa-apostas.png`;
const LOGO_SPIN = `${import.meta.env.BASE_URL}torneio-cda/logo-spin-gaming.png`;

const VAZIO_RANKING_MSG = "Aguardando primeiras rodadas…";
const ERRO_MSG = "Não foi possível carregar o torneio. Tentando novamente…";

function useTorneioCdaViewport() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");
    const snap = {
      htmlBg: html.style.background,
      htmlMinH: html.style.minHeight,
      bodyBg: body.style.background,
      bodyMinH: body.style.minHeight,
      rootBg: root?.style.background ?? "",
      rootMinH: root?.style.minHeight ?? "",
      zoom: html.style.getPropertyValue("--app-ui-zoom"),
    };
    const bg = TORNEIO_CDA_BG;
    html.style.background = bg;
    html.style.minHeight = "100%";
    body.style.background = bg;
    body.style.minHeight = "100dvh";
    html.style.setProperty("--app-ui-zoom", "1");
    if (root) {
      root.style.background = bg;
      root.style.minHeight = "100dvh";
    }
    return () => {
      html.style.background = snap.htmlBg;
      html.style.minHeight = snap.htmlMinH;
      body.style.background = snap.bodyBg;
      body.style.minHeight = snap.bodyMinH;
      if (root) {
        root.style.background = snap.rootBg;
        root.style.minHeight = snap.rootMinH;
      }
      if (snap.zoom) html.style.setProperty("--app-ui-zoom", snap.zoom);
      else html.style.removeProperty("--app-ui-zoom");
    };
  }, []);
}

function useTorneioCdaMeta() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    const anterior = document.title;
    document.title = "Torneio VIP Casa de Apostas e Spin Gaming";
    return () => {
      meta.remove();
      document.title = anterior;
    };
  }, []);
}

function TorneioCdaSyncBadge({ sincronizadoEm }: { sincronizadoEm: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="torneio-cda-sync-badge" title="Última atualização do ranking">
      <span className="torneio-cda-sync-dot" aria-hidden="true" />
      {fmtTorneioSyncRelativo(sincronizadoEm, now)}
    </div>
  );
}

function TorneioCdaPodium({ top3 }: { top3: TorneioCdaRankingRow[] }) {
  const [second, first, third] = [
    top3.find((r) => r.posicao === 2),
    top3.find((r) => r.posicao === 1),
    top3.find((r) => r.posicao === 3),
  ];

  const slot = (row: TorneioCdaRankingRow | undefined, cls: string, rankLabel: string) => {
    if (!row) {
      return (
        <div className={`torneio-cda-podium-slot ${cls}`}>
          <div className="torneio-cda-podium-rank">{rankLabel}</div>
          <div className="torneio-cda-podium-name">—</div>
          <div className="torneio-cda-podium-points">{fmtTorneioPontos(0)}</div>
          <div className="torneio-cda-podium-stats">
            0 rodadas · 0 ganhas
            <br />
            {fmtBRL(0)} apostado
          </div>
        </div>
      );
    }
    return (
      <div className={`torneio-cda-podium-slot ${cls}`}>
        <div className="torneio-cda-podium-rank">{rankLabel}</div>
        <div className="torneio-cda-podium-name">{row.apelido}</div>
        <div className="torneio-cda-podium-points">{fmtTorneioPontos(row.pontos)}</div>
        <div className="torneio-cda-podium-stats">
          {row.rodadas_jogadas} rodadas · {row.rodadas_ganhas} ganhas
          <br />
          {fmtBRL(Number(row.valor_apostado))} apostado
        </div>
      </div>
    );
  };

  return (
    <div className="torneio-cda-podium" aria-label="Pódio top 3">
      {slot(second, "second", "2º")}
      {slot(first, "first", "1º")}
      {slot(third, "third", "3º")}
    </div>
  );
}

function TorneioCdaRankingTable({ rows }: { rows: TorneioCdaRankingRow[] }) {
  return (
    <div className="torneio-cda-table-wrap">
      <table className="torneio-cda-table">
        <caption style={{ display: "none" }}>Ranking completo do torneio</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Jogador</th>
            <th scope="col">Rodadas Jogadas</th>
            <th scope="col">Rodadas Ganhas</th>
            <th scope="col">Valor Apostado</th>
            <th scope="col">Pontos</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.user_name}>
              <td>
                <span className={`torneio-cda-rank-badge${row.posicao <= 3 ? " top" : ""}`}>{row.posicao}</span>
              </td>
              <td className="torneio-cda-player-cell">{row.apelido}</td>
              <td>{row.rodadas_jogadas}</td>
              <td>{row.rodadas_ganhas}</td>
              <td>{fmtBRL(Number(row.valor_apostado))}</td>
              <td>
                <strong>{row.pontos.toLocaleString("pt-BR")}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TorneioCdaRegras() {
  return (
    <div className="torneio-cda-content-box torneio-cda-rules-box">
      <h2 className="torneio-cda-section-title">Regras de Pontuação</h2>
      <p className="torneio-cda-section-sub">Como os pontos são calculados no ranking do torneio</p>
      <div className="torneio-cda-rules-list">
        <div className="torneio-cda-rule-item">
          <div className="torneio-cda-rule-points">500 pts</div>
          <div className="torneio-cda-rule-desc">
            Por rodada jogada
            <span>Cada rodada em que o participante apostou conta 500 pontos, independentemente do resultado.</span>
          </div>
        </div>
        <div className="torneio-cda-rule-item">
          <div className="torneio-cda-rule-points">1.000 pts</div>
          <div className="torneio-cda-rule-desc">
            Por rodada ganha
            <span>Rodada considerada ganha quando o saldo líquido da rodada é positivo.</span>
          </div>
        </div>
        <div className="torneio-cda-rule-item">
          <div className="torneio-cda-rule-points">10 pts</div>
          <div className="torneio-cda-rule-desc">
            Por real ganho
            <span>A cada R$ 1,00 de valor ganho (saldo positivo) somam-se 10 pontos extras ao total.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TorneioCdaPremiacao() {
  const faixas = [
    { posicao: "1º", titulo: "Primeiro", valor: 20_000, variant: "first" as const },
    { posicao: "2º", titulo: "Segundo", valor: 10_000, variant: "second" as const },
    { posicao: "3º", titulo: "Terceiro", valor: 5_000, variant: "third" as const },
    { posicao: "—", titulo: "Demais participantes", valor: 1_000, variant: "demais" as const },
  ];

  return (
    <div className="torneio-cda-content-box torneio-cda-premiacao-box">
      <h2 className="torneio-cda-section-title">Premiação</h2>
      <p className="torneio-cda-section-sub">Prêmios em bônus para os participantes do torneio</p>
      <div className="torneio-cda-premiacao-list">
        {faixas.map((faixa) => (
          <div
            key={faixa.titulo}
            className={`torneio-cda-premiacao-item torneio-cda-premiacao-item--${faixa.variant}`}
          >
            <div className="torneio-cda-premiacao-rank">{faixa.posicao}</div>
            <div className="torneio-cda-premiacao-desc">
              {faixa.titulo}
              <span>
                {faixa.variant === "demais"
                  ? `Bônus de ${fmtBRL(faixa.valor)}`
                  : `${fmtBRL(faixa.valor)} em bônus`}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="torneio-cda-premiacao-nota">
        O bônus é creditado como saldo na conta Casa de Apostas do participante.
      </p>
    </div>
  );
}

function TorneioCdaAtividades({ rows }: { rows: TorneioCdaAtividadeRow[] }) {
  return (
    <aside className="torneio-cda-content-box torneio-cda-activity-panel" aria-label="Atividades recentes">
      <h2 className="torneio-cda-section-title">Atividades Recentes</h2>
      <div className="torneio-cda-activity-scroll">
        {rows.length === 0 ? (
          <p className="torneio-cda-empty">Nenhuma vitória registrada ainda.</p>
        ) : (
          <ul className="torneio-cda-activity-feed">
            {rows.map((item, i) => (
              <li
                key={item.id}
                className={`torneio-cda-activity-item${i === 0 ? " is-new" : ""}`}
              >
                <span className={`torneio-cda-game-tag ${torneioCdaGameTagClass(item.game_type)}`}>
                  {torneioCdaGameTypeLabel(item.game_type)}
                </span>
                <p>{item.mensagem}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

export default function TorneioCdaLivePage() {
  useTorneioCdaViewport();
  useTorneioCdaMeta();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [ranking, setRanking] = useState<TorneioCdaRankingRow[]>([]);
  const [consolidado, setConsolidado] = useState<TorneioCdaConsolidadoRow | null>(null);
  const [atividades, setAtividades] = useState<TorneioCdaAtividadeRow[]>([]);

  const carregar = useCallback(async () => {
    const { data: torneioRows, error: torneioErr } = await supabase
      .from("torneio_cda")
      .select("id, slug, nome, periodo_inicio, periodo_fim, ativo")
      .eq("slug", TORNEIO_CDA_SLUG)
      .eq("ativo", true)
      .maybeSingle();

    if (torneioErr) {
      console.error("[TorneioCDA]", torneioErr.message);
      setErro(true);
      setRanking([]);
      setConsolidado(null);
      setAtividades([]);
      setLoading(false);
      return;
    }

    if (!torneioRows) {
      setErro(false);
      setRanking([]);
      setConsolidado(null);
      setAtividades([]);
      setLoading(false);
      return;
    }

    const torneioRow = torneioRows as TorneioCdaRow;
    setErro(false);

    const [rankRes, consRes, ativRes] = await Promise.all([
      supabase
        .from("torneio_cda_ranking")
        .select(
          "user_name, apelido, posicao, rodadas_jogadas, rodadas_ganhas, valor_apostado, pontos, sincronizado_em",
        )
        .eq("torneio_id", torneioRow.id)
        .order("posicao", { ascending: true }),
      supabase
        .from("torneio_cda_consolidado")
        .select("rodadas_jogadas, rodadas_ganhas, valor_apostado, sincronizado_em")
        .eq("torneio_id", torneioRow.id)
        .maybeSingle(),
      supabase
        .from("torneio_cda_atividade")
        .select("id, user_name, apelido, game_id, game_type, table_name, valor_net, mensagem, ocorrido_em")
        .eq("torneio_id", torneioRow.id)
        .order("ocorrido_em", { ascending: false })
        .limit(30),
    ]);

    if (rankRes.error || consRes.error || ativRes.error) {
      console.error("[TorneioCDA]", rankRes.error?.message ?? consRes.error?.message ?? ativRes.error?.message);
      setErro(true);
    } else {
      setRanking((rankRes.data ?? []) as TorneioCdaRankingRow[]);
      setConsolidado((consRes.data as TorneioCdaConsolidadoRow | null) ?? null);
      setAtividades((ativRes.data ?? []) as TorneioCdaAtividadeRow[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void carregar();
    const id = window.setInterval(() => void carregar(), TORNEIO_CDA_POLL_MS);
    return () => window.clearInterval(id);
  }, [carregar]);

  const sincronizadoEm = consolidado?.sincronizado_em ?? ranking[0]?.sincronizado_em ?? null;

  if (loading) {
    return (
      <div className="torneio-cda-page">
        <div className="torneio-cda-loading">
          <Loader2 size={24} className="app-lucide-spin" color="#75b62d" aria-hidden />
          Carregando…
        </div>
      </div>
    );
  }

  const temRanking = ranking.length > 0;

  return (
    <div className="torneio-cda-page">
      <header className="torneio-cda-header">
        <div className="torneio-cda-brand-strip" aria-hidden="true" />
        <div className="torneio-cda-header-inner">
          <div className="torneio-cda-brand-lockup">
            <img src={LOGO_CDA} alt="Casa de Apostas" className="torneio-cda-logo-cda" />
            <div className="torneio-cda-partner-lockup">
              <span className="torneio-cda-partner-label">Powered by</span>
              <img src={LOGO_SPIN} alt="Spin Gaming" className="torneio-cda-logo-spin" />
            </div>
          </div>
          <TorneioCdaSyncBadge sincronizadoEm={sincronizadoEm} />
        </div>
      </header>

      <main className="torneio-cda-shell">
        {erro ? (
          <p className="torneio-cda-erro-banner" role="alert" aria-live="polite">
            {ERRO_MSG}
          </p>
        ) : null}

        <section className="torneio-cda-hero" aria-labelledby="torneio-cda-hero-title">
          <p className="torneio-cda-hero-eyebrow">Live Cassino · Torneio</p>
          <h1 id="torneio-cda-hero-title">
            Torneio VIP <em>Casa de Apostas</em> e{" "}
            <span className="torneio-cda-hero-spin">Spin Gaming</span> — Setembro 2026
          </h1>
          <p className="torneio-cda-hero-sub">
            Ranking ao vivo dos participantes. Pontuação com base em rodadas, volume apostado e vitórias nas mesas da
            CDA com a Spin Gaming.
          </p>
        </section>

        <div className="torneio-cda-kpi-grid" aria-label="KPIs consolidados do torneio">
          <div className="torneio-cda-kpi-card">
            <div className="torneio-cda-kpi-label">Rodadas Jogadas</div>
            <div className="torneio-cda-kpi-value">{consolidado?.rodadas_jogadas ?? 0}</div>
          </div>
          <div className="torneio-cda-kpi-card">
            <div className="torneio-cda-kpi-label">Valor Apostado</div>
            <div className="torneio-cda-kpi-value">{fmtBRL(Number(consolidado?.valor_apostado ?? 0))}</div>
          </div>
          <div className="torneio-cda-kpi-card">
            <div className="torneio-cda-kpi-label">Rodadas Ganhas</div>
            <div className="torneio-cda-kpi-value">{consolidado?.rodadas_ganhas ?? 0}</div>
          </div>
        </div>

        <div className="torneio-cda-main-grid">
          <div className="torneio-cda-content-box torneio-cda-ranking-box">
            <h2 className="torneio-cda-section-title">Ranking</h2>
            <TorneioCdaPodium top3={temRanking ? ranking.slice(0, 3) : []} />
            {temRanking ? (
              <TorneioCdaRankingTable rows={ranking} />
            ) : (
              <>
                <TorneioCdaRankingTable rows={[]} />
                <p className="torneio-cda-empty torneio-cda-empty-inline">{VAZIO_RANKING_MSG}</p>
              </>
            )}
          </div>

          <TorneioCdaRegras />
          <TorneioCdaPremiacao />
          <TorneioCdaAtividades rows={atividades} />
        </div>
      </main>

      <footer className="torneio-cda-footer">
        <div className="torneio-cda-footer-brands">
          <span className="torneio-cda-footer-cda">Casa de Apostas</span>
          <span className="torneio-cda-footer-spin">Spin Gaming</span>
        </div>
      </footer>
    </div>
  );
}
