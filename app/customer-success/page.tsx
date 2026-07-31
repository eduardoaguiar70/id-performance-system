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
  AlertTriangle, ChevronRight, XCircle, CheckCircle,
  Bot, Sparkles, MessageCircle, Plus, CalendarClock, Pencil, RefreshCw
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
  const [selectedChat, setSelectedChat] = useState<any>(null)
  const [disparosPendentes, setDisparosPendentes] = useState<any[]>([])

  // Modal States
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

  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editMensagem1, setEditMensagem1] = useState("")
  const [editMensagem2, setEditMensagem2] = useState("")
  const [editMensagem3, setEditMensagem3] = useState("")
  const [editMensagem4, setEditMensagem4] = useState("")
  const [editMensagem5, setEditMensagem5] = useState("")
  const [editData, setEditData] = useState("")

  const fetchDisparosPendentes = async () => {
    const { data, error } = await supabase
      .from("nps_disparos")
      .select("*")
      .in("status", ["pendente", "enviado"])
      .order("data_agendamento", { ascending: true })
    if (!error && data) {
      setDisparosPendentes(data)
    }
  }

  const handleCriarDisparo = async () => {
    if (!clienteNome || !clienteWhatsapp || !dataAgendamento || !mensagem1) {
      toast.error("Preencha os campos obrigatórios: Nome, WhatsApp, Mensagem 1 e Data de Agendamento.")
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from("nps_disparos")
        .insert({
          cliente_nome: clienteNome,
          cliente_whatsapp: clienteWhatsapp,
          empresa: empresa,
          mensagem_texto: mensagem1,
          mensagem_2: mensagem2,
          mensagem_3: mensagem3,
          mensagem_4: mensagem4,
          mensagem_5: mensagem5,
          data_agendamento: dataAgendamento
        })

      if (error) throw error

      toast.success("Disparo manual criado com sucesso!")
      setIsModalOpen(false)
      setClienteNome("")
      setClienteWhatsapp("")
      setEmpresa("")
      setMensagem1("")
      setMensagem2("")
      setMensagem3("")
      setMensagem4("")
      setMensagem5("")
      setDataAgendamento("")
      fetchDisparosPendentes()
    } catch (error: any) {
      console.error(error)
      toast.error("Erro ao criar disparo: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenEdit = (disparo: any) => {
    setEditId(disparo.id)
    setEditMensagem1(disparo.mensagem_texto || "")
    setEditMensagem2(disparo.mensagem_2 || "")
    setEditMensagem3(disparo.mensagem_3 || "")
    setEditMensagem4(disparo.mensagem_4 || "")
    setEditMensagem5(disparo.mensagem_5 || "")
    setEditData(disparo.data_agendamento || "")
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
          data_agendamento: editData
        })
        .eq("id", editId)

      if (error) throw error

      toast.success("Disparo atualizado com sucesso!")
      setIsEditModalOpen(false)
      fetchDisparosPendentes()
    } catch (error: any) {
      console.error(error)
      toast.error("Erro ao atualizar: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const fetchFeedbacks = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("feedbacks_cs")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(50)
    
    if (!error && data) {
      setFeedbacks(data as FeedbackCS[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchFeedbacks()
    fetchDisparosPendentes()
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setSelectedChat(null)
      return
    }
    const fb = feedbacks.find((f) => f.id === selectedId)
    if (!fb || !fb.cliente_whatsapp) {
      setSelectedChat(null)
      return
    }

    const fetchChat = async () => {
      const { data } = await supabase
        .from("nps_disparos")
        .select("*")
        .eq("cliente_whatsapp", fb.cliente_whatsapp)
        .order("criado_em", { ascending: false })
        .limit(1)
        .single()
      
      setSelectedChat(data || null)
    }

    fetchChat()
  }, [selectedId, feedbacks])


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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Customer Success
          </h2>
        </div>
        
        <div className="flex items-center gap-2">

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
              <div className="grid gap-2">
                <Label htmlFor="nome" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nome do Cliente *</Label>
                <Input
                  id="nome"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  placeholder="Ex: João Silva"
                  style={{ borderRadius: "2px" }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="whatsapp" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">WhatsApp *</Label>
                <Input
                  id="whatsapp"
                  value={clienteWhatsapp}
                  onChange={(e) => setClienteWhatsapp(e.target.value)}
                  placeholder="Ex: 5511999999999"
                  style={{ borderRadius: "2px" }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="empresa" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Empresa</Label>
                <Input
                  id="empresa"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  placeholder="Opcional"
                  style={{ borderRadius: "2px" }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mensagem1" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mensagem 1 (Apresentação / Saudação) *</Label>
                <Textarea
                  id="mensagem1"
                  value={mensagem1}
                  onChange={(e) => setMensagem1(e.target.value)}
                  placeholder="Obrigatório"
                  className="resize-none"
                  style={{ borderRadius: "2px" }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mensagem2" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mensagem 2 (Pergunta da Nota 0-5)</Label>
                <Textarea
                  id="mensagem2"
                  value={mensagem2}
                  onChange={(e) => setMensagem2(e.target.value)}
                  placeholder="Opcional"
                  className="resize-none"
                  style={{ borderRadius: "2px" }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mensagem3" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mensagem 3 (Pergunta do Motivo)</Label>
                <Textarea
                  id="mensagem3"
                  value={mensagem3}
                  onChange={(e) => setMensagem3(e.target.value)}
                  placeholder="Opcional"
                  className="resize-none"
                  style={{ borderRadius: "2px" }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mensagem4" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mensagem 4 (Opcional)</Label>
                <Textarea
                  id="mensagem4"
                  value={mensagem4}
                  onChange={(e) => setMensagem4(e.target.value)}
                  placeholder="Opcional"
                  className="resize-none"
                  style={{ borderRadius: "2px" }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mensagem5" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mensagem 5 (Opcional)</Label>
                <Textarea
                  id="mensagem5"
                  value={mensagem5}
                  onChange={(e) => setMensagem5(e.target.value)}
                  placeholder="Opcional"
                  className="resize-none"
                  style={{ borderRadius: "2px" }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="data" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Data de Agendamento *</Label>
                <Input
                  id="data"
                  type="datetime-local"
                  value={dataAgendamento}
                  onChange={(e) => setDataAgendamento(e.target.value)}
                  style={{ borderRadius: "2px" }}
                />
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

      {/* ── Body Tabs ──────────────────────────────────────────────────────── */}
      <Tabs defaultValue="feedbacks" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="feedbacks" className="text-xs uppercase tracking-widest font-semibold">Feedbacks Recebidos</TabsTrigger>
          <TabsTrigger value="fila" className="text-xs uppercase tracking-widest font-semibold gap-2">
            <CalendarClock className="h-3.5 w-3.5" />
            Fila de Disparos
          </TabsTrigger>
        </TabsList>

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

              {/* Histórico de Chat */}
              {(() => {
                if (!selectedChat) return null

                const sysMsgs = [
                  selectedChat.mensagem_texto,
                  selectedChat.mensagem_2,
                  selectedChat.mensagem_3,
                  selectedChat.mensagem_4,
                  selectedChat.mensagem_5
                ].filter(Boolean)
                
                const clientMsgs = selectedChat.respostas_cliente 
                  ? selectedChat.respostas_cliente.split('---').map((s: string) => s.trim()).filter(Boolean)
                  : []
                  
                const maxLen = Math.max(sysMsgs.length, clientMsgs.length)
                const chatFlow = []
                for(let i=0; i<maxLen; i++) {
                  if (sysMsgs[i]) chatFlow.push({ type: 'system', text: sysMsgs[i] })
                  if (clientMsgs[i]) chatFlow.push({ type: 'client', text: clientMsgs[i] })
                }
                
                if (chatFlow.length === 0) return null

                return (
                  <div className="mt-8 border-t border-border/50 pt-6">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono mb-4 flex items-center gap-1">
                      <MessageCircle className="h-2.5 w-2.5" />
                      Histórico de Interações
                    </p>
                    <div className="space-y-4">
                      {chatFlow.map((msg, idx) => (
                        <div key={idx} className={`flex w-full ${msg.type === 'system' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] px-3.5 py-2.5 text-xs leading-relaxed ${
                            msg.type === 'system' 
                              ? 'bg-green-500/20 border border-green-500/30 text-green-100 rounded-2xl rounded-tr-sm shadow-sm' 
                              : 'bg-muted/40 border border-border/50 text-foreground/80 rounded-2xl rounded-tl-sm shadow-sm'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Empty analysis & chat state */}
              {!selected.resumo_executivo && atrito.length === 0 && praticas.length === 0 && !selectedChat?.mensagem_texto && !selectedChat?.respostas_cliente && (
                <div className="py-6 flex flex-col items-center gap-2 text-muted-foreground">
                  <Bot className="h-6 w-6 opacity-20" />
                  <p className="text-xs text-center">Nenhum detalhe ou histórico disponível para este feedback.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </TabsContent>

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
            {disparosPendentes.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
                <CalendarClock className="h-8 w-8 opacity-15" />
                <p className="text-sm">Nenhum disparo pendente.</p>
              </div>
            ) : (
              disparosPendentes.map((d) => (
                <div key={d.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-all">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-foreground">
                      {d.cliente_nome}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      {d.cliente_whatsapp} {d.empresa ? `• ${d.empresa}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs font-mono">
                        {d.data_agendamento ? format(new Date(d.data_agendamento), "dd/MM/yyyy HH:mm") : "—"}
                      </p>
                      <Badge className={`text-[10px] px-1.5 py-0 h-4 border mt-1 capitalize font-medium ${
                        d.status === 'enviado' 
                          ? 'bg-green-500/15 text-green-400 border-green-500/30'
                          : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                      }`}>
                        {d.status || "pendente"}
                      </Badge>
                    </div>
                    {d.status !== 'enviado' && (
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

    {/* Edit Dialog */}
    <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
      <DialogContent className="sm:max-w-[600px]" style={{ borderRadius: "2px" }}>
        <DialogHeader>
          <DialogTitle className="text-foreground">Editar Disparo</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="grid gap-2">
            <Label htmlFor="edit-mensagem1" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mensagem 1 (Apresentação / Saudação) *</Label>
            <Textarea
              id="edit-mensagem1"
              value={editMensagem1}
              onChange={(e) => setEditMensagem1(e.target.value)}
              className="resize-none"
              style={{ borderRadius: "2px" }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-mensagem2" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mensagem 2 (Pergunta da Nota 0-5)</Label>
            <Textarea
              id="edit-mensagem2"
              value={editMensagem2}
              onChange={(e) => setEditMensagem2(e.target.value)}
              className="resize-none"
              style={{ borderRadius: "2px" }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-mensagem3" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mensagem 3 (Pergunta do Motivo)</Label>
            <Textarea
              id="edit-mensagem3"
              value={editMensagem3}
              onChange={(e) => setEditMensagem3(e.target.value)}
              className="resize-none"
              style={{ borderRadius: "2px" }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-mensagem4" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mensagem 4 (Opcional)</Label>
            <Textarea
              id="edit-mensagem4"
              value={editMensagem4}
              onChange={(e) => setEditMensagem4(e.target.value)}
              className="resize-none"
              style={{ borderRadius: "2px" }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-mensagem5" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mensagem 5 (Opcional)</Label>
            <Textarea
              id="edit-mensagem5"
              value={editMensagem5}
              onChange={(e) => setEditMensagem5(e.target.value)}
              className="resize-none"
              style={{ borderRadius: "2px" }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-data" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Data de Agendamento *</Label>
            <Input
              id="edit-data"
              type="datetime-local"
              value={editData}
              onChange={(e) => setEditData(e.target.value)}
              style={{ borderRadius: "2px" }}
            />
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
