/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft, Building2, User, Phone, ExternalLink,
  MessageCircle, Target, Megaphone, BarChart2,
  TrendingUp, CalendarDays, TrendingDown, Minus,
  Pencil, Check, X, StickyNote, DollarSign,
  MousePointerClick, ShoppingCart, Zap, BellRing
} from "lucide-react"
import Link from "next/link"
import { AlertasConfig } from "@/components/clientes/alertas-config"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"

// ─── Flexible field pickers ───────────────────────────────────────────────────

function pick(row: any, ...keys: string[]): string | null {
  for (const k of keys) {
    if (row[k] != null && row[k] !== "") return String(row[k])
  }
  return null
}

// detectKey returns the actual column name that exists on the row (even if null)
function detectKey(row: any, ...keys: string[]): string | null {
  for (const k of keys) {
    if (k in row) return k
  }
  return null
}

function getNome(row: any)        { return pick(row, "nome_empresa", "name", "nome", "empresa", "company_name", "client_name", "razao_social", "fantasia") ?? "Sem nome" }
function getStatus(row: any)      { return pick(row, "status", "situacao") }
function getNicho(row: any)       { return pick(row, "nicho", "niche", "segmento", "sector", "categoria") }
function getKpi(row: any)         { return pick(row, "kpi_principal", "kpi", "main_kpi", "objetivo") }
function getResponsavel(row: any) { return pick(row, "responsavel_nome", "responsavel", "contact_name", "responsible", "gestor") }
function getWhatsapp(row: any)    { return pick(row, "responsavel_whatsapp", "whatsapp", "telefone", "phone", "celular") }
function getDrive(row: any)       { return pick(row, "pasta_drive_url", "drive_url", "drive", "pasta_drive", "folder_url") }
function getMetaId(row: any)      { return pick(row, "meta_ads_id", "meta_id", "facebook_ads_id", "fb_ads_id") }
function getGoogleId(row: any)    { return pick(row, "google_ads_id", "google_id", "adwords_id") }
function getObs(row: any)         { return pick(row, "observacoes", "notas", "notes", "anotacoes", "obs", "comentarios") }

// ─── Formatters ────────────────────────────────────────────────────────────────

const fmtBRL  = (v: any) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v) || 0)
const fmtPct  = (v: any) => `${(Number(v) || 0).toFixed(2)}%`
const fmtDec  = (v: any, dec = 2) => (Number(v) || 0).toFixed(dec)

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FeedbackCS {
  id: string
  criado_em: string | null
  cliente_nome: string | null
  cliente_whatsapp: string | null
  status_pesquisa: string | null
  sentimento: string | null
  resumo_executivo: string | null
  nps: number | null
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null }) {
  const v = (status ?? "").toLowerCase()
  if (v === "ativo" || v === "active" || v === "true")
    return <Badge className="text-xs border bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/20">Ativo</Badge>
  if (!status) return null
  return <Badge variant="secondary" className="text-xs text-muted-foreground">{status}</Badge>
}

const SENTIMENTO_CFG: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  positivo: { color: "text-green-400",  bg: "bg-green-500/10 border-green-500/25",   icon: TrendingUp,   label: "Positivo" },
  negativo: { color: "text-red-400",    bg: "bg-red-500/10 border-red-500/25",       icon: TrendingDown, label: "Negativo" },
  neutro:   { color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/25", icon: Minus,        label: "Neutro"   },
}

function getSentimentoCfg(s: string | null) {
  return SENTIMENTO_CFG[(s ?? "").toLowerCase().trim()] ??
    { color: "text-muted-foreground", bg: "bg-muted/30 border-border", icon: Minus, label: s ?? "—" }
}

function parseFbDate(fb: FeedbackCS): Date | null {
  if (!fb.criado_em) return null
  const d = new Date(fb.criado_em)
  return isNaN(d.getTime()) ? null : d
}

// ─── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label, right }: { icon: React.ElementType; label: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-widest text-foreground">{label}</span>
      </div>
      {right}
    </div>
  )
}

