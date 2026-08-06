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
  enviado_em?: string | null
}

export interface NpsRelatorio {
  id: string
  conteudo_markdown: string
  criado_em: string
}

export interface NpsConfiguracoes {
  id: number
  mensagem_texto: string | null
  mensagem_2: string | null
  mensagem_3: string | null
  mensagem_4: string | null
  mensagem_5: string | null
  instrucoes_diretoria: string | null
  atualizado_em: string | null
}

export interface NpsCliente {
  id: string
  nome_cliente: string
  empresa: string | null
  whatsapp: string
  status_ativo: boolean
  ultimo_nps_em: string | null
  proximo_nps_em: string | null
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

  /**
   * Fetches the NPS configuration record (always id = 1).
   * Returns null if the record doesn't exist yet.
   */
  const fetchConfiguracoes = async (): Promise<NpsConfiguracoes | null> => {
    const { data, error } = await supabase
      .from('nps_configuracoes')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    if (error) throw error
    return data as NpsConfiguracoes | null
  }

  /**
   * Updates (or inserts) the NPS configuration record at id = 1.
   */
  const updateConfiguracoes = async (payload: {
    mensagem_texto: string
    mensagem_2?: string
    mensagem_3?: string
    mensagem_4?: string
    mensagem_5?: string
    instrucoes_diretoria?: string
  }): Promise<void> => {
    const { error } = await supabase
      .from('nps_configuracoes')
      .upsert({ id: 1, ...payload, atualizado_em: new Date().toISOString() }, { onConflict: 'id' })

    if (error) throw error
  }

  // ─── nps_clientes ────────────────────────────────────────────────────────────

  /** Fetches all clients from nps_clientes ordered by nome_cliente. */
  const fetchClientes = async (): Promise<NpsCliente[]> => {
    const { data, error } = await supabase
      .from('nps_clientes')
      .select('*')
      .order('nome_cliente', { ascending: true })

    if (error) throw error
    return (data ?? []) as NpsCliente[]
  }

  /** Creates a new client record. */
  const createCliente = async (payload: {
    nome_cliente: string
    empresa?: string
    whatsapp: string
  }): Promise<void> => {
    const { error } = await supabase
      .from('nps_clientes')
      .insert({ ...payload, status_ativo: true })

    if (error) throw error
  }

  /** Toggles status_ativo for a client. */
  const updateClienteStatus = async (id: string, status_ativo: boolean): Promise<void> => {
    const { error } = await supabase
      .from('nps_clientes')
      .update({ status_ativo })
      .eq('id', id)

    if (error) throw error
  }

  /** Permanently deletes a client record. */
  const deleteCliente = async (id: string): Promise<void> => {
    const { error } = await supabase.from('nps_clientes').delete().eq('id', id)
    if (error) throw error
  }

  const dispararNpsLote = async (clienteIds: string[], dataAgendamento?: string | null): Promise<number> => {
    if (clienteIds.length === 0) return 0

    // 1 — fetch active config messages
    const config = await fetchConfiguracoes()
    if (!config?.mensagem_texto) {
      throw new Error('Nenhuma mensagem configurada em Configurações NPS. Configure a Mensagem 1 antes de disparar.')
    }

    // 2 — fetch selected clients
    const { data: clientes, error: clientesError } = await supabase
      .from('nps_clientes')
      .select('id, nome_cliente, whatsapp, empresa')
      .in('id', clienteIds)

    if (clientesError) throw clientesError
    if (!clientes || clientes.length === 0) throw new Error('Nenhum cliente encontrado para os IDs selecionados.')

    // 3 — build batch payload
    const rows = clientes.map((c) => ({
      cliente_nome:    c.nome_cliente,
      cliente_whatsapp: c.whatsapp,
      empresa:          c.empresa ?? null,
      mensagem_texto:   config.mensagem_texto,
      mensagem_2:       config.mensagem_2 ?? null,
      mensagem_3:       config.mensagem_3 ?? null,
      mensagem_4:       config.mensagem_4 ?? null,
      mensagem_5:       config.mensagem_5 ?? null,
      status:           'pendente',
      data_agendamento: dataAgendamento || new Date().toISOString(),
    }))

    const { error: insertError } = await supabase.from('nps_disparos').insert(rows)
    if (insertError) throw insertError

    return rows.length
  }

  return {
    fetchAllDisparos,
    fetchLatestRelatorio,
    triggerGerarRelatorio,
    createDisparo,
    updateDisparo,
    fetchConfiguracoes,
    updateConfiguracoes,
    fetchClientes,
    createCliente,
    updateClienteStatus,
    deleteCliente,
    dispararNpsLote,
  }
}
