/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Heart, TrendingUp, Clock, CheckCircle2, Users,
  AlertTriangle, ChevronRight, XCircle, CheckCircle,
  Bot, Sparkles, MessageCircle,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FeedbackCS {
  id: string
  nome_cliente: string | null
  cliente_nome: string | null
  cliente_whatsapp: string | null
  nps: number | null
  status_pesquisa: string | null
  sentimento: string | null
  resumo_executivo: string | null
  pontos_atrito: any
  boas_praticas: any
  criado_em: string | null
  data: string | null
  [key: string]: any
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getClienteNome(fb: FeedbackCS): string {
  return fb.nome_cliente || fb.cliente_nome || fb.cliente_whatsapp || "Cliente"
}

function getFeedbackDate(fb: FeedbackCS): Date | null {
  const raw = fb.criado_em || fb.data
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

function parseJsonArray(val: any): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val.map(String).filter(Boolean)
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
    } catch { /* fall through */ }
    return val.split(/\n/).map((s) => s.replace(/^[-*•]\s*/, "").trim()).filter(Boolean)
  }
  return []
}

// ─── Badge configs ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null }) {
  const v = (status ?? "").toLowerCase().replace(/[\s-]/g, "_")
  if (v === "em_andamento" || v === "em andamento")
    return (
      <Badge className="text-[10px] px-1.5 py-0 h-4 border bg-yellow-500/15 text-yellow-400 border-yellow-500/30 font-medium">
        Em andamento
      </Badge>
    )
  if (v === "concluido" || v === "concluído" || v === "finalizado")
    return (
      <Badge className="text-[10px] px-1.5 py-0 h-4 border bg-green-500/15 text-green-400 border-green-500/30 font-medium">
        Concluído
      </Badge>
    )
  return (
    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 capitalize">
      {status ?? "—"}
    </Badge>
  )
}

const SENTIMENTO_STYLES: Record<string, { bg: string; text: string }> = {
  positivo:       { bg: "bg-green-500/15 border-green-500/30",   text: "text-green-400" },
  neutro:         { bg: "bg-yellow-500/15 border-yellow-500/30", text: "text-yellow-400" },
  negativo:       { bg: "bg-orange-500/15 border-orange-500/30", text: "text-orange-400" },
  "risco de churn": { bg: "bg-red-500/15 border-red-500/30",    text: "text-red-400" },
  risco_churn:    { bg: "bg-red-500/15 border-red-500/30",      text: "text-red-400" },
}

function SentimentoBadge({ sentimento }: { sentimento: string | null }) {
  if (!sentimento) return <span className="text-xs text-muted-foreground/40">—</span>
  const key = sentimento.toLowerCase().trim()
  const style = SENTIMENTO_STYLES[key] ?? { bg: "bg-muted/30 border-border", text: "text-muted-foreground" }
  return (
    <Badge className={`text-[10px] px-1.5 py-0 h-4 border ${style.bg} ${style.text} font-medium`}>
      {sentimento}
    </Badge>
  )
}

function NpsBadge({ nps }: { nps: number | null }) {
  if (nps == null) return <span className="text-xs text-muted-foreground/40">—</span>
  const n = Number(nps)
  const color = n >= 9 ? "text-green-400" : n >= 7 ? "text-yellow-400" : "text-red-400"
  const label = n >= 9 ? "Promotor" : n >= 7 ? "Passivo" : "Detrator"
  return (
    <span className={`text-xs font-bold font-mono tabular-nums ${color}`} title={label}>
      {n}
    </span>
  )
}

