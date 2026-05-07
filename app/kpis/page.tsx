/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, prefer-const, @typescript-eslint/no-unused-vars */
"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useSupabase } from "@/hooks/useSupabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowDownIcon, ArrowUpIcon, AlertTriangleIcon, TrendingUp, Building2, RefreshCw, Bot, Lightbulb, Target, PauseCircle, CalendarRange, X, ShoppingCart, CreditCard, Eye, Repeat2, DollarSign, ShoppingBag } from "lucide-react"
import { format, subDays, isAfter, differenceInDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { useCliente } from "@/context/ClienteContext"
import { ClienteBanner } from "@/components/cliente-banner"

// --- Formatters ---
const fmtBRL = (v: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0)
const fmtInt = (v: any) => new Intl.NumberFormat('pt-BR').format(Number(v) || 0)
const fmtFreq = (v: any) => `${(Number(v) || 0).toFixed(2)}x`

// --- Aggregates multiple daily rows into one synthetic snapshot ---
function aggregateRows(rows: any[]): any | null {
  if (!rows || rows.length === 0) return null
  if (rows.length === 1) return rows[0]
  const sum = (key: string) => rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0)
  const avg = (key: string) => sum(key) / rows.length
  const investimento  = sum('investimento_total')
  const receita       = sum('receita_atribuida')
  const compras       = sum('compras')
  const impressoes    = sum('impressoes')
  const cliques       = sum('cliques')
  const leads         = sum('leads_gerados')
  const add_to_cart   = sum('add_to_cart')
  const init_checkout = sum('initiate_checkout')
  const roas     = investimento > 0 ? receita / investimento : 0
  const cac      = compras > 0 ? investimento / compras : 0
  const cpl      = leads > 0 ? investimento / leads : 0
  const cpm      = impressoes > 0 ? (investimento / impressoes) * 1000 : 0
  const cpc      = cliques > 0 ? investimento / cliques : 0
  const ctr      = impressoes > 0 ? (cliques / impressoes) * 100 : 0
  const taxa_conv = cliques > 0 ? (compras / cliques) * 100 : 0
  const reach    = avg('reach')
  const frequency = avg('frequency')
  return {
    ...rows[0],
    investimento_total: investimento, receita_atribuida: receita, compras,
    impressoes, cliques, leads_gerados: leads, add_to_cart,
    initiate_checkout: init_checkout, roas, cac, cpl, cpm, cpc, ctr,
    taxa_conversao: taxa_conv, reach, frequency,
    roas_anterior: undefined, cac_anterior: undefined, cpl_anterior: undefined,
    taxa_conversao_anterior: undefined, leads_gerados_anterior: undefined,
    ctr_anterior: undefined, investimento_total_anterior: undefined,
  }
}


