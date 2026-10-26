# Seção de Dashboard & Analytics — Código Completo

Documento gerado com o código-fonte completo, atual, de toda a seção de Dashboard/Analytics do Sistema ID Performance.

## Índice

1. [app/dashboard/page.tsx](#appdashboardpagetsx)
2. [app/dashboard/loading.tsx](#appdashboardloadingtsx)
3. [components/dashboard/agency-metrics.tsx](#componentsdashboardagency-metricstsx)
4. [components/dashboard/client-metrics.tsx](#componentsdashboardclient-metricstsx)
5. [components/dashboard/focus-widget.tsx](#componentsdashboardfocus-widgettsx)
6. [components/dashboard/insight-feed.tsx](#componentsdashboardinsight-feedtsx)
7. [components/dashboard/overview.tsx](#componentsdashboardoverviewtsx)
8. [components/dashboard/recent-alerts.tsx](#componentsdashboardrecent-alertstsx)
9. [components/dashboard/scraper-control.tsx](#componentsdashboardscraper-controltsx)
10. [components/dashboard/spotlight-search.tsx](#componentsdashboardspotlight-searchtsx)

> **Observação:** `overview.tsx` e `recent-alerts.tsx` existem no diretório mas não são importados por `app/dashboard/page.tsx` — parecem ser componentes legados/não utilizados na página atual do dashboard (que usa `AgencyMetrics`/`ClientMetrics`, `FocusWidget` e `InsightFeed` em seu lugar).

---

## `app/dashboard/page.tsx`

Página principal do dashboard. Orquestra o fetch de reuniões, tarefas, histórico de KPI e contagem de clientes ativos, e decide entre a visão "Agência" (sem cliente selecionado) e a visão "Analista" (cliente selecionado).

```tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useCallback } from "react"
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
  const { supabase, fetchMeetings, fetchLatestKpiAnalysis, fetchKpiHistory } = useSupabase()

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
        // Busca direto da tabela tarefas (nova arquitetura)
        supabase.from('tarefas').select('*').order('id', { ascending: false }),
        clienteSelecionado
          ? fetchKpiHistory(clienteSelecionado.conta_nome, 7)
          : fetchKpiHistory(undefined, 7),
        supabase.from('contas_ativas').select('*', { count: 'exact', head: true }).eq('ativo', true),
      ])

      if (meetingsData.status === "fulfilled") setMeetings(meetingsData.value || [])

      if (tasksData.status === "fulfilled") {
        const lista: any[] = tasksData.value.data || []
        if (tasksData.value.error) {
          console.error("[Dashboard] Erro ao buscar tarefas:", tasksData.value.error)
        }
        const urgentes = lista.filter((t: any) =>
          (t.prioridade ?? "").toLowerCase() === "urgente"
        ).length
        // Monta objeto compatível com AgencyMetrics e FocusWidget
        setTasks({
          tarefas: lista,
          resumo_backlog: { total: lista.length, urgentes },
        })
      }

      if (historyData.status === "fulfilled") setKpiHistory(historyData.value || [])

      if (clientesData.status === "fulfilled") {
        if (clientesData.value.error) {
          console.error("[Dashboard] Erro ao buscar clientes ativos:", clientesData.value.error)
        }
        setClientesAtivosCount(clientesData.value.count ?? 0)
      }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
```

---

## `app/dashboard/loading.tsx`

Skeleton de loading exibido pelo Next.js enquanto a página do dashboard carrega (Suspense boundary automático de rota).

```tsx
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Skeleton className="h-4 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" style={{ borderRadius: "2px" }} />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-64 w-full" style={{ borderRadius: "2px" }} />
        <Skeleton className="h-64 w-full" style={{ borderRadius: "2px" }} />
      </div>
      <Skeleton className="h-48 w-full" style={{ borderRadius: "2px" }} />
    </div>
  )
}
```

---

## `components/dashboard/agency-metrics.tsx`

Visão "Agência" (sem cliente selecionado): cards de estatísticas gerais (reuniões, backlog de tarefas, clientes ativos, status geral) + lista das últimas reuniões.

```tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useMemo } from "react"
import {
  TrendingUp, Users, CalendarDays, CheckSquare,
  BarChart2, ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface Props {
  meetings: any[]
  tasks: any
  clientesAtivosCount: number
  loading: boolean
}

interface StatCard {
  label: string
  value: string | number
  sub?: string
  trend?: "up" | "down" | "flat"
  icon: React.ElementType
}

export function AgencyMetrics({ meetings, tasks, clientesAtivosCount, loading }: Props) {
  const stats = useMemo<StatCard[]>(() => {
    // Prefer resumo_backlog fields (structured summary), fall back to scanning tarefas array
    const taskCount = tasks?.resumo_backlog?.total
      ?? tasks?.tarefas?.length
      ?? 0
    const urgentCount = tasks?.resumo_backlog?.urgentes
      ?? tasks?.tarefas?.filter(
          (t: any) => t.prioridade === "Urgente" || t.status === "Urgente"
        ).length
      ?? 0

    const meetingCount = meetings.length
    const recentMeetings = meetings.slice(0, 3)

    const actionItemCount = recentMeetings.reduce((acc: number, m: any) => {
      if (Array.isArray(m.action_items)) return acc + m.action_items.length
      return acc
    }, 0)

    return [
      {
        label: "Reuniões Registradas",
        value: meetingCount,
        sub: `${actionItemCount} action items pendentes`,
        trend: meetingCount > 0 ? "up" : "flat",
        icon: CalendarDays,
      },
      {
        label: "Tarefas no Backlog",
        value: taskCount,
        sub: urgentCount > 0 ? `${urgentCount} urgentes` : "Nenhuma urgente",
        trend: urgentCount > 2 ? "down" : urgentCount > 0 ? "flat" : "up",
        icon: CheckSquare,
      },
      {
        label: "Clientes Ativos",
        value: clientesAtivosCount,
        sub: "Contas ativas no sistema",
        trend: clientesAtivosCount > 0 ? "up" : "flat",
        icon: Users,
      },
      {
        label: "Status Geral",
        value: urgentCount > 0 ? "Atenção" : "OK",
        sub: urgentCount > 0 ? `${urgentCount} itens requerem ação` : "Todos os processos normais",
        trend: urgentCount > 0 ? "down" : "up",
        icon: BarChart2,
      },
    ]
  }, [meetings, tasks, clientesAtivosCount])

  const TREND_ICON = {
    up:   { icon: ArrowUpRight,   cls: "text-primary" },
    down: { icon: ArrowDownRight, cls: "text-red-400" },
    flat: { icon: Minus,          cls: "text-muted-foreground" },
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-1">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Visão Geral da Agência
        </h3>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" style={{ borderRadius: "2px" }} />
            ))
          : stats.map((s, i) => {
              const Icon = s.icon
              const TrendIcon = TREND_ICON[s.trend ?? "flat"]
              const TIcon = TrendIcon.icon
              return (
                <div
                  key={i}
                  className="border border-border bg-card px-4 py-4 flex flex-col gap-2 hover:border-primary/30 transition-colors duration-200 cursor-default"
                  style={{ borderRadius: "2px" }}
                >
                  <div className="flex items-center justify-between">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <TIcon className={`h-3.5 w-3.5 ${TrendIcon.cls}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-mono tracking-tight">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{s.label}</p>
                  </div>
                  {s.sub && (
                    <p className="text-[10px] text-muted-foreground/60 leading-tight">{s.sub}</p>
                  )}
                </div>
              )
            })}
      </div>

      {/* Recent meetings list */}
      <div className="border border-border bg-card" style={{ borderRadius: "2px" }}>
        <div className="px-4 py-3 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-widest text-foreground flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            Últimas Reuniões
          </span>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-4 py-3">
                <Skeleton className="h-4 w-3/4 mb-1" style={{ borderRadius: "2px" }} />
                <Skeleton className="h-3 w-1/2" style={{ borderRadius: "2px" }} />
              </div>
            ))
          ) : meetings.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              Nenhuma reunião registrada.
            </div>
          ) : (
            meetings.slice(0, 5).map((m: any, i) => {
              const aiCount = Array.isArray(m.action_items) ? m.action_items.length : 0
              return (
                <div key={i} className="px-4 py-3 hover:bg-muted/20 transition-colors duration-150 cursor-default">
                  <p className="text-xs font-medium text-foreground line-clamp-1">
                    {m.titulo || m.title || "Reunião"}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      {m.cliente || m.conta_nome || "Agência"}
                    </span>
                    {aiCount > 0 && (
                      <span className="text-[10px] text-primary font-mono">
                        {aiCount} action {aiCount === 1 ? "item" : "items"}
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## `components/dashboard/client-metrics.tsx`

Visão "Analista" (cliente selecionado): cards de KPI (investimento, receita atribuída, ROAS, compras) + gráfico de área com a tendência de ROAS, usando `recharts`.

```tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useMemo } from "react"
import {
  TrendingUp, DollarSign, ShoppingCart, BarChart2,
  ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts"

interface Props {
  clienteSelecionado: any
  kpiHistory: any[]
  loading: boolean
}

const fmtBRL = (v: any) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(v) || 0)
const fmtNum = (v: any) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(Number(v) || 0)

function trendIcon(cur: number, prev: number | undefined) {
  if (!prev) return { icon: Minus, cls: "text-muted-foreground" }
  if (cur > prev) return { icon: ArrowUpRight, cls: "text-primary" }
  return { icon: ArrowDownRight, cls: "text-red-400" }
}

export function ClientMetrics({ clienteSelecionado, kpiHistory, loading }: Props) {
  // Latest snapshot is the most recent entry in history
  const latest = useMemo(() => kpiHistory.at(-1), [kpiHistory])
  const prev   = useMemo(() => kpiHistory.at(-2), [kpiHistory])

  const stats = useMemo(() => {
    if (!latest) return []
    return [
      {
        label: "Investimento",
        value: fmtBRL(latest.investimento_total),
        trend: trendIcon(latest.investimento_total, prev?.investimento_total),
        icon: DollarSign,
      },
      {
        label: "Receita Atribuída",
        value: fmtBRL(latest.receita_atribuida),
        trend: trendIcon(latest.receita_atribuida, prev?.receita_atribuida),
        icon: TrendingUp,
      },
      {
        label: "ROAS",
        value: `${fmtNum(latest.roas)}x`,
        trend: trendIcon(latest.roas, prev?.roas),
        icon: BarChart2,
      },
      {
        label: "Compras",
        value: fmtNum(latest.compras),
        trend: trendIcon(latest.compras, prev?.compras),
        icon: ShoppingCart,
      },
    ]
  }, [latest, prev])

  // Chart data — map history to chart format
  const chartData = useMemo(() =>
    kpiHistory.map((h: any) => ({
      name: h.periodo_fim
        ? new Date(h.periodo_fim).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
        : "—",
      roas:  Number(h.roas || 0).toFixed(2),
      receita: Number(h.receita_atribuida || 0),
    })),
    [kpiHistory]
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-1">
        <BarChart2 className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Performance · {clienteSelecionado.conta_nome}
        </h3>
      </div>

      {/* KPI stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" style={{ borderRadius: "2px" }} />
            ))
          : !latest
            ? (
              <div className="col-span-2 py-8 text-center text-xs text-muted-foreground border border-dashed border-border" style={{ borderRadius: "2px" }}>
                Nenhum dado de KPI para este cliente.
              </div>
            )
            : stats.map((s, i) => {
                const Icon = s.icon
                const { icon: TIcon, cls } = s.trend
                return (
                  <div
                    key={i}
                    className="border border-border bg-card px-4 py-4 flex flex-col gap-2 hover:border-primary/30 transition-colors duration-200 cursor-default"
                    style={{ borderRadius: "2px" }}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <TIcon className={`h-3.5 w-3.5 ${cls}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-mono tracking-tight">{s.value}</p>
                      <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{s.label}</p>
                    </div>
                  </div>
                )
              })
        }
      </div>

      {/* ROAS trend chart */}
      {!loading && chartData.length > 1 && (
        <div className="border border-border bg-card" style={{ borderRadius: "2px" }}>
          <div className="px-4 py-3 border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-widest text-foreground">
              Tendência de ROAS
            </span>
          </div>
          <div className="px-4 py-4">
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="roasGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "2px",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    color: "hsl(var(--foreground))",
                  }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                />
                <Area
                  type="monotone"
                  dataKey="roas"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#roasGrad)"
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## `components/dashboard/focus-widget.tsx`

Widget "Meu Foco Hoje": lista tarefas urgentes/vencidas e action items de reuniões recentes, filtrando por cliente selecionado quando aplicável.

```tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useMemo } from "react"
import { AlertTriangle, Clock, CheckSquare, ArrowRight, CalendarDays } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { format, isAfter } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Props {
  meetings: any[]
  tasks: any
  loading: boolean
  clienteSelecionado: any | null
}

interface FocusItem {
  type: "task" | "action_item"
  label: string
  meta?: string
  urgency: "urgent" | "overdue" | "normal"
  source?: string
}

export function FocusWidget({ meetings, tasks, loading, clienteSelecionado }: Props) {
  const focusItems = useMemo<FocusItem[]>(() => {
    const items: FocusItem[] = []

    // Urgent/overdue tasks from task_snapshots
    if (tasks?.tarefas && Array.isArray(tasks.tarefas)) {
      const tarefaList = tasks.tarefas as any[]
      const now = new Date()

      const filtered = tarefaList
        .filter((t: any) => {
          if (!clienteSelecionado) return true
          return t.cliente === clienteSelecionado.conta_nome ||
                 t.conta_nome === clienteSelecionado.conta_nome
        })
        .filter((t: any) => {
          const s = (t.status ?? "").toLowerCase()
          if (s.includes("conclu") || s === "done") return false
          const isUrgent = (t.prioridade ?? "").toLowerCase() === "urgente" || s === "urgente"
          // aceita tanto due_date (legado) quanto prazo (nova tabela)
          const dateStr = t.prazo || t.due_date
          const isOverdue = dateStr && isAfter(now, new Date(dateStr.length === 10 ? dateStr + "T12:00:00" : dateStr))
          return isUrgent || isOverdue
        })
        .slice(0, 4)

      for (const t of filtered) {
        const dateStr = t.prazo || t.due_date
        const dateObj = dateStr ? new Date(dateStr.length === 10 ? dateStr + "T12:00:00" : dateStr) : null
        const isOverdue = dateObj && isAfter(now, dateObj)
        items.push({
          type: "task",
          label: t.titulo || t.title || t.nome || "Tarefa sem título",
          meta: dateObj
            ? `Vence ${format(dateObj, "dd MMM", { locale: ptBR })}`
            : undefined,
          urgency: isOverdue ? "overdue" : "urgent",
          source: t.cliente || t.conta_nome || t.responsavel,
        })
      }
    }

    // Action items from recent meetings
    const recentMeetings = meetings
      .filter((m: any) => {
        if (!clienteSelecionado) return true
        return m.cliente === clienteSelecionado.conta_nome ||
               m.conta_nome === clienteSelecionado.conta_nome
      })
      .slice(0, 3)

    for (const meeting of recentMeetings) {
      const actionItems: any[] = []

      if (Array.isArray(meeting.action_items)) {
        actionItems.push(...meeting.action_items.slice(0, 2))
      } else if (typeof meeting.action_items === "string") {
        try {
          const parsed = JSON.parse(meeting.action_items)
          if (Array.isArray(parsed)) actionItems.push(...parsed.slice(0, 2))
        } catch { /* empty */ }
      }

      for (const action of actionItems) {
        if (items.length >= 6) break
        const label = typeof action === "string"
          ? action
          : (action?.tarefa || action?.titulo || action?.acao || JSON.stringify(action))
        items.push({
          type: "action_item",
          label,
          urgency: "normal",
          source: meeting.cliente || meeting.titulo || "Reunião",
        })
      }
    }

    return items.slice(0, 6)
  }, [meetings, tasks, clienteSelecionado])

  const urgencyConfig = {
    overdue: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", icon: AlertTriangle, label: "Vencida" },
    urgent:  { color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30", icon: Clock, label: "Urgente" },
    normal:  { color: "text-muted-foreground", bg: "bg-muted/30 border-border", icon: CheckSquare, label: "Action" },
  }

  return (
    <div className="border border-border bg-card" style={{ borderRadius: "2px" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
          <span className="text-xs font-semibold uppercase tracking-widest text-foreground">
            Meu Foco Hoje
          </span>
        </div>
        <Link href="/tarefas">
          <button className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 cursor-pointer">
            Ver todas <ArrowRight className="h-2.5 w-2.5" />
          </button>
        </Link>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" style={{ borderRadius: "2px" }} />
          ))
        ) : focusItems.length === 0 ? (
          <div className="py-6 flex flex-col items-center gap-2 text-muted-foreground">
            <CheckSquare className="h-6 w-6 opacity-30" />
            <p className="text-xs text-center">Nenhuma tarefa urgente.<br />Está tudo em dia.</p>
          </div>
        ) : (
          focusItems.map((item, i) => {
            const cfg = urgencyConfig[item.urgency]
            const Icon = cfg.icon
            return (
              <div
                key={i}
                className={`flex items-start gap-2.5 px-3 py-2.5 border ${cfg.bg} transition-all duration-150 hover:border-primary/30 cursor-default`}
                style={{ borderRadius: "2px" }}
              >
                <Icon className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                    {item.label}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.source && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                        {item.source}
                      </span>
                    )}
                    {item.meta && (
                      <span className={`text-[10px] ${cfg.color} flex items-center gap-1`}>
                        <CalendarDays className="h-2.5 w-2.5" />
                        {item.meta}
                      </span>
                    )}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0 flex-shrink-0 border-0 ${cfg.color}`}
                  style={{ background: "transparent" }}
                >
                  {item.type === "action_item" ? "Reunião" : cfg.label}
                </Badge>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
```

---

## `components/dashboard/insight-feed.tsx`

Feed de insights de IA: combina alertas de KPI (análise mais recente do cliente selecionado, quando houver e for "fresca" — menos de 24h) com um feed cronológico unificado (reuniões + task snapshots), atualizado em tempo real via Supabase Realtime.

```tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Bot, Mic, TrendingUp, TrendingDown, PauseCircle,
  Zap, ArrowRight, Sparkles,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { supabase } from "@/lib/supabase"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  kpiAnalysis: any | null
  clienteSelecionado: any | null
  loading: boolean
}

interface FeedItem {
  id: string
  type: "meeting" | "task_snapshot"
  title: string
  subtitle?: string
  body: string
  created_at: string
}

// ─── KPI alert parsing (kept for client view) ─────────────────────────────────

interface InsightAlert {
  type: "pause" | "champion" | "warning" | "opportunity"
  message: string
  detail?: string
}

const KPI_CONFIG = {
  pause:       { icon: PauseCircle,  color: "text-red-400",    bg: "bg-red-500/8 border-red-500/25",       label: "Pausar" },
  champion:    { icon: TrendingUp,   color: "text-primary",    bg: "bg-primary/8 border-primary/25",       label: "Destaque" },
  warning:     { icon: TrendingDown, color: "text-orange-400", bg: "bg-orange-500/8 border-orange-500/25", label: "Alerta" },
  opportunity: { icon: Zap,          color: "text-sky-400",    bg: "bg-sky-500/8 border-sky-500/25",       label: "Oportunidade" },
}

function parseKpiAlerts(analysis: any): InsightAlert[] {
  if (!analysis) return []
  const alerts: InsightAlert[] = []
  const parseSafe = (f: any) => {
    if (!f) return null
    if (typeof f === "string") { try { return JSON.parse(f) } catch { return f } }
    return f
  }
  const acoes = parseSafe(analysis.acoes_recomendadas)
  const anuncios = parseSafe(analysis.anuncios)
  const campanhas = parseSafe(analysis.campanhas)

  if (anuncios && typeof anuncios === "object") {
    for (const [key, val] of Object.entries(anuncios)) {
      if (!Array.isArray(val)) continue
      const isPause = key.toLowerCase().includes("paus") || key.toLowerCase().includes("pior")
      for (const item of (val as any[]).slice(0, 2))
        alerts.push({ type: isPause ? "pause" : "champion", message: item.ad_name || item.nome || "Anúncio", detail: item.insight || item.motivo })
    }
  }
  if (campanhas && typeof campanhas === "object") {
    for (const [key, val] of Object.entries(campanhas)) {
      if (!Array.isArray(val)) continue
      const isGood = key.toLowerCase().includes("melhor") || key.toLowerCase().includes("top")
      for (const item of (val as any[]).slice(0, 1))
        alerts.push({ type: isGood ? "champion" : "warning", message: item.nome || item.campanha || "Campanha", detail: item.insight || item.justificativa })
    }
  }
  if (acoes) {
    const str = typeof acoes === "string" ? acoes : JSON.stringify(acoes)
    for (const line of str.split(/[\n.·•]/).filter((l: string) => l.trim().length > 20).slice(0, 2))
      alerts.push({ type: "opportunity", message: line.trim().replace(/^[-*]\s*/, "") })
  }
  return alerts.slice(0, 5)
}

// ─── Feed item card ────────────────────────────────────────────────────────────

function FeedCard({ item }: { item: FeedItem }) {
  const isMeeting = item.type === "meeting"
  const Icon = isMeeting ? Mic : Bot
  const iconColor = isMeeting ? "text-violet-400" : "text-primary"
  const bg = isMeeting ? "bg-violet-500/8 border-violet-500/25" : "bg-primary/8 border-primary/25"

  return (
    <div
      className={`flex items-start gap-2.5 px-3 py-2.5 border ${bg} transition-all duration-150 hover:border-primary/20`}
      style={{ borderRadius: "2px" }}
    >
      <Icon className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
          {item.subtitle && (
            <Badge
              variant="outline"
              className="text-[9px] px-1 py-0 h-4 leading-none flex-shrink-0 capitalize"
            >
              {item.subtitle}
            </Badge>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
          {item.body}
        </p>
        <p className="text-[9px] text-muted-foreground/40 mt-1 font-mono">
          {format(new Date(item.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
        </p>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function InsightFeed({ kpiAnalysis, clienteSelecionado, loading }: Props) {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [feedLoading, setFeedLoading] = useState(true)

  // ── Fetch + Realtime ───────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setFeedLoading(true)

      const [meetingsRes, tasksRes] = await Promise.allSettled([
        supabase
          .from("meeting_summaries")
          .select("id, titulo, tipo, resumo_executivo, criado_em")
          .order("criado_em", { ascending: false })
          .limit(6),
        supabase
          .from("task_snapshots")
          .select("id, insight, kpis_analisados, criado_em")
          .order("criado_em", { ascending: false })
          .limit(4),
      ])

      const items: FeedItem[] = []

      if (meetingsRes.status === "fulfilled" && meetingsRes.value.data) {
        for (const m of meetingsRes.value.data) {
          if (!m.resumo_executivo) continue
          items.push({
            id: `meeting-${m.id}`,
            type: "meeting",
            title: m.titulo || "Reunião",
            subtitle: m.tipo || undefined,
            body: m.resumo_executivo,
            created_at: m.criado_em,
          })
        }
      }

      if (tasksRes.status === "fulfilled" && tasksRes.value.data) {
        for (const t of tasksRes.value.data) {
          const body =
            t.insight ||
            (t.kpis_analisados
              ? typeof t.kpis_analisados === "string"
                ? t.kpis_analisados
                : JSON.stringify(t.kpis_analisados)
              : null)
          if (!body) continue
          items.push({
            id: `task-${t.id}`,
            type: "task_snapshot",
            title: "Análise de Produtividade",
            body,
            created_at: t.criado_em,
          })
        }
      }

      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setFeedItems(items.slice(0, 8))
      setFeedLoading(false)
    }

    load()

    // Realtime: push new items to the top without refresh
    const channel = supabase
      .channel("insight-feed-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "meeting_summaries" },
        (payload) => {
          const m = payload.new as any
          if (!m.resumo_executivo) return
          setFeedItems((prev) =>
            [
              {
                id: `meeting-${m.id}`,
                type: "meeting" as const,
                title: m.titulo || "Reunião",
                subtitle: m.tipo || undefined,
                body: m.resumo_executivo,
                created_at: m.criado_em || new Date().toISOString(),
              },
              ...prev,
            ].slice(0, 8)
          )
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_snapshots" },
        (payload) => {
          const t = payload.new as any
          const body = t.insight || ""
          if (!body) return
          setFeedItems((prev) =>
            [
              {
                id: `task-${t.id}`,
                type: "task_snapshot" as const,
                title: "Análise de Produtividade",
                body,
                created_at: t.criado_em || new Date().toISOString(),
              },
              ...prev,
            ].slice(0, 8)
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── KPI alerts (client-specific section) ──────────────────────────────────
  const kpiAlerts = useMemo(() => parseKpiAlerts(kpiAnalysis), [kpiAnalysis])
  const isValidKpi =
    kpiAnalysis?.criado_em &&
    (Date.now() - new Date(kpiAnalysis.criado_em).getTime()) / 3_600_000 < 24

  const hasKpiSection = !!clienteSelecionado && isValidKpi && kpiAlerts.length > 0

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="border border-border bg-card flex-1" style={{ borderRadius: "2px" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-widest text-foreground">
            Feed de Insights IA
          </span>
        </div>
        {clienteSelecionado && (
          <Link href="/kpis">
            <button className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 cursor-pointer">
              KPIs <ArrowRight className="h-2.5 w-2.5" />
            </button>
          </Link>
        )}
      </div>

      <div className="p-3 space-y-2">
        {/* ── KPI alerts section (only when client selected + fresh analysis) ── */}
        {loading ? (
          <Skeleton className="h-10 w-full" style={{ borderRadius: "2px" }} />
        ) : hasKpiSection ? (
          <>
            <p className="text-[10px] text-muted-foreground/50 font-mono px-1 flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5 text-primary" />
              KPIs · {clienteSelecionado.conta_nome} ·{" "}
              {format(new Date(kpiAnalysis.criado_em), "dd/MM HH:mm", { locale: ptBR })}
            </p>
            {kpiAlerts.map((alert, i) => {
              const cfg = KPI_CONFIG[alert.type]
              const Icon = cfg.icon
              return (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 px-3 py-2.5 border ${cfg.bg} transition-all duration-150 hover:border-primary/20`}
                  style={{ borderRadius: "2px" }}
                >
                  <Icon className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground line-clamp-2 leading-relaxed font-medium">
                      {alert.message}
                    </p>
                    {alert.detail && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                        {alert.detail}
                      </p>
                    )}
                  </div>
                  <span className={`text-[9px] flex-shrink-0 font-semibold uppercase ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
              )
            })}
            {/* Divider before live feed */}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[9px] text-muted-foreground/40 uppercase tracking-widest font-mono">
                feed ao vivo
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
          </>
        ) : null}

        {/* ── Unified chronological feed ─────────────────────────────────────── */}
        {feedLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" style={{ borderRadius: "2px" }} />
          ))
        ) : feedItems.length === 0 ? (
          <div className="py-6 flex flex-col items-center gap-2 text-muted-foreground">
            <Bot className="h-6 w-6 opacity-20" />
            <p className="text-xs text-center leading-relaxed">
              Nenhum insight ainda.<br />
              Os agentes de IA alimentarão este feed automaticamente.
            </p>
          </div>
        ) : (
          feedItems.map((item) => <FeedCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}
```

---

## `components/dashboard/overview.tsx`

Componente de gráfico de barras (`recharts`) com dados mockados (aleatórios) por dia da semana. **Não está sendo importado por `app/dashboard/page.tsx`** — aparenta ser um componente legado/placeholder.

```tsx
"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

const data = [
  {
    name: "Seg",
    total: Math.floor(Math.random() * 500) + 100,
  },
  {
    name: "Ter",
    total: Math.floor(Math.random() * 500) + 100,
  },
  {
    name: "Qua",
    total: Math.floor(Math.random() * 500) + 100,
  },
  {
    name: "Qui",
    total: Math.floor(Math.random() * 500) + 100,
  },
  {
    name: "Sex",
    total: Math.floor(Math.random() * 500) + 100,
  },
  {
    name: "Sáb",
    total: Math.floor(Math.random() * 500) + 100,
  },
  {
    name: "Dom",
    total: Math.floor(Math.random() * 500) + 100,
  },
]

export function Overview() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#333', color: '#fff' }} />
        <Bar
          dataKey="total"
          fill="currentColor"
          radius={[4, 4, 0, 0]}
          className="fill-primary"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

---

## `components/dashboard/recent-alerts.tsx`

Lista de alertas recentes com dados mockados (hardcoded). **Não está sendo importado por `app/dashboard/page.tsx`** — aparenta ser um componente legado/placeholder.

```tsx
import { AlertCircle, TrendingDown, Clock } from "lucide-react"

export function RecentAlerts() {
  const alerts = [
    {
      title: "Campanha Black Friday com CPC alto",
      description: "O CPC passou de R$ 5,00 para R$ 8,50 nas últimas 2h.",
      icon: TrendingDown,
      color: "text-red-500",
      time: "2 horas atrás",
    },
    {
      title: "Falha no webhook n8n",
      description: "O disparo de approaches falhou para 15 leads.",
      icon: AlertCircle,
      color: "text-orange-500",
      time: "4 horas atrás",
    },
    {
      title: "Orçamento quase esgotado",
      description: "Campanha 'Retargeting IG' atingiu 90% do orçamento diário.",
      icon: Clock,
      color: "text-yellow-500",
      time: "5 horas atrás",
    },
  ]

  return (
    <div className="space-y-8">
      {alerts.map((alert, index) => (
        <div key={index} className="flex items-center">
          <div className={`mr-4 h-9 w-9 rounded-full bg-muted flex items-center justify-center ${alert.color}`}>
            <alert.icon className="h-5 w-5" />
          </div>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{alert.title}</p>
            <p className="text-sm text-muted-foreground">
              {alert.description}
            </p>
          </div>
          <div className="ml-auto font-medium text-xs text-muted-foreground">
            {alert.time}
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

## `components/dashboard/scraper-control.tsx`

Painel de controle do scraper de leads (Instagram): disparo manual via webhook n8n, com polling inteligente do status de execução e feed de logs das últimas execuções (com detecção de timeout).

```tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSupabase } from "@/hooks/useSupabase"
import {
  Play, RefreshCw, CheckCircle2, XCircle,
  Clock, Loader2, Terminal, ScanSearch,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const WEBHOOK    = "https://n8n-n8n-start.kfocge.easypanel.host/webhook/executar-scraper"
const POLL_MS    = 8_000
const TIMEOUT_MS = 10 * 60 * 1_000  // 10 minutos

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------
type StatusKey = "em_andamento" | "sucesso" | "erro" | "erro_timeout"

const STATUS_CFG: Record<StatusKey, {
  label: string
  Icon: React.ElementType
  spin: boolean
  badge: string
  row: string
}> = {
  em_andamento: {
    label: "Em andamento",
    Icon: Loader2,
    spin: true,
    badge: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
    row: "border-l-2 border-l-yellow-500/40",
  },
  sucesso: {
    label: "Sucesso",
    Icon: CheckCircle2,
    spin: false,
    badge: "border-primary/40 bg-primary/10 text-primary",
    row: "border-l-2 border-l-primary/40",
  },
  erro: {
    label: "Erro",
    Icon: XCircle,
    spin: false,
    badge: "border-red-500/40 bg-red-500/10 text-red-400",
    row: "border-l-2 border-l-red-500/40",
  },
  erro_timeout: {
    label: "Erro (Timeout)",
    Icon: XCircle,
    spin: false,
    badge: "border-red-500/40 bg-red-500/10 text-red-400",
    row: "border-l-2 border-l-red-500/40",
  },
}

function isTimedOut(log: any): boolean {
  if (log?.status !== "em_andamento") return false
  const started = log.iniciado_em ?? log.criado_em
  if (!started) return false
  return Date.now() - new Date(started).getTime() > TIMEOUT_MS
}

function getEffectiveStatus(log: any): StatusKey {
  return isTimedOut(log) ? "erro_timeout" : (log.status as StatusKey)
}

function getStatusCfg(log: any) {
  return STATUS_CFG[getEffectiveStatus(log)] ?? STATUS_CFG.erro
}

// ---------------------------------------------------------------------------
// Componente de Mensagem de Erro Expansível
// ---------------------------------------------------------------------------
function ErrorMessage({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  if (!text) return null
  const isLong = text.length > 80

  return (
    <p
      className={`text-[10px] text-red-400 font-mono mt-1 transition-all ${
        isLong && !expanded ? "line-clamp-1" : "break-words whitespace-normal"
      } ${isLong ? "cursor-pointer hover:opacity-80" : ""}`}
      onClick={(e) => {
        if (isLong) {
          e.preventDefault()
          e.stopPropagation()
          setExpanded((prev) => !prev)
        }
      }}
      title={isLong && !expanded ? text : undefined}
    >
      {text}
    </p>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ScraperControl() {
  const { fetchScraperLogs } = useSupabase()

  // Keep a stable ref to fetchScraperLogs so the polling interval
  // never holds a stale closure (useSupabase recreates functions each render).
  const fetchRef = useRef(fetchScraperLogs)
  useEffect(() => { fetchRef.current = fetchScraperLogs })

  // Form state
  const [query, setQuery]           = useState("")
  const [minFollowers, setMin]      = useState(5_000)
  const [firing, setFiring]         = useState(false)

  // Logs state
  const [logs, setLogs]             = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(true)

  // Derived: is the most recent log still running?
  const isRunning = logs[0]?.status === "em_andamento" && !isTimedOut(logs[0])

  // ── Data fetching ────────────────────────────────────────────────────────

  // Stable loadLogs — uses ref internally so deps array stays empty.
  const loadLogs = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLogsLoading(true)
      const data = await fetchRef.current()
      setLogs(data || [])
    } catch { /* silent on background polls */ } finally {
      if (showLoader) setLogsLoading(false)
    }
  }, [])

  // Initial fetch on mount
  useEffect(() => { loadLogs(true) }, [loadLogs])

  // Smart polling — only while a job is running; stops automatically otherwise.
  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => loadLogs(false), POLL_MS)
    return () => clearInterval(id)
  }, [isRunning, loadLogs])

  // ── Webhook dispatch ─────────────────────────────────────────────────────

  const handleFire = async () => {
    if (!query.trim()) {
      toast.error("Informe o termo de busca antes de disparar.")
      return
    }
    setFiring(true)
    try {
      const res = await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), min_followers: minFollowers }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success("Scraper iniciado! Monitorando execução...")
      setQuery("")
      // Small delay to allow n8n to write the first log row
      setTimeout(() => loadLogs(false), 2_500)
    } catch {
      toast.error("Falha ao acionar o webhook do scraper.")
    } finally {
      setFiring(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="col-span-12 border border-border bg-card" style={{ borderRadius: "2px" }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-widest text-foreground">
            Controle do Scraper
          </span>
          {isRunning && (
            <span className="ml-1 flex items-center gap-1.5 text-[10px] font-mono text-yellow-400">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse inline-block" />
              LIVE
            </span>
          )}
        </div>
        <button
          onClick={() => loadLogs(false)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
        >
          <RefreshCw className="h-2.5 w-2.5" />
          Atualizar
        </button>
      </div>

      {/* ── Body: form (left) + logs (right) ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">

        {/* ── Left: Disparo Manual ──────────────────────────────────────── */}
        <div className="p-4 flex flex-col gap-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Disparo Manual
          </p>

          <div className="space-y-3">
            {/* Termo de busca */}
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Termo de Busca
              </Label>
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !isRunning && !firing && handleFire()}
                placeholder="Ex: Moda feminina São Paulo"
                className="h-8 text-xs bg-background border-border"
                style={{ borderRadius: "2px" }}
                disabled={isRunning || firing}
              />
            </div>

            {/* Mínimo de seguidores */}
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Mínimo de Seguidores
              </Label>
              <Input
                type="number"
                value={minFollowers}
                onChange={e => setMin(Math.max(0, Number(e.target.value)))}
                className="h-8 text-xs bg-background border-border font-mono"
                style={{ borderRadius: "2px" }}
                disabled={isRunning || firing}
                min={0}
                step={1000}
              />
            </div>

            {/* Botão de disparo */}
            <button
              onClick={handleFire}
              disabled={isRunning || firing || !query.trim()}
              className={[
                "w-full flex items-center justify-center gap-2 py-2 px-4",
                "text-xs font-semibold uppercase tracking-widest border",
                "transition-all duration-200",
                isRunning || firing || !query.trim()
                  ? "border-border text-muted-foreground cursor-not-allowed opacity-50"
                  : "border-primary text-primary hover:bg-primary hover:text-primary-foreground cursor-pointer",
              ].join(" ")}
              style={{ borderRadius: "2px" }}
            >
              {firing ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Iniciando...</>
              ) : isRunning ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Executando — aguarde</>
              ) : (
                <><Play className="h-3.5 w-3.5" /> Iniciar Scraper</>
              )}
            </button>
          </div>

          {/* Execução ativa — card de status inline */}
          {isRunning && logs[0] && (
            <div
              className="border border-yellow-500/30 bg-yellow-500/5 px-3 py-2.5 space-y-1"
              style={{ borderRadius: "2px" }}
            >
              <div className="flex items-center gap-1.5">
                <ScanSearch className="h-3 w-3 text-yellow-400" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-400">
                  Em execução
                </p>
              </div>
              <p className="text-xs text-foreground truncate font-medium">
                {logs[0].query ?? logs[0].termo_busca ?? "—"}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono">
                Iniciado às {format(new Date(logs[0].criado_em), "HH:mm:ss", { locale: ptBR })}
              </p>
            </div>
          )}
        </div>

        {/* ── Right: Feed de Logs ───────────────────────────────────────── */}
        <div className="flex flex-col">
          <div className="px-4 py-2.5 border-b border-border">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              Últimas Execuções
            </p>
          </div>

          <div className="divide-y divide-border">
            {logsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-4 py-3 space-y-1.5">
                  <Skeleton className="h-3.5 w-2/3" style={{ borderRadius: "2px" }} />
                  <Skeleton className="h-3 w-1/3" style={{ borderRadius: "2px" }} />
                </div>
              ))
            ) : logs.length === 0 ? (
              <div className="px-4 py-8 flex flex-col items-center gap-2 text-muted-foreground">
                <Terminal className="h-6 w-6 opacity-20" />
                <p className="text-xs text-center">Nenhuma execução registrada.</p>
              </div>
            ) : (
              logs.map((log, i) => {
                const effectiveStatus = getEffectiveStatus(log)
                const cfg = getStatusCfg(log)
                const Icon = cfg.Icon
                return (
                  <div
                    key={i}
                    className={`px-4 py-3 flex items-start justify-between gap-3 hover:bg-muted/10 transition-colors cursor-default ${cfg.row}`}
                  >
                    {/* Left: query + meta */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {log.query ?? log.termo_busca ?? "—"}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                        {log.leads_encontrados != null && (
                          <span className="text-[10px] font-mono text-primary font-semibold">
                            {Number(log.leads_encontrados).toLocaleString("pt-BR")} leads
                          </span>
                        )}
                        {log.min_followers != null && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ≥{Number(log.min_followers).toLocaleString("pt-BR")} seg.
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {format(
                            new Date(log.finalizado_em ?? log.criado_em),
                            "dd/MM HH:mm",
                            { locale: ptBR }
                          )}
                        </span>
                      </div>
                      {effectiveStatus === "erro_timeout" && (
                        <p className="text-[10px] text-red-400 mt-1 line-clamp-2 font-mono" title="O processo excedeu o tempo limite de 10 minutos e foi interrompido pelo sistema.">
                          O processo excedeu o tempo limite de 10 minutos e foi interrompido pelo sistema.
                        </p>
                      )}
                      {effectiveStatus === "erro" && (log.detalhes || log.mensagem) && (
                        <ErrorMessage text={log.detalhes || log.mensagem} />
                      )}
                    </div>

                    {/* Right: badge */}
                    <span
                      className={`flex items-center gap-1 shrink-0 text-[10px] font-semibold border px-2 py-0.5 ${cfg.badge}`}
                      style={{ borderRadius: "2px" }}
                    >
                      <Icon className={`h-3 w-3 ${cfg.spin ? "animate-spin" : ""}`} />
                      {cfg.label}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## `components/dashboard/spotlight-search.tsx`

Barra de busca/chat com IA no topo do dashboard, integrada a um webhook n8n que mantém uma conversa (`conversa_id`) e renderiza respostas em Markdown.

```tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useRef, useCallback } from "react"
import { Send, Sparkles, ChevronDown, ChevronUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import ReactMarkdown from "react-markdown"

interface Props {
  clienteSelecionado: any | null
}

interface AIMessage {
  role: "user" | "assistant"
  content: string
}

export function SpotlightSearch({ clienteSelecionado }: Props) {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [expanded, setExpanded] = useState(false)
  const [conversaId, setConversaId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const hasMessages = messages.length > 0

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim() || loading) return

    const userMsg = query.trim()
    setQuery("")
    setLoading(true)
    setExpanded(true)
    setMessages(prev => [...prev, { role: "user", content: userMsg }])

    try {
      const res = await fetch("https://n8n-n8n-start.kfocge.easypanel.host/webhook/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: clienteSelecionado?.conta_id || null,
          conversa_id: conversaId,
          mensagem: userMsg,
          usuario: "analista@idperformance.com.br",
        }),
      })
      const data = await res.json()
      if (data.status === "ok") {
        if (!conversaId && data.conversa_id) setConversaId(data.conversa_id)
        setMessages(prev => [...prev, { role: "assistant", content: data.resposta }])
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "Erro ao processar. Tente novamente." }])
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Não foi possível conectar ao agente." }])
    } finally {
      setLoading(false)
    }
  }, [query, loading, conversaId, clienteSelecionado])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === "Escape") {
      setExpanded(false)
    }
  }

  const handleClear = () => {
    setMessages([])
    setConversaId(null)
    setExpanded(false)
    setQuery("")
    inputRef.current?.focus()
  }

  return (
    <div
      className="w-full border border-border bg-card transition-all duration-300"
      style={{ borderRadius: "4px" }}
    >
      {/* Input row */}
      <form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 py-3">
        <Sparkles
          className="h-4 w-4 flex-shrink-0 transition-colors"
          style={{ color: loading ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            clienteSelecionado
              ? `Pergunte à IA sobre ${clienteSelecionado.conta_nome}, campanhas ou tarefas...`
              : "Pergunte à IA sobre campanhas, tarefas ou clientes..."
          }
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none font-mono"
          disabled={loading}
          autoComplete="off"
        />
        <div className="flex items-center gap-1">
          {hasMessages && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleClear}
              title="Limpar conversa"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          {hasMessages && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded(v => !v)}
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          )}
          <Button
            type="submit"
            size="icon"
            className="h-7 w-7 flex-shrink-0"
            disabled={!query.trim() || loading}
            style={{ borderRadius: "2px" }}
          >
            {loading ? (
              <span className="flex gap-0.5">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="h-1 w-1 rounded-full bg-primary-foreground animate-bounce"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </span>
            ) : (
              <Send className="h-3 w-3" />
            )}
          </Button>
        </div>
      </form>

      {/* Response area */}
      {expanded && hasMessages && (
        <div
          className="border-t border-border px-4 py-3 max-h-72 overflow-y-auto space-y-3"
          style={{ background: "hsl(var(--background))" }}
        >
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div
                  className="h-5 w-5 rounded-sm flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{ background: "hsl(var(--primary)/0.15)" }}
                >
                  <Sparkles className="h-3 w-3 text-primary" />
                </div>
              )}
              <div
                className={`text-xs max-w-[85%] px-3 py-2 ${
                  msg.role === "user"
                    ? "text-primary-foreground"
                    : "text-foreground prose prose-sm dark:prose-invert max-w-none"
                }`}
                style={{
                  background: msg.role === "user" ? "hsl(var(--primary))" : "hsl(var(--card))",
                  border: msg.role === "assistant" ? "1px solid hsl(var(--border))" : "none",
                  borderRadius: "2px",
                }}
              >
                {msg.role === "assistant"
                  ? <ReactMarkdown>{msg.content}</ReactMarkdown>
                  : msg.content
                }
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="h-5 w-5 rounded-sm bg-primary/15 flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-primary" />
              </div>
              <div className="flex gap-1 items-center px-3 py-2 border border-border" style={{ borderRadius: "2px" }}>
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```
