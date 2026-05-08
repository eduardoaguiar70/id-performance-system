/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Building2, ChevronRight, Target, AlertTriangle, Plus,
  Check, Users, TrendingUp, MessageSquare, BarChart2,
  Loader2, Sparkles, Link as LinkIcon, Search, X, Phone,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

// ─── Flexible pickers ─────────────────────────────────────────────────────────

function pick(row: any, ...keys: string[]): string | null {
  for (const k of keys) {
    if (row[k] != null && row[k] !== "") return String(row[k])
  }
  return null
}

// detectKey: returns the actual column name that EXISTS on the row object
function detectKey(row: any, ...keys: string[]): string | null {
  for (const k of keys) { if (k in row) return k }
  return null
}

function getNome(row: any)  { return pick(row, "nome", "nome_empresa", "name", "empresa", "company_name", "client_name", "razao_social", "fantasia") ?? "Sem nome" }
function getNicho(row: any) { return pick(row, "segmento", "nicho", "niche", "sector", "categoria") }
function getKpi(row: any)   { return pick(row, "kpi_principal", "kpi", "main_kpi", "objetivo") }
function getEmail(row: any) { return pick(row, "responsavel_email", "email", "contact_email") }

// Handles both boolean `ativo` and text `status` columns
function getStatus(row: any): string | null {
  if ("ativo" in row) {
    if (row.ativo === true)  return "ativo"
    if (row.ativo === false) return "inativo"
  }
  return pick(row, "status", "situacao")
}

// Search helper: concatenates searchable text fields of a row
function getWhatsapp(row: any) { return pick(row, "responsavel_whatsapp", "whatsapp", "telefone", "celular", "phone") }

function getSearchText(row: any): string {
  return [getNome(row), getNicho(row), getKpi(row), getEmail(row), getWhatsapp(row), getStatus(row)]
    .filter(Boolean).join(" ").toLowerCase()
}

// Builds a logical→actualColumn mapping from an existing row.
// Returns null for any field whose column could not be detected —
// those fields are SKIPPED in INSERT to avoid 400 errors.
function buildFieldMap(row: any) {
  return {
    nome:     detectKey(row, "nome", "nome_empresa", "name", "empresa", "company_name", "client_name", "razao_social", "fantasia"),
    email:    detectKey(row, "responsavel_email", "email", "contact_email"),
    whatsapp: detectKey(row, "responsavel_whatsapp", "whatsapp", "telefone", "celular", "phone"),
    status:   detectKey(row, "status", "situacao"),
    ativo:    detectKey(row, "ativo"),
    nicho:    detectKey(row, "segmento", "nicho", "niche", "sector", "categoria"),
    kpi:      detectKey(row, "kpi_principal", "kpi", "main_kpi", "objetivo"),
    drive:    detectKey(row, "pasta_drive_url", "drive_url", "drive", "pasta_drive", "folder_url"),
    meta:     detectKey(row, "meta_ads_id", "meta_id", "facebook_ads_id", "fb_ads_id"),
    google:   detectKey(row, "google_ads_id", "google_id", "adwords_id"),
  }
}
type FieldMap = ReturnType<typeof buildFieldMap>

const EMPTY_MAP: FieldMap = {
  nome: null, email: null, whatsapp: null, status: null, ativo: null,
  nicho: null, kpi: null, drive: null, meta: null, google: null,
}

// ─── Cross-reference types ────────────────────────────────────────────────────

interface CrossRefMatch {
  table: string
  label: string
  icon: React.ElementType
  color: string
  items: { primary: string; secondary?: string }[]
}

// ─── Cross-reference logic ────────────────────────────────────────────────────

