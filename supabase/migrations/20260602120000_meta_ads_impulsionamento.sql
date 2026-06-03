-- Meta Ads (Impulsionamento) — spend e métricas pagas IG/FB via Marketing API
-- Consumido pela aba Impulsionamento em Mídias Sociais

create table if not exists meta_ads_daily (
  id                  uuid primary key default uuid_generate_v4(),
  ad_account_id       text not null,
  date                date not null,
  spend               numeric(14, 2) not null default 0,
  impressions         bigint not null default 0,
  reach               bigint not null default 0,
  clicks              bigint not null default 0,
  link_clicks         bigint not null default 0,
  engagements         bigint not null default 0,
  boosted_posts_count integer not null default 0,
  attributed_ggr        numeric(14, 2),
  created_at          timestamptz default now(),
  unique (ad_account_id, date)
);

create table if not exists meta_boosted_posts (
  id              uuid primary key default uuid_generate_v4(),
  ad_id           text not null,
  post_id         text,
  platform        text not null,
  date            date not null,
  ad_name         text,
  campaign_name   text,
  spend           numeric(14, 2) not null default 0,
  impressions     bigint not null default 0,
  reach           bigint not null default 0,
  engagements     bigint not null default 0,
  link_clicks     bigint not null default 0,
  permalink       text,
  thumbnail_url   text,
  created_at      timestamptz default now(),
  unique (ad_id, date),
  constraint chk_meta_boosted_posts_platform check (platform in ('instagram', 'facebook'))
);

create index if not exists idx_meta_ads_daily_date on meta_ads_daily (date desc);
create index if not exists idx_meta_boosted_posts_date on meta_boosted_posts (date desc);
create index if not exists idx_meta_boosted_posts_platform on meta_boosted_posts (platform, date desc);

alter table meta_ads_daily enable row level security;
alter table meta_boosted_posts enable row level security;

drop policy if exists "read_only" on meta_ads_daily;
create policy "read_only" on meta_ads_daily for select using (true);

drop policy if exists "read_only" on meta_boosted_posts;
create policy "read_only" on meta_boosted_posts for select using (true);

-- pipeline_runs: canal meta_ads
alter table pipeline_runs drop constraint if exists chk_pipeline_runs_channel;
alter table pipeline_runs add constraint chk_pipeline_runs_channel
  check (channel in ('instagram', 'facebook', 'youtube', 'linkedin', 'meta_ads'));

comment on table meta_ads_daily is 'Agregado diário de mídia paga Meta (conta de anúncios Spin).';
comment on table meta_boosted_posts is 'Métricas por anúncio/post impulsionado (nível ad) no dia.';