export default function KPIsPage() {
  const { supabase, fetchKpiHistory, fetchLatestKpiAnalysis } = useSupabase()
  const [snapshot, setSnapshot] = useState<any>(null)
  const [analiseIA, setAnaliseIA] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periodFilter, setPeriodFilter] = useState("all")
  const { clienteSelecionado } = useCliente()
  const [atualizando, setAtualizando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [gerandoIA, setGerandoIA] = useState(false)

  // Modal de seleção de período para análise IA
  const [analiseModalOpen, setAnaliseModalOpen] = useState(false)
  const [analiseDateRange, setAnaliseDateRange] = useState<DateRange | undefined>(undefined)

  // Calendar date range state
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [dateFilterActive, setDateFilterActive] = useState(false)
  const [consultando, setConsultando] = useState(false)

  // Derived string values for API calls
  const dateStart = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : ""
  const dateEnd = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : ""

  const handleAtualizarKpis = async () => {
    if (!clienteSelecionado) {
      toast.error("Selecione um cliente antes de atualizar.")
      return
    }
    setAtualizando(true)
    const toastId = toast.loading(`Atualizando KPIs de ${clienteSelecionado.conta_nome}...`)
    try {
      const res = await fetch("https://n8n-n8n-start.kfocge.easypanel.host/webhook/kpis-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conta_id:   clienteSelecionado.conta_id,
          conta_nome: clienteSelecionado.conta_nome
        })
      })
      if (!res.ok) throw new Error()
      toast.success("KPIs atualizados com sucesso!", { id: toastId })
      setTimeout(() => window.location.reload(), 2000)
    } catch {
      toast.error("Erro ao atualizar KPIs. Tente novamente.", { id: toastId })
    } finally {
      setAtualizando(false)
    }
  }

  const handleImportarHistorico = async () => {
    if (!clienteSelecionado) { toast.error("Selecione um cliente."); return }
    setImportando(true)
    const toastId = toast.loading("Importando histórico de 90 dias... Isso pode levar alguns minutos.")
    try {
      await fetch("/api/kpis-historico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conta_id: clienteSelecionado.conta_id, historico: true })
      })
      toast.success("ImportaÃ§Ã£o iniciada! Os dados aparecerÃ£o em breve.", { id: toastId, duration: 6000 })
      await new Promise(r => setTimeout(r, 5000))
      const { data } = await supabase
        .from('kpi_snapshots')
        .select('*')
        .eq('conta_nome', clienteSelecionado.conta_nome)
        .order('periodo_inicio', { ascending: false })
        .limit(30)
      setSnapshot(aggregateRows(data || []))
    } catch {
      toast.error("Erro ao importar histórico. Tente novamente.", { id: toastId })
    } finally {
      setImportando(false)
    }
  }

  const handleGerarAnaliseIA = async () => {
    if (!clienteSelecionado) { toast.error("Selecione um cliente."); return }
    if (!analiseDateRange?.from || !analiseDateRange?.to) {
      toast.error("Selecione data de início e fim no calendário.")
      return
    }

    const dStart = format(analiseDateRange.from, "yyyy-MM-dd")
    const dEnd   = format(analiseDateRange.to,   "yyyy-MM-dd")

    setAnaliseModalOpen(false) // Fecha o modal antes de iniciar
    setGerandoIA(true)
    const toastId = toast.loading("A IA está analisando os dados... Aguarde até 30 segundos.")
    try {
      const res = await fetch("https://n8n-n8n-start.kfocge.easypanel.host/webhook/kpis-analise-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conta_id:   clienteSelecionado.conta_id,
          conta_nome: clienteSelecionado.conta_nome,
          date_start: dStart,
          date_end:   dEnd,
        })
      })
      if (!res.ok) throw new Error("Webhook retornou erro.")

      // Polling: tenta buscar a nova análise a cada 5s por até 40s
      toast.loading("Análise enviada! Buscando resultado...", { id: toastId })
      let novaAnalise = null
      for (let attempt = 0; attempt < 8; attempt++) {
        await new Promise(r => setTimeout(r, 5000))
        const resultado = await fetchLatestKpiAnalysis(clienteSelecionado.conta_nome)
        if (resultado && resultado.criado_em) {
          const diff = (Date.now() - new Date(resultado.criado_em).getTime()) / 1000 / 60 / 60
          if (diff < 2) {
            novaAnalise = resultado
            break
          }
        }
      }

      if (novaAnalise) {
        setAnaliseIA(novaAnalise)
        toast.success("Análise IA gerada com sucesso!", { id: toastId })
      } else {
        toast.error("A IA demorou mais que o esperado. Tente novamente em instantes.", { id: toastId })
      }
    } catch (err: any) {
      console.error("Erro ao gerar análise IA:", err)
      toast.error("Erro ao acionar a análise IA. Verifique a conexão.", { id: toastId })
    } finally {
      setGerandoIA(false)
    }
  }

  const handleConsultarPeriodo = async () => {
    if (!clienteSelecionado) { toast.error("Selecione um cliente."); return }
    if (!dateRange?.from || !dateRange?.to) { toast.error("Selecione um período no calendÃ¡rio."); return }
    const diff = differenceInDays(dateRange.to, dateRange.from)
    if (diff > 90) { toast.error("O período máximo é de 90 dias."); return }
    setConsultando(true)
    setLoading(true)
    const toastId = toast.loading("Consultando período...")
    try {
      await fetch("/api/kpis-historico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conta_id: clienteSelecionado.conta_id, date_start: dateStart, date_end: dateEnd })
      })
      await new Promise(r => setTimeout(r, 3000))
      // Fetch ALL daily rows in range â€” no .limit(1).single()
      const { data, error: dbErr } = await supabase
        .from('kpi_snapshots')
        .select('*')
        .eq('conta_nome', clienteSelecionado.conta_nome)
        .gte('periodo_inicio', dateStart)
        .lte('periodo_inicio', dateEnd)
        .order('periodo_inicio', { ascending: false })
      if (dbErr) throw dbErr
      setSnapshot(aggregateRows(data || []))
      setDateFilterActive(true)
      toast.success(`Período agregado: ${(data || []).length} dia(s).`, { id: toastId })
    } catch {
      toast.error("Erro ao consultar período. Tente novamente.", { id: toastId })
    } finally {
      setConsultando(false)
      setLoading(false)
    }
  }

  const handleLimparFiltro = () => {
    setDateRange(undefined)
    setDateFilterActive(false)
    setPeriodFilter("all")
  }

  useEffect(() => {
    async function loadData() {
      // FIX 1: Reset imediato — apaga dados do cliente anterior antes de qualquer fetch
      setSnapshot(null)
      setAnaliseIA(null)
      setHistory([])
      setLoading(true)
      setError(null)

      try {
        let startStr: string
        let endStr: string

        // FIX 2: Se há filtro de data ativo, usa as datas do calendário mesmo ao trocar de cliente
        if (dateFilterActive && dateStart && dateEnd) {
          startStr = dateStart
          endStr = dateEnd
        } else {
          const now = new Date()
          endStr = now.toISOString().split('T')[0]
          const startDate = new Date()
          if (periodFilter === 'week')         startDate.setDate(now.getDate() - 7)
          else if (periodFilter === 'month')   startDate.setMonth(now.getMonth() - 1)
          else if (periodFilter === 'quarter') startDate.setMonth(now.getMonth() - 3)
          else                                 startDate.setDate(now.getDate() - 1)
          startStr = startDate.toISOString().split('T')[0]
        }

        // Fetch ALL daily rows in the period
        const { data: rows, error: fetchError } = await supabase
          .from('kpi_snapshots')
          .select('*')
          .eq('conta_nome', clienteSelecionado!.conta_nome)
          .gte('periodo_inicio', startStr)
          .lte('periodo_inicio', endStr)
          .order('periodo_inicio', { ascending: false })
        if (fetchError) throw fetchError

        // FIX 3: Array vazio → aggregateRows retorna null → Empty State renderiza corretamente
        const aggregated = aggregateRows(rows || [])
        setSnapshot(aggregated)

        const aiData = await fetchLatestKpiAnalysis(clienteSelecionado!.conta_nome)
        setAnaliseIA(aiData)
        const histData = await fetchKpiHistory(clienteSelecionado?.conta_nome, 8)
        const formattedHistory = histData.map((h: any) => {
          const date = new Date(h.periodo_inicio || h.periodo_fim)
          return {
            ...h,
            periodoFormatado: `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
          }
        })
        setHistory(formattedHistory)
      } catch (err: any) {
        console.error("Error fetching KPIs:", err)
        setSnapshot(null) // garante Empty State em caso de erro também
        setError("Erro ao carregar dados de KPIs.")
        toast.error("Não foi possível carregar os KPIs.")
      } finally {
        setLoading(false)
      }
    }

    if (clienteSelecionado) {
      loadData()
    } else {
      setSnapshot(null); setAnaliseIA(null); setHistory([]); setLoading(false)
    }
  }, [periodFilter, clienteSelecionado, dateFilterActive])

  const renderMetricCard = (
    title: string, 
    value: string | number, 
    previousValue?: number, 
    currentRawValue?: number,
    inverseLogic: boolean = false
  ) => {
    let variation = 0
    let isPositive = true

    if (currentRawValue !== undefined && previousValue !== undefined && previousValue !== 0) {
      variation = ((currentRawValue - previousValue) / previousValue) * 100
      isPositive = inverseLogic ? variation <= 0 : variation >= 0
    }

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {previousValue !== undefined && (
            <p className={`text-xs flex items-center mt-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {variation >= 0 ? <ArrowUpIcon className="mr-1 h-3 w-3" /> : <ArrowDownIcon className="mr-1 h-3 w-3" />}
              {Math.abs(variation).toFixed(1)}% vs anterior
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  const renderAnaliseIA = () => {
    if (loading) {
      return (
        <div className="space-y-4 mt-4">
          <Skeleton className="h-[150px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      )
    }

    // --- Regra de cache de 2 horas ---
    const isAnaliseValida = (() => {
      if (!analiseIA || !analiseIA.criado_em) return false
      const diffHoras = (Date.now() - new Date(analiseIA.criado_em).getTime()) / 1000 / 60 / 60
      return diffHoras < 2
    })()

    if (!isAnaliseValida) {
      return (
        <Card className="mt-4 border-dashed">
          <CardContent className="pt-10 pb-10 flex flex-col items-center justify-center text-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <div className="relative rounded-full bg-primary/10 p-5">
                <Bot className="h-10 w-10 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold">
                {analiseIA ? "Análise Expirada" : "Nenhuma Análise Disponível"}
              </h3>
              <p className="text-muted-foreground mt-2 max-w-sm text-sm">
                {analiseIA
                  ? "A última análise tem mais de 2 horas. Gere uma nova para o período selecionado."
                  : "A IA ainda não analisou esta conta. Clique no botão abaixo para gerar a análise agora."}
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => setAnaliseModalOpen(true)}
              disabled={gerandoIA || !clienteSelecionado}
              className="gap-2 shadow-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0"
            >
              {gerandoIA ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> A IA está analisando os dados...</>
              ) : (
                <><Bot className="h-4 w-4" /> Gerar Análise IA Agora</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Um calendário será aberto para você escolher o período exato da análise.
            </p>
          </CardContent>
        </Card>
      )
    }

    // Safely parse JSON if they are strings
    const parseSafe = (field: any, fallback: any) => {
      if (!field) return fallback
      if (typeof field === 'string') {
        try { return JSON.parse(field) } catch { return field }
      }
      return field
    }

    const observacoes = parseSafe(analiseIA.observacoes, null)
    const acoes = parseSafe(analiseIA.acoes_recomendadas, null)
    const campanhasIA = parseSafe(analiseIA.campanhas, null)
    const anunciosIA = parseSafe(analiseIA.anuncios, null)

    // Oculta cards se os objetos vierem vazios do banco
    const hasCampanhas = campanhasIA && Object.keys(campanhasIA).length > 0
    const hasAnuncios = anunciosIA && Object.keys(anunciosIA).length > 0

    const renderTextOrArray = (content: any) => {
      if (!content) return null
      if (Array.isArray(content)) {
        return <ul className="list-disc pl-5 space-y-1">{content.map((item, i) => <li key={i}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>)}</ul>
      }
      if (typeof content === 'object') {
        return <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">{JSON.stringify(content, null, 2)}</pre>
      }
      return <p>{String(content)}</p>
    }

    const formatCurrency = (value: any) => {
      const num = Number(value)
      if (isNaN(num)) return value
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
    }

    const renderCampanhasIA = (data: any) => {
      if (!data) return <p className="text-muted-foreground">Sem dados disponíveis.</p>
      return Object.entries(data).map(([key, val], idx) => {
        if (!Array.isArray(val)) return null
        const isPositive = key.includes('melhor') || key.includes('top') || key.includes('bom')
        return (
          <div key={idx} className="mb-6 last:mb-0">
            <h4 className={`font-semibold capitalize mb-3 flex items-center gap-2 ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
              {key.replace(/_/g, ' ')}
            </h4>
            <div className="space-y-3">
              {val.map((item: any, i: number) => (
                <div key={i} className={`bg-muted/30 p-4 rounded-lg border ${isPositive ? 'border-green-500/20' : 'border-red-500/20'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-base">{item.nome || item.campanha || "Campanha Desconhecida"}</span>
                    {item.roas && (
                      <Badge variant={isPositive ? 'default' : 'destructive'} className={isPositive ? 'bg-green-500 hover:bg-green-600' : ''}>
                        ROAS: {Number(item.roas).toFixed(2)}x
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-4 mb-3 text-xs text-muted-foreground">
                    {item.spend !== undefined && <span>Investimento: <strong className="text-foreground">{formatCurrency(item.spend)}</strong></span>}
                    {item.compras !== undefined && <span>Compras: <strong className="text-foreground">{item.compras}</strong></span>}
                  </div>
                  {(item.insight || item.justificativa || item.motivo) && (
                    <div className="bg-background rounded p-2 text-sm text-foreground/90 border-l-2 border-primary/40">
                      {item.insight || item.justificativa || item.motivo}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })
    }

    const renderAnunciosIA = (data: any) => {
      if (!data) return <p className="text-muted-foreground">Sem dados disponíveis.</p>
      return Object.entries(data).map(([key, val], idx) => {
        if (!Array.isArray(val)) return null
        const isPause = key.includes('pausa') || key.includes('pior') || key.includes('ruim')
        return (
          <div key={idx} className="mb-6 last:mb-0">
            <h4 className={`font-semibold capitalize mb-3 flex items-center gap-2 ${isPause ? 'text-orange-500' : 'text-green-600'}`}>
              {isPause && <PauseCircle className="h-4 w-4" />}
              {key.replace(/_/g, ' ')}
            </h4>
            <div className="space-y-3">
              {val.map((item: any, i: number) => (
                <div key={i} className={`bg-muted/30 p-3 rounded-lg border-l-4 ${isPause ? 'border-orange-500' : 'border-green-500'}`}>
                  <div className="mb-1">
                    <span className="font-semibold text-sm block text-foreground">{item.ad_name || item.anuncio || item.nome || "Anúncio Desconhecido"}</span>
                    {item.campaign && <span className="text-[10px] uppercase text-muted-foreground bg-muted px-2 py-0.5 rounded-sm inline-block mt-1">Campanha: {item.campaign}</span>}
                  </div>
                  {(item.insight || item.motivo || item.justificativa) && (
                    <span className="text-muted-foreground text-xs block leading-snug mt-2">
                      {item.insight || item.motivo || item.justificativa}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })
    }

    return (
      <div className="space-y-6 mt-4 animate-in fade-in duration-500">

        {/* Cabeçalho com timestamp e botão de regeneração */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Análise gerada em:{" "}
            <span className="font-medium text-foreground">
              {format(new Date(analiseIA.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAnaliseModalOpen(true)}
            disabled={gerandoIA}
            className="gap-2 text-xs"
          >
            {gerandoIA
              ? <><RefreshCw className="h-3 w-3 animate-spin" /> Gerando...</>
              : <><RefreshCw className="h-3 w-3" /> Gerar nova análise</>}
          </Button>
        </div>

        {/* Observações / Contexto Geral */}
        {observacoes && (
          <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <Bot className="h-5 w-5" />
                Contexto Geral da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-foreground/90">
              {renderTextOrArray(observacoes)}
            </CardContent>
          </Card>
        )}

        {/* Ações Recomendadas */}
        {acoes && (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Recomendações e Verba
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {renderTextOrArray(acoes)}
            </CardContent>
          </Card>
        )}

        {/* Campanhas e Anúncios — só renderiza se não estiverem vazios */}
        {(hasCampanhas || hasAnuncios) && (
          <div className="grid gap-4 md:grid-cols-2">
            {hasCampanhas && (
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-500" />
                    Análise de Campanhas
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm pt-4">
                  {renderCampanhasIA(campanhasIA)}
                </CardContent>
              </Card>
            )}
            {hasAnuncios && (
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-500" />
                    Análise de Anúncios
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm pt-4">
                  {renderAnunciosIA(anunciosIA)}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderContent = () => {
    if (!clienteSelecionado) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground border rounded-xl bg-card mt-4">
          <Building2 className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhum cliente selecionado</p>
          <p className="text-sm mt-1">Use o seletor no topo para escolher um cliente</p>
        </div>
      )
    }

    if (loading) {
      return (
        <div className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      )
    }

    if (error) {
      return (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950/20 mt-4">
          <CardContent className="pt-6 flex items-center text-red-500">
            <AlertTriangleIcon className="mr-2" />
            {error}
          </CardContent>
        </Card>
      )
    }

    if (!snapshot) {
      return (
        <Card className="mt-4 border-dashed">
          <CardContent className="pt-10 pb-10 flex flex-col items-center justify-center text-center gap-4">
            <div className="rounded-full bg-primary/10 p-4">
              <TrendingUp className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Nenhum dado encontrado</h3>
              <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                Esta conta ainda não possui dados de KPIs. Importe o histórico dos últimos 90 dias para começar.
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleImportarHistorico}
              disabled={importando}
              className="gap-2 shadow-lg"
            >
              {importando
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> Importando...</>
                : <><CalendarRange className="h-4 w-4" /> Importar Histórico (90 dias)</>}
            </Button>
            <p className="text-xs text-muted-foreground">
              Ou use &quot;Atualizar KPIs&quot; para buscar somente os dados de hoje.
            </p>
          </CardContent>
        </Card>
      )
    }

    // Parse metrics
    const roas = snapshot.roas || 0
    const prevRoas = snapshot.roas_anterior
    
    const cac = snapshot.cac || 0
    const prevCac = snapshot.cac_anterior
    
    const cpl = snapshot.cpl || 0
    const prevCpl = snapshot.cpl_anterior
    
    const taxaConv = snapshot.taxa_conversao || 0
    const prevTaxaConv = snapshot.taxa_conversao_anterior
    
    const leads = snapshot.leads_gerados || 0
    const prevLeads = snapshot.leads_gerados_anterior
    
    const ctr = snapshot.ctr || 0
    const prevCtr = snapshot.ctr_anterior
    
    const investimento = snapshot.investimento_total || 0
    const prevInvestimento = snapshot.investimento_total_anterior

    // Parse campaigns safely
    const alertas = typeof snapshot.alertas === 'string'
      ? JSON.parse(snapshot.alertas)
      : (snapshot.alertas || [])

    const campanhas = typeof snapshot.campanhas === 'string'
      ? JSON.parse(snapshot.campanhas)
      : (snapshot.campanhas || {})

    const bestCampaign = campanhas.melhor_desempenho
    const worstCampaign = campanhas.pior_desempenho

    return (
      <>
        {snapshot.tem_alerta_critico && alertas && alertas.length > 0 && (
          <Card className="border-red-500 mt-4">
            <CardHeader>
              <CardTitle className="text-red-500 flex items-center">
                <AlertTriangleIcon className="mr-2 h-5 w-5" />
                Alertas Ativos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alertas.map((alerta: any, index: number) => (
                <div key={index} className="flex items-center">
                  <Badge variant={alerta.nivel === 'critico' ? 'destructive' : 'secondary'} className={alerta.nivel === 'atencao' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}>
                    {alerta.nivel.toUpperCase()}
                  </Badge>
                  <span className="ml-2 text-sm">{alerta.mensagem}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-4">
          {renderMetricCard("ROAS", `${roas.toFixed(2)}x`, prevRoas, roas)}
          {renderMetricCard("CAC", `R$ ${cac.toFixed(2)}`, prevCac, cac, true)}
          {renderMetricCard("CPL", `R$ ${cpl.toFixed(2)}`, prevCpl, cpl, true)}
          {renderMetricCard("Taxa de Conversão", `${taxaConv.toFixed(1)}%`, prevTaxaConv, taxaConv)}
          {renderMetricCard("Leads Gerados", leads, prevLeads, leads)}
          {renderMetricCard("CTR", `${ctr.toFixed(2)}%`, prevCtr, ctr)}
          {renderMetricCard("Investimento Total", `R$ ${investimento.toFixed(2)}`, prevInvestimento, investimento)}
        </div>

        {/* Ã¢â€â‚¬Ã¢â€â‚¬ ConversÃƒÂµes & Vendas Ã¢â€â‚¬Ã¢â€â‚¬ */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">ConversÃƒÂµes &amp; Vendas</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Atribuída</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{fmtBRL(snapshot.receita_atribuida)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compras</CardTitle>
                <ShoppingBag className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{fmtInt(snapshot.compras)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Adições ao Carrinho</CardTitle>
                <ShoppingCart className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{fmtInt(snapshot.add_to_cart)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Checkouts Iniciados</CardTitle>
                <CreditCard className="h-4 w-4 text-violet-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{fmtInt(snapshot.initiate_checkout)}</div></CardContent>
            </Card>
          </div>
        </div>

        {/* Ã¢â€â‚¬Ã¢â€â‚¬ Topo de Funil Ã¢â€â‚¬Ã¢â€â‚¬ */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="h-4 w-4 text-sky-500" />
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Topo de Funil</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPM</CardTitle>
                <TrendingUp className="h-4 w-4 text-sky-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{fmtBRL(snapshot.cpm)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPC</CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{fmtBRL(snapshot.cpc)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alcance</CardTitle>
                <Eye className="h-4 w-4 text-sky-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{fmtInt(snapshot.reach)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Frequência</CardTitle>
                <Repeat2 className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{fmtFreq(snapshot.frequency)}</div></CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <Card className="col-span-1 md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle>Histórico de Desempenho (ROAS vs Conversão)</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="periodoFormatado" className="text-xs" />
                    <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" className="text-xs" />
                    <YAxis yAxisId="right" orientation="right" stroke="#10b981" className="text-xs" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="roas" name="ROAS" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 8 }} />
                    <Line yAxisId="right" type="monotone" dataKey="taxa_conversao" name="Conversão (%)" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Dados insuficientes para o gráfico
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4 col-span-1">
            {bestCampaign && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Melhor Desempenho</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-lg">{bestCampaign.nome}</p>
                  <div className="flex justify-between items-center mt-2">
                    <Badge className="bg-green-500 hover:bg-green-600">ROAS: {bestCampaign.roas}x</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{bestCampaign.motivo}</p>
                </CardContent>
              </Card>
            )}

            {worstCampaign && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Pior Desempenho</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-lg">{worstCampaign.nome}</p>
                  <div className="flex justify-between items-center mt-2">
                    <Badge variant="destructive">ROAS: {worstCampaign.roas}x</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{worstCampaign.motivo}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <ClienteBanner />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Painel de KPIs
          </h2>
          <Button onClick={handleAtualizarKpis} disabled={atualizando || !clienteSelecionado} size="sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${atualizando ? "animate-spin" : ""}`} />
            {atualizando ? "Atualizando..." : "Atualizar KPIs"}
          </Button>
        </div>

        {/* Calendar Date Range Picker */}
        <div className="flex flex-wrap items-center gap-2">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 justify-start text-left font-normal min-w-[240px]"
              >
                <CalendarRange className="mr-2 h-4 w-4 text-muted-foreground" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <span>
                      {format(dateRange.from, "dd/MM/yyyy")} &rarr; {format(dateRange.to, "dd/MM/yyyy")}
                    </span>
                  ) : (
                    format(dateRange.from, "dd/MM/yyyy")
                  )
                ) : (
                  <span className="text-muted-foreground">Selecionar período...</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                locale={ptBR}
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range)
                  if (range?.from && range?.to) setCalendarOpen(false)
                }}
                disabled={(date) =>
                  isAfter(date, new Date()) || date < subDays(new Date(), 90)
                }
                numberOfMonths={2}
              />
              <div className="flex justify-end gap-2 border-t p-3">
                <Button size="sm" variant="ghost" onClick={() => { setDateRange(undefined); setCalendarOpen(false) }}>
                  Limpar
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            size="sm"
            onClick={handleConsultarPeriodo}
            disabled={consultando || !clienteSelecionado || !dateRange?.from || !dateRange?.to}
          >
            {consultando ? <RefreshCw className="mr-2 h-3 w-3 animate-spin" /> : <CalendarRange className="mr-2 h-3 w-3" />}
            {consultando ? "Consultando..." : "Consultar Período"}
          </Button>

          {dateFilterActive && (
            <Button size="sm" variant="outline" onClick={handleLimparFiltro}>
              <X className="mr-1 h-3 w-3" /> Limpar Filtro
            </Button>
          )}

          {!dateFilterActive && snapshot && (
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[155px] h-9">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Último snapshot</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <Tabs defaultValue="metricas" className="mt-4">
        <TabsList className="mb-4">
          <TabsTrigger value="metricas">Métricas de Performance</TabsTrigger>
          <TabsTrigger value="analise" className="flex items-center gap-1">
            <Bot className="h-4 w-4" /> Análise IA
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="metricas">
          {renderContent()}
        </TabsContent>
        
        <TabsContent value="analise">
          {renderAnaliseIA()}
        </TabsContent>
      </Tabs>

      {/* Modal de seleção de período para Análise IA */}
      <Dialog open={analiseModalOpen} onOpenChange={setAnaliseModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Analisar Período com IA</DialogTitle>
            <DialogDescription>
              Selecione o intervalo de datas que a IA deve analisar. O limite máximo é de 90 dias.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex justify-center">
            <Calendar
              initialFocus
              mode="range"
              locale={ptBR}
              selected={analiseDateRange}
              onSelect={setAnaliseDateRange}
              disabled={(date) => isAfter(date, new Date()) || date < subDays(new Date(), 90)}
              numberOfMonths={1}
              className="border rounded-md"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnaliseModalOpen(false)} disabled={gerandoIA}>
              Cancelar
            </Button>
            <Button
              onClick={handleGerarAnaliseIA}
              disabled={gerandoIA || !analiseDateRange?.from || !analiseDateRange?.to}
            >
              <Bot className="mr-2 h-4 w-4" />
              Gerar Análise
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


