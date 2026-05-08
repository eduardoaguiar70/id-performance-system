/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, prefer-const, @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect } from "react"
import { useSupabase } from "@/hooks/useSupabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { UploadCloud, Video, CheckCircle2, AlertTriangle, Calendar, Users, ChevronDown, ChevronUp, Trash2, Pencil } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { ClienteBanner } from "@/components/cliente-banner"
import { supabase } from "@/hooks/useSupabase"

export default function ReunioesPage() {
  const { fetchMeetings } = useSupabase()
  const [meetings, setMeetings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [isProcessingFile, setIsProcessingFile] = useState(false)

  // Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<any>(null)
  const [editTitulo, setEditTitulo] = useState("")
  const [editTipo, setEditTipo] = useState("")
  const [editData, setEditData] = useState("")
  const [editResumo, setEditResumo] = useState("")
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Upload Form State
  const [transcript, setTranscript] = useState("")
  const [title, setTitle] = useState("")
  const [date, setDate] = useState("")
  const [email, setEmail] = useState("")

  useEffect(() => {
    loadMeetings()
  }, [])

  const loadMeetings = async () => {
    try {
      setLoading(true)
      const data = await fetchMeetings()
      setMeetings(data || [])
    } catch (error) {
      console.error("Error fetching meetings:", error)
      toast.error("Erro ao carregar as reuniões.")
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async () => {
    if (!transcript.trim()) {
      toast.error("A transcrição não pode estar vazia.")
      return
    }

    try {
      setIsUploading(true)
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_REUNIAO
      if (!webhookUrl) throw new Error("Webhook URL não configurada.")

      const payload = {
        transcricao: transcript,
        titulo: title,
        data: date,
        enviado_por: email
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error("Erro na resposta do webhook.")
      }

      const result = await response.json()
      if (result.status === "erro") {
        throw new Error(result.message || "Erro retornado pelo n8n.")
      }

      toast.success("Transcrição enviada com sucesso! Ela será processada em breve.")
      setUploadOpen(false)
      // Reset form
      setTranscript("")
      setTitle("")
      setDate("")
      setEmail("")
      
      // Reload meetings after a short delay to allow webhook processing
      setTimeout(loadMeetings, 3000)

    } catch (error: any) {
      console.error("Upload error:", error)
      toast.error(error.message || "Falha ao enviar a transcrição para processamento.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessingFile(true)
    const toastId = toast.loading("Extraindo texto do arquivo...")

    try {
      if (file.type === "text/plain") {
        const text = await file.text()
        setTranscript(prev => prev + (prev ? "\n\n" : "") + text)
        toast.success("Texto do .txt extraído com sucesso!", { id: toastId })
      } else if (file.type === "application/pdf") {
        const formData = new FormData()
        formData.append("file", file)
        
        const res = await fetch("/api/parse-pdf", {
          method: "POST",
          body: formData
        })
        
        if (!res.ok) throw new Error("Erro ao processar o PDF no servidor.")
        
        const data = await res.json()
        setTranscript(prev => prev + (prev ? "\n\n" : "") + data.text)
        toast.success("Texto do PDF extraído com sucesso!", { id: toastId })
      } else {
        toast.error("Formato não suportado. Por favor, envie um .txt ou .pdf.", { id: toastId })
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Falha ao processar o arquivo.", { id: toastId })
    } finally {
      setIsProcessingFile(false)
      event.target.value = "" // clear input so user can upload the same file again if needed
    }
  }

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const handleDeleteMeeting = async () => {
    if (!confirmDeleteId) return
    setDeletingId(confirmDeleteId)
    try {
      const { error } = await supabase
        .from('meeting_summaries')
        .delete()
        .eq('id', confirmDeleteId)
      if (error) throw error
      setMeetings(prev => prev.filter(m => m.id !== confirmDeleteId))
      setConfirmDeleteId(null)
      toast.success("Reunião excluída com sucesso.")
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir a reunião.")
    } finally {
      setDeletingId(null)
    }
  }

  const openEditDialog = (meeting: any) => {
    setEditingMeeting(meeting)
    setEditTitulo(meeting.titulo || "")
    setEditTipo(meeting.tipo || "")
    setEditData(
      meeting.data_reuniao
        ? new Date(meeting.data_reuniao).toISOString().split('T')[0]
        : ""
    )
    setEditResumo(meeting.resumo_executivo || "")
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingMeeting) return
    setIsSavingEdit(true)
    try {
      const updates: any = {
        titulo: editTitulo.trim(),
        tipo: editTipo.trim(),
        resumo_executivo: editResumo.trim(),
      }
      if (editData) updates.data_reuniao = editData
      const { error } = await supabase
        .from('meeting_summaries')
        .update(updates)
        .eq('id', editingMeeting.id)
      if (error) throw error
      setMeetings(prev =>
        prev.map(m => m.id === editingMeeting.id ? { ...m, ...updates } : m)
      )
      setEditDialogOpen(false)
      toast.success("Reunião atualizada com sucesso.")
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar a reunião.")
    } finally {
      setIsSavingEdit(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'alta': return 'destructive'
      case 'média':
      case 'media': return 'default' // Use default (which is primary color) and override with warning colors manually if needed, or stick to default variants
      default: return 'secondary'
    }
  }

  const getPriorityClass = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'alta': return ''
      case 'média':
      case 'media': return 'bg-yellow-500 hover:bg-yellow-600'
      default: return ''
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <ClienteBanner />
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Video className="h-4 w-4" />
          Reuniões e Transcrições
        </h2>
        
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <UploadCloud className="mr-2 h-4 w-4" />
              Enviar transcrição
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Nova Transcrição</DialogTitle>
              <DialogDescription>
                Cole a transcrição da reunião para que a IA processe os resumos e tarefas.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título (Opcional)</Label>
                  <Input id="title" placeholder="Ex: Sync Semanal" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Data (Opcional)</Label>
                  <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Seu e-mail (Opcional)</Label>
                <Input id="email" type="email" placeholder="nome@agencia.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="transcript">Transcrição Completa</Label>
                  <div className="flex items-center">
                    <input 
                      type="file" 
                      id="file-upload" 
                      className="hidden" 
                      accept=".txt,.pdf,application/pdf,text/plain" 
                      onChange={handleFileUpload} 
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => document.getElementById("file-upload")?.click()}
                      disabled={isProcessingFile}
                      className="h-7 text-xs"
                    >
                      <UploadCloud className="mr-2 h-3 w-3" />
                      {isProcessingFile ? "Extraindo..." : "Carregar Arquivo (.txt, .pdf)"}
                    </Button>
                  </div>
                </div>
                <Textarea 
                  id="transcript" 
                  className="min-h-[200px]" 
                  placeholder="Cole o texto da transcrição aqui, ou carregue um arquivo usando o botão acima..." 
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                  disabled={isProcessingFile}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={isUploading}>Cancelar</Button>
              <Button onClick={handleUpload} disabled={isUploading}>
                {isUploading ? "Enviando..." : "Processar Reunião"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : meetings.length === 0 ? (
        <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center h-64">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhuma reunião processada</h3>
            <p className="text-muted-foreground mt-2 max-w-sm mb-4">
              Você ainda não enviou transcrições. Faça o upload de uma transcrição para começar.
            </p>
            <Button onClick={() => setUploadOpen(true)} variant="outline">
              <UploadCloud className="mr-2 h-4 w-4" /> Enviar primeira transcrição
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => {
            const isExpanded = expandedId === meeting.id;
            // Parse JSONB fields
            const temas = meeting.temas_discutidos || [];
            const decisoes = meeting.decisoes || [];
            const actions = meeting.action_items || [];
            const bloqueios = meeting.bloqueios || [];
            const proximosPassos = meeting.proximos_passos || [];

            return (
              <Card key={meeting.id} className="overflow-hidden transition-all duration-200 hover:shadow-md">
                <CardHeader 
                  className="pb-4 cursor-pointer select-none bg-card hover:bg-muted/50"
                  onClick={() => toggleExpand(meeting.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {meeting.tipo || "Geral"}
                        </Badge>
                        <CardTitle className="text-xl">{meeting.titulo}</CardTitle>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground gap-4">
                        <span className="flex items-center"><Calendar className="mr-1 h-3 w-3" /> {new Date(meeting.data_reuniao).toLocaleDateString()}</span>
                        {meeting.participantes && <span className="flex items-center"><Users className="mr-1 h-3 w-3" /> {meeting.participantes.length} participantes</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0 text-muted-foreground hover:text-primary"
                        onClick={(e) => { e.stopPropagation(); openEditDialog(meeting) }}
                        title="Editar reunião"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(meeting.id) }}
                        title="Excluir reunião"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  {!isExpanded && (
                    <CardDescription className="line-clamp-2 mt-2 text-base text-foreground/80">
                      {meeting.resumo_executivo}
                    </CardDescription>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Badge variant="secondary" className="font-normal text-xs">{actions.length} Action Items</Badge>
                    <Badge variant="secondary" className="font-normal text-xs">{decisoes.length} Decisões</Badge>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="border-t pt-6 space-y-8 animate-in slide-in-from-top-2 duration-200">
                    {/* Resumo Executivo */}
                    <div>
                      <h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Resumo Executivo</h4>
                      <p className="text-foreground/90 leading-relaxed">{meeting.resumo_executivo}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                      {/* Temas e Decisões */}
                      <div className="space-y-6">
                        {temas.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Temas Discutidos</h4>
                            <ul className="space-y-2">
                              {temas.map((temaItem: any, i: number) => {
                                const rawTema = temaItem.tema
                                const text = typeof temaItem === 'string' ? temaItem : (typeof rawTema === 'string' ? rawTema : JSON.stringify(rawTema ?? temaItem));
                                const subtext = typeof temaItem === 'object' && temaItem.pontos ? temaItem.pontos : null;
                                return (
                                  <li key={i} className="flex flex-col mb-2">
                                    <div className="flex items-start text-sm">
                                      <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/50 flex-shrink-0" />
                                      <span className="font-medium">{text}</span>
                                    </div>
                                    {subtext && (
                                      <span className="text-muted-foreground text-xs ml-3.5 mt-1 pl-1 border-l-2 border-muted">
                                        {Array.isArray(subtext) ? subtext.join(', ') : String(subtext)}
                                      </span>
                                    )}
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        )}

                        {decisoes.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Decisões Tomadas</h4>
                            <ul className="space-y-3">
                              {decisoes.map((decisaoItem: any, i: number) => {
                                const descricao = typeof decisaoItem === 'string'
                                  ? decisaoItem
                                  : (decisaoItem.descricao || decisaoItem.decisao || decisaoItem.titulo || JSON.stringify(decisaoItem))
                                const contexto = typeof decisaoItem === 'object' && typeof decisaoItem.contexto === 'string'
                                  ? decisaoItem.contexto
                                  : null
                                return (
                                  <li key={i} className="flex items-start bg-secondary/30 p-3 rounded-md text-sm border border-secondary/50">
                                    <CheckCircle2 className="mr-3 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <div className="flex flex-col gap-1">
                                      {contexto && <span className="text-xs text-muted-foreground italic">{contexto}</span>}
                                      <span className="text-foreground/90">{descricao}</span>
                                    </div>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Bloqueios e Próximos Passos */}
                      <div className="space-y-6">
                        {bloqueios.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-red-500 uppercase tracking-wider mb-3 flex items-center">
                              <AlertTriangle className="mr-2 h-4 w-4" /> Bloqueios
                            </h4>
                            <ul className="space-y-2">
                              {bloqueios.map((bloqueioItem: any, i: number) => {
                                const descricao = typeof bloqueioItem === 'string'
                                  ? bloqueioItem
                                  : (bloqueioItem.descricao || bloqueioItem.bloqueio || bloqueioItem.titulo || JSON.stringify(bloqueioItem))
                                const impacto = typeof bloqueioItem === 'object' && typeof bloqueioItem.impacto === 'string'
                                  ? bloqueioItem.impacto
                                  : null
                                return (
                                  <li key={i} className="flex items-start text-sm gap-2">
                                    <Badge variant="destructive" className="mt-0.5 text-[10px] px-1 py-0 rounded flex-shrink-0">Block</Badge>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-medium">{descricao}</span>
                                      {impacto && <span className="text-xs text-muted-foreground">{impacto}</span>}
                                    </div>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        )}

                        {proximosPassos.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Próximos Passos (Gerais)</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              {proximosPassos.map((passoItem: any, i: number) => {
                                const rawP = passoItem.passo ?? passoItem.acao
                                const text = typeof passoItem === 'string' ? passoItem : (typeof rawP === 'string' ? rawP : JSON.stringify(rawP ?? passoItem));
                                return (
                                  <li key={i}>• {text}</li>
                                )
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Items */}
                    {actions.length > 0 && (
                      <div className="pt-4">
                        <h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">Action Items</h4>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead>Tarefa</TableHead>
                                <TableHead>Responsável</TableHead>
                                <TableHead>Prazo</TableHead>
                                <TableHead>Prioridade</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {actions.map((actionItem: any, i: number) => {
                                const action = typeof actionItem === 'object' && actionItem !== null ? (actionItem.tarefa && typeof actionItem.tarefa === 'object' ? actionItem.tarefa : actionItem) : { tarefa: actionItem };
                                
                                const tarefaStr = typeof action.tarefa === 'string' ? action.tarefa : (typeof action === 'string' ? action : JSON.stringify(action.tarefa || action));
                                const respStr = typeof action.responsavel === 'string' ? action.responsavel : (action.responsavel ? JSON.stringify(action.responsavel) : "Não definido");
                                const prazoStr = typeof action.prazo === 'string' ? action.prazo : (action.prazo ? JSON.stringify(action.prazo) : "Sem prazo");
                                const prioStr = typeof action.prioridade === 'string' ? action.prioridade : (action.prioridade ? JSON.stringify(action.prioridade) : "Normal");

                                return (
                                  <TableRow key={i}>
                                    <TableCell className="font-medium max-w-[200px] truncate" title={tarefaStr}>{tarefaStr}</TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-medium uppercase flex-shrink-0">
                                          {respStr.substring(0, 2)}
                                        </div>
                                        <span className="text-sm truncate max-w-[100px]" title={respStr}>{respStr}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{prazoStr}</TableCell>
                                    <TableCell>
                                      <Badge variant={getPriorityColor(prioStr) as any} className={getPriorityClass(prioStr)}>
                                        {prioStr}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
      {/* ── Diálogo de confirmação de exclusão ────────────────────────── */}
      <Dialog open={confirmDeleteId !== null} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Excluir Reunião
            </DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. A reunião será removida permanentemente do banco de dados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteId(null)}
              disabled={deletingId !== null}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMeeting}
              disabled={deletingId !== null}
            >
              {deletingId !== null ? "Excluindo..." : "Sim, excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo de edição ─────────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Editar Reunião
            </DialogTitle>
            <DialogDescription>
              Atualize as informações principais. Os action items e decisões permanecem intactos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-titulo">Título</Label>
              <Input
                id="edit-titulo"
                value={editTitulo}
                onChange={e => setEditTitulo(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-tipo">Tipo</Label>
                <Input
                  id="edit-tipo"
                  placeholder="Ex: Sync, Estratégia..."
                  value={editTipo}
                  onChange={e => setEditTipo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-data">Data da Reunião</Label>
                <Input
                  id="edit-data"
                  type="date"
                  value={editData}
                  onChange={e => setEditData(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-resumo">Resumo Executivo</Label>
              <Textarea
                id="edit-resumo"
                className="min-h-[120px]"
                value={editResumo}
                onChange={e => setEditResumo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isSavingEdit}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