// ─── Metric tile ───────────────────────────────────────────────────────────────

function MetricTile({ icon: Icon, label, value, sub, color = "text-foreground" }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 border border-border/60 bg-muted/10" style={{ borderRadius: "2px" }}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className={`text-lg font-bold leading-none ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground/60">{sub}</p>}
    </div>
  )
}

// ─── Feedback card ─────────────────────────────────────────────────────────────

function FeedbackCard({ feedback }: { feedback: FeedbackCS }) {
  const cfg = getSentimentoCfg(feedback.sentimento)
  const Icon = cfg.icon
  const date = parseFbDate(feedback)
  const nps = feedback.nps != null ? Number(feedback.nps) : null
  const npsColor = nps == null ? "" : nps >= 9 ? "text-green-400" : nps >= 7 ? "text-yellow-400" : "text-red-400"
  return (
    <div className={`flex items-start gap-3 px-3 py-2.5 border ${cfg.bg}`} style={{ borderRadius: "2px" }}>
      <Icon className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 ${cfg.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</span>
          {feedback.status_pesquisa && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 leading-none capitalize">{feedback.status_pesquisa}</Badge>
          )}
          {nps != null && (
            <span className={`text-[10px] font-bold font-mono ${npsColor}`} title="NPS">NPS {nps}</span>
          )}
          {date && (
            <span className="text-[9px] text-muted-foreground/40 font-mono flex items-center gap-1 ml-auto">
              <CalendarDays className="h-2.5 w-2.5" />
              {format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          )}
        </div>
        {feedback.resumo_executivo && (
          <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">{feedback.resumo_executivo}</p>
        )}
      </div>
    </div>
  )
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="flex-1 space-y-5 p-8 pt-6 max-w-5xl">
      <Skeleton className="h-4 w-32" />
      <div className="flex items-start gap-4">
        <Skeleton className="h-14 w-14 flex-shrink-0" style={{ borderRadius: "2px" }} />
        <div className="space-y-2 flex-1"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-36" /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-40 w-full" style={{ borderRadius: "2px" }} />
        <Skeleton className="h-40 w-full" style={{ borderRadius: "2px" }} />
      </div>
      <Skeleton className="h-32 w-full" style={{ borderRadius: "2px" }} />
      <Skeleton className="h-48 w-full" style={{ borderRadius: "2px" }} />
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ClienteProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [cliente, setCliente] = useState<any>(null)
  const [feedbacks, setFeedbacks] = useState<FeedbackCS[]>([])
  const [kpiSnapshot, setKpiSnapshot] = useState<any>(null)
  const [kpiAnalise, setKpiAnalise] = useState<any>(null)
  const [googleAdsSnapshot, setGoogleAdsSnapshot] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Contact edit state
  const [editingContact, setEditingContact] = useState(false)
  const [editResponsavel, setEditResponsavel] = useState("")
  const [editWhatsapp, setEditWhatsapp] = useState("")
  const [savingContact, setSavingContact] = useState(false)

  // Observações state
  const [obsText, setObsText] = useState("")
  const [savingObs, setSavingObs] = useState(false)
  const [obsDirty, setObsDirty] = useState(false)

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!id) return
    const { data: c, error } = await supabase.from("clientes").select("*").eq("id", id).single()
    if (error || !c) { setNotFound(true); setLoading(false); return }

    setCliente(c)
    setObsText(getObs(c) ?? "")

    const nome = getNome(c)
    const whatsapp = getWhatsapp(c)

    // Parallel: CS feedbacks + KPI snapshot + KPI analysis
    // Query feedbacks by name tokens (handles partial names like "Eduardo" vs "Eduardo Teste")
    // or WhatsApp as secondary identifier. Only uses columns that exist: cliente_nome, cliente_whatsapp.
    const nameTokens = Array.from(new Set([
      nome,
      ...nome.split(/\s+/).filter((t) => t.length > 2),
    ]))
    const orParts: string[] = nameTokens.map((token) => `cliente_nome.ilike.%${token}%`)
    if (whatsapp) orParts.push(`cliente_whatsapp.eq.${whatsapp}`)
    const orFilter = orParts.join(",")

    const [fbRes, kpiRes, analiseRes, googleRes] = await Promise.allSettled([
      supabase
        .from("feedbacks_cs")
        .select("id, criado_em, cliente_nome, cliente_whatsapp, status_pesquisa, sentimento, resumo_executivo, nps")
        .or(orFilter)
        .order("criado_em", { ascending: false })
        .limit(15),
      supabase.from("kpi_snapshots").select("*").eq("conta_nome", nome)
        .order("criado_em", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("kpi_analises").select("*").eq("conta_nome", nome)
        .order("criado_em", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("google_ads_snapshots").select("*").eq("conta_nome", nome)
        .order("criado_em", { ascending: false }).limit(1).maybeSingle(),
    ])

    if (fbRes.status === "fulfilled") setFeedbacks((fbRes.value as any).data || [])
    if (kpiRes.status === "fulfilled") setKpiSnapshot((kpiRes.value as any).data || null)
    if (analiseRes.status === "fulfilled") setKpiAnalise((analiseRes.value as any).data || null)
    if (googleRes.status === "fulfilled") setGoogleAdsSnapshot((googleRes.value as any).data || null)

    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  // ── Save contact ──────────────────────────────────────────────────────────

  const handleSaveContact = async () => {
    if (!cliente) return
    setSavingContact(true)
    try {
      const whatsappKey = detectKey(cliente, "responsavel_whatsapp", "whatsapp", "telefone", "phone", "celular") ?? "responsavel_whatsapp"
      const responsavelKey = detectKey(cliente, "responsavel_nome", "responsavel", "contact_name", "responsible", "gestor") ?? "responsavel_nome"
      const { error } = await supabase
        .from("clientes")
        .update({ [responsavelKey]: editResponsavel || null, [whatsappKey]: editWhatsapp || null })
        .eq("id", id)
      if (error) throw error
      toast.success("Contato atualizado!")
      setEditingContact(false)
      await load()
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar contato.")
    } finally {
      setSavingContact(false)
    }
  }

  const startEditContact = () => {
    setEditResponsavel(getResponsavel(cliente) ?? "")
    setEditWhatsapp(getWhatsapp(cliente) ?? "")
    setEditingContact(true)
  }

  // ── Save observações ──────────────────────────────────────────────────────

  const handleSaveObs = async () => {
    if (!cliente) return
    setSavingObs(true)
    try {
      const obsKey = detectKey(cliente, "observacoes", "notas", "notes", "anotacoes", "obs", "comentarios") ?? "observacoes"
      const { error } = await supabase.from("clientes").update({ [obsKey]: obsText || null }).eq("id", id)
      if (error) throw error
      toast.success("Observações salvas!")
      setObsDirty(false)
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar. Verifique se a coluna 'observacoes' existe na tabela.")
    } finally {
      setSavingObs(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <ProfileSkeleton />
  if (notFound || !cliente) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-muted-foreground">
        <Building2 className="h-12 w-12 opacity-15" />
        <p className="text-sm">Cliente não encontrado.</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-3.5 w-3.5" />Voltar
        </Button>
      </div>
    )
  }

  const nome      = getNome(cliente)
  const status    = getStatus(cliente)
  const nicho     = getNicho(cliente)
  const kpi       = getKpi(cliente)
  const responsavel = getResponsavel(cliente)
  const whatsapp  = getWhatsapp(cliente)
  const driveUrl  = getDrive(cliente)
  const metaId    = getMetaId(cliente)
  const googleId  = getGoogleId(cliente)
  const waNumber  = whatsapp?.replace(/\D/g, "") ?? ""

  // Lógica de CPA
  let cpaAtualMeta: number | null = null;
  let cpaAtualGoogle: number | null = null;
  let cpaAtualUnificado: number | null = null;
  let nomeCpaExibido = "CPA";

  if (kpiSnapshot && kpiSnapshot.cac != null) {
    cpaAtualMeta = Number(kpiSnapshot.cac);
  }

  if (googleAdsSnapshot && googleAdsSnapshot.spend != null && googleAdsSnapshot.conversions != null) {
    const s = Number(googleAdsSnapshot.spend);
    const c = Number(googleAdsSnapshot.conversions);
    cpaAtualGoogle = c > 0 ? s / c : 0;
  }

  const hasMetaCpa = cpaAtualMeta !== null;
  const hasGoogleCpa = cpaAtualGoogle !== null;

  if (hasMetaCpa && hasGoogleCpa) {
    const totalSpend = (Number(kpiSnapshot?.investimento_total) || 0) + (Number(googleAdsSnapshot?.spend) || 0);
    const totalConversions = (Number(kpiSnapshot?.leads_gerados) || 0) + (Number(googleAdsSnapshot?.conversions) || 0);
    cpaAtualUnificado = totalConversions > 0 ? totalSpend / totalConversions : 0;
    nomeCpaExibido = "CPA Médio Unificado";
  } else if (hasMetaCpa) {
    cpaAtualUnificado = cpaAtualMeta;
    nomeCpaExibido = "CPA (Meta Ads)";
  } else if (hasGoogleCpa) {
    cpaAtualUnificado = cpaAtualGoogle;
    nomeCpaExibido = "CPA (Google Ads)";
  }

  const hasMetrics = !!kpiSnapshot || !!googleAdsSnapshot;
  const mainSnapshotDate = kpiSnapshot?.criado_em || googleAdsSnapshot?.criado_em;

  return (
    <div className="flex-1 p-8 pt-6">
      <div className="max-w-5xl space-y-5">

        <Link href="/clientes" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />Todos os clientes
        </Link>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-primary text-lg font-black leading-none">{nome.slice(0, 2).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-foreground leading-tight">{nome}</h1>
              <StatusBadge status={status} />
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {nicho && <Badge variant="outline" className="text-[10px] px-2 py-0.5 capitalize">{nicho}</Badge>}
              {kpi && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Target className="h-3 w-3 text-primary" />
                  KPI principal: <span className="font-semibold text-foreground">{kpi}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Info cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Contato — editable */}
          <div className="border border-border bg-card" style={{ borderRadius: "2px" }}>
            <SectionHeader
              icon={User}
              label="Contato"
              right={
                !editingContact ? (
                  <button
                    onClick={startEditContact}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Editar contato"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditingContact(false)} className="text-muted-foreground hover:text-destructive transition-colors" title="Cancelar">
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={handleSaveContact} disabled={savingContact} className="text-primary hover:text-primary/80 transition-colors" title="Salvar">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              }
            />
            <div className="p-4 space-y-4">
              {editingContact ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Responsável</Label>
                    <Input
                      placeholder="Nome do responsável"
                      value={editResponsavel}
                      onChange={(e) => setEditResponsavel(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/60">WhatsApp</Label>
                    <Input
                      placeholder="Ex: 5511999999999"
                      value={editWhatsapp}
                      onChange={(e) => setEditWhatsapp(e.target.value)}
                      className="h-8 text-sm font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground/50">Formato internacional sem espaços: 5511999999999</p>
                  </div>
                  <Button size="sm" onClick={handleSaveContact} disabled={savingContact} className="w-full h-8">
                    {savingContact ? "Salvando..." : "Salvar contato"}
                  </Button>
                </>
              ) : (
                <>
                  {responsavel && (
                    <div className="flex items-center gap-2.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground/60 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">Responsável</p>
                        <p className="text-sm font-medium">{responsavel}</p>
                      </div>
                    </div>
                  )}
                  {whatsapp ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground/60 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">WhatsApp</p>
                          <p className="text-sm font-medium font-mono">{whatsapp}</p>
                        </div>
                      </div>
                      <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs text-green-400 border-green-500/30 hover:bg-green-500/10 hover:text-green-300">
                          <MessageCircle className="h-3.5 w-3.5" />Abrir WA
                        </Button>
                      </a>
                    </div>
                  ) : (
                    <button
                      onClick={startEditContact}
                      className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border hover:border-primary/40 rounded-sm text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar WhatsApp
                    </button>
                  )}
                  {!responsavel && !whatsapp && (
                    <p className="text-xs text-muted-foreground/40 italic text-center py-2">
                      Clique no lápis para preencher os dados de contato.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Operacional */}
          <div className="border border-border bg-card" style={{ borderRadius: "2px" }}>
            <SectionHeader icon={BarChart2} label="Operacional" />
            <div className="p-4 space-y-4">
              {driveUrl && (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/60 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">Pasta Google Drive</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[170px]">{driveUrl}</p>
                    </div>
                  </div>
                  <a href={driveUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="h-8 text-xs flex-shrink-0">Abrir</Button>
                  </a>
                </div>
              )}
              {metaId ? (
                <div className="flex items-center gap-2.5">
                  <Megaphone className="h-3.5 w-3.5 text-muted-foreground/60 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">Meta Ads ID</p>
                    <p className="text-sm font-mono">{metaId}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <Megaphone className="h-3.5 w-3.5 text-muted-foreground/30 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">Meta Ads ID</p>
                    <p className="text-xs text-muted-foreground/40 italic">Usando conta global da agência</p>
                  </div>
                </div>
              )}
              {googleId ? (
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/60 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">Google Ads ID</p>
                    <p className="text-sm font-mono">{googleId}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/30 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">Google Ads ID</p>
                    <p className="text-xs text-muted-foreground/40 italic">Usando conta global da agência</p>
                  </div>
                </div>
              )}
              {!driveUrl && !metaId && !googleId && (
                <p className="text-xs text-muted-foreground/40 italic text-center py-2">Drive não configurado. IDs de plataforma usando conta global.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Métricas de Campanha ────────────────────────────────────────── */}
        <div className="border border-border bg-card" style={{ borderRadius: "2px" }}>
          <SectionHeader
            icon={TrendingUp}
            label="Últimas Métricas de Campanha"
            right={
              mainSnapshotDate && (
                <span className="text-[10px] text-muted-foreground/40 font-mono">
                  {format(new Date(mainSnapshotDate), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              )
            }
          />
          <div className="p-4">
            {!hasMetrics ? (
              <div className="py-6 flex flex-col items-center gap-2 text-muted-foreground">
                <BarChart2 className="h-6 w-6 opacity-20" />
                <p className="text-xs text-center">
                  Nenhuma métrica encontrada para <span className="font-medium text-foreground">{nome}</span>.
                </p>
                <p className="text-[10px] text-muted-foreground/50">
                  O nome do cliente deve coincidir com o campo <code className="font-mono">conta_nome</code> em kpi_snapshots.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {cpaAtualUnificado !== null && (
                    <MetricTile
                      icon={Target}
                      label={nomeCpaExibido}
                      value={cpaAtualUnificado === 0 ? "R$ 0,00" : fmtBRL(cpaAtualUnificado)}
                      color="text-primary"
                    />
                  )}
                  {kpiSnapshot?.roas != null && (
                    <MetricTile
                      icon={Zap}
                      label="ROAS"
                      value={`${fmtDec(kpiSnapshot.roas)}x`}
                      color={Number(kpiSnapshot.roas) >= 3 ? "text-green-400" : Number(kpiSnapshot.roas) >= 1.5 ? "text-yellow-400" : "text-red-400"}
                    />
                  )}
                  {kpiSnapshot?.investimento_total != null && (
                    <MetricTile
                      icon={DollarSign}
                      label="Investimento"
                      value={fmtBRL(kpiSnapshot.investimento_total)}
                    />
                  )}
                  {kpiSnapshot?.receita_atribuida != null && (
                    <MetricTile
                      icon={ShoppingCart}
                      label="Receita atribuída"
                      value={fmtBRL(kpiSnapshot.receita_atribuida)}
                      color="text-primary"
                    />
                  )}
                  {kpiSnapshot?.ctr != null && (
                    <MetricTile
                      icon={MousePointerClick}
                      label="CTR"
                      value={fmtPct(kpiSnapshot.ctr)}
                    />
                  )}
                </div>
                {kpiSnapshot && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {kpiSnapshot.leads_gerados != null && (
                      <MetricTile icon={Target} label="Leads" value={String(kpiSnapshot.leads_gerados)} />
                    )}
                    {kpiSnapshot.cpl != null && (
                      <MetricTile icon={DollarSign} label="CPL" value={fmtBRL(kpiSnapshot.cpl)} />
                    )}
                    {kpiSnapshot.taxa_conversao != null && (
                      <MetricTile icon={TrendingUp} label="Taxa conv." value={fmtPct(kpiSnapshot.taxa_conversao)} />
                    )}
                  </div>
                )}

                {/* AI analysis summary */}
                {kpiAnalise?.resumo_executivo && (
                  <div className="px-3 py-2.5 border border-primary/20 bg-primary/5" style={{ borderRadius: "2px" }}>
                    <p className="text-[10px] text-primary/60 uppercase tracking-widest font-mono mb-1.5">Análise IA</p>
                    <p className="text-xs text-foreground/80 leading-relaxed">{kpiAnalise.resumo_executivo}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Observações ─────────────────────────────────────────────────── */}
        <div className="border border-border bg-card" style={{ borderRadius: "2px" }}>
          <SectionHeader icon={StickyNote} label="Observações" />
          <div className="p-4 space-y-3">
            <Textarea
              placeholder="Adicione notas internas sobre este cliente — contexto, acordos, particularidades..."
              value={obsText}
              onChange={(e) => { setObsText(e.target.value); setObsDirty(true) }}
              rows={4}
              className="text-sm resize-none bg-muted/20 border-border/60 focus:border-primary/40"
            />
            {obsDirty && (
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground/50">Alterações não salvas</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => { setObsText(getObs(cliente) ?? ""); setObsDirty(false) }}
                    disabled={savingObs}
                  >
                    Descartar
                  </Button>
                  <Button size="sm" className="h-7 text-xs" onClick={handleSaveObs} disabled={savingObs}>
                    {savingObs ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Histórico de CS ──────────────────────────────────────────────── */}
        <div className="border border-border bg-card" style={{ borderRadius: "2px" }}>
          <SectionHeader
            icon={MessageCircle}
            label="Histórico de CS"
            right={<Badge variant="secondary" className="text-xs">{feedbacks.length} registro{feedbacks.length !== 1 ? "s" : ""}</Badge>}
          />
          <div className="p-3 space-y-2">
            {feedbacks.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2 text-muted-foreground">
                <MessageCircle className="h-6 w-6 opacity-20" />
                <p className="text-xs text-center">Nenhum feedback de CS registrado para este cliente.</p>
                <p className="text-[10px] text-muted-foreground/40 text-center max-w-xs">
                  O nome em <code className="font-mono">nome_cliente</code> ou <code className="font-mono">cliente_nome</code> deve coincidir com o nome cadastrado aqui.
                </p>
              </div>
            ) : (
              feedbacks.map((fb) => <FeedbackCard key={fb.id} feedback={fb} />)
            )}
          </div>
        </div>
        {/* ── Configurações de Alertas ──────────────────────────────────────── */}
        <div className="border border-border bg-card" style={{ borderRadius: "2px" }}>
          <SectionHeader icon={BellRing} label="Configurações de Alertas Ativos" />
          <div className="p-4">
            <AlertasConfig clienteId={id} cpaAtualMeta={cpaAtualMeta} cpaAtualGoogle={cpaAtualGoogle} />
          </div>
        </div>

      </div>
    </div>
  )
}

// tiny helper used inline
function Plus({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}
