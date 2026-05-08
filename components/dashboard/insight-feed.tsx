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
