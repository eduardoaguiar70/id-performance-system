/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useCliente } from "@/context/ClienteContext"
import { useSupabase } from "@/hooks/useSupabase"
import { SpotlightSearch } from "@/components/dashboard/spotlight-search"
import { FocusWidget } from "@/components/dashboard/focus-widget"
import { InsightFeed } from "@/components/dashboard/insight-feed"
import { AgencyMetrics } from "@/components/dashboard/agency-metrics"
import { ClientMetrics } from "@/components/dashboard/client-metrics"
import { ScraperControl } from "@/components/dashboard/scraper-control"
import { Building2, Crosshair } from "lucide-react"

export default function DashboardPage() {
  const { clienteSelecionado } = useCliente()
  const { supabase, fetchMeetings, fetchLatestTaskSnapshot, fetchLatestKpiAnalysis, fetchKpiHistory } = useSupabase()

  const [meetings, setMeetings] = useState<any[]>([])
  const [tasks, setTasks] = useState<any>(null)
  const [kpiAnalysis, setKpiAnalysis] = useState<any>(null)
  const [kpiHistory, setKpiHistory] = useState<any[]>([])
  const [clientesAtivosCount, setClientesAtivosCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [meetingsData, tasksData, historyData, clientesData] = await Promise.allSettled([
        fetchMeetings(),
        fetchLatestTaskSnapshot(),
        clienteSelecionado
          ? fetchKpiHistory(clienteSelecionado.conta_nome, 7)
          : fetchKpiHistory(undefined, 7),
        supabase.from('contas_ativas').select('*', { count: 'exact', head: true }).eq('ativo', true),
      ])

      if (meetingsData.status === "fulfilled") setMeetings(meetingsData.value || [])
      if (tasksData.status === "fulfilled") setTasks(tasksData.value)
      if (historyData.status === "fulfilled") setKpiHistory(historyData.value || [])
      if (clientesData.status === "fulfilled") setClientesAtivosCount(clientesData.value.count ?? 0)

      if (clienteSelecionado) {
        const analysis = await fetchLatestKpiAnalysis(clienteSelecionado.conta_nome)
        setKpiAnalysis(analysis)
      } else {
        setKpiAnalysis(null)
      }
    } catch (err) {
      console.error("Dashboard load error:", err)
    } finally {
      setLoading(false)
    }
  }, [clienteSelecionado])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="flex flex-col min-h-full bg-background">

      {/* ── Top bar: context label + spotlight ──────────────────────── */}
      <div className="px-6 pt-6 pb-0 flex flex-col gap-4">

        {/* Context header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {clienteSelecionado ? (
              <>
                <Crosshair className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary uppercase tracking-widest">
                  Visão Analista
                </span>
                <span className="text-muted-foreground text-sm">·</span>
                <span className="text-sm text-foreground font-medium">
                  {clienteSelecionado.conta_nome}
                </span>
              </>
            ) : (
              <>
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                  Visão Agência
                </span>
              </>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground/50 font-mono uppercase tracking-widest">
            ID Performance · Command Center
          </span>
        </div>

        {/* Spotlight AI Search */}
        <SpotlightSearch clienteSelecionado={clienteSelecionado} />
      </div>

      {/* ── Main grid ───────────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-6">

        {/* Left column: metrics (dynamic) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          {clienteSelecionado ? (
            <ClientMetrics
              clienteSelecionado={clienteSelecionado}
              kpiHistory={kpiHistory}
              loading={loading}
            />
          ) : (
            <AgencyMetrics
              meetings={meetings}
              tasks={tasks}
              clientesAtivosCount={clientesAtivosCount}
              loading={loading}
            />
          )}
        </div>

        {/* Right column: focus + insights */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          <FocusWidget
            meetings={meetings}
            tasks={tasks}
            loading={loading}
            clienteSelecionado={clienteSelecionado}
          />
          <InsightFeed
            kpiAnalysis={kpiAnalysis}
            clienteSelecionado={clienteSelecionado}
            loading={loading}
          />
        </div>

        {/* Scraper control — full width row */}
        <ScraperControl />
      </div>
    </div>
  )
}
