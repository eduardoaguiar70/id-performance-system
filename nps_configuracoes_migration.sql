-- ─── Migration: nps_configuracoes ────────────────────────────────────────────
-- Tabela de configuração global do fluxo NPS.
-- Sempre haverá apenas um registro com id = 1.
-- Execute este script no Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.nps_configuracoes (
  id             integer PRIMARY KEY DEFAULT 1,
  mensagem_1     text        NOT NULL,                  -- Abertura / Saudação (obrigatória)
  mensagem_2     text,                                  -- Opcional
  mensagem_3     text,                                  -- Opcional
  mensagem_4     text,                                  -- Opcional
  mensagem_5     text,                                  -- Opcional
  atualizado_em  timestamptz DEFAULT now()
);

-- Garante que apenas um registro possa existir (id fixo = 1)
ALTER TABLE public.nps_configuracoes
  ADD CONSTRAINT nps_configuracoes_single_row
  CHECK (id = 1);

-- Insere o registro padrão se ainda não existir
INSERT INTO public.nps_configuracoes (id, mensagem_1)
VALUES (1, 'Olá! Tudo bem? Aqui é da ID Performance. Gostaríamos de saber como foi sua experiência conosco até agora. 😊')
ON CONFLICT (id) DO NOTHING;

-- Row Level Security (opcional — ajuste conforme sua política)
ALTER TABLE public.nps_configuracoes ENABLE ROW LEVEL SECURITY;

-- Permite leitura e escrita para usuários autenticados
CREATE POLICY "Authenticated users can read nps_configuracoes"
  ON public.nps_configuracoes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update nps_configuracoes"
  ON public.nps_configuracoes FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert nps_configuracoes"
  ON public.nps_configuracoes FOR INSERT
  TO authenticated
  WITH CHECK (true);
