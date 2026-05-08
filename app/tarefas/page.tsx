/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { useTarefas, type Tarefa, type TarefaStatus } from "@/hooks/useTarefas"
import { criarTarefa, editarTarefa, gerarInsightsTarefas, sincronizarNotion } from "@/lib/actions/tarefas"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { ListTodo, Plus, Sparkles, User, Calendar, AlertTriangle, Pencil, RefreshCw } from "lucide-react"
import { ClienteBanner } from "@/components/cliente-banner"

// ─── Kanban column definitions ────────────────────────────────────────────────

const COLUNAS: {
  status: TarefaStatus
  label: string
  colorClass: string
  bgClass: string
}[] = [
  {
    status: "Pendente",
    label: "Pendente",
    colorClass: "text-yellow-500",
    bgClass: "border-yellow-500/20",
  },
  {
    status: "Em Andamento",
    label: "Em Andamento",
    colorClass: "text-blue-400",
    bgClass: "border-blue-400/20",
  },
  {
    status: "Concluído",
    label: "Concluído",
    colorClass: "text-green-500",
    bgClass: "border-green-500/20",
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePrazo(prazo: string | null | undefined): Date | null {
  if (!prazo) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(prazo)) {
    const str = prazo.length === 10 ? `${prazo}T12:00:00` : prazo
    const d = new Date(str)
    return isNaN(d.getTime()) ? null : d
  }
  const br = prazo.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (br) {
    const d = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]), 12, 0, 0)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

