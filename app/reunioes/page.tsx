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
import { UploadCloud, Video, CheckCircle2, AlertTriangle, Calendar, Users, ChevronDown, ChevronUp } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { ClienteBanner } from "@/components/cliente-banner"

export default function ReunioesPage() {
  const { fetchMeetings } = useSupabase()
  const [meetings, setMeetings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

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

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id)
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
                <Label htmlFor="transcript">Transcrição Completa</Label>
                <Textarea 
                  id="transcript" 
                  className="min-h-[200px]" 
                  placeholder="Cole o texto da transcrição aqui..." 
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
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
                    <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
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
                              {temas.map((tema: string, i: number) => (
                                <li key={i} className="flex items-start text-sm">
                                  <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/50 flex-shrink-0" />
                                  <span>{tema}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {decisoes.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Decisões Tomadas</h4>
                            <ul className="space-y-3">
                              {decisoes.map((decisao: string, i: number) => (
                                <li key={i} className="flex items-start bg-secondary/30 p-3 rounded-md text-sm border border-secondary/50">
                                  <CheckCircle2 className="mr-3 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-foreground/90">{decisao}</span>
                                </li>
                              ))}
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
                              {bloqueios.map((bloqueio: string, i: number) => (
                                <li key={i} className="flex items-start text-sm">
                                  <Badge variant="destructive" className="mr-2 mt-0.5 text-[10px] px-1 py-0 rounded">Block</Badge>
                                  <span>{bloqueio}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {proximosPassos.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Próximos Passos (Gerais)</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              {proximosPassos.map((passo: string, i: number) => (
                                <li key={i}>• {passo}</li>
                              ))}
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
                              {actions.map((action: any, i: number) => (
                                <TableRow key={i}>
                                  <TableCell className="font-medium">{action.tarefa}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-medium uppercase">
                                        {action.responsavel?.substring(0, 2) || "??"}
                                      </div>
                                      <span className="text-sm">{action.responsavel}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-sm">{action.prazo}</TableCell>
                                  <TableCell>
                                    <Badge variant={getPriorityColor(action.prioridade) as any} className={getPriorityClass(action.prioridade)}>
                                      {action.prioridade}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
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
    </div>
  )
}
