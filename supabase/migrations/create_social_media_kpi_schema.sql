-- ============================================================
-- Social Media KPI Pipeline — Supabase Schema
-- Canais: LinkedIn, Instagram, YouTube, Facebook
-- Com melhorias: histórico temporal YouTube, CHECK constraints
-- ============================================================

-- Extensão para UUID
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- Tabela central de snapshots diários por canal
-- ------------------------------------------------------------
create table if not exists kpi_daily (
  id              uuid primary key default uuid_generate_v4(),
  channel         text not null,
  date            date not null,
  followers       bigint,
  impressions     bigint,
  reach           bigint,
  engagements     bigint,
  engagement_rate numeric(6,4),
  posts_published integer,
  video_views     bigint,
  link_clicks     bigint,
  created_at      timestamptz default now(),
  unique (channel, date),
  constraint chk_kpi_daily_channel check (channel in ('instagram', 'facebook', 'youtube', 'linkedin'))
);

-- ------------------------------------------------------------
-- Instagram — métricas por post
-- ------------------------------------------------------------
create table if not exists instagram_posts (
  id              uuid primary key default uuid_generate_v4(),
  post_id         text unique not null,
  date            date not null,
  type            text,
  caption         text,
  permalink       text,
  impressions     bigint,
  reach           bigint,
  likes           bigint,
  comments        bigint,
  shares          bigint,
  saves          bigint,
  video_views     bigint,
  engagement_rate numeric(6,4),
  created_at      timestamptz default now(),
  constraint chk_instagram_posts_type check (type is null or type in ('IMAGE', 'VIDEO', 'CAROUSEL_ALBUM', 'REELS'))
);

-- ------------------------------------------------------------
-- Facebook — métricas por post e página
-- ------------------------------------------------------------
create table if not exists facebook_posts (
  id              uuid primary key default uuid_generate_v4(),
  post_id         text unique not null,
  date            date not null,
  type            text,
  message         text,
  permalink       text,
  impressions     bigint,
  reach           bigint,
  reactions       bigint,
  comments        bigint,
  shares          bigint,
  video_views     bigint,
  link_clicks     bigint,
  engagement_rate numeric(6,4),
  created_at      timestamptz default now(),
  constraint chk_facebook_posts_type check (type is null or type in ('photo', 'video', 'link', 'status'))
);

-- ------------------------------------------------------------
-- YouTube — métricas por vídeo (com histórico temporal)
-- Permite múltiplas linhas por video_id para evolução ao longo do tempo
-- ------------------------------------------------------------
create table if not exists youtube_videos (
  id              uuid primary key default uuid_generate_v4(),
  video_id        text not null,
  date            date not null,
  title           text,
  type            text,
  views           bigint,
  watch_time_min  bigint,
  avg_view_pct    numeric(5,2),
  likes           bigint,
  comments        bigint,
  shares          bigint,
  impressions     bigint,
  ctr             numeric(6,4),
  subscribers_gained integer,
  created_at      timestamptz default now(),
  unique (video_id, date),
  constraint chk_youtube_videos_type check (type is null or type in ('upload', 'short', 'live'))
);

-- ------------------------------------------------------------
-- LinkedIn — métricas por post (company page)
-- ------------------------------------------------------------
create table if not exists linkedin_posts (
  id              uuid primary key default uuid_generate_v4(),
  post_id         text unique not null,
  date            date not null,
  type            text,
  text_preview    text,
  impressions     bigint,
  unique_impressions bigint,
  clicks          bigint,
  reactions       bigint,
  comments        bigint,
  shares          bigint,
  engagement_rate numeric(6,4),
  ctr             numeric(6,4),
  created_at      timestamptz default now(),
  constraint chk_linkedin_posts_type check (type is null or type in ('ARTICLE', 'IMAGE', 'VIDEO', 'DOCUMENT'))
);

-- ------------------------------------------------------------
-- Log de execuções do pipeline
-- ------------------------------------------------------------
create table if not exists pipeline_runs (
  id          uuid primary key default uuid_generate_v4(),
  run_date    date not null,
  channel     text not null,
  status      text not null,
  records_in  integer default 0,
  error_msg   text,
  duration_ms integer,
  created_at  timestamptz default now(),
  constraint chk_pipeline_runs_status check (status in ('success', 'error', 'partial')),
  constraint chk_pipeline_runs_channel check (channel in ('instagram', 'facebook', 'youtube', 'linkedin'))
);

-- ------------------------------------------------------------
-- Índices para performance
-- ------------------------------------------------------------
create index if not exists idx_kpi_daily_channel_date   on kpi_daily (channel, date desc);
create index if not exists idx_instagram_posts_date     on instagram_posts (date desc);
create index if not exists idx_facebook_posts_date      on facebook_posts (date desc);
create index if not exists idx_youtube_videos_date      on youtube_videos (date desc);
create index if not exists idx_youtube_videos_video_id  on youtube_videos (video_id, date desc);
create index if not exists idx_linkedin_posts_date      on linkedin_posts (date desc);
create index if not exists idx_pipeline_runs_date       on pipeline_runs (run_date desc, channel);

-- ------------------------------------------------------------
-- Row Level Security (RLS) — somente leitura para o dashboard
-- ATENÇÃO: using (true) permite leitura pública. Se os dados forem
-- sensíveis, troque por policies baseadas em auth.uid() ou roles.
-- ------------------------------------------------------------
alter table kpi_daily        enable row level security;
alter table instagram_posts  enable row level security;
alter table facebook_posts   enable row level security;
alter table youtube_videos   enable row level security;
alter table linkedin_posts   enable row level security;
alter table pipeline_runs    enable row level security;

drop policy if exists "read_only" on kpi_daily;
create policy "read_only" on kpi_daily        for select using (true);
drop policy if exists "read_only" on instagram_posts;
create policy "read_only" on instagram_posts  for select using (true);
drop policy if exists "read_only" on facebook_posts;
create policy "read_only" on facebook_posts   for select using (true);
drop policy if exists "read_only" on youtube_videos;
create policy "read_only" on youtube_videos   for select using (true);
drop policy if exists "read_only" on linkedin_posts;
create policy "read_only" on linkedin_posts   for select using (true);
drop policy if exists "read_only" on pipeline_runs;
create policy "read_only" on pipeline_runs    for select using (true);

-- Apenas service_role (usado pelo ETL) pode inserir/atualizar
-- (service_role bypassa RLS por padrão no Supabase)
