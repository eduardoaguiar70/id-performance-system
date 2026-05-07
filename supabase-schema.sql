-- Criação da tabela de Leads (já existe, mas documentada aqui)
/*
CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  instagram_username TEXT UNIQUE NOT NULL,
  instagram_url TEXT,
  full_name TEXT,
  followers_count INTEGER,
  bio TEXT,
  external_url TEXT,
  whatsapp TEXT,
  whatsapp_source TEXT,
  status TEXT DEFAULT 'pending',
  approached BOOLEAN DEFAULT false,
  approached_at TIMESTAMPTZ,
  selected BOOLEAN DEFAULT false,
  selected_at TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
*/

-- Novas tabelas para criar via Supabase SQL Editor

-- 1. Criativos
CREATE TABLE criativos (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  type TEXT NOT NULL, -- 'image' ou 'video'
  insights JSONB,     -- para armazenar análise da IA
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Briefings
CREATE TABLE briefings (
  id SERIAL PRIMARY KEY,
  client_name TEXT NOT NULL,
  objective TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  budget TEXT NOT NULL,
  deadline TEXT NOT NULL,
  content TEXT NOT NULL, -- Briefing gerado em Markdown
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Campanhas
CREATE TABLE campanhas (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'meta' ou 'google'
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'error'
  cpc NUMERIC(10, 2) DEFAULT 0,
  ctr NUMERIC(5, 2) DEFAULT 0,
  roas NUMERIC(5, 2) DEFAULT 0,
  budget_spent NUMERIC(10, 2) DEFAULT 0,
  budget_limit NUMERIC(10, 2) NOT NULL,
  alerts JSONB, -- Array de strings com alertas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Alertas (Gerais do sistema)
CREATE TABLE alertas (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Reunioes
CREATE TABLE reunioes (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  transcript TEXT NOT NULL,
  action_items JSONB,
  decisions JSONB,
  next_steps JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
