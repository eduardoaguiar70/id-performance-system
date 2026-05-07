/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, prefer-const, @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect } from "react"
import { useSupabase } from "@/hooks/useSupabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { RefreshCw, AlertCircle, Clock, Ban, ListTodo, Users, ChevronDown, ChevronUp } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { ClienteBanner } from "@/components/cliente-banner"

export default function TarefasPage() {
  const { fetchLatestTaskSnapshot } = useSupabase()
  const [snapshot, setSnapshot] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  
  // Upload State
  const [jsonInput, setJsonInput] = useState("")

  // Filters State
  const [filterResponsavel, setFilterResponsavel] = useState("all")
  const [filterPrioridade, setFilterPrioridade] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [groupByResponsavel, setGroupByResponsavel] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadSnapshot()
  }, [])

  const loadSnapshot = async () => {
    try {
      setLoading(true)
      const data = await fetchLatestTaskSnapshot()
      setSnapshot(data || null)
    } catch (error: any) {
      if (error.code !== 'PGRST116') {
        console.error("Error fetching tasks:", error)
        toast.error("Erro ao carregar as tarefas.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async () => {
    if (!jsonInput.trim()) {
      toast.error("Cole o JSON com as tarefas.")
      return
    }

    let parsedTasks = []
    try {
      parsedTasks = JSON.parse(jsonInput)
      if (!Array.isArray(parsedTasks)) {
        throw new Error("O JSON deve ser um array de tarefas.")
      }
    } catch (e) {
      toast.error("JSON inválido. Verifique a formatação.")
      return
    }

    try {
      setIsUploading(true)
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_TAREFAS
      if (!webhookUrl) throw new Error("Webhook URL não configurada.")

      const payload = {
        tarefas: parsedTasks,
        enviado_por: "Sistema Dashboard",
        fonte: "notion",
        sync_id: Date.now()
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error("Erro na resposta do webhook.")
      }

      toast.success("Sincronização enviada com sucesso!")
      setUploadOpen(false)
      setJsonInput("")
      
      // Delay to let webhook process
      setTimeout(loadSnapshot, 3000)

    } catch (error: any) {
      console.error("Upload error:", error)
      toast.error(error.message || "Falha ao enviar tarefas.")
    } finally {
      setIsUploading(false)
    }
  }

  const getPriorityBadgeProps = (priority: string) => {
    const p = priority?.toLowerCase() || ""
    if (p === 'urgente') return { className: 'bg-red-500 hover:bg-red-600 border-transparent text-white' }
    if (p === 'alta') return { className: 'bg-orange-100 text-orange-800 hover:bg-orange-200 border-transparent dark:bg-orange-900 dark:text-orange-100' }
    if (p === 'média' || p === 'media') return { className: 'bg-yellow-500 hover:bg-yellow-600 border-transparent text-white' }
    return { variant: 'secondary' as any }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  const tarefas = snapshot?.tarefas || []
  const resumo = snapshot?.resumo_backlog || { total: 0, urgentes: 0, vencidas: 0, bloqueadas: 0 }
  const responsaveisMap = snapshot?.por_responsavel || {}
  const responsaveisList = Object.keys(responsaveisMap)

  // Filter logic
  let filteredTasks = tarefas.filter((t: any) => {
    if (filterResponsavel !== 'all' && t.responsavel !== filterResponsavel) return false
    if (filterPrioridade !== 'all' && t.prioridade?.toLowerCase() !== filterPrioridade.toLowerCase()) return false
    if (filterStatus !== 'all' && t.status?.toLowerCase() !== filterStatus.toLowerCase()) return false
    return true
  })

  const renderTaskTable = (tasks: any[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Título</TableHead>
          <TableHead>Responsável</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead>Prioridade</TableHead>
          <TableHead>Prazo</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((t: any, i: number) => {
          const isVencida = t.vencida === true || (t.prazo && new Date(t.prazo) < new Date() && t.status !== 'Concluída')
          return (
            <TableRow key={i} className={isVencida ? "bg-red-50 dark:bg-red-950/20" : ""}>
              <TableCell className="font-medium">
                <div className="flex flex-col space-y-1">
                  <span>{t.titulo}</span>
                  {t.relacionada_a_kpi && (
                    <Badge variant="outline" className="w-fit text-[10px] h-4 leading-none">Relacionado a KPI</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>{t.responsavel || "Não atribuído"}</TableCell>
              <TableCell><Badge variant="outline">{t.categoria}</Badge></TableCell>
              <TableCell><Badge {...getPriorityBadgeProps(t.prioridade)}>{t.prioridade}</Badge></TableCell>
              <TableCell className={isVencida ? "text-red-500 font-medium" : ""}>
                {t.prazo ? new Date(t.prazo).toLocaleDateString() : "-"}
              </TableCell>
              <TableCell><Badge variant={t.status?.toLowerCase() === 'concluída' ? 'outline' : 'secondary'}>{t.status}</Badge></TableCell>
            </TableRow>
          )
        })}
        {tasks.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma tarefa encontrada.</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )

  const toggleGroup = (resp: string) => {
    setExpandedGroups(prev => ({ ...prev, [resp]: !prev[resp] }))
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <ClienteBanner />
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <ListTodo className="h-4 w-4" />
          Gestão de Tarefas
        </h2>
        
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar Tarefas
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Sincronização Manual (Notion)</DialogTitle>
              <DialogDescription>
                Cole o JSON exportado do Notion para atualizar o backlog de tarefas.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="json">Payload JSON</Label>
              <Textarea 
                id="json" 
                className="font-mono text-xs min-h-[300px] mt-2" 
                placeholder='[{"titulo": "Exemplo", "responsavel": "João"}]' 
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={isUploading}>Cancelar</Button>
              <Button onClick={handleUpload} disabled={isUploading}>
                {isUploading ? "Enviando..." : "Sincronizar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!snapshot ? (
        <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center h-64">
            <ListTodo className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum backlog disponível</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
              Sincronize as tarefas exportadas do Notion para visualizar o backlog.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
                <ListTodo className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{resumo.total}</div></CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-600">Urgentes</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-red-600">{resumo.urgentes}</div></CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-600">Vencidas</CardTitle>
                <Clock className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-red-600">{resumo.vencidas}</div></CardContent>
            </Card>
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-yellow-600">Bloqueadas</CardTitle>
                <Ban className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-yellow-600">{resumo.bloqueadas}</div></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-4 border-b">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle>Backlog Priorizado</CardTitle>
                
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center space-x-2 mr-4">
                    <Checkbox 
                      id="groupby" 
                      checked={groupByResponsavel}
                      onCheckedChange={(c) => setGroupByResponsavel(!!c)}
                    />
                    <Label htmlFor="groupby" className="cursor-pointer">Ver por responsável</Label>
                  </div>
                  
                  <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {responsaveisList.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select value={filterPrioridade} onValueChange={setFilterPrioridade}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="média">Média</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="a fazer">A fazer</SelectItem>
                      <SelectItem value="em andamento">Em andamento</SelectItem>
                      <SelectItem value="bloqueada">Bloqueada</SelectItem>
                      <SelectItem value="concluída">Concluída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 p-0">
              {groupByResponsavel ? (
                <div className="space-y-4 p-6">
                  {responsaveisList.filter(r => filterResponsavel === 'all' || filterResponsavel === r).map(resp => {
                    const respTasks = filteredTasks.filter((t: any) => t.responsavel === resp)
                    if (respTasks.length === 0) return null
                    
                    const isExpanded = expandedGroups[resp] !== false // default true
                    const urgentesCount = respTasks.filter((t: any) => t.prioridade?.toLowerCase() === 'urgente').length

                    return (
                      <Card key={resp} className="overflow-hidden border-muted">
                        <div 
                          className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => toggleGroup(resp)}
                        >
                          <div className="flex items-center gap-4">
                            <Users className="h-5 w-5 text-muted-foreground" />
                            <h4 className="font-semibold text-lg">{resp}</h4>
                            <div className="flex gap-2">
                              <Badge variant="secondary">{respTasks.length} tarefas</Badge>
                              {urgentesCount > 0 && <Badge variant="destructive">{urgentesCount} urgentes</Badge>}
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                        {isExpanded && (
                          <div className="border-t">
                            {renderTaskTable(respTasks)}
                          </div>
                        )}
                      </Card>
                    )
                  })}
                  {filteredTasks.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">Nenhuma tarefa encontrada com os filtros atuais.</div>
                  )}
                </div>
              ) : (
                <div className="p-1">
                  {renderTaskTable(filteredTasks)}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
