import { supabase } from '@/lib/supabase'
import { ultimaCapturaPorDia } from '@/lib/meta/dedupe'

export { supabase }

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
    // Busca a mais para compensar as recapturas do mesmo dia, que são descartadas abaixo.
    let query = supabase
      .from('kpi_snapshots')
      .select('conta_id, conta_nome, periodo_inicio, periodo_fim, criado_em, roas, taxa_conversao, investimento_total, receita_atribuida')
      .order('periodo_inicio', { ascending: false })
      .limit(limit * 10)

    if (conta_nome) query = query.eq('conta_nome', conta_nome)

    const { data, error } = await query
    if (error) throw error
    return ultimaCapturaPorDia(data)
      .sort((a, b) => String(b.periodo_inicio).localeCompare(String(a.periodo_inicio)))
      .slice(0, limit)
      .reverse()
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

    if (error && error.code !== 'PGRST116') throw error
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
