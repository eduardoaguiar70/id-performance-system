/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useMemo } from "react"
import {
  TrendingUp, Users, CalendarDays, CheckSquare,
  BarChart2, ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip
} from "recharts"

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
