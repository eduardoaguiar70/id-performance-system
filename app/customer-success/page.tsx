/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import {
  Heart, TrendingUp, Clock, CheckCircle2, Users,
  ChevronRight, MessageCircle, Plus, CalendarClock,
  Pencil, MessageSquare, FileText, Sparkles, RefreshCw,
  Star, BarChart2, Zap, AlertTriangle, ClipboardList, CircleCheck,
  Siren, Settings2, Save, Info, Braces,
  UserPlus, Trash2, ToggleLeft, ToggleRight, Send, ShieldAlert, Search
} from "lucide-react"
import { useNps, type NpsDisparo, type NpsRelatorio, type NpsConfiguracoes, type NpsCliente } from "@/hooks/useNps"

// ─── Timezone helpers (America/Sao_Paulo) ─────────────────────────────────────

function getBRTStringForInput(dateStr: string) {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ""
  try {
    const formatted = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Sao_Paulo",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(d)
    return formatted.replace(" ", "T")
  } catch {
    return ""
  }
}

function formatBRTDisplay(dateStr: string) {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return "—"
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(d).replace(",", "")
  } catch {
    return "—"
  }
}

function toBRTISO(dateStr: string): string | null {
  if (!dateStr) return null
  const hasSeconds = dateStr.split(":").length === 3
  return `${dateStr}${hasSeconds ? "" : ":00"}-03:00`
}

function formatBRTDateShort(date: Date) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit", month: "2-digit", year: "2-digit",
    }).format(date)
  } catch {
    return "—"
  }
}

// ─── NPS Scale helpers (1–5) ──────────────────────────────────────────────────

/**
 * NPS scale is 1–5.
 * 5       → Promotor  (green)
 * 4       → Neutro    (yellow)
 * 1–3     → Detrator  (red)
 */
function getNpsZone(score: number): "promotor" | "neutro" | "detrator" {
  if (score === 5) return "promotor"
  if (score === 4) return "neutro"
  return "detrator"
}

function getNpsColor(score: number | null): string {
  if (score == null) return "text-muted-foreground"
  const zone = getNpsZone(score)
  if (zone === "promotor") return "text-green-400"
  if (zone === "neutro") return "text-yellow-400"
  return "text-red-400"
}

function getNpsZoneLabel(score: number | null): string {
  if (score == null) return "Sem dados suficientes"
  const avg = score
  if (avg === 5) return "Zona de Promotores"
  if (avg === 4) return "Zona Neutra"
  return "Zona de Detratores"
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNome(d: NpsDisparo): string {
  return d.cliente_nome || d.cliente_whatsapp || "Cliente"
}

function getDate(d: NpsDisparo): Date | null {
  const raw = d.data_agendamento || d.criado_em
  if (!raw) return null
  const dt = new Date(raw)
  return isNaN(dt.getTime()) ? null : dt
}

function parseChatMessages(raw: string | null): string[] {
  if (!raw) return []
  return raw
    .split(/\n?---\n?/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function buildChatFlow(disparo: NpsDisparo) {
  const sysMsgs = [
    disparo.mensagem_texto,
    disparo.mensagem_2,
    disparo.mensagem_3,
    disparo.mensagem_4,
    disparo.mensagem_5,
  ].filter(Boolean) as string[]

  const clientMsgs = parseChatMessages(disparo.respostas_cliente)

  const flow: Array<{ type: "system" | "client"; text: string }> = []
  sysMsgs.forEach((msg) => flow.push({ type: "system", text: msg }))
  clientMsgs.forEach((msg) => flow.push({ type: "client", text: msg }))

  return flow
}

// ─── Badge components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null }) {
  const v = (status ?? "").toLowerCase().replace(/[\s-]/g, "_")
  if (v === "em_andamento")
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
  if (v === "pendente")
    return (
      <Badge className="text-[10px] px-1.5 py-0 h-4 border bg-muted/40 text-muted-foreground border-border font-medium">
        Pendente
      </Badge>
    )
  if (v === "enviado")
    return (
      <Badge className="text-[10px] px-1.5 py-0 h-4 border bg-blue-500/15 text-blue-400 border-blue-500/30 font-medium">
        Enviado
      </Badge>
    )
  return (
    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 capitalize">
      {status ?? "—"}
    </Badge>
  )
}

// Corrected: keys match nps_classificacao values from the database (promotor/neutro/detrator)
const CLASSIFICACAO_STYLES: Record<string, { bg: string; text: string }> = {
  promotor: { bg: "bg-green-500/15 border-green-500/30", text: "text-green-400" },
  neutro:   { bg: "bg-yellow-500/15 border-yellow-500/30", text: "text-yellow-400" },
  detrator: { bg: "bg-red-500/15 border-red-500/30", text: "text-red-400" },
}

function ClassificacaoBadge({ classificacao }: { classificacao: string | null }) {
  if (!classificacao) return null
  const key = classificacao.toLowerCase().trim()
  const style = CLASSIFICACAO_STYLES[key] ?? { bg: "bg-muted/30 border-border", text: "text-muted-foreground" }
  return (
    <Badge className={`text-[10px] px-1.5 py-0 h-4 border ${style.bg} ${style.text} font-medium capitalize`}>
      {classificacao}
    </Badge>
  )
}

/** NPS score badge — scale 1-5. Max score is 5. */
function NpsScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-xs text-muted-foreground/40 font-mono">—</span>
  const n = Number(score)
  const color = getNpsColor(n)
  const zone = getNpsZone(n)
  const zoneLabel = zone === "promotor" ? "Promotor" : zone === "neutro" ? "Neutro" : "Detrator"
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-bold font-mono tabular-nums ${color}`}
      title={`${zoneLabel} — ${n}/5`}
    >
      {n}
      <span className="text-[9px] opacity-50 font-normal">/5</span>
    </span>
  )
}

/** Star display row for the NPS score (1–5 stars). */
function NpsStars({ score }: { score: number | null }) {
  if (score == null) return null
  const n = Math.max(1, Math.min(5, Number(score)))
  const color = getNpsColor(n)
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < n ? `${color} fill-current` : "text-muted-foreground/20"}`}
        />
      ))}
    </div>
  )
}

// ─── Metric card ──────────────────────────────────────────────────────────────

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

// ─── Chat bubble panel ────────────────────────────────────────────────────────

