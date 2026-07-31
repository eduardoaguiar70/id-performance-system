/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  Heart, TrendingUp, Clock, CheckCircle2, Users,
  ChevronRight, MessageCircle, Plus, CalendarClock,
  Pencil, MessageSquare,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface NpsDisparo {
  id: string
  cliente_nome: string | null
  cliente_whatsapp: string | null
  empresa: string | null
  status: string | null
  mensagem_texto: string | null
  mensagem_2: string | null
  mensagem_3: string | null
  mensagem_4: string | null
  mensagem_5: string | null
  respostas_cliente: string | null
  nps_score: number | null
  nps_classificacao: string | null
  data_agendamento: string | null
  criado_em: string | null
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

// ─── Timezone helpers (America/Sao_Paulo) ──────────────────────────────────────

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

const CLASSIFICACAO_STYLES: Record<string, { bg: string; text: string }> = {
  positivo: { bg: "bg-green-500/15 border-green-500/30", text: "text-green-400" },
  neutro:   { bg: "bg-yellow-500/15 border-yellow-500/30", text: "text-yellow-400" },
  detrator: { bg: "bg-red-500/15 border-red-500/30", text: "text-red-400" },
  negativo: { bg: "bg-orange-500/15 border-orange-500/30", text: "text-orange-400" },
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

function NpsScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-xs text-muted-foreground/40 font-mono">—</span>
  const n = Number(score)
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

// ─── Chat bubble panel ─────────────────────────────────────────────────────────

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
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            NPS: <NpsScoreBadge score={disparo.nps_score} />
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CustomerSuccessPage() {
  const [disparos, setDisparos] = useState<NpsDisparo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Fila de disparos (pendente / enviado)
  const [disparosPendentes, setDisparosPendentes] = useState<NpsDisparo[]>([])

  // Modal — novo disparo
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [clienteNome, setClienteNome] = useState("")
  const [clienteWhatsapp, setClienteWhatsapp] = useState("")
  const [empresa, setEmpresa] = useState("")
  const [mensagem1, setMensagem1] = useState("")
  const [mensagem2, setMensagem2] = useState("")
  const [mensagem3, setMensagem3] = useState("")
  const [mensagem4, setMensagem4] = useState("")
  const [mensagem5, setMensagem5] = useState("")
  const [dataAgendamento, setDataAgendamento] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modal — editar disparo
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editMensagem1, setEditMensagem1] = useState("")
  const [editMensagem2, setEditMensagem2] = useState("")
  const [editMensagem3, setEditMensagem3] = useState("")
  const [editMensagem4, setEditMensagem4] = useState("")
  const [editMensagem5, setEditMensagem5] = useState("")
  const [editData, setEditData] = useState("")

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchDisparos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("nps_disparos")
      .select("*")
      .order("data_agendamento", { ascending: false })

    if (!error && data) {
      const all = data as NpsDisparo[]
      // Feedbacks recebidos = registros que já têm respostas do cliente
      setDisparos(all.filter((d) => d.respostas_cliente && d.respostas_cliente.trim() !== ""))
      // Fila = pendente ou enviado (aguardando ou recentemente disparado)
      setDisparosPendentes(all.filter((d) => d.status === "pendente" || d.status === "enviado"))
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchDisparos()
  }, [])

  // ── Metrics (from nps_disparos data) ─────────────────────────────────────

  const metrics = useMemo(() => {
    const withNps = disparos.filter((d) => d.nps_score != null)
    const npsMedia = withNps.length
      ? withNps.reduce((s, d) => s + Number(d.nps_score), 0) / withNps.length
      : null

    const emAndamento = disparos.filter((d) => d.status?.toLowerCase().replace(/[\s-]/g, "_") === "em_andamento").length
    const concluido = disparos.filter((d) => {
      const v = (d.status ?? "").toLowerCase()
      return v === "concluido" || v === "concluído" || v === "finalizado"
    }).length

    return { npsMedia, emAndamento, concluido, total: disparos.length }
  }, [disparos])

  const npsColor =
    metrics.npsMedia == null ? "text-muted-foreground"
    : metrics.npsMedia >= 9 ? "text-green-400"
    : metrics.npsMedia >= 7 ? "text-yellow-400"
    : "text-red-400"

  const selected = disparos.find((d) => d.id === selectedId) ?? null

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  const handleCriarDisparo = async () => {
    if (!clienteNome || !clienteWhatsapp || !dataAgendamento || !mensagem1) {
      toast.error("Preencha os campos obrigatórios: Nome, WhatsApp, Mensagem 1 e Data de Agendamento.")
      return
    }
    setIsSubmitting(true)
    try {
      const { error } = await supabase.from("nps_disparos").insert({
        cliente_nome: clienteNome,
        cliente_whatsapp: clienteWhatsapp,
        empresa,
        mensagem_texto: mensagem1,
        mensagem_2: mensagem2,
        mensagem_3: mensagem3,
        mensagem_4: mensagem4,
        mensagem_5: mensagem5,
        data_agendamento: toBRTISO(dataAgendamento),
      })
      if (error) throw error
      toast.success("Disparo manual criado com sucesso!")
      setIsModalOpen(false)
      setClienteNome(""); setClienteWhatsapp(""); setEmpresa("")
      setMensagem1(""); setMensagem2(""); setMensagem3(""); setMensagem4(""); setMensagem5("")
      setDataAgendamento("")
      fetchDisparos()
    } catch (err: any) {
      toast.error("Erro ao criar disparo: " + err.message)
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
      const { error } = await supabase
        .from("nps_disparos")
        .update({
          mensagem_texto: editMensagem1,
          mensagem_2: editMensagem2,
          mensagem_3: editMensagem3,
          mensagem_4: editMensagem4,
          mensagem_5: editMensagem5,
          data_agendamento: toBRTISO(editData),
        })
        .eq("id", editId)
      if (error) throw error
      toast.success("Disparo atualizado com sucesso!")
      setIsEditModalOpen(false)
      fetchDisparos()
    } catch (err: any) {
      toast.error("Erro ao atualizar: " + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

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
              {[
                { id: "nome", label: "Nome do Cliente *", value: clienteNome, set: setClienteNome, placeholder: "Ex: João Silva" },
                { id: "whatsapp", label: "WhatsApp *", value: clienteWhatsapp, set: setClienteWhatsapp, placeholder: "Ex: 5511999999999" },
                { id: "empresa", label: "Empresa", value: empresa, set: setEmpresa, placeholder: "Opcional" },
              ].map(({ id, label, value, set, placeholder }) => (
                <div key={id} className="grid gap-2">
                  <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</Label>
                  <Input id={id} value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} style={{ borderRadius: "2px" }} />
                </div>
              ))}
              {[
                { id: "msg1", label: "Mensagem 1 (Apresentação / Saudação) *", value: mensagem1, set: setMensagem1, placeholder: "Obrigatório" },
                { id: "msg2", label: "Mensagem 2 (Pergunta da Nota 0-5)", value: mensagem2, set: setMensagem2 },
                { id: "msg3", label: "Mensagem 3 (Pergunta do Motivo)", value: mensagem3, set: setMensagem3 },
                { id: "msg4", label: "Mensagem 4 (Opcional)", value: mensagem4, set: setMensagem4 },
                { id: "msg5", label: "Mensagem 5 (Opcional)", value: mensagem5, set: setMensagem5 },
              ].map(({ id, label, value, set, placeholder }) => (
                <div key={id} className="grid gap-2">
                  <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</Label>
                  <Textarea id={id} value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder || "Opcional"} className="resize-none" style={{ borderRadius: "2px" }} />
                </div>
              ))}
              <div className="grid gap-2">
                <Label htmlFor="data" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Data de Agendamento *</Label>
                <Input id="data" type="datetime-local" value={dataAgendamento} onChange={(e) => setDataAgendamento(e.target.value)} style={{ borderRadius: "2px" }} />
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
          sub="clientes que responderam"
        />
      </div>

      {/* ── Body Tabs ──────────────────────────────────────────────────────── */}
      <Tabs defaultValue="feedbacks" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="feedbacks" className="text-xs uppercase tracking-widest font-semibold">Feedbacks Recebidos</TabsTrigger>
          <TabsTrigger value="fila" className="text-xs uppercase tracking-widest font-semibold gap-2">
            <CalendarClock className="h-3.5 w-3.5" />
            Fila de Disparos
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: Feedbacks Recebidos ──────────────────────────────────────── */}
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
                    {disparos.length} registros
                  </span>
                )}
              </div>

              {loading ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" style={{ borderRadius: "2px" }} />
                  ))}
                </div>
              ) : disparos.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
                  <Heart className="h-8 w-8 opacity-15" />
                  <p className="text-sm">Nenhum feedback registrado ainda.</p>
                  <p className="text-xs text-muted-foreground/50 text-center max-w-xs">
                    Os feedbacks aparecerão aqui quando clientes responderem via WhatsApp.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {disparos.map((d) => {
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

                        {/* NPS score */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <NpsScoreBadge score={d.nps_score} />
                          <ChevronRight className={`h-3.5 w-3.5 transition-colors ${isSelected ? "text-primary" : "text-muted-foreground/30"}`} />
                        </div>
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
              { id: "edit-msg2", label: "Mensagem 2 (Pergunta da Nota 0-5)", value: editMensagem2, set: setEditMensagem2 },
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
