/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import {
  TrendingUp, AlertTriangle, Building2, Target,
  MousePointerClick, DollarSign, ShoppingCart,
  Percent, RefreshCw, CalendarRange, X
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCliente } from "@/context/ClienteContext"
import { ClienteBanner } from "@/components/cliente-banner"
import { supabase } from "@/lib/supabase"
import { format, subDays, isAfter, differenceInDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import { toast } from "sonner"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CampaignRow {
  conta_nome: string
  periodo_inicio: string
  campaign_name: string
  impressoes: number
  cliques: number
  spend: number
  compras: number
  receita: number
  reach?: number
  frequency?: number
}

interface AdRow extends CampaignRow {
  ad_name: string
}

// Aggregated shapes (with derived metrics)
interface AggregatedCampaign {
  campaign_name: string
  spend: number
  receita: number
  compras: number
  impressoes: number
  cliques: number
  roas: number
  cac: number
  ctr: number
}

interface AggregatedAd {
  ad_name: string
  spend: number
  receita: number
  compras: number
  impressoes: number
  cliques: number
  roas: number
  cac: number
  ctr: number
}

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------
function aggregateCampaigns(rows: CampaignRow[]): AggregatedCampaign[] {
  const map = new Map<string, AggregatedCampaign>()

  for (const row of rows) {
    const key = row.campaign_name
    if (!map.has(key)) {
      map.set(key, {
        campaign_name: key,
        spend: 0, receita: 0, compras: 0,
        impressoes: 0, cliques: 0,
        roas: 0, cac: 0, ctr: 0,
      })
    }
    const acc = map.get(key)!
    acc.spend      += Number(row.spend)      || 0
    acc.receita    += Number(row.receita)    || 0
    acc.compras    += Number(row.compras)    || 0
    acc.impressoes += Number(row.impressoes) || 0
    acc.cliques    += Number(row.cliques)    || 0
  }

  // Recalculate derived metrics
  for (const acc of Array.from(map.values())) {
    acc.roas = acc.spend > 0 ? acc.receita / acc.spend : 0
    acc.cac  = acc.compras > 0 ? acc.spend / acc.compras : 0
    acc.ctr  = acc.impressoes > 0 ? (acc.cliques / acc.impressoes) * 100 : 0
  }

  return Array.from(map.values()).sort((a, b) => b.roas - a.roas)
}

function aggregateAds(rows: AdRow[]): AggregatedAd[] {
  const map = new Map<string, AggregatedAd>()

  for (const row of rows) {
    const key = row.ad_name
    if (!map.has(key)) {
      map.set(key, {
        ad_name: key,
        spend: 0, receita: 0, compras: 0,
        impressoes: 0, cliques: 0,
        roas: 0, cac: 0, ctr: 0,
      })
    }
    const acc = map.get(key)!
    acc.spend      += Number(row.spend)      || 0
    acc.receita    += Number(row.receita)    || 0
    acc.compras    += Number(row.compras)    || 0
    acc.impressoes += Number(row.impressoes) || 0
    acc.cliques    += Number(row.cliques)    || 0
  }

  for (const acc of Array.from(map.values())) {
    acc.roas = acc.spend > 0 ? acc.receita / acc.spend : 0
    acc.cac  = acc.compras > 0 ? acc.spend / acc.compras : 0
    acc.ctr  = acc.impressoes > 0 ? (acc.cliques / acc.impressoes) * 100 : 0
  }

  return Array.from(map.values()).sort((a, b) => b.roas - a.roas)
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------
const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtInt = (v: number) =>
  new Intl.NumberFormat('pt-BR').format(v || 0)

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CampanhasPage() {
  const { clienteSelecionado } = useCliente()

  // Date range picker state (will be set automatically based on latest data)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [consultando, setConsultando] = useState(false)

  const [integracoes, setIntegracoes] = useState({ meta: false, google: false })
  const [activeTab, setActiveTab] = useState<"meta" | "google">("meta")


  // Derived strings
  const dateStart = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : ""
  const dateEnd   = dateRange?.to   ? format(dateRange.to,   "yyyy-MM-dd") : ""

  // Data state
  const [campanhas, setCampanhas] = useState<AggregatedCampaign[]>([])
  const [loadingCampanhas, setLoadingCampanhas] = useState(false)
  const [alertasConfig, setAlertasConfig] = useState<any>(null)

  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [ads, setAds] = useState<AggregatedAd[]>([])
  const [loadingAds, setLoadingAds] = useState(false)

  const [error, setError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Fetch + aggregate campaigns
  // ---------------------------------------------------------------------------
  const fetchCampanhas = async (start: string, end: string, platform: "meta" | "google" = activeTab) => {
    if (!clienteSelecionado || !start || !end) return

    setLoadingCampanhas(true)
    setSelectedCampaign(null)
    setAds([])
    setError(null)
    setCampanhas([])

    try {
      const table = platform === "meta" ? "campaign_snapshots" : "google_campaign_snapshots"
      const { data, error: dbErr } = await supabase
        .from(table)
        .select("*")
        .eq("conta_nome", clienteSelecionado.conta_nome)
        .gte("periodo_inicio", start)
        .lte("periodo_inicio", end)

      if (dbErr) throw dbErr

      const aggregated = aggregateCampaigns((data || []) as CampaignRow[])
      setCampanhas(aggregated)

      if (aggregated.length === 0) {
        toast.info(`Nenhuma campanha ${platform} encontrada para o período.`)
      } else {
        toast.success(`${aggregated.length} campanha(s) ${platform} agregada(s).`)
      }
    } catch (err: any) {
      console.error("Erro ao buscar campanhas:", err)
      setError("Erro ao carregar campanhas para o período selecionado.")
    } finally {
      setLoadingCampanhas(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Handle "Consultar Período" button
  // ---------------------------------------------------------------------------
  const handleConsultarPeriodo = async () => {
    if (!clienteSelecionado) { toast.error("Selecione um cliente."); return }
    if (!dateRange?.from || !dateRange?.to) { toast.error("Selecione um período no calendário."); return }
    const diff = differenceInDays(dateRange.to, dateRange.from)
    if (diff > 90) { toast.error("O período máximo é de 90 dias."); return }

    setConsultando(true)
    await fetchCampanhas(dateStart, dateEnd, activeTab)
    setConsultando(false)
  }

  // ---------------------------------------------------------------------------
  // Initial load when client changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function initClientData() {
      if (!clienteSelecionado) {
        setCampanhas([])
        setAds([])
        setSelectedCampaign(null)
        setDateRange(undefined)
        return
      }

      setLoadingCampanhas(true)

      try {
        // Detect Integrations
        const { data: clienteData, error: clienteErr } = await supabase
          .from('clientes')
          .select('id, meta_ads_id, google_ads_id')
          .eq('conta_id', clienteSelecionado!.conta_id)
          .single();
        
        let hasMeta = false;
        let hasGoogle = false;
        if (!clienteErr && clienteData) {
          hasMeta = !!clienteData.meta_ads_id;
          hasGoogle = !!clienteData.google_ads_id;
          setIntegracoes({ meta: hasMeta, google: hasGoogle });

          const { data: alertasData } = await supabase
            .from('configuracoes_alertas')
            .select('*')
            .eq('cliente_id', clienteData.id)
            .maybeSingle();
          setAlertasConfig(alertasData);
        } else {
          // Default to Meta if error or not found just in case
          hasMeta = true;
          setIntegracoes({ meta: true, google: false });
        }

        const initialTab = hasMeta ? "meta" : (hasGoogle ? "google" : "meta");
        setActiveTab(initialTab);

        const table = initialTab === "meta" ? "campaign_snapshots" : "google_campaign_snapshots"
        const { data: latestRows, error: latestErr } = await supabase
          .from(table)
          .select("periodo_inicio")
          .eq("conta_nome", clienteSelecionado.conta_nome)
          .order("periodo_inicio", { ascending: false })
          .limit(1)

        if (latestErr) throw latestErr

        let startStr = ""
        let endStr = ""

        if (latestRows && latestRows.length > 0) {
          const latestDateStr = latestRows[0].periodo_inicio
          const toDate = new Date(`${latestDateStr}T12:00:00`)
          const fromDate = subDays(toDate, 7)
          
          setDateRange({ from: fromDate, to: toDate })
          startStr = format(fromDate, "yyyy-MM-dd")
          endStr = format(toDate, "yyyy-MM-dd")
        } else {
          const toDate = new Date()
          const fromDate = subDays(toDate, 7)
          setDateRange({ from: fromDate, to: toDate })
          startStr = format(fromDate, "yyyy-MM-dd")
          endStr = format(toDate, "yyyy-MM-dd")
        }

        await fetchCampanhas(startStr, endStr, initialTab)
      } catch (err) {
        console.error("Erro ao buscar data inicial:", err)
        setError("Erro ao determinar o período mais recente.")
        setLoadingCampanhas(false)
      }
    }

    initClientData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteSelecionado])

  // ---------------------------------------------------------------------------
  // Fetch + aggregate ads when a campaign is selected
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!clienteSelecionado || !selectedCampaign || !dateStart || !dateEnd) return

    async function loadAds() {
      setLoadingAds(true)
      setAds([])
      try {
        const table = activeTab === "meta" ? "ad_snapshots" : "google_ad_snapshots"
        const { data, error: dbErr } = await supabase
          .from(table)
          .select("*")
          .eq("conta_nome", clienteSelecionado!.conta_nome)
          .eq("campaign_name", selectedCampaign)
          .gte("periodo_inicio", dateStart)
          .lte("periodo_inicio", dateEnd)

        if (dbErr) throw dbErr

        const aggregated = aggregateAds((data || []) as AdRow[])
        setAds(aggregated)
      } catch (err: any) {
        console.error("Erro ao buscar anúncios:", err)
      } finally {
        setLoadingAds(false)
      }
    }

    loadAds()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampaign, clienteSelecionado])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (!clienteSelecionado) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Target className="h-4 w-4" />
          Monitor de Campanhas
        </h2>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground border rounded-xl bg-card mt-4">
          <Building2 className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhum cliente selecionado</p>
          <p className="text-sm mt-1">Use o seletor no topo para escolher um cliente</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <ClienteBanner />

      {/* Header + DatePicker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Target className="h-4 w-4" />
          Monitor de Campanhas
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          {/* Calendar range picker */}
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
                  <X className="h-3 w-3 mr-1" /> Limpar
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Consultar button */}
          <Button
            size="sm"
            onClick={handleConsultarPeriodo}
            disabled={consultando || !dateRange?.from || !dateRange?.to}
          >
            {consultando
              ? <><RefreshCw className="mr-2 h-3 w-3 animate-spin" /> Consultando...</>
              : <><CalendarRange className="mr-2 h-3 w-3" /> Consultar Período</>}
          </Button>
        </div>
      </div>

      
      {/* Active period badge */}
      {dateStart && dateEnd && (
        <p className="text-xs text-muted-foreground -mt-2 mb-2">
          Exibindo dados agregados de{" "}
          <span className="font-medium text-foreground">{format(new Date(dateStart + "T12:00:00"), "dd/MM/yyyy")}</span>
          {" "}a{" "}
          <span className="font-medium text-foreground">{format(new Date(dateEnd + "T12:00:00"), "dd/MM/yyyy")}</span>
        </p>
      )}

      {(integracoes.meta && integracoes.google) && (
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); fetchCampanhas(dateStart, dateEnd, v as any) }} className="mb-6">
          <TabsList>
            <TabsTrigger value="meta">Meta Ads</TabsTrigger>
            <TabsTrigger value="google">Google Ads</TabsTrigger>
          </TabsList>
        </Tabs>
      )}


      {/* Error */}
      {error && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950/20 mb-4">
          <CardContent className="pt-6 flex items-center text-red-500">
            <AlertTriangle className="mr-2" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* Campaign cards */}
      {loadingCampanhas ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : campanhas.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[200px] text-muted-foreground border rounded-xl bg-card">
          <Target className="h-10 w-10 mb-2 opacity-30" />
          <p>Nenhuma campanha encontrada. Selecione um período e clique em &quot;Consultar Período&quot;.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campanhas.map((campanha, idx) => {
            const limiteCpa = activeTab === "meta" ? alertasConfig?.meta_cpa_maximo : alertasConfig?.google_cpa_maximo;
            const cpaOverLimit = limiteCpa != null && campanha.cac > limiteCpa;

            return (
              <Card
                key={idx}
                className={`cursor-pointer transition-all hover:border-primary/50 ${selectedCampaign === campanha.campaign_name ? 'border-primary ring-1 ring-primary' : ''}`}
                onClick={() => setSelectedCampaign(campanha.campaign_name)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base line-clamp-2" title={campanha.campaign_name}>
                    {campanha.campaign_name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-2 mt-2">
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" /> Spend</p>
                      <p className="font-semibold text-sm">{fmtBRL(campanha.spend)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Receita</p>
                      <p className="font-semibold text-sm text-green-600 dark:text-green-400">{fmtBRL(campanha.receita)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3" /> ROAS</p>
                      <Badge
                        variant={campanha.roas > 2 ? 'default' : 'secondary'}
                        className={campanha.roas > 5 ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
                      >
                        {campanha.roas.toFixed(2)}x
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" /> CPA</p>
                      <p className={`font-semibold text-sm ${cpaOverLimit ? 'text-red-500' : ''}`}>
                        {campanha.cac === 0 ? "R$ 0,00" : fmtBRL(campanha.cac)}
                        {cpaOverLimit && <span title={`Acima do limite de ${fmtBRL(limiteCpa)}`}><AlertTriangle className="h-3 w-3 inline ml-1 text-red-500" /></span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><ShoppingCart className="h-3 w-3" /> Compras</p>
                      <p className="font-semibold text-sm">{fmtInt(campanha.compras)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Percent className="h-3 w-3" /> CTR</p>
                      <p className="font-semibold text-sm">{campanha.ctr.toFixed(2)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Ad drill-down */}
      {selectedCampaign && (
        <div className="mt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 mb-4 border-b pb-2">
            <MousePointerClick className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-bold">Anúncios da Campanha</h3>
            <Badge variant="outline" className="ml-2 font-normal text-muted-foreground">
              {selectedCampaign}
            </Badge>
          </div>

          {loadingAds ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 w-full" />)}
            </div>
          ) : ads.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground border rounded-xl bg-card">
              Nenhum anúncio encontrado para esta campanha no período.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {ads.map((ad, idx) => {
                const limiteCpa = activeTab === "meta" ? alertasConfig?.meta_cpa_maximo : alertasConfig?.google_cpa_maximo;
                const isCpaRed = limiteCpa != null && ad.cac > limiteCpa;
                const isGreen = ad.roas > 5
                const isRed   = ad.roas < 2 && ad.spend > 0
                const cardClass = isGreen
                  ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/10"
                  : isRed
                    ? "border-red-500/50 bg-red-50/50 dark:bg-red-950/10"
                    : ""

                return (
                  <Card key={idx} className={`overflow-hidden ${cardClass}`}>
                    <CardHeader className="pb-2 p-4">
                      <CardTitle className="text-sm line-clamp-2" title={ad.ad_name}>
                        {ad.ad_name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="grid grid-cols-2 gap-y-3 gap-x-2 mt-2">
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Spend</p>
                          <p className="font-semibold text-sm">{fmtBRL(ad.spend)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Receita</p>
                          <p className={`font-semibold text-sm ${isGreen ? 'text-green-700 dark:text-green-400' : ''}`}>
                            {fmtBRL(ad.receita)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">ROAS</p>
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                            isGreen ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400' :
                            isRed   ? 'bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-900/30 dark:text-red-400' :
                                      'bg-gray-50 text-gray-600 ring-gray-500/10 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {ad.roas.toFixed(2)}x
                          </span>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">CPA</p>
                          <p className={`font-semibold text-sm ${isCpaRed ? 'text-red-500' : ''}`}>
                            {ad.cac === 0 ? "R$ 0,00" : fmtBRL(ad.cac)}
                            {isCpaRed && <span title={`Acima do limite de ${fmtBRL(limiteCpa)}`}><AlertTriangle className="h-3 w-3 inline ml-1 text-red-500" /></span>}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Compras / Impr.</p>
                          <p className="font-medium text-xs">
                            {fmtInt(ad.compras)} <span className="text-muted-foreground">/ {fmtInt(ad.impressoes)}</span>
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