function ChatPanel({ disparo }: { disparo: NpsDisparo | null }) {
  if (!disparo) {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground px-6">
        <MessageSquare className="h-8 w-8 opacity-15" />
        <p className="text-xs text-center leading-relaxed">
          Selecione um feedback ao lado para visualizar a conversa.
        </p>
      </div>
    )
  }

  const flow = buildChatFlow(disparo)

  if (flow.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground px-6">
        <MessageSquare className="h-8 w-8 opacity-15" />
        <p className="text-xs text-center leading-relaxed">
          Nenhuma mensagem ou resposta registrada neste disparo.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
      {/* Header info */}
      <div className="flex items-center gap-2 flex-wrap pb-3 border-b border-border/60">
        <StatusBadge status={disparo.status} />
        <ClassificacaoBadge classificacao={disparo.nps_classificacao} />
        {disparo.nps_score != null && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            NPS: <NpsScoreBadge score={disparo.nps_score} />
            <NpsStars score={disparo.nps_score} />
          </span>
        )}
        {getDate(disparo) && (
          <span className="text-[10px] text-muted-foreground/40 font-mono ml-auto">
            {formatBRTDisplay(disparo.data_agendamento || disparo.criado_em || "")}
          </span>
        )}
      </div>

      {/* Chat bubbles */}
      <div className="space-y-2 pt-1">
        {flow.map((msg, idx) => (
          <div key={idx} className={`flex w-full ${msg.type === "system" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.type === "system"
                  ? "bg-green-500/20 border border-green-500/30 text-green-100 rounded-2xl rounded-tr-sm shadow-sm"
                  : "bg-muted/40 border border-border/50 text-foreground/80 rounded-2xl rounded-tl-sm shadow-sm"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Relatório IA — Section Parser ────────────────────────────────────────────

interface ReportSection {
  title: string
  content: string
  type: "resumo" | "fortes" | "gargalos" | "acao" | "other" | "risco"
}

function classifySection(title: string): ReportSection["type"] {
  const t = title.toLowerCase()
  if (t.includes("resumo") || t.includes("satisfa") || t.includes("geral") || t.includes("overview") || t.includes("vis")) return "resumo"
  if (t.includes("forte") || t.includes("manter") || t.includes("positiv") || t.includes("destaqu")) return "fortes"
  if (t.includes("risco") || t.includes("aten")) return "risco"
  if (t.includes("gargalo") || t.includes("fraqueza") || t.includes("melhorar")) return "gargalos"
  if (t.includes("a\u00e7") || t.includes("plano") || t.includes("tático") || t.includes("tatico") || t.includes("recomend") || t.includes("pr")) return "acao"
  return "other"
}

function parseMarkdownSections(markdown: string): ReportSection[] {
  const lines = markdown.split("\n")
  const sections: ReportSection[] = []
  let currentTitle = ""
  let currentLines: string[] = []

  const flush = () => {
    const content = currentLines.join("\n").trim()
    if (content || currentTitle) {
      sections.push({ title: currentTitle, content, type: classifySection(currentTitle) })
    }
  }

  for (const line of lines) {
    if (/^#{1,3}\s/.test(line)) {
      flush()
      currentTitle = line.replace(/^#+\s/, "").trim()
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }
  flush()

  return sections.filter((s) => s.content.length > 0)
}

// ─── Relatório IA — Markdown renderers ────────────────────────────────────────

const mdComponents = {
  // Bold: white in dark mode for emphasis
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  // Paragraphs
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-[13px] leading-relaxed text-foreground/75 mb-2 last:mb-0">{children}</p>
  ),
  // Unordered list
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="space-y-1.5 my-2 pl-0">{children}</ul>
  ),
  // Ordered list
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="space-y-1.5 my-2 pl-0 list-none counter-reset-list">{children}</ol>
  ),
  // List item
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="flex items-start gap-2 text-[13px] leading-relaxed text-foreground/75">
      <CircleCheck className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  ),
  // Inline code
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="bg-muted/60 text-primary px-1 py-0.5 rounded text-[11px] font-mono">{children}</code>
  ),
  // Blockquote
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 border-primary/50 pl-3 text-foreground/60 italic my-2">{children}</blockquote>
  ),
  // H3 within a section card
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/50 mt-3 mb-1.5 first:mt-0">{children}</h3>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="text-xs font-semibold text-foreground/70 mt-2 mb-1">{children}</h4>
  ),
}

// ─── Relatório IA — Markdown renderers (Risco variant) ──────────────────────

const mdComponentsRisco = {
  ...mdComponents,
  // Top-level list: keep a bit of spacing
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="space-y-2 my-2 pl-0">{children}</ul>
  ),
  // Nested list: indent subtopics
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="space-y-1.5 mt-1.5 pl-4 list-none">{children}</ol>
  ),
  // All list items: arrow icon in red instead of CircleCheck
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="flex items-start gap-2 text-[13px] leading-relaxed text-foreground/80">
      <ChevronRight className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  ),
}

// ─── Relatório IA — Section Card ──────────────────────────────────────────────

const SECTION_CONFIG = {
  resumo: {
    icon: BarChart2,
    label: "Resumo da Satisfação Geral",
    border: "border-primary/30",
    headerBg: "bg-primary/5",
    headerText: "text-primary",
    iconColor: "text-primary",
    accentBar: "bg-primary",
  },
  fortes: {
    icon: Zap,
    label: "Pontos Fortes — O que Manter",
    border: "border-green-500/30",
    headerBg: "bg-green-500/5",
    headerText: "text-green-400",
    iconColor: "text-green-400",
    accentBar: "bg-green-500",
  },
  gargalos: {
    icon: AlertTriangle,
    label: "Gargalos — O que Melhorar",
    border: "border-amber-500/30",
    headerBg: "bg-amber-500/5",
    headerText: "text-amber-400",
    iconColor: "text-amber-400",
    accentBar: "bg-amber-500",
  },
  risco: {
    icon: Siren,
    label: "Clientes em Risco (Atenção Urgente)",
    border: "border-red-500/50",
    headerBg: "bg-red-500/10",
    headerText: "text-red-500",
    iconColor: "text-red-500",
    accentBar: "bg-red-500",
  },
  acao: {
    icon: ClipboardList,
    label: "Plano de Ação Tático",
    border: "border-blue-500/30",
    headerBg: "bg-blue-500/5",
    headerText: "text-blue-400",
    iconColor: "text-blue-400",
    accentBar: "bg-blue-500",
  },
  other: {
    icon: FileText,
    label: "Informações Adicionais",
    border: "border-border",
    headerBg: "bg-muted/30",
    headerText: "text-foreground",
    iconColor: "text-muted-foreground",
    accentBar: "bg-border",
  },
} as const

function SectionCard({ section }: { section: ReportSection }) {
  const cfg = SECTION_CONFIG[section.type]
  const Icon = cfg.icon
  const displayTitle = section.title || cfg.label

  return (
    <div
      className={`border ${cfg.border} bg-card overflow-hidden`}
      style={{ borderRadius: "2px" }}
    >
      {/* Accent top bar */}
      <div className={`h-0.5 w-full ${cfg.accentBar} opacity-60`} />

      {/* Card header */}
      <div className={`flex items-center gap-2.5 px-5 py-3.5 border-b border-border/50 ${cfg.headerBg}`}>
        <div className={`flex items-center justify-center h-7 w-7 rounded-sm ${cfg.headerBg} border ${cfg.border} flex-shrink-0`}>
          <Icon className={`h-3.5 w-3.5 ${cfg.iconColor}`} />
        </div>
        <span className={`text-xs font-bold uppercase tracking-widest ${cfg.headerText}`}>
          {displayTitle}
        </span>
      </div>

      {/* Card body */}
      <div className="px-5 py-4">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={section.type === "risco" ? mdComponentsRisco : mdComponents}
        >
          {section.content}
        </ReactMarkdown>
      </div>
    </div>
  )
}

// ─── Relatório IA — Skeleton loader (card-shaped) ─────────────────────────────

function RelatorioSkeleton() {
  const cards = [
    { barColor: "bg-primary/40", w: "w-40" },
    { barColor: "bg-green-500/40", w: "w-48" },
    { barColor: "bg-amber-500/40", w: "w-44" },
    { barColor: "bg-red-500/40", w: "w-48" },
    { barColor: "bg-blue-500/40", w: "w-52" },
  ]
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {cards.map((c, i) => (
        <div key={i} className="border border-border bg-card overflow-hidden" style={{ borderRadius: "2px" }}>
          <Skeleton className={`h-0.5 w-full ${c.barColor} opacity-60`} />
          <div className="px-5 py-3.5 border-b border-border/50 flex items-center gap-2.5">
            <Skeleton className="h-7 w-7" style={{ borderRadius: "2px" }} />
            <Skeleton className={`h-3 ${c.w}`} style={{ borderRadius: "2px" }} />
          </div>
          <div className="px-5 py-4 space-y-2.5">
            <Skeleton className="h-3 w-full" style={{ borderRadius: "2px" }} />
            <Skeleton className="h-3 w-5/6" style={{ borderRadius: "2px" }} />
            <Skeleton className="h-3 w-full" style={{ borderRadius: "2px" }} />
            <Skeleton className="h-3 w-4/5" style={{ borderRadius: "2px" }} />
            {i % 2 === 0 && <Skeleton className="h-3 w-3/4" style={{ borderRadius: "2px" }} />}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Relatório IA panel ───────────────────────────────────────────────────────

function RelatorioPanel({
  relatorio,
  loading,
  generating,
  onGerar,
  fetchConfiguracoes,
  updateConfiguracoes,
}: {
  relatorio: NpsRelatorio | null
  loading: boolean
  generating: boolean
  onGerar: () => void
  fetchConfiguracoes: () => Promise<NpsConfiguracoes | null>
  updateConfiguracoes: (payload: {
    mensagem_texto: string
    mensagem_2?: string
    mensagem_3?: string
    mensagem_4?: string
    mensagem_5?: string
    instrucoes_diretoria?: string
  }) => Promise<void>
}) {
  const sections = relatorio ? parseMarkdownSections(relatorio.conteudo_markdown) : []

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [instrucoesIA, setInstrucoesIA] = useState("")
  const [loadingCfg, setLoadingCfg] = useState(false)
  const [savingCfg, setSavingCfg] = useState(false)

  const handleOpenSettings = async () => {
    setIsSettingsOpen(true)
    setLoadingCfg(true)
    try {
      const config = await fetchConfiguracoes()
      if (config) {
        setInstrucoesIA(config.instrucoes_diretoria ?? "")
      }
    } catch (err: any) {
      toast.error("Erro ao carregar configurações da IA: " + err.message)
    } finally {
      setLoadingCfg(false)
    }
  }

  const handleSaveSettings = async () => {
    setSavingCfg(true)
    try {
      const config = await fetchConfiguracoes()
      if (!config) {
        toast.error("Configuração não encontrada.")
        return
      }
      await updateConfiguracoes({
        mensagem_texto: config.mensagem_texto ?? "",
        mensagem_2: config.mensagem_2 ?? undefined,
        mensagem_3: config.mensagem_3 ?? undefined,
        mensagem_4: config.mensagem_4 ?? undefined,
        mensagem_5: config.mensagem_5 ?? undefined,
        instrucoes_diretoria: instrucoesIA || undefined,
      })
      toast.success("Instruções para a IA salvas com sucesso!")
      setIsSettingsOpen(false)
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message)
    } finally {
      setSavingCfg(false)
    }
  }

  // Order sections by type priority
  const typeOrder: ReportSection["type"][] = ["resumo", "fortes", "gargalos", "risco", "acao", "other"]
  const sorted = [...sections].sort(
    (a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)
  )

  // If parser finds no structured sections, render a single fallback card
  const hasSections = sorted.length > 0

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div
        className="flex items-center justify-between border border-border bg-card px-4 py-3"
        style={{ borderRadius: "2px" }}
      >
        <div className="flex items-center gap-2.5">
          <BarChart2 className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-foreground">
            Relatório Executivo de NPS
          </span>
          {relatorio && (
            <span className="text-[10px] text-muted-foreground/40 font-mono">
              · Gerado em {formatBRTDisplay(relatorio.criado_em)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenSettings}
                className="gap-2 text-xs"
                style={{ borderRadius: "2px" }}
              >
                <Settings2 className="h-3.5 w-3.5" />
                Configurar IA
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]" style={{ borderRadius: "2px" }}>
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Instruções para a IA
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                {loadingCfg ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" style={{ borderRadius: "2px" }} />
                    <Skeleton className="h-24 w-full" style={{ borderRadius: "2px" }} />
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="instrucoes-ia" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Diretrizes para o Relatório Executivo
                    </Label>
                    <Textarea
                      id="instrucoes-ia"
                      value={instrucoesIA}
                      onChange={(e) => setInstrucoesIA(e.target.value)}
                      placeholder="Ex: Priorize clientes detratores no resumo. Sempre sugira ações de retenção proativa..."
                      rows={5}
                      className="resize-none text-sm leading-relaxed bg-background/50 border-border/80 focus:border-primary/50 transition-colors"
                      style={{ borderRadius: "2px" }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Estas instruções guiarão a IA na geração do próximo relatório.
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button disabled={savingCfg || loadingCfg} onClick={handleSaveSettings} style={{ borderRadius: "2px" }}>
                  {savingCfg ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            size="sm"
            onClick={onGerar}
            disabled={generating}
            className="gap-2 text-xs"
            style={{ borderRadius: "2px" }}
          >
            {generating ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {generating ? "Gerando relatório..." : "Gerar Novo Relatório com IA"}
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading || generating ? (
        <RelatorioSkeleton />
      ) : !relatorio ? (
        <div
          className="border border-border bg-card py-16 flex flex-col items-center gap-3 text-muted-foreground"
          style={{ borderRadius: "2px" }}
        >
          <div className="h-12 w-12 rounded-sm border border-border flex items-center justify-center">
            <BarChart2 className="h-6 w-6 opacity-20" />
          </div>
          <p className="text-sm font-medium">Nenhum relatório gerado ainda.</p>
          <p className="text-xs text-muted-foreground/50 text-center max-w-xs leading-relaxed">
            Clique em &quot;Gerar Novo Relatório com IA&quot; para criar a análise
            executiva com base nos feedbacks recentes.
          </p>
        </div>
      ) : hasSections ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sorted.map((section, idx) => (
            <SectionCard key={idx} section={section} />
          ))}
        </div>
      ) : (
        // Fallback: unstructured markdown → single prose card
        <div className="border border-border bg-card" style={{ borderRadius: "2px" }}>
          <div className="h-0.5 w-full bg-primary opacity-60" />
          <div className="px-6 py-5">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {relatorio.conteudo_markdown}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Configurações NPS Panel ──────────────────────────────────────────────────

function ConfiguracoesNpsPanel({
  fetchConfiguracoes,
  updateConfiguracoes,
}: {
  fetchConfiguracoes: () => Promise<NpsConfiguracoes | null>
  updateConfiguracoes: (payload: {
    mensagem_texto: string
    mensagem_2?: string
    mensagem_3?: string
    mensagem_4?: string
    mensagem_5?: string
    instrucoes_diretoria?: string
  }) => Promise<void>
}) {
  const [loadingCfg, setLoadingCfg] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg1, setMsg1] = useState("")
  const [msg2, setMsg2] = useState("")
  const [msg3, setMsg3] = useState("")
  const [msg4, setMsg4] = useState("")
  const [msg5, setMsg5] = useState("")
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoadingCfg(true)
      try {
        const config = await fetchConfiguracoes()
        if (config) {
          setMsg1(config.mensagem_texto ?? "")
          setMsg2(config.mensagem_2 ?? "")
          setMsg3(config.mensagem_3 ?? "")
          setMsg4(config.mensagem_4 ?? "")
          setMsg5(config.mensagem_5 ?? "")
          setLastUpdated(config.atualizado_em)
        }
      } catch (err: any) {
        toast.error("Erro ao carregar configurações: " + err.message)
      } finally {
        setLoadingCfg(false)
      }
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!msg1.trim()) {
      toast.error("A Mensagem 1 é obrigatória.")
      return
    }
    setSaving(true)
    try {
      const config = await fetchConfiguracoes()
      await updateConfiguracoes({
        mensagem_texto: msg1,
        mensagem_2: msg2 || undefined,
        mensagem_3: msg3 || undefined,
        mensagem_4: msg4 || undefined,
        mensagem_5: msg5 || undefined,
        instrucoes_diretoria: config?.instrucoes_diretoria || undefined,
      })
      setLastUpdated(new Date().toISOString())
      toast.success("Configurações salvas com sucesso!")
    } catch (err: any) {
      toast.error("Erro ao salvar configurações: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    { id: "cfg-msg1", label: "Mensagem 1 — Abertura / Saudação", required: true,  value: msg1, set: setMsg1, placeholder: "Ex: Olá! Tudo bem? Sou da ID Performance e gostaríamos de saber como foi sua experiência conosco." },
    { id: "cfg-msg2", label: "Mensagem 2", required: false, value: msg2, set: setMsg2, placeholder: "Opcional" },
    { id: "cfg-msg3", label: "Mensagem 3", required: false, value: msg3, set: setMsg3, placeholder: "Opcional" },
    { id: "cfg-msg4", label: "Mensagem 4", required: false, value: msg4, set: setMsg4, placeholder: "Opcional" },
    { id: "cfg-msg5", label: "Mensagem 5", required: false, value: msg5, set: setMsg5, placeholder: "Opcional" },
  ]

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div
        className="flex items-center justify-between border border-border bg-card px-4 py-3"
        style={{ borderRadius: "2px" }}
      >
        <div className="flex items-center gap-2.5">
          <Settings2 className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-foreground">
            Configurações do Fluxo de Disparo NPS
          </span>
          {lastUpdated && (
            <span className="text-[10px] text-muted-foreground/40 font-mono">
              · Salvo em {formatBRTDisplay(lastUpdated)}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
        {/* Form */}
        <div className="border border-border bg-card" style={{ borderRadius: "2px" }}>
          <div className="h-0.5 w-full bg-primary opacity-60" />
          <div className="px-5 py-5 space-y-5">
            {loadingCfg ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-40" style={{ borderRadius: "2px" }} />
                    <Skeleton className="h-20 w-full" style={{ borderRadius: "2px" }} />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {fields.map(({ id, label, required, value, set, placeholder }) => (
                  <div key={id} className="grid gap-2">
                    <Label
                      htmlFor={id}
                      className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                    >
                      {label}
                      {required ? (
                        <span className="text-primary font-bold">*</span>
                      ) : (
                        <span className="text-[9px] text-muted-foreground/40 normal-case tracking-normal font-normal">(opcional)</span>
                      )}
                    </Label>
                    <Textarea
                      id={id}
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      placeholder={placeholder}
                      rows={3}
                      className="resize-none text-sm leading-relaxed bg-background/50 border-border/80 focus:border-primary/50 transition-colors"
                      style={{ borderRadius: "2px" }}
                    />
                  </div>
                ))}
              </>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <p className="text-[10px] text-muted-foreground/40">* Campo obrigatório</p>
              <Button
                onClick={handleSave}
                disabled={saving || loadingCfg}
                className="gap-2 text-xs"
                style={{ borderRadius: "2px" }}
              >
                {saving ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {saving ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </div>
          </div>
        </div>

        {/* Info sidebar */}
        <div className="space-y-4">
          {/* Variables block */}
          <div className="border border-primary/30 bg-primary/5 overflow-hidden" style={{ borderRadius: "2px" }}>
            <div className="h-0.5 w-full bg-primary opacity-70" />
            <div className="px-4 py-3.5 border-b border-primary/20 flex items-center gap-2.5">
              <div
                className="flex items-center justify-center h-7 w-7 bg-primary/10 border border-primary/30 flex-shrink-0"
                style={{ borderRadius: "2px" }}
              >
                <Braces className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                Variáveis Dinâmicas
              </span>
            </div>
            <div className="px-4 py-4 space-y-3">
              <p className="text-[13px] leading-relaxed text-foreground/75">
                Você <strong className="text-foreground">não precisa</strong> incluir o nome do cliente nas mensagens agora.
              </p>
              <p className="text-[13px] leading-relaxed text-foreground/60">
                O fluxo n8n substitui automaticamente as variáveis antes de enviar cada mensagem via WhatsApp.
              </p>
              <div className="space-y-2 pt-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Variáveis disponíveis</p>
                {[
                  { v: "{{nome_cliente}}", desc: "Nome completo do cliente" },
                  { v: "{{empresa}}",      desc: "Nome da empresa" },
                  { v: "{{whatsapp}}",     desc: "Número do WhatsApp" },
                ].map(({ v, desc }) => (
                  <div key={v} className="flex items-start gap-2">
                    <code
                      className="text-[11px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 flex-shrink-0"
                      style={{ borderRadius: "2px" }}
                    >
                      {v}
                    </code>
                    <span className="text-[12px] text-muted-foreground/70 leading-tight pt-0.5">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tips block */}
          <div className="border border-border bg-card overflow-hidden" style={{ borderRadius: "2px" }}>
            <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Dicas do Fluxo</span>
            </div>
            <div className="px-4 py-4 space-y-2.5">
              {[
                "A Mensagem 1 é a abertura — seja direto e amigável.",
                "Mensagens 2 e 3 costumam ser as perguntas principais (nota e motivo).",
                "Mensagens 4 e 5 são opcionais, use para aprofundar o feedback.",
                "Mantenha as mensagens curtas para WhatsApp (máx. ~300 caracteres).",
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[10px] font-bold text-primary/70 mt-0.5 flex-shrink-0">{i + 1}.</span>
                  <p className="text-[12px] leading-relaxed text-muted-foreground/70">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Clientes NPS Panel ───────────────────────────────────────────────────────

function ClientesNpsPanel({
  fetchClientes,
  createCliente,
  updateClienteStatus,
  deleteCliente,
  dispararNpsLote,
}: {
  fetchClientes: () => Promise<NpsCliente[]>
  createCliente: (p: { nome_cliente: string; empresa?: string; whatsapp: string }) => Promise<void>
  updateClienteStatus: (id: string, status: boolean) => Promise<void>
  deleteCliente: (id: string) => Promise<void>
  dispararNpsLote: (ids: string[]) => Promise<number>
}) {
  const [clientes, setClientes]       = useState<NpsCliente[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [search, setSearch]           = useState("")
  const [selected, setSelected]       = useState<Set<string>>(new Set())

  // ── Add modal state ────────────────────────────────────────────────────────
  const [addOpen, setAddOpen]     = useState(false)
  const [addNome, setAddNome]     = useState("")
  const [addEmpresa, setAddEmpresa] = useState("")
  const [addWhats, setAddWhats]   = useState("")
  const [addSaving, setAddSaving] = useState(false)

  // ── Dispatch confirmation modal ────────────────────────────────────────────
  const [dispOpen, setDispOpen]       = useState(false)
  const [dispatching, setDispatching] = useState(false)

  // ── Inline action loading per row ─────────────────────────────────────────
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)

  const load = async () => {
    setLoadingList(true)
    try {
      const data = await fetchClientes()
      setClientes(data)
    } catch (err: any) {
      toast.error("Erro ao carregar clientes: " + err.message)
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived filtered list ─────────────────────────────────────────────────
  const filtered = clientes.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.nome_cliente.toLowerCase().includes(q) ||
      (c.empresa ?? "").toLowerCase().includes(q) ||
      c.whatsapp.includes(q)
    )
  })

  const allChecked = filtered.length > 0 && filtered.every((c) => selected.has(c.id))
  const someChecked = filtered.some((c) => selected.has(c.id))

  const toggleAll = () => {
    if (allChecked) {
      setSelected((prev) => {
        const next = new Set(prev)
        filtered.forEach((c) => next.delete(c.id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        filtered.forEach((c) => next.add(c.id))
        return next
      })
    }
  }

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!addNome.trim() || !addWhats.trim()) {
      toast.error("Nome e WhatsApp são obrigatórios.")
      return
    }
    setAddSaving(true)
    try {
      await createCliente({ nome_cliente: addNome.trim(), empresa: addEmpresa.trim() || undefined, whatsapp: addWhats.trim() })
      toast.success("Cliente adicionado com sucesso!")
      setAddOpen(false)
      setAddNome(""); setAddEmpresa(""); setAddWhats("")
      await load()
    } catch (err: any) {
      toast.error("Erro ao adicionar cliente: " + err.message)
    } finally {
      setAddSaving(false)
    }
  }

  const handleToggleStatus = async (c: NpsCliente) => {
    setTogglingId(c.id)
    try {
      await updateClienteStatus(c.id, !c.status_ativo)
      setClientes((prev) => prev.map((x) => x.id === c.id ? { ...x, status_ativo: !c.status_ativo } : x))
    } catch (err: any) {
      toast.error("Erro ao alterar status: " + err.message)
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteCliente(id)
      setClientes((prev) => prev.filter((c) => c.id !== id))
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n })
      toast.success("Cliente removido.")
    } catch (err: any) {
      toast.error("Erro ao excluir cliente: " + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleDisparar = async () => {
    setDispatching(true)
    try {
      const count = await dispararNpsLote(Array.from(selected))
      toast.success(`${count} disparo(s) NPS criado(s) com sucesso!`)
      setSelected(new Set())
      setDispOpen(false)
      await load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDispatching(false)
    }
  }

  const selectedCount = selected.size

  return (
    <div className="space-y-4">

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-3 border border-border bg-card px-4 py-3"
        style={{ borderRadius: "2px" }}
      >
        {/* Icon + title */}
        <div className="flex items-center gap-2 mr-1">
          <Users className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-foreground">
            Clientes NPS
          </span>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
          <Input
            id="nps-clientes-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, empresa ou WhatsApp…"
            className="pl-8 h-8 text-xs bg-background/50"
            style={{ borderRadius: "2px" }}
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Batch dispatch button — only when items selected */}
          {selectedCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 text-xs border-primary/40 text-primary hover:bg-primary/10 hover:border-primary/60"
              style={{ borderRadius: "2px" }}
              onClick={() => setDispOpen(true)}
            >
              <Send className="h-3.5 w-3.5" />
              Disparar NPS para {selectedCount} selecionado{selectedCount !== 1 ? "s" : ""}
            </Button>
          )}

          {/* Add client */}
          <Button
            size="sm"
            className="gap-2 text-xs"
            style={{ borderRadius: "2px" }}
            onClick={() => setAddOpen(true)}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="border border-border bg-card overflow-hidden" style={{ borderRadius: "2px" }}>
        {/* Table header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-4 px-4 py-2.5 border-b border-border bg-muted/20 items-center">
          <input
            type="checkbox"
            id="nps-check-all"
            checked={allChecked}
            ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked }}
            onChange={toggleAll}
            className="h-3.5 w-3.5 accent-primary cursor-pointer"
          />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cliente</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Status</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right hidden sm:block">Último NPS</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right hidden md:block">Próximo NPS</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Ações</span>
        </div>

        {/* Rows */}
        {loadingList ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" style={{ borderRadius: "2px" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-2 text-muted-foreground">
            <Users className="h-8 w-8 opacity-15" />
            <p className="text-sm">
              {search ? "Nenhum cliente encontrado para esta busca." : "Nenhum cliente cadastrado ainda."}
            </p>
            {!search && (
              <p className="text-xs text-muted-foreground/50">Clique em &quot;Novo Cliente&quot; para começar.</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filtered.map((c) => {
              const isSelected = selected.has(c.id)
              return (
                <div
                  key={c.id}
                  className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-4 px-4 py-3 items-center transition-colors ${
                    isSelected ? "bg-primary/5" : "hover:bg-muted/10"
                  }`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    id={`nps-check-${c.id}`}
                    checked={isSelected}
                    onChange={() => toggleOne(c.id)}
                    className="h-3.5 w-3.5 accent-primary cursor-pointer"
                  />

                  {/* Name + empresa + whatsapp */}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{c.nome_cliente}</p>
                    <p className="text-[11px] text-muted-foreground/60 truncate">
                      {[c.empresa, c.whatsapp].filter(Boolean).join(" · ")}
                    </p>
                  </div>

                  {/* Status badge */}
                  <div className="flex justify-center">
                    {c.status_ativo ? (
                      <Badge className="text-[10px] px-1.5 py-0 h-4 border bg-green-500/15 text-green-400 border-green-500/30 font-medium">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge className="text-[10px] px-1.5 py-0 h-4 border bg-muted/40 text-muted-foreground border-border font-medium">
                        Inativo
                      </Badge>
                    )}
                  </div>

                  {/* Último NPS */}
                  <span className="text-[10px] font-mono text-muted-foreground/50 text-right hidden sm:block">
                    {c.ultimo_nps_em ? formatBRTDisplay(c.ultimo_nps_em) : "—"}
                  </span>

                  {/* Próximo NPS */}
                  <span className="text-[10px] font-mono text-muted-foreground/50 text-right hidden md:block">
                    {c.proximo_nps_em ? formatBRTDisplay(c.proximo_nps_em) : "—"}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    {/* Toggle status */}
                    <button
                      title={c.status_ativo ? "Desativar cliente" : "Ativar cliente"}
                      disabled={togglingId === c.id}
                      onClick={() => handleToggleStatus(c)}
                      className="h-7 w-7 flex items-center justify-center rounded-sm hover:bg-muted/30 transition-colors disabled:opacity-40"
                    >
                      {togglingId === c.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      ) : c.status_ativo ? (
                        <ToggleRight className="h-4 w-4 text-green-400" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-muted-foreground/50" />
                      )}
                    </button>

                    {/* Delete */}
                    <button
                      title="Excluir cliente"
                      disabled={deletingId === c.id}
                      onClick={() => handleDelete(c.id)}
                      className="h-7 w-7 flex items-center justify-center rounded-sm hover:bg-red-500/10 transition-colors disabled:opacity-40"
                    >
                      {deletingId === c.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-red-400" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground/40 hover:text-red-400 transition-colors" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer count */}
        {!loadingList && filtered.length > 0 && (
          <div className="px-4 py-2 border-t border-border/60 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground/40 font-mono">
              {filtered.length} cliente{filtered.length !== 1 ? "s" : ""}{search ? " encontrado" + (filtered.length !== 1 ? "s" : "") : " cadastrado" + (filtered.length !== 1 ? "s" : "")}
            </span>
            {selectedCount > 0 && (
              <span className="text-[10px] text-primary/70 font-mono">
                {selectedCount} selecionado{selectedCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Add Client Modal ──────────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) { setAddNome(""); setAddEmpresa(""); setAddWhats("") } }}>
        <DialogContent className="sm:max-w-[440px]" style={{ borderRadius: "2px" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <UserPlus className="h-4 w-4 text-primary" />
              Novo Cliente NPS
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {[
              { id: "add-nome",    label: "Nome do Cliente *", value: addNome,    set: setAddNome,    placeholder: "Ex: João Silva" },
              { id: "add-empresa", label: "Empresa",           value: addEmpresa, set: setAddEmpresa, placeholder: "Opcional" },
              { id: "add-whats",   label: "WhatsApp *",        value: addWhats,   set: setAddWhats,   placeholder: "Ex: 5511999999999" },
            ].map(({ id, label, value, set, placeholder }) => (
              <div key={id} className="grid gap-2">
                <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {label}
                </Label>
                <Input
                  id={id}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  style={{ borderRadius: "2px" }}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)} style={{ borderRadius: "2px" }}>
              Cancelar
            </Button>
            <Button disabled={addSaving} onClick={handleAdd} className="gap-2" style={{ borderRadius: "2px" }}>
              {addSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
              {addSaving ? "Salvando..." : "Adicionar Cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Batch Dispatch Confirmation Modal ────────────────────────────────── */}
      <Dialog open={dispOpen} onOpenChange={setDispOpen}>
        <DialogContent className="sm:max-w-[480px]" style={{ borderRadius: "2px" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Send className="h-4 w-4 text-primary" />
              Confirmar Disparo NPS
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-4">
            {/* Summary */}
            <div
              className="flex items-center gap-3 border border-primary/30 bg-primary/5 px-4 py-3"
              style={{ borderRadius: "2px" }}
            >
              <Send className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {selectedCount} cliente{selectedCount !== 1 ? "s" : ""} selecionado{selectedCount !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Serão criados {selectedCount} disparo{selectedCount !== 1 ? "s" : ""} com status <span className="text-yellow-400 font-mono">pendente</span>.
                </p>
              </div>
            </div>

            {/* Warnings */}
            <div className="space-y-2">
              {[
                "As mensagens configuradas em 'Configurações NPS' serão usadas para todos os disparos.",
                "Os disparos ficam com status 'pendente' até o n8n processá-los automaticamente.",
                "Verifique se as mensagens estão configuradas antes de prosseguir.",
              ].map((w, i) => (
                <div key={i} className="flex items-start gap-2">
                  <ShieldAlert className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[12px] leading-relaxed text-muted-foreground/75">{w}</p>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDispOpen(false)} style={{ borderRadius: "2px" }}>
              Cancelar
            </Button>
            <Button
              disabled={dispatching}
              onClick={handleDisparar}
              className="gap-2"
              style={{ borderRadius: "2px" }}
            >
              {dispatching ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {dispatching ? "Disparando..." : `Confirmar e Disparar`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomerSuccessPage() {
  const {

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
  } = useNps()

  // ── All disparos (for correct KPI counting) ───────────────────────────────
  const [allDisparos, setAllDisparos] = useState<NpsDisparo[]>([])
  // ── Filtered: only those with client responses (for feedback list) ─────────
  const [feedbacks, setFeedbacks] = useState<NpsDisparo[]>([])
  // ── Fila: pending/sent (awaiting dispatch) ─────────────────────────────────
  const [disparosPendentes, setDisparosPendentes] = useState<NpsDisparo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // ── Relatório IA ──────────────────────────────────────────────────────────
  const [relatorio, setRelatorio] = useState<NpsRelatorio | null>(null)
  const [loadingRelatorio, setLoadingRelatorio] = useState(false)
  const [generating, setGenerating] = useState(false)

  // ── Modal — novo disparo ──────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeClients, setActiveClients] = useState<NpsCliente[]>([])
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [clientSearchTerm, setClientSearchTerm] = useState("")
  const [dataAgendamento, setDataAgendamento] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isModalOpen) {
      fetchClientes().then(clients => {
        setActiveClients(clients.filter(c => c.status_ativo))
      }).catch(err => {
        toast.error("Erro ao carregar clientes: " + err.message)
      })
    } else {
      setSelectedClients([])
      setClientSearchTerm("")
      setDataAgendamento("")
    }
  }, [isModalOpen])

  // ── Modal — editar disparo ────────────────────────────────────────────────
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editMensagem1, setEditMensagem1] = useState("")
  const [editMensagem2, setEditMensagem2] = useState("")
  const [editMensagem3, setEditMensagem3] = useState("")
  const [editMensagem4, setEditMensagem4] = useState("")
  const [editMensagem5, setEditMensagem5] = useState("")
  const [editData, setEditData] = useState("")

  // ── Data fetching ─────────────────────────────────────────────────────────

  const loadDisparos = async () => {
    setLoading(true)
    try {
      const all = await fetchAllDisparos()
      setAllDisparos(all)
      // Feedbacks = records where client has already replied or are active/completed
      setFeedbacks(all.filter((d) => {
        const s = (d.status ?? "").toLowerCase().replace(/[\s-]/g, "_")
        return s === "em_andamento" || s === "concluido" || s === "concluído" || s === "finalizado" || (d.respostas_cliente && d.respostas_cliente.trim() !== "")
      }))
      // Queue = pending or recently sent (awaiting dispatch window)
      setDisparosPendentes(all.filter((d) => d.status === "pendente" || d.status === "enviado"))
    } catch (err: any) {
      toast.error("Erro ao carregar disparos: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadRelatorio = async () => {
    setLoadingRelatorio(true)
    try {
      const data = await fetchLatestRelatorio()
      setRelatorio(data)
    } catch (err: any) {
      toast.error("Erro ao carregar relatório: " + err.message)
    } finally {
      setLoadingRelatorio(false)
    }
  }

  useEffect(() => {
    loadDisparos()
    loadRelatorio()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Metrics — calculated from ALL disparos (not just with responses) ───────

  const metrics = useMemo(() => {
    // NPS average from all records with a score
    const withNps = allDisparos.filter((d) => d.nps_score != null)
    const npsMedia = withNps.length
      ? withNps.reduce((s, d) => s + Number(d.nps_score), 0) / withNps.length
      : null

    // Status counts from ALL disparos
    const emAndamento = allDisparos.filter(
      (d) => (d.status ?? "").toLowerCase().replace(/[\s-]/g, "_") === "em_andamento"
    ).length
    const concluido = allDisparos.filter((d) => {
      const v = (d.status ?? "").toLowerCase()
      return v === "concluido" || v === "concluído" || v === "finalizado"
    }).length

    // Total feedbacks = active, completed or those with at least one client reply
    const totalFeedbacks = allDisparos.filter((d) => {
      const s = (d.status ?? "").toLowerCase().replace(/[\s-]/g, "_")
      return s === "em_andamento" || s === "concluido" || s === "concluído" || s === "finalizado" || (d.respostas_cliente && d.respostas_cliente.trim() !== "")
    }).length

    return { npsMedia, emAndamento, concluido, totalFeedbacks }
  }, [allDisparos])

  const npsColor = metrics.npsMedia == null ? "text-muted-foreground" : getNpsColor(Math.round(metrics.npsMedia))

  const selected = feedbacks.find((d) => d.id === selectedId) ?? null

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  const handleCriarDisparo = async () => {
    if (selectedClients.length === 0) {
      toast.error("Selecione pelo menos um cliente para o disparo.")
      return
    }
    setIsSubmitting(true)
    try {
      const insertedCount = await dispararNpsLote(selectedClients, dataAgendamento ? toBRTISO(dataAgendamento) : null)
      toast.success(`${insertedCount} disparo(s) enfileirado(s) com sucesso!`)
      setIsModalOpen(false)
      loadDisparos()
    } catch (err: any) {
      toast.error("Erro ao enfileirar disparos: " + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenEdit = (disparo: NpsDisparo) => {
    setEditId(disparo.id)
    setEditMensagem1(disparo.mensagem_texto || "")
    setEditMensagem2(disparo.mensagem_2 || "")
    setEditMensagem3(disparo.mensagem_3 || "")
    setEditMensagem4(disparo.mensagem_4 || "")
    setEditMensagem5(disparo.mensagem_5 || "")
    setEditData(getBRTStringForInput(disparo.data_agendamento || ""))
    setIsEditModalOpen(true)
  }

  const handleUpdateDisparo = async () => {
    if (!editId || !editData || !editMensagem1) {
      toast.error("A Data de Agendamento e a Mensagem 1 são obrigatórias.")
      return
    }
    setIsSubmitting(true)
    try {
      await updateDisparo(editId, {
        mensagem_texto: editMensagem1,
        mensagem_2: editMensagem2,
        mensagem_3: editMensagem3,
        mensagem_4: editMensagem4,
        mensagem_5: editMensagem5,
        data_agendamento: toBRTISO(editData),
      })
      toast.success("Disparo atualizado com sucesso!")
      setIsEditModalOpen(false)
      loadDisparos()
    } catch (err: any) {
      toast.error("Erro ao atualizar: " + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGerarRelatorio = async () => {
    setGenerating(true)
    try {
      await triggerGerarRelatorio()
      toast.success("Solicitação enviada! O relatório será gerado em instantes.")
      // Reload after a short delay to pick up the new record
      setTimeout(() => loadRelatorio(), 3000)
    } catch (err: any) {
      toast.error("Erro ao acionar geração: " + err.message)
    } finally {
      setGenerating(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 space-y-5 p-8 pt-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Customer Success
          </h2>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" style={{ borderRadius: "2px" }}>
              <Plus className="h-4 w-4" />
              Novo Disparo Manual
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]" style={{ borderRadius: "2px" }}>
            <DialogHeader>
              <DialogTitle className="text-foreground">Novo Disparo Manual</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
              
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Selecione os Clientes (Ativos)
                  </Label>
                  <Input
                    placeholder="Pesquisar por nome ou empresa..."
                    value={clientSearchTerm}
                    onChange={(e) => setClientSearchTerm(e.target.value)}
                    className="h-8 text-sm"
                    style={{ borderRadius: "2px" }}
                  />
                </div>
                
                <div className="border border-border/60 bg-muted/20 p-2 space-y-1.5 overflow-y-auto max-h-[250px]" style={{ borderRadius: "2px" }}>
                  {activeClients
                    .filter((c) =>
                      c.nome_cliente.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                      (c.empresa && c.empresa.toLowerCase().includes(clientSearchTerm.toLowerCase()))
                    )
                    .map((cliente) => (
                      <label
                        key={cliente.id}
                        className="flex items-center gap-2.5 p-2 rounded-sm hover:bg-muted/40 cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={selectedClients.includes(cliente.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedClients((prev) => [...prev, cliente.id])
                            } else {
                              setSelectedClients((prev) => prev.filter((id) => id !== cliente.id))
                            }
                          }}
                        />
                        <div className="flex flex-col gap-0.5 leading-none">
                          <span className="text-sm font-medium text-foreground">
                            {cliente.nome_cliente}
                            {cliente.empresa && (
                              <span className="text-muted-foreground font-normal ml-1.5 text-xs">
                                ({cliente.empresa})
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {cliente.whatsapp}
                          </span>
                        </div>
                      </label>
                    ))}
                  {activeClients.length > 0 && activeClients.filter((c) =>
                    c.nome_cliente.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                    (c.empresa && c.empresa.toLowerCase().includes(clientSearchTerm.toLowerCase()))
                  ).length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      Nenhum cliente encontrado.
                    </div>
                  )}
                  {activeClients.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      Carregando ou nenhum cliente ativo encontrado...
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 py-1 px-1">
                  <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-1 rounded border border-border/50">
                    {selectedClients.length} cliente(s) selecionado(s)
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Os textos das mensagens serão preenchidos automaticamente conforme as configurações ativas.
                  </span>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="data" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Data de Agendamento
                </Label>
                <div className="flex items-center gap-3">
                  <Input 
                    id="data" 
                    type="datetime-local" 
                    value={dataAgendamento} 
                    onChange={(e) => setDataAgendamento(e.target.value)} 
                    style={{ borderRadius: "2px" }} 
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground/60 w-32">
                    Deixe em branco para disparar imediatamente.
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button disabled={isSubmitting} onClick={handleCriarDisparo} style={{ borderRadius: "2px" }}>
                {isSubmitting ? "Salvando..." : "Criar Disparo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Metric cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon={TrendingUp}
          label="NPS Médio"
          loading={loading}
          value={
            metrics.npsMedia != null
              ? <span className="inline-flex items-baseline gap-1">
                  {metrics.npsMedia.toFixed(1)}
                  <span className="text-sm font-normal text-muted-foreground/50">/5</span>
                </span>
              : "—"
          }
          color={npsColor}
          sub={getNpsZoneLabel(metrics.npsMedia != null ? Math.round(metrics.npsMedia) : null)}
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
          value={metrics.totalFeedbacks}
          sub="clientes que responderam"
        />
      </div>

      {/* ── Body Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="feedbacks" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="feedbacks" className="text-xs uppercase tracking-widest font-semibold">
            Feedbacks Recebidos
          </TabsTrigger>
          <TabsTrigger value="fila" className="text-xs uppercase tracking-widest font-semibold gap-2">
            <CalendarClock className="h-3.5 w-3.5" />
            Fila de Disparos
          </TabsTrigger>
          <TabsTrigger value="relatorio" className="text-xs uppercase tracking-widest font-semibold gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            Relatório IA
          </TabsTrigger>
          <TabsTrigger value="configuracoes" className="text-xs uppercase tracking-widest font-semibold gap-2">
            <Settings2 className="h-3.5 w-3.5" />
            Configurações NPS
          </TabsTrigger>
          <TabsTrigger value="clientes" className="text-xs uppercase tracking-widest font-semibold gap-2">
            <Users className="h-3.5 w-3.5" />
            Clientes NPS
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: Feedbacks Recebidos ─────────────────────────────────────── */}
        <TabsContent value="feedbacks" className="m-0 focus-visible:outline-none focus-visible:ring-0">
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
                    Os feedbacks aparecerão aqui quando clientes responderem via WhatsApp.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {feedbacks.map((d) => {
                    const nome = getNome(d)
                    const date = getDate(d)
                    const isSelected = d.id === selectedId
                    return (
                      <button
                        key={d.id}
                        onClick={() => setSelectedId(isSelected ? null : d.id)}
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
                                {formatBRTDateShort(date)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <StatusBadge status={d.status} />
                            <ClassificacaoBadge classificacao={d.nps_classificacao} />
                          </div>
                        </div>

                        {/* NPS score + stars */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <NpsScoreBadge score={d.nps_score} />
                          <NpsStars score={d.nps_score} />
                        </div>

                        <ChevronRight className={`h-3.5 w-3.5 transition-colors flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground/30"}`} />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Right — Chat panel */}
            <div className="border border-border bg-card sticky top-6" style={{ borderRadius: "2px" }}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-widest text-foreground">
                  Chat do Feedback
                </span>
                {selected && (
                  <span className="ml-auto text-[10px] text-muted-foreground/50 truncate max-w-[130px]">
                    {getNome(selected)}
                  </span>
                )}
              </div>
              <ChatPanel disparo={selected} />
            </div>

          </div>
        </TabsContent>

        {/* ── TAB: Fila de Disparos ────────────────────────────────────────── */}
        <TabsContent value="fila" className="m-0 focus-visible:outline-none focus-visible:ring-0">
          <div className="border border-border bg-card" style={{ borderRadius: "2px" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-widest text-foreground">
                  Disparos Pendentes
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground/40 font-mono">
                {disparosPendentes.length} registros
              </span>
            </div>

            <div className="divide-y divide-border/60">
              {loading ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" style={{ borderRadius: "2px" }} />
                  ))}
                </div>
              ) : disparosPendentes.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
                  <CalendarClock className="h-8 w-8 opacity-15" />
                  <p className="text-sm">Nenhum disparo pendente.</p>
                </div>
              ) : (
                disparosPendentes.map((d) => (
                  <div key={d.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-all">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-foreground">{d.cliente_nome}</p>
                      <p className="text-xs text-muted-foreground/70">
                        {d.cliente_whatsapp} {d.empresa ? `• ${d.empresa}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs font-mono">
                          {formatBRTDisplay(d.data_agendamento || "")}
                        </p>
                        <Badge className={`text-[10px] px-1.5 py-0 h-4 border mt-1 capitalize font-medium ${
                          d.status === "enviado"
                            ? "bg-green-500/15 text-green-400 border-green-500/30"
                            : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                        }`}>
                          {d.status || "pendente"}
                        </Badge>
                      </div>
                      {d.status !== "enviado" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(d)}>
                          <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB: Relatório IA ────────────────────────────────────────────── */}
        <TabsContent value="relatorio" className="m-0 focus-visible:outline-none focus-visible:ring-0">
          <RelatorioPanel
            relatorio={relatorio}
            loading={loadingRelatorio}
            generating={generating}
            onGerar={handleGerarRelatorio}
            fetchConfiguracoes={fetchConfiguracoes}
            updateConfiguracoes={updateConfiguracoes}
          />
        </TabsContent>

        {/* ── TAB: Configurações NPS ───────────────────────────────────────── */}
        <TabsContent value="configuracoes" className="m-0 focus-visible:outline-none focus-visible:ring-0">
          <ConfiguracoesNpsPanel
            fetchConfiguracoes={fetchConfiguracoes}
            updateConfiguracoes={updateConfiguracoes}
          />
        </TabsContent>

        {/* ── TAB: Clientes NPS ──────────────────────────────────────────── */}
        <TabsContent value="clientes" className="m-0 focus-visible:outline-none focus-visible:ring-0">
          <ClientesNpsPanel
            fetchClientes={fetchClientes}
            createCliente={createCliente}
            updateClienteStatus={updateClienteStatus}
            deleteCliente={deleteCliente}
            dispararNpsLote={dispararNpsLote}
          />
        </TabsContent>
      </Tabs>

      {/* ── Edit Dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]" style={{ borderRadius: "2px" }}>
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Disparo</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {[
              { id: "edit-msg1", label: "Mensagem 1 (Apresentação / Saudação) *", value: editMensagem1, set: setEditMensagem1 },
              { id: "edit-msg2", label: "Mensagem 2 (Pergunta da Nota 1–5)", value: editMensagem2, set: setEditMensagem2 },
              { id: "edit-msg3", label: "Mensagem 3 (Pergunta do Motivo)", value: editMensagem3, set: setEditMensagem3 },
              { id: "edit-msg4", label: "Mensagem 4 (Opcional)", value: editMensagem4, set: setEditMensagem4 },
              { id: "edit-msg5", label: "Mensagem 5 (Opcional)", value: editMensagem5, set: setEditMensagem5 },
            ].map(({ id, label, value, set }) => (
              <div key={id} className="grid gap-2">
                <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</Label>
                <Textarea id={id} value={value} onChange={(e) => set(e.target.value)} className="resize-none" style={{ borderRadius: "2px" }} />
              </div>
            ))}
            <div className="grid gap-2">
              <Label htmlFor="edit-data" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Data de Agendamento *</Label>
              <Input id="edit-data" type="datetime-local" value={editData} onChange={(e) => setEditData(e.target.value)} style={{ borderRadius: "2px" }} />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={isSubmitting} onClick={handleUpdateDisparo} style={{ borderRadius: "2px" }}>
              {isSubmitting ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