async function crossReference(nome: string): Promise<CrossRefMatch[]> {
  const term = nome.trim()
  const results: CrossRefMatch[] = []

  const [contasRes, kpiRes, leadsRes, meetingsRes, tarefasRes] = await Promise.allSettled([
    supabase.from("contas_ativas").select("conta_id, conta_nome").ilike("conta_nome", `%${term}%`).limit(5),
    supabase.from("kpi_snapshots").select("conta_nome, roas, investimento_total, criado_em").ilike("conta_nome", `%${term}%`).order("criado_em", { ascending: false }).limit(3),
    supabase.from("leads").select("full_name, instagram_username, whatsapp").ilike("full_name", `%${term}%`).limit(5),
    supabase.from("meeting_summaries").select("titulo, criado_em").or(`titulo.ilike.%${term}%,conta_nome.ilike.%${term}%`).order("criado_em", { ascending: false }).limit(3),
    supabase.from("tarefas").select("titulo, responsavel").or(`titulo.ilike.%${term}%,responsavel.ilike.%${term}%`).limit(4),
  ])

  if (contasRes.status === "fulfilled" && (contasRes.value.data?.length ?? 0) > 0) {
    results.push({
      table: "contas_ativas", label: "Conta Ativa", icon: Building2, color: "text-green-400",
      items: contasRes.value.data!.map((r) => ({ primary: r.conta_nome, secondary: `ID: ${r.conta_id}` })),
    })
  }
  if (kpiRes.status === "fulfilled" && (kpiRes.value.data?.length ?? 0) > 0) {
    results.push({
      table: "kpi_snapshots", label: "Métricas KPI", icon: TrendingUp, color: "text-primary",
      items: kpiRes.value.data!.map((r) => ({
        primary: r.conta_nome,
        secondary: r.roas ? `ROAS ${Number(r.roas).toFixed(2)}x · R$ ${Number(r.investimento_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}` : undefined,
      })),
    })
  }
  if (leadsRes.status === "fulfilled" && (leadsRes.value.data?.length ?? 0) > 0) {
    results.push({
      table: "leads", label: "Leads", icon: Users, color: "text-violet-400",
      items: leadsRes.value.data!.map((r) => ({ primary: r.full_name, secondary: r.instagram_username ? `@${r.instagram_username}` : r.whatsapp })),
    })
  }
  if (meetingsRes.status === "fulfilled" && (meetingsRes.value.data?.length ?? 0) > 0) {
    results.push({
      table: "meeting_summaries", label: "Reuniões", icon: MessageSquare, color: "text-sky-400",
      items: meetingsRes.value.data!.map((r) => ({
        primary: r.titulo || "Reunião",
        secondary: r.criado_em ? new Date(r.criado_em).toLocaleDateString("pt-BR") : undefined,
      })),
    })
  }
  if (tarefasRes.status === "fulfilled" && (tarefasRes.value.data?.length ?? 0) > 0) {
    results.push({
      table: "tarefas", label: "Tarefas", icon: BarChart2, color: "text-orange-400",
      items: tarefasRes.value.data!.map((r) => ({ primary: r.titulo, secondary: r.responsavel })),
    })
  }

  return results
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null
  const v = status.toLowerCase()
  if (v === "ativo" || v === "active" || v === "true")
    return <Badge className="text-xs border bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/20">Ativo</Badge>
  return <Badge variant="secondary" className="text-xs text-muted-foreground">{status}</Badge>
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [step, setStep] = useState<"form" | "cross">("form")
  const [saving, setSaving] = useState(false)
  const [crossResults, setCrossResults] = useState<CrossRefMatch[]>([])
  const [crossLoading, setCrossLoading] = useState(false)
  const [newClienteNome, setNewClienteNome] = useState("")

  // Form fields
  const [fNome, setFNome] = useState("")
  const [fResponsavel, setFResponsavel] = useState("")
  const [fWhatsapp, setFWhatsapp] = useState("")
  const [fStatus, setFStatus] = useState("ativo")
  const [fNicho, setFNicho] = useState("")
  const [fKpi, setFKpi] = useState("")
  const [fDrive, setFDrive] = useState("")
  const [fMeta, setFMeta] = useState("")
  const [fGoogle, setFGoogle] = useState("")

  // Field map derived from loaded data (null values when column can't be detected)
  const fieldMap = useMemo<FieldMap>(() => {
    if (clientes.length > 0) return buildFieldMap(clientes[0])
    return EMPTY_MAP
  }, [clientes])

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchClientes = async () => {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("id", { ascending: true })

    if (error) {
      setErro(error.message)
    } else {
      setClientes(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchClientes() }, [])

  // ── Reset modal ────────────────────────────────────────────────────────────
  const resetModal = () => {
    setFNome(""); setFResponsavel(""); setFWhatsapp(""); setFStatus("ativo")
    setFNicho(""); setFKpi(""); setFDrive(""); setFMeta(""); setFGoogle("")
    setStep("form"); setCrossResults([]); setNewClienteNome("")
  }

  // ── Create client ──────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!fNome.trim()) { toast.error("O nome da empresa é obrigatório."); return }

    // Guard: must have detected at least the name column
    if (!fieldMap.nome) {
      toast.error("Não foi possível detectar a coluna de nome da tabela. Verifique o console.")
      return
    }

    setSaving(true)
    try {
      const add = (key: string | null, value: any) => { if (key) payload[key] = value }
      const payload: any = {}
      add(fieldMap.nome,     fNome.trim())
      add(fieldMap.status,   fStatus)
      add(fieldMap.email,    fResponsavel.trim() || null)
      add(fieldMap.whatsapp, fWhatsapp.trim() || null)
      add(fieldMap.nicho,  fNicho.trim() || null)
      add(fieldMap.kpi,    fKpi.trim() || null)
      add(fieldMap.drive,  fDrive.trim() || null)
      add(fieldMap.meta,   fMeta.trim() || null)
      add(fieldMap.google, fGoogle.trim() || null)
      // ativo boolean if column exists
      if (fieldMap.ativo) payload[fieldMap.ativo] = fStatus === "ativo"

      console.log("[Novo Cliente] payload →", payload)

      const { error } = await supabase.from("clientes").insert(payload)
      if (error) {
        console.error("[Novo Cliente] Supabase error →", error)
        throw new Error(error.message || error.details || JSON.stringify(error))
      }

      toast.success(`Cliente "${fNome}" criado!`)
      setNewClienteNome(fNome.trim())

      setCrossLoading(true)
      setStep("cross")
      fetchClientes()

      const refs = await crossReference(fNome.trim())
      setCrossResults(refs)
      setCrossLoading(false)
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar cliente.")
    } finally {
      setSaving(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Hub de Clientes
        </h2>
        <div className="flex items-center gap-3">
          {!loading && !erro && (
            <span className="text-xs text-muted-foreground/50 font-mono">
              {clientes.length} cliente{clientes.length !== 1 ? "s" : ""}
            </span>
          )}
          <Button size="sm" onClick={() => { resetModal(); setModalOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Error */}
      {erro && (
        <div className="flex items-start gap-3 rounded-sm border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold">Erro: </span>{erro}
            <p className="mt-1 text-xs text-destructive/70">
              Execute <code className="font-mono">ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;</code> no SQL Editor do Supabase.
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      {!loading && clientes.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar cliente, nicho, KPI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-8 h-9 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] w-full" style={{ borderRadius: "2px" }} />
          ))}
        </div>
      ) : clientes.length === 0 && !erro ? (
        <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
          <Building2 className="h-10 w-10 opacity-15" />
          <p className="text-sm">Nenhum cliente cadastrado.</p>
          <Button variant="outline" size="sm" onClick={() => { resetModal(); setModalOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />Criar primeiro cliente
          </Button>
        </div>
      ) : (() => {
        const term = search.trim().toLowerCase()
        const filtered = term
          ? clientes.filter((c) => getSearchText(c).includes(term))
          : clientes

        if (filtered.length === 0) return (
          <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
            <Search className="h-8 w-8 opacity-15" />
            <p className="text-sm">Nenhum cliente encontrado para <span className="font-medium">&quot;{search}&quot;</span>.</p>
            <button onClick={() => setSearch("")} className="text-xs text-primary hover:underline">
              Limpar busca
            </button>
          </div>
        )

        return (
          <div className="space-y-1.5">
            {filtered.map((c) => {
              const nome = getNome(c)
              const status = getStatus(c)
              const nicho = getNicho(c)
              const kpi = getKpi(c)
              const email = getEmail(c)
              return (
                <Link key={c.id} href={`/clientes/${c.id}`}>
                  <div
                    className="flex items-center gap-4 px-4 py-3.5 border border-border bg-card hover:border-primary/40 hover:bg-muted/20 transition-all cursor-pointer group"
                    style={{ borderRadius: "2px" }}
                  >
                    <div className="h-9 w-9 rounded-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary text-xs font-black leading-none">
                        {nome.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{nome}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {nicho && <span className="text-xs text-muted-foreground">{nicho}</span>}
                        {kpi && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
                            <Target className="h-2.5 w-2.5" />{kpi}
                          </span>
                        )}
                      </div>
                    </div>
                    {email && (
                      <span className="text-xs text-muted-foreground hidden md:block flex-shrink-0 truncate max-w-[180px]">
                        {email}
                      </span>
                    )}
                    <StatusBadge status={status} />
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                  </div>
                </Link>
              )
            })}
          </div>
        )
      })()}

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={(o) => { if (!o) resetModal(); setModalOpen(o) }}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">

          {step === "form" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Novo Cliente
                </DialogTitle>
                <DialogDescription>
                  Após salvar, o sistema varre automaticamente as outras tabelas em busca de dados vinculados a este cliente.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-2">
                {/* Nome */}
                <div className="space-y-1.5">
                  <Label htmlFor="f-nome">Nome da empresa <span className="text-destructive">*</span></Label>
                  <Input id="f-nome" placeholder="Ex: Hangway" value={fNome} onChange={(e) => setFNome(e.target.value)} />
                </div>

                {/* Status + Nicho */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={fStatus} onValueChange={setFStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                        <SelectItem value="prospecto">Prospecto</SelectItem>
                        <SelectItem value="pausado">Pausado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="f-nicho">Nicho</Label>
                    <Input id="f-nicho" placeholder="Ex: E-commerce, Saúde..." value={fNicho} onChange={(e) => setFNicho(e.target.value)} />
                  </div>
                </div>

                {/* KPI */}
                <div className="space-y-1.5">
                  <Label htmlFor="f-kpi">KPI Principal</Label>
                  <Input id="f-kpi" placeholder="Ex: ROAS, CPL, Taxa de Conversão..." value={fKpi} onChange={(e) => setFKpi(e.target.value)} />
                </div>

                {/* Divider */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-mono">Contato</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* E-mail + WhatsApp */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="f-resp">E-mail do responsável</Label>
                    <Input
                      id="f-resp"
                      type="email"
                      placeholder="contato@empresa.com"
                      value={fResponsavel}
                      onChange={(e) => setFResponsavel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="f-whatsapp" className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />WhatsApp
                    </Label>
                    <Input
                      id="f-whatsapp"
                      type="tel"
                      placeholder="+55 11 99999-9999"
                      value={fWhatsapp}
                      onChange={(e) => setFWhatsapp(e.target.value)}
                    />
                  </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-mono">Integrações</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Drive */}
                <div className="space-y-1.5">
                  <Label htmlFor="f-drive">Pasta Google Drive</Label>
                  <Input id="f-drive" placeholder="https://drive.google.com/..." value={fDrive} onChange={(e) => setFDrive(e.target.value)} />
                </div>

                {/* Meta + Google */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="f-meta">Meta Ads ID</Label>
                    <Input id="f-meta" placeholder="Ex: 123456789" value={fMeta} onChange={(e) => setFMeta(e.target.value)} className="font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="f-google">Google Ads ID</Label>
                    <Input id="f-google" placeholder="Ex: 987-654-3210" value={fGoogle} onChange={(e) => setFGoogle(e.target.value)} className="font-mono" />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={saving || !fNome.trim()}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : "Criar Cliente"}
                </Button>
              </DialogFooter>
            </>
          )}

          {step === "cross" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  Cliente criado com sucesso
                </DialogTitle>
                <DialogDescription>
                  Varrendo o banco de dados em busca de registros vinculados a{" "}
                  <span className="font-semibold text-foreground">&quot;{newClienteNome}&quot;</span>…
                </DialogDescription>
              </DialogHeader>

              <div className="py-3 space-y-3">
                {crossLoading ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                    <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                    <p className="text-sm">Cruzando dados nas tabelas do sistema…</p>
                    <div className="flex gap-1.5 text-[10px] text-muted-foreground/50 font-mono">
                      {["contas_ativas", "kpi_snapshots", "leads", "reuniões", "tarefas"].map((t) => (
                        <span key={t} className="px-1.5 py-0.5 bg-muted/40 rounded">{t}</span>
                      ))}
                    </div>
                  </div>
                ) : crossResults.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                    <Building2 className="h-6 w-6 opacity-20" />
                    <p className="text-sm">Nenhuma correspondência encontrada nas outras tabelas.</p>
                    <p className="text-xs text-muted-foreground/50 text-center max-w-sm">
                      Os dados aparecerão automaticamente no perfil conforme o n8n for populando as tabelas com este nome.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground px-1">
                      <span className="text-primary font-semibold">{crossResults.length} fonte{crossResults.length > 1 ? "s" : ""}</span>{" "}
                      com dados vinculados a este cliente:
                    </p>
                    {crossResults.map((ref) => {
                      const Icon = ref.icon
                      return (
                        <div
                          key={ref.table}
                          className="border border-border bg-muted/10 px-3 py-2.5"
                          style={{ borderRadius: "2px" }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className={`h-3.5 w-3.5 ${ref.color}`} />
                            <span className="text-xs font-semibold text-foreground">{ref.label}</span>
                            <Badge variant="secondary" className="text-[9px] px-1.5 h-4 leading-none ml-auto">
                              {ref.items.length} registro{ref.items.length > 1 ? "s" : ""}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            {ref.items.map((item, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <div className={`h-1 w-1 rounded-full flex-shrink-0 ${ref.color} opacity-60`} />
                                <span className="text-xs text-foreground/80 truncate">{item.primary}</span>
                                {item.secondary && (
                                  <span className="text-[10px] text-muted-foreground/50 truncate">{item.secondary}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setModalOpen(false); resetModal() }}>
                  Fechar
                </Button>
                <Link
                  href={`/clientes`}
                  onClick={() => { setModalOpen(false); resetModal() }}
                >
                  <Button>
                    <LinkIcon className="mr-2 h-3.5 w-3.5" />
                    Ver perfil do cliente
                  </Button>
                </Link>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
