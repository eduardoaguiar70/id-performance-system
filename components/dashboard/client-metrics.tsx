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
