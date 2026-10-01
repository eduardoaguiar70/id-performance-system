-- Metas mensais de faturamento por cliente (aba Projeções do Dashboard E-commerce).
-- Rodar no Supabase: SQL Editor → New query → colar → Run.

create table if not exists metas_faturamento (
  id            uuid primary key default gen_random_uuid(),
  conta_id      text not null references contas_ativas(conta_id),
  mes           date not null check (extract(day from mes) = 1),
  valor         numeric(14, 2) not null check (valor >= 0),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (conta_id, mes)
);

-- Sem policies: só o servidor (service role) lê e grava, via /api/ecommerce/metas.
alter table metas_faturamento enable row level security;
