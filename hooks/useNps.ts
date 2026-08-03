import { supabase } from '@/lib/supabase'

// ─── Constants ─────────────────────────────────────────────────────────────────

const NPS_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_N8N_WEBHOOK_NPS_RELATORIO ??
  'https://n8n-n8n-start.kfocge.easypanel.host/webhook/gerar-relatorio-nps'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface NpsDisparo {
  id: string
  cliente_nome: string | null
  cliente_whatsapp: string | null
  empresa: string | null
  status: string | null
  mensagem_texto: string | null
  mensagem_2: string | null
  mensagem_3: string | null
  mensagem_4: string | null
  mensagem_5: string | null
  respostas_cliente: string | null
  nps_score: number | null
  nps_classificacao: string | null
  data_agendamento: string | null
  criado_em: string | null
}

export interface NpsRelatorio {
  id: string
  conteudo_markdown: string
  criado_em: string
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useNps() {
  /**
   * Fetches ALL nps_disparos records (not filtered by response).
   * Used for KPI metrics (em_andamento, concluido counts).
   */
  const fetchAllDisparos = async (): Promise<NpsDisparo[]> => {
    const { data, error } = await supabase
      .from('nps_disparos')
      .select('*')
      .order('data_agendamento', { ascending: false })

    if (error) throw error
    return (data ?? []) as NpsDisparo[]
  }

  /**
   * Fetches the most recent executive NPS report from nps_relatorios.
   * Returns null if no report exists yet.
   */
  const fetchLatestRelatorio = async (): Promise<NpsRelatorio | null> => {
    const { data, error } = await supabase
      .from('nps_relatorios')
      .select('id, conteudo_markdown, criado_em')
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data as NpsRelatorio | null
  }

  /**
   * Triggers the n8n webhook to generate a new NPS report via AI.
   * Throws on HTTP error so the caller can handle with toast.
   */
  const triggerGerarRelatorio = async (): Promise<void> => {
    const res = await fetch(NPS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger: 'manual', timestamp: new Date().toISOString() }),
    })

    if (!res.ok) {
      throw new Error(`Webhook respondeu com status ${res.status}`)
    }
  }

  /**
   * Creates a new manual NPS disparo record.
   */
  const createDisparo = async (payload: {
    cliente_nome: string
    cliente_whatsapp: string
    empresa?: string
    mensagem_texto: string
    mensagem_2?: string
    mensagem_3?: string
    mensagem_4?: string
    mensagem_5?: string
    data_agendamento: string | null
  }): Promise<void> => {
    const { error } = await supabase.from('nps_disparos').insert(payload)
    if (error) throw error
  }

  /**
   * Updates messages and scheduling date of an existing disparo.
   */
  const updateDisparo = async (
    id: string,
    payload: {
      mensagem_texto: string
      mensagem_2?: string
      mensagem_3?: string
      mensagem_4?: string
      mensagem_5?: string
      data_agendamento: string | null
    }
  ): Promise<void> => {
    const { error } = await supabase.from('nps_disparos').update(payload).eq('id', id)
    if (error) throw error
  }

  return {
    fetchAllDisparos,
    fetchLatestRelatorio,
    triggerGerarRelatorio,
    createDisparo,
    updateDisparo,
  }
}
