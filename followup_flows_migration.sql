-- =======================================================
-- followup_flows — Tabela para o Flow Builder do n8n
-- Executar no SQL Editor do Supabase
-- =======================================================

create extension if not exists "pgcrypto";

create table if not exists public.followup_flows (
  id           uuid        default gen_random_uuid() primary key,
  label        text        not null check (label in ('LEAD', 'SUSPECT')),
  step         integer     not null check (step between 1 and 7),
  message_text text        not null default '',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (label, step)
);

-- Atualiza updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists followup_flows_set_updated_at on public.followup_flows;
create trigger followup_flows_set_updated_at
  before update on public.followup_flows
  for each row execute procedure public.set_updated_at();

-- =======================================================
-- RLS (Row Level Security) — Leitura e escrita pública (MVP)
-- =======================================================

alter table public.followup_flows enable row level security;

-- Permite SELECT para todos (anon + authenticated)
create policy "followup_flows_select_all"
  on public.followup_flows for select
  using (true);

-- Permite INSERT para todos
create policy "followup_flows_insert_all"
  on public.followup_flows for insert
  with check (true);

-- Permite UPDATE para todos
create policy "followup_flows_update_all"
  on public.followup_flows for update
  using (true)
  with check (true);

-- Permite DELETE para todos
create policy "followup_flows_delete_all"
  on public.followup_flows for delete
  using (true);

-- =======================================================
-- Seed de exemplo (opcional — remova se não quiser dados iniciais)
-- =======================================================

insert into public.followup_flows (label, step, message_text) values
  ('SUSPECT', 1, 'Oi {nome}! Tudo bem? Sou da ID Performance, vi que você se interessou em otimizar as suas campanhas. Posso te contar mais em 5 minutos?'),
  ('SUSPECT', 2, 'Olá {nome}! Só passando para ver se conseguiu ver minha mensagem de ontem. Temos ajudado clientes a reduzir o CPA em até 40%. Vale uma conversa rápida?'),
  ('SUSPECT', 3, 'E aí {nome}, tudo certo? Sei que o dia a dia é corrido. Mas seria incrível poder te mostrar o que estamos fazendo pelos nossos clientes. Quer agendar 15 minutos?')
on conflict (label, step) do nothing;
