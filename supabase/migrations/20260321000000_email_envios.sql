-- Tabela para registrar envios de e-mail por tipo (relatório diretoria, etc.)
-- Permite rastrear fluxo de dados de e-mails e adicionar novos tipos no futuro.

create table if not exists email_envios (
  id                uuid primary key default uuid_generate_v4(),
  data              date not null,
  tipo              text not null,
  destinatarios_count integer not null default 0,
  created_at        timestamptz default now()
);

create index if not exists idx_email_envios_data on email_envios (data desc);
create index if not exists idx_email_envios_tipo on email_envios (tipo);

comment on table email_envios is 'Registro de envios de e-mail por tipo. 1 fluxo = 1 destinatário.';
comment on column email_envios.tipo is 'Nome do e-mail (ex: relatorio_diretoria). Usado para agregar e adicionar novos tipos no futuro.';
comment on column email_envios.destinatarios_count is 'Quantidade de destinatários que receberam o e-mail.';

alter table email_envios enable row level security;
create policy "read_email_envios" on email_envios for select using (true);
