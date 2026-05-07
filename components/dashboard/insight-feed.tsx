/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useMemo } from "react"
import { Bot, TrendingUp, TrendingDown, PauseCircle, Zap, ArrowRight } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Props {
  kpiAnalysis: any | null
  clienteSelecionado: any | null
  loading: boolean
}

interface InsightAlert {
  type: "pause" | "champion" | "warning" | "opportunity"
  message: string
  detail?: string
}

const TYPE_CONFIG = {
  pause:       { icon: PauseCircle,  color: "text-red-400",    bg: "bg-red-500/8 border-red-500/25",    label: "Pausar" },
  champion:    { icon: TrendingUp,   color: "text-primary",     bg: "bg-primary/8 border-primary/25",    label: "Destaque" },
  warning:     { icon: TrendingDown, color: "text-orange-400", bg: "bg-orange-500/8 border-orange-500/25", label: "Alerta" },
  opportunity: { icon: Zap,          color: "text-sky-400",    bg: "bg-sky-500/8 border-sky-500/25",    label: "Oportunidade" },
}

function parseAlerts(analysis: any): InsightAlert[] {
  if (!analysis) return []
  const alerts: InsightAlert[] = []

  const parseSafe = (field: any) => {
    if (!field) return null
    if (typeof field === "string") { try { return JSON.parse(field) } catch { return field } }
    return field
  }

  const observacoes = parseSafe(analysis.observacoes)
  const acoes = parseSafe(analysis.acoes_recomendadas)
  const anuncios = parseSafe(analysis.anuncios)
  const campanhas = parseSafe(analysis.campanhas)

  // Scan anuncios for pause signals
  if (anuncios && typeof anuncios === "object") {
    for (const [key, val] of Object.entries(anuncios)) {
      if (!Array.isArray(val)) continue
      const isPause = key.toLowerCase().includes("paus") || key.toLowerCase().includes("pior")
      for (const item of (val as any[]).slice(0, 2)) {
        alerts.push({
          type: isPause ? "pause" : "champion",
          message: item.ad_name || item.nome || item.anuncio || "Anúncio",
          detail: item.insight || item.motivo || item.justificativa,
        })
      }
    }
  }

  // Scan campanhas
  if (campanhas && typeof campanhas === "object") {
    for (const [key, val] of Object.entries(campanhas)) {
      if (!Array.isArray(val)) continue
      const isGood = key.toLowerCase().includes("melhor") || key.toLowerCase().includes("top")
      for (const item of (val as any[]).slice(0, 1)) {
        alerts.push({
          type: isGood ? "champion" : "warning",
          message: item.nome || item.campanha || "Campanha",
          detail: item.insight || item.justificativa,
        })
      }
    }
  }

  // Scan acoes for opportunity keywords
  if (acoes) {
    const acoesStr = typeof acoes === "string" ? acoes : JSON.stringify(acoes)
    const lines = acoesStr.split(/[\n.·•]/).filter((l: string) => l.trim().length > 20).slice(0, 2)
    for (const line of lines) {
      alerts.push({ type: "opportunity", message: line.trim().replace(/^[-*]\s*/, "") })
    }
  }

  return alerts.slice(0, 5)
}

export function InsightFeed({ kpiAnalysis, clienteSelecionado, loading }: Props) {
  const alerts = useMemo(() => parseAlerts(kpiAnalysis), [kpiAnalysis])
  const isValidAnalysis = kpiAnalysis?.criado_em &&
    (Date.now() - new Date(kpiAnalysis.criado_em).getTime()) / 1000 / 60 / 60 < 24

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
              Ver análise <ArrowRight className="h-2.5 w-2.5" />
            </button>
          </Link>
        )}
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" style={{ borderRadius: "2px" }} />
          ))
        ) : !clienteSelecionado ? (
          <div className="py-5 text-center space-y-1">
            <Bot className="h-6 w-6 mx-auto opacity-20" />
            <p className="text-xs text-muted-foreground">
              Selecione um cliente para ver<br />insights da IA.
            </p>
          </div>
        ) : !isValidAnalysis ? (
          <div className="py-5 text-center space-y-2">
            <Bot className="h-6 w-6 mx-auto opacity-20" />
            <p className="text-xs text-muted-foreground">
              Nenhuma análise recente.<br />Gere uma análise na aba KPIs.
            </p>
            <Link href="/kpis">
              <button
                className="text-[10px] text-primary hover:underline flex items-center gap-1 mx-auto cursor-pointer"
              >
                Ir para KPIs <ArrowRight className="h-2.5 w-2.5" />
              </button>
            </Link>
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-5 text-center">
            <p className="text-xs text-muted-foreground">Análise sem alertas destacados.</p>
          </div>
        ) : (
          <>
            {kpiAnalysis?.criado_em && (
              <p className="text-[10px] text-muted-foreground/50 font-mono px-1 pb-1">
                Análise de {format(new Date(kpiAnalysis.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
            {alerts.map((alert, i) => {
              const cfg = TYPE_CONFIG[alert.type]
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
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
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
          </>
        )}
      </div>
    </div>
  )
}
