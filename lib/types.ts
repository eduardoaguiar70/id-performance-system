// ============================================================
// Tipos da plataforma ID Performance
// ============================================================

export type LeadStatus = "pending" | "approved" | "rejected" | "approached"

/**
 * Representa um lead scraped do Instagram pelo WF1 (n8n)
 * Espelha fielmente a tabela `leads` no Supabase
 */
export interface Lead {
  id: string
  instagram_username: string
  instagram_url: string
  full_name: string
  followers_count: number
  bio: string
  external_url: string
  whatsapp: string
  whatsapp_source: string
  status: LeadStatus
  approached: boolean
  approached_at: string | null
  selected: boolean
  selected_at: string | null
  scraped_at: string
  created_at: string
  updated_at: string
}

/** Filtros disponíveis na página de leads */
export interface LeadsFilters {
  status: LeadStatus | "all"
  hasWhatsApp: boolean
  minFollowers: number | null
  search: string
}

// ============================================================
// Tipos dos outros módulos (criativos, briefings, etc.)
// ============================================================

export interface Creative {
  id: number
  url: string
  type: "image" | "video"
  insights?: string
  created_at: string
}

export interface Briefing {
  id: number
  client_name: string
  objective: string
  target_audience: string
  budget: string
  deadline: string
  content: string
  created_at: string
}

export interface Campaign {
  id: number
  name: string
  platform: "meta" | "google"
  status: "active" | "paused" | "error"
  cpc: number
  ctr: number
  roas: number
  budget_spent: number
  budget_limit: number
  alerts?: string[]
}

export interface Meeting {
  id: number
  title: string
  date: string
  transcript: string
  action_items: string[]
  decisions: string[]
  next_steps: string[]
}

