export type KpiDailyRow = {
  channel: string;
  date: string;
  followers: number | null;
  impressions: number | null;
  posts_published: number | null;
  engagements?: number | null;
  link_clicks?: number | null;
};

export type SocialKpiTotaisMtd = {
  postagens: number;
  seguidores: number;
  impressoes: number;
};

/** Totais MTD alinhados ao dashboard Mídias Sociais (`totaisFromKpiRows`). */
export function totaisSocialKpiFromRows(kpiData: KpiDailyRow[]): SocialKpiTotaisMtd {
  const byCh: Record<string, KpiDailyRow[]> = {};
  for (const r of kpiData) {
    if (!byCh[r.channel]) byCh[r.channel] = [];
    byCh[r.channel].push(r);
  }

  const sum = (arr: KpiDailyRow[], field: keyof KpiDailyRow) =>
    arr.reduce((a, row) => a + (Number(row[field]) || 0), 0);

  const last = (arr: KpiDailyRow[], field: keyof KpiDailyRow) => {
    const sorted = [...arr].sort((a, b) => a.date.localeCompare(b.date));
    const v = sorted[sorted.length - 1]?.[field];
    return v != null ? Number(v) : 0;
  };

  const postagens = kpiData.reduce((a, r) => a + (Number(r.posts_published) || 0), 0);
  const seguidores = Object.values(byCh).reduce((a, arr) => a + last(arr, "followers"), 0);
  const impressoes = Object.values(byCh).reduce((a, arr) => a + sum(arr, "impressions"), 0);

  return { postagens, seguidores, impressoes };
}
