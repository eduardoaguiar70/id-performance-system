import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function useSupabase() {
  const fetchLatestKpiSnapshot = async () => {
    const { data, error } = await supabase
      .from('kpi_snapshots')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(1)
      .single()

    if (error) throw error
    return data
  }

  const fetchKpiHistory = async (conta_nome?: string, limit: number = 8) => {
    let query = supabase
      .from('kpi_snapshots')
      .select('periodo_fim, roas, taxa_conversao, investimento_total, receita_atribuida')
      .order('periodo_inicio', { ascending: false })
      .limit(limit)

    if (conta_nome) query = query.eq('conta_nome', conta_nome)

    const { data, error } = await query
    if (error) throw error
    return data.reverse()
  }

  const fetchMeetings = async () => {
    const { data, error } = await supabase
      .from('meeting_summaries')
      .select('*')
      .order('criado_em', { ascending: false })

    if (error) throw error
    return data
  }

  const fetchLatestTaskSnapshot = async () => {
    const { data, error } = await supabase
      .from('task_snapshots')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(1)
      .single()

    if (error) throw error
    return data
  }

  const fetchLatestKpiAnalysis = async (conta_nome: string) => {
    const { data, error } = await supabase
      .from('kpi_analises')
      .select('*')
      .eq('conta_nome', conta_nome)
      .order('criado_em', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error // Ignore if no rows
    return data || null
  }

  const fetchScraperLogs = async (limit: number = 5) => {
    const { data, error } = await supabase
      .from('scraper_logs')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  return {
    supabase,
    fetchLatestKpiSnapshot,
    fetchKpiHistory,
    fetchMeetings,
    fetchLatestTaskSnapshot,
    fetchLatestKpiAnalysis,
    fetchScraperLogs,
  }
}