function formatDateForInput(prazo: string | null | undefined): string {
  const d = parsePrazo(prazo)
  if (!d) return ""
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function normalizarStatus(s: string | null | undefined): TarefaStatus {
  const v = (s ?? "").toLowerCase().trim()
  if (v === "em andamento" || v === "in_progress" || v === "em-andamento" || v === "in progress") return "Em Andamento"
  if (v.includes("conclu") || v === "done" || v === "completed" || v === "finalizado") return "Concluído"
  return "Pendente"
}

// ─── Task card with inline edit dialog ────────────────────────────────────────

function TarefaCard({
  tarefa,
  onUpdate,
}: {
  tarefa: Tarefa
  onUpdate: (id: number, updates: Partial<Tarefa>) => void
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [tituloEdit, setTituloEdit] = useState("")
  const [responsavelEdit, setResponsavelEdit] = useState("")
  const [prazoEdit, setPrazoEdit] = useState("")
  const [statusEdit, setStatusEdit] = useState<TarefaStatus>("Pendente")

  const concluida = normalizarStatus(tarefa.status) === "Concluído"
  const dataPrazo = parsePrazo(tarefa.prazo)
  const vencida = dataPrazo !== null && dataPrazo < new Date() && !concluida

  const handleOpen = () => {
    setTituloEdit(tarefa.titulo)
    setResponsavelEdit(tarefa.responsavel ?? "")
    setPrazoEdit(formatDateForInput(tarefa.prazo))
    setStatusEdit(normalizarStatus(tarefa.status))
    setEditOpen(true)
  }

  const handleSalvar = async () => {
    if (!tituloEdit.trim()) {
      toast.error("O título é obrigatório.")
      return
    }

    // Snapshot para rollback em caso de falha
    const snapshot = {
      titulo: tarefa.titulo,
      responsavel: tarefa.responsavel,
      prazo: tarefa.prazo,
      status: tarefa.status,
    }

    // Optimistic UI — fecha o modal e reflecte a mudança imediatamente
    onUpdate(tarefa.id, {
      titulo: tituloEdit,
      responsavel: responsavelEdit || null,
      prazo: prazoEdit || null,
      status: statusEdit,
    })
    setEditOpen(false)

    try {
      await editarTarefa({
        tarefa_id: tarefa.id,
        notion_id: (tarefa.notion_id as string | null) ?? null,
        titulo: tituloEdit,
        responsavel: responsavelEdit || null,
        prazo: prazoEdit || null,
        status: statusEdit,
      })
      toast.success("Tarefa atualizada!")
    } catch (error: any) {
      // Rollback: reverte o estado visual e reabre o modal com os dados originais
      onUpdate(tarefa.id, snapshot)
      setTituloEdit(snapshot.titulo)
      setResponsavelEdit(snapshot.responsavel ?? "")
      setPrazoEdit(formatDateForInput(snapshot.prazo))
      setStatusEdit(normalizarStatus(snapshot.status))
      setEditOpen(true)
      toast.error(error.message || "Falha ao salvar. As alterações foram revertidas.")
    }
  }

  return (
    <>
      <Card
        onClick={handleOpen}
        className={`p-3 cursor-pointer group transition-colors ${
          vencida
            ? "border-red-500/40 bg-red-950/10 hover:bg-red-950/20"
            : "hover:bg-muted/40 hover:border-border/80"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug">{tarefa.titulo}</p>
          <Pencil className="h-3 w-3 mt-0.5 flex-shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {tarefa.responsavel && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {tarefa.responsavel}
            </span>
          )}
          {tarefa.prazo && (
            <span className={`flex items-center gap-1 ${vencida ? "text-red-500 font-medium" : ""}`}>
              <Calendar className="h-3 w-3" />
              {dataPrazo ? dataPrazo.toLocaleDateString("pt-BR") : tarefa.prazo}
            </span>
          )}
          {tarefa.origem === "notion" ? (
            <Badge
              variant="outline"
              className="ml-auto text-[10px] px-1.5 py-0 h-4 bg-white text-neutral-900 border-neutral-300 font-medium flex items-center gap-1 shrink-0"
            >
              <span className="inline-flex items-center justify-center w-3 h-3 rounded-[2px] bg-neutral-900 text-white text-[7px] font-black leading-none shrink-0">
                N
              </span>
              Notion
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="ml-auto text-[10px] px-1.5 py-0 h-4 bg-neutral-800 text-neutral-400 border-neutral-700/50 shrink-0"
            >
              Sistema
            </Badge>
          )}
        </div>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Editar Tarefa</DialogTitle>
            <DialogDescription>
              As alterações são salvas diretamente no banco de dados.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor={`titulo-edit-${tarefa.id}`}>Título *</Label>
              <Input
                id={`titulo-edit-${tarefa.id}`}
                value={tituloEdit}
                onChange={(e) => setTituloEdit(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSalvar()}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`resp-edit-${tarefa.id}`}>Responsável</Label>
                <Input
                  id={`resp-edit-${tarefa.id}`}
                  placeholder="Ex: João"
                  value={responsavelEdit}
                  onChange={(e) => setResponsavelEdit(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`prazo-edit-${tarefa.id}`}>Prazo</Label>
                <Input
                  id={`prazo-edit-${tarefa.id}`}
                  type="date"
                  value={prazoEdit}
                  onChange={(e) => setPrazoEdit(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`status-edit-${tarefa.id}`}>Status</Label>
              <Select
                value={statusEdit}
                onValueChange={(v) => setStatusEdit(v as TarefaStatus)}
              >
                <SelectTrigger id={`status-edit-${tarefa.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar}>
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TarefasPage() {
  const { tarefas, loading, erro, updateTarefa } = useTarefas()

  // Dialog state
  const [novaTarefaOpen, setNovaTarefaOpen] = useState(false)
  const [insightsOpen, setInsightsOpen] = useState(false)

  // Loading state
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)
  const [insightsText, setInsightsText] = useState("")
  const [isSyncing, setIsSyncing] = useState(false)

  // Nova tarefa form
  const [titulo, setTitulo] = useState("")
  const [responsavel, setResponsavel] = useState("")
  const [prazo, setPrazo] = useState("")
  const [status, setStatus] = useState<TarefaStatus>("Pendente")

  const resetForm = () => {
    setTitulo("")
    setResponsavel("")
    setPrazo("")
    setStatus("Pendente")
  }

  const handleCriarTarefa = async () => {
    if (!titulo.trim()) {
      toast.error("O título da tarefa é obrigatório.")
      return
    }
    try {
      setIsSaving(true)
      await criarTarefa({ titulo, responsavel, prazo, status })
      toast.success("Tarefa enviada! O n8n irá processar e salvar em breve.")
      setNovaTarefaOpen(false)
      resetForm()
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar a tarefa.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSincronizarNotion = async () => {
    try {
      setIsSyncing(true)
      await sincronizarNotion(tarefas)
      toast.success("Tarefas sincronizadas com o Notion!")
    } catch (error: any) {
      toast.error(error.message || "Erro ao sincronizar com o Notion.")
    } finally {
      setIsSyncing(false)
    }
  }

  const handleGerarInsights = async () => {
    try {
      setInsightsText("")
      setIsLoadingInsights(true)
      setInsightsOpen(true)
      const resultado = await gerarInsightsTarefas(tarefas)
      setInsightsText(resultado)
    } catch (error: any) {
      setInsightsText("Erro ao gerar insights: " + (error.message || "Tente novamente."))
    } finally {
      setIsLoadingInsights(false)
    }
  }

  const tarefasPorColuna = (s: TarefaStatus) =>
    tarefas.filter((t) => normalizarStatus(t.status) === s)

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[420px] w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <ClienteBanner />

      {/* ── Erro de conexão ─────────────────────────────────────────────── */}
      {erro && (
        <div className="flex items-start gap-3 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold">Erro ao carregar tarefas: </span>
            {erro}
            <p className="mt-1 text-xs text-destructive/80">
              Verifique se a tabela <code className="font-mono">tarefas</code> existe no Supabase e se o RLS permite leitura pela chave anônima.
            </p>
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <ListTodo className="h-4 w-4" />
          Gestão de Tarefas
        </h2>

        <div className="flex items-center gap-2">
          {/* Sincronizar Notion */}
          <Button
            variant="outline"
            onClick={handleSincronizarNotion}
            disabled={isSyncing || tarefas.length === 0}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Sincronizando..." : "Sincronizar Notion"}
          </Button>

          {/* Nova Tarefa */}
          <Dialog
            open={novaTarefaOpen}
            onOpenChange={(open) => {
              setNovaTarefaOpen(open)
              if (!open) resetForm()
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Tarefa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>Nova Tarefa</DialogTitle>
                <DialogDescription>
                  Preencha os dados. O n8n irá criar a tarefa e sincronizar em tempo real.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título *</Label>
                  <Input
                    id="titulo"
                    placeholder="Ex: Criar campanha de remarketing"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCriarTarefa()}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="responsavel">Responsável</Label>
                    <Input
                      id="responsavel"
                      placeholder="Ex: João"
                      value={responsavel}
                      onChange={(e) => setResponsavel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prazo">Prazo</Label>
                    <Input
                      id="prazo"
                      type="date"
                      value={prazo}
                      onChange={(e) => setPrazo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status Inicial</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as TarefaStatus)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                      <SelectItem value="Concluído">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setNovaTarefaOpen(false)}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCriarTarefa} disabled={isSaving}>
                  {isSaving ? "Salvando..." : "Criar Tarefa"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Kanban / empty state ────────────────────────────────────────── */}
      {tarefas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-center pt-6">
            <ListTodo className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhuma tarefa cadastrada</h3>
            <p className="text-muted-foreground mt-2 max-w-sm mb-4">
              Crie a primeira tarefa ou aguarde a sincronização em tempo real com o Supabase.
            </p>
            <Button variant="outline" onClick={() => setNovaTarefaOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar primeira tarefa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {COLUNAS.map(({ status: colStatus, label, colorClass, bgClass }) => {
            const items = tarefasPorColuna(colStatus)
            return (
              <div key={colStatus} className="flex flex-col gap-3">
                {/* Column header */}
                <div
                  className={`flex items-center justify-between rounded-md border px-3 py-2 bg-muted/20 ${bgClass}`}
                >
                  <h3
                    className={`text-xs font-semibold uppercase tracking-widest ${colorClass}`}
                  >
                    {label}
                  </h3>
                  <Badge variant="secondary" className="text-xs h-5">
                    {items.length}
                  </Badge>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 min-h-[100px]">
                  {items.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-muted-foreground/20 h-20 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground/50">
                        Sem tarefas
                      </span>
                    </div>
                  ) : (
                    items.map((tarefa) => (
                      <TarefaCard key={tarefa.id} tarefa={tarefa} onUpdate={updateTarefa} />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Insights Dialog ──────────────────────────────────────────────── */}
      <Dialog open={insightsOpen} onOpenChange={setInsightsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Insights das Tarefas
            </DialogTitle>
            <DialogDescription>
              Análise gerada pelo agente de IA com base nas tarefas atuais.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 max-h-[420px] overflow-y-auto">
            {isLoadingInsights ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/6" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                {insightsText}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInsightsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