// ─── Metric card ────────────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon, label, value, sub, color = "text-foreground", loading,
}: {
  icon: React.ElementType; label: string; value: React.ReactNode
  sub?: string; color?: string; loading?: boolean
}) {
  return (
    <div className="border border-border bg-card px-5 py-4" style={{ borderRadius: "2px" }}>
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-semibold uppercase tracking-widest">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-20 mt-1" />
      ) : (
        <p className={`text-2xl font-bold leading-none ${color}`}>{value}</p>
      )}
      {sub && <p className="text-[10px] text-muted-foreground/50 mt-1.5">{sub}</p>}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CustomerSuccessPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackCS[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from("feedbacks_cs")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error && data) setFeedbacks(data as FeedbackCS[])
        setLoading(false)
      })
  }, [])

  // ── Metrics ─────────────────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const withNps = feedbacks.filter((f) => f.nps != null)
    const npsMedia = withNps.length
      ? withNps.reduce((s, f) => s + Number(f.nps), 0) / withNps.length
      : null

    const emAndamento = feedbacks.filter((f) => {
      const v = (f.status_pesquisa ?? "").toLowerCase().replace(/[\s-]/g, "_")
      return v === "em_andamento" || v === "em andamento"
    }).length

    const concluido = feedbacks.filter((f) => {
      const v = (f.status_pesquisa ?? "").toLowerCase()
      return v === "concluido" || v === "concluído" || v === "finalizado"
    }).length

    return { npsMedia, emAndamento, concluido, total: feedbacks.length }
  }, [feedbacks])

  const npsColor =
    metrics.npsMedia == null ? "text-muted-foreground"
    : metrics.npsMedia >= 9 ? "text-green-400"
    : metrics.npsMedia >= 7 ? "text-yellow-400"
    : "text-red-400"

  const selected = feedbacks.find((f) => f.id === selectedId) ?? null
  const atrito    = parseJsonArray(selected?.pontos_atrito)
  const praticas  = parseJsonArray(selected?.boas_praticas)

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 space-y-5 p-8 pt-6">

      {/* Header */}
      <div className="flex items-center gap-2">
        <Heart className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Customer Success
        </h2>
      </div>

      {/* ── Metric cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon={TrendingUp}
          label="NPS Médio"
          loading={loading}
          value={metrics.npsMedia != null ? metrics.npsMedia.toFixed(1) : "—"}
          color={npsColor}
          sub={
            metrics.npsMedia != null
              ? metrics.npsMedia >= 9 ? "Zona de Promotores"
              : metrics.npsMedia >= 7 ? "Zona Passiva"
              : "Zona de Detratores"
              : "Sem dados suficientes"
          }
        />
        <MetricCard
          icon={Clock}
          label="Em Andamento"
          loading={loading}
          value={metrics.emAndamento}
          color="text-yellow-400"
          sub="pesquisas ativas"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Concluídas"
          loading={loading}
          value={metrics.concluido}
          color="text-green-400"
          sub="pesquisas finalizadas"
        />
        <MetricCard
          icon={Users}
          label="Total de Feedbacks"
          loading={loading}
          value={metrics.total}
          sub="registros na base"
        />
      </div>

      {/* ── Body grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 items-start">

        {/* Left — feedback list */}
        <div className="border border-border bg-card" style={{ borderRadius: "2px" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-foreground">
                Feedbacks Recentes
              </span>
            </div>
            {!loading && (
              <span className="text-[10px] text-muted-foreground/40 font-mono">
                {feedbacks.length} registros
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" style={{ borderRadius: "2px" }} />
              ))}
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
              <Heart className="h-8 w-8 opacity-15" />
              <p className="text-sm">Nenhum feedback registrado ainda.</p>
              <p className="text-xs text-muted-foreground/50 text-center max-w-xs">
                Os feedbacks aparecerão aqui conforme o n8n for populando a tabela <code className="font-mono">feedbacks_cs</code>.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {feedbacks.map((fb) => {
                const nome = getClienteNome(fb)
                const date = getFeedbackDate(fb)
                const isSelected = fb.id === selectedId
                return (
                  <button
                    key={fb.id}
                    onClick={() => setSelectedId(isSelected ? null : fb.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-muted/20 ${
                      isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "border-l-2 border-l-transparent"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="h-8 w-8 rounded-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary text-[10px] font-black leading-none">
                        {nome.slice(0, 2).toUpperCase()}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-semibold text-foreground truncate">{nome}</p>
                        {date && (
                          <span className="text-[9px] text-muted-foreground/40 font-mono flex-shrink-0">
                            {format(date, "dd/MM/yy", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusBadge status={fb.status_pesquisa} />
                        <SentimentoBadge sentimento={fb.sentimento} />
                      </div>
                    </div>

                    {/* NPS */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <NpsBadge nps={fb.nps} />
                      <ChevronRight className={`h-3.5 w-3.5 transition-colors ${isSelected ? "text-primary" : "text-muted-foreground/30"}`} />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right — AI detail panel */}
        <div className="border border-border bg-card sticky top-6" style={{ borderRadius: "2px" }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Bot className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-foreground">
              Raio-X da IA
            </span>
            {selected && (
              <span className="ml-auto text-[10px] text-muted-foreground/50 truncate max-w-[120px]">
                {getClienteNome(selected)}
              </span>
            )}
          </div>

          {!selected ? (
            <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground px-6">
              <Sparkles className="h-8 w-8 opacity-15" />
              <p className="text-xs text-center leading-relaxed">
                Selecione um feedback ao lado para ver a análise detalhada gerada pela IA.
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">

              {/* Header info */}
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={selected.status_pesquisa} />
                <SentimentoBadge sentimento={selected.sentimento} />
                {selected.nps != null && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    NPS: <NpsBadge nps={selected.nps} />
                  </span>
                )}
                {getFeedbackDate(selected) && (
                  <span className="text-[10px] text-muted-foreground/40 font-mono ml-auto">
                    {format(getFeedbackDate(selected)!, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                )}
              </div>

              {/* Resumo Executivo */}
              {selected.resumo_executivo && (
                <div>
                  <p className="text-[10px] text-primary/60 uppercase tracking-widest font-mono mb-1.5 flex items-center gap-1">
                    <Bot className="h-2.5 w-2.5" />
                    Resumo Executivo
                  </p>
                  <p className="text-xs text-foreground/85 leading-relaxed whitespace-pre-wrap bg-muted/20 px-3 py-2.5 border border-border/60" style={{ borderRadius: "2px" }}>
                    {selected.resumo_executivo}
                  </p>
                </div>
              )}

              {/* Pontos de Atrito */}
              {atrito.length > 0 && (
                <div>
                  <p className="text-[10px] text-red-400/80 uppercase tracking-widest font-mono mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    Pontos de Atrito
                  </p>
                  <ul className="space-y-1.5">
                    {atrito.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground/80 leading-relaxed">
                        <XCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Boas Práticas */}
              {praticas.length > 0 && (
                <div>
                  <p className="text-[10px] text-green-400/80 uppercase tracking-widest font-mono mb-1.5 flex items-center gap-1">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Boas Práticas
                  </p>
                  <ul className="space-y-1.5">
                    {praticas.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground/80 leading-relaxed">
                        <CheckCircle className="h-3.5 w-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Empty analysis state */}
              {!selected.resumo_executivo && atrito.length === 0 && praticas.length === 0 && (
                <div className="py-6 flex flex-col items-center gap-2 text-muted-foreground">
                  <Bot className="h-6 w-6 opacity-20" />
                  <p className="text-xs text-center">Análise da IA ainda não disponível para este feedback.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
