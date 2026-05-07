/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-expressions */
"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Lead, LeadStatus, LeadsFilters } from "@/lib/types"
import { formatFollowers, formatWhatsApp, cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Send,
  CheckSquare,
  Filter,
} from "lucide-react"
import { LeadDetailsModal, getStatusConfig } from "./lead-details-modal"

// ──────────────────────────────────────────
// Constantes
// ──────────────────────────────────────────
const PAGE_SIZE = 20

// ──────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────
export function LeadsTable() {
  // ── Estado de dados ──
  const [leads, setLeads] = useState<Lead[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // ── Estado de seleção ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // ── Estado do modal ──
  const [modalLead, setModalLead] = useState<Lead | null>(null)

  // ── Paginação ──
  const [page, setPage] = useState(0) // 0-indexed

  // ── Filtros ──
  const [filters, setFilters] = useState<LeadsFilters>({
    status: "all",
    hasWhatsApp: false,
    minFollowers: null,
    search: "",
  })

  // ── Busca com debounce ──
  const [searchInput, setSearchInput] = useState("")

  // Debounce da busca: só aplica filtro 400ms após parar de digitar
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput }))
      setPage(0)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // ──────────────────────────────────────────
  // Buscar leads do Supabase
  // ──────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      // Monta a query base
      let query = supabase
        .from("leads")
        .select("*", { count: "exact" })
        .order("followers_count", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      // Filtro de status
      if (filters.status !== "all") {
        query = query.eq("status", filters.status)
      }

      // Filtro: só leads com WhatsApp
      if (filters.hasWhatsApp) {
        query = query.not("whatsapp", "is", null).neq("whatsapp", "")
      }

      // Filtro: mínimo de seguidores
      if (filters.minFollowers) {
        query = query.gte("followers_count", filters.minFollowers)
      }

      // Busca por username ou nome
      if (filters.search.trim()) {
        const term = `%${filters.search.trim()}%`
        query = query.or(
          `instagram_username.ilike.${term},full_name.ilike.${term}`
        )
      }

      const { data, error, count } = await query

      if (error) {
        console.error("[Supabase] Erro ao buscar leads:", error)
        toast.error("Erro ao carregar leads do banco de dados.")
        return
      }

      setLeads((data as Lead[]) || [])
      setTotalCount(count || 0)
    } catch (err) {
      console.error("[LeadsTable] Erro inesperado:", err)
      toast.error("Erro inesperado ao carregar leads.")
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  // Carrega ao montar e sempre que filtros/página mudarem
  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  // ──────────────────────────────────────────
  // Realtime: novo lead inserido pelo WF1
  // ──────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("leads-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const newLead = payload.new as Lead
          // Adiciona no topo se estiver na primeira página e o filtro permitir
          if (page === 0 && filters.status === "all") {
            setLeads((prev) => [newLead, ...prev.slice(0, PAGE_SIZE - 1)])
            setTotalCount((c) => c + 1)
            toast.info(`Novo lead scraped: @${newLead.instagram_username}`)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [page, filters.status])

  // ──────────────────────────────────────────
  // Handlers de seleção
  // ──────────────────────────────────────────
  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(leads.map((l) => l.id)) : new Set())
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }

  const isAllSelected = leads.length > 0 && selectedIds.size === leads.length
  const isIndeterminate = selectedIds.size > 0 && !isAllSelected

  // ──────────────────────────────────────────
  // Aprovar selecionados
  // ──────────────────────────────────────────
  const handleApproveSelected = async () => {
    if (selectedIds.size === 0) return

    const ids = Array.from(selectedIds)
    const toastId = toast.loading(`Aprovando ${ids.length} leads...`)

    const { error } = await supabase
      .from("leads")
      .update({
        status: "approved",
        selected: true,
        selected_at: new Date().toISOString(),
      })
      .in("id", ids)

    if (error) {
      toast.error("Erro ao aprovar leads.", { id: toastId })
      return
    }

    toast.success(`${ids.length} leads aprovados!`, { id: toastId })
    setSelectedIds(new Set())
    fetchLeads()
  }

  // ──────────────────────────────────────────
  // Disparar approaches — Webhook real WF2 (n8n)
  // ──────────────────────────────────────────
  const handleDispararApproaches = async () => {
    // Se há leads selecionados, dispara APENAS eles (filtrando aprovados+não abordados)
    // Caso contrário, dispara todos os aprovados pendentes da página
    const hasSelection = selectedIds.size > 0

    const leadsToApproach = leads.filter((l) => {
      const isApproved = (l.status as any) === "approved" || (l.status as any) === "aprovado"
      const isPending  = !l.approached
      if (hasSelection) return selectedIds.has(l.id) && isApproved && isPending
      return isApproved && isPending
    })

    if (leadsToApproach.length === 0) {
      if (hasSelection) {
        toast.warning("Nenhum dos leads selecionados está aprovado e pendente de approach.")
      } else {
        toast.warning("Nenhum lead aprovado pendente de approach.")
      }
      return
    }

    const label = hasSelection
      ? `${leadsToApproach.length} lead(s) selecionado(s)`
      : `${leadsToApproach.length} lead(s) aprovado(s)`

    const toastId = toast.loading(`Disparando approaches para ${label} via n8n...`)

    try {
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_APPROACH!

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: leadsToApproach.map((l) => ({
            id: l.id,
            instagram_username: l.instagram_username,
            instagram_url: l.instagram_url,
            whatsapp: l.whatsapp,
          })),
          total: leadsToApproach.length,
          dispatched_at: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        const body = await response.text().catch(() => "")
        throw new Error(body || `HTTP ${response.status}`)
      }

      toast.success(`${leadsToApproach.length} approaches disparados via n8n!`, { id: toastId })
      if (hasSelection) setSelectedIds(new Set())
    } catch (error: any) {
      const errorMessage = error.message || String(error)

      if (errorMessage.includes("Fora do horário")) {
        toast.error("Approaches só podem ser enviados entre 10h–17h", { id: toastId })
      } else if (errorMessage.includes("Limite")) {
        toast.error("Limite diário de 50 approaches excedido. Tente amanhã.", { id: toastId })
      } else if (
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError") ||
        errorMessage.includes("fetch")
      ) {
        toast.error("Erro de conexão com o servidor n8n", { id: toastId })
      } else {
        toast.error(`Erro ao disparar approaches: ${errorMessage}`, { id: toastId })
      }

      console.error("[Dispatch Error]", error)
    }
  }

  // ──────────────────────────────────────────
  // Callback do modal ao mudar status
  // ──────────────────────────────────────────
  const handleStatusChange = (id: string, newStatus: LeadStatus) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
    )
    // Se o lead aprovado/rejeitado estava selecionado, remove da seleção
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  // ──────────────────────────────────────────
  // Totais de paginação
  // ──────────────────────────────────────────
  const pageStart = page * PAGE_SIZE + 1
  const pageEnd = Math.min((page + 1) * PAGE_SIZE, totalCount)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const approvedPendingCount = leads.filter(
    (l) => ((l.status as any) === "approved" || (l.status as any) === "aprovado") && !l.approached
  ).length

  // ──────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Barra de Filtros ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Busca */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="leads-search"
            placeholder="Buscar por @usuario ou nome..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              setPage(0)
            }}
            className="pl-9"
          />
        </div>

        {/* Status */}
        <Select
          value={filters.status}
          onValueChange={(v) => {
            setFilters((f) => ({ ...f, status: v as LeadStatus | "all" }))
            setPage(0)
          }}
        >
          <SelectTrigger id="leads-status-filter" className="w-[180px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="aprovado">Aprovados</SelectItem>
            <SelectItem value="rejeitado">Rejeitados</SelectItem>
            <SelectItem value="abordado">Abordados</SelectItem>
            <SelectItem value="pending">Pending (en)</SelectItem>
            <SelectItem value="approved">Approved (en)</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtro: tem WhatsApp */}
        <Button
          id="leads-filter-whatsapp"
          variant={filters.hasWhatsApp ? "default" : "outline"}
          size="sm"
          className="whitespace-nowrap"
          onClick={() => {
            setFilters((f) => ({ ...f, hasWhatsApp: !f.hasWhatsApp }))
            setPage(0)
          }}
        >
          📱 Com WhatsApp
        </Button>

        {/* Filtro: +5K seguidores */}
        <Button
          id="leads-filter-followers"
          variant={filters.minFollowers === 5000 ? "default" : "outline"}
          size="sm"
          className="whitespace-nowrap"
          onClick={() => {
            setFilters((f) => ({
              ...f,
              minFollowers: f.minFollowers === 5000 ? null : 5000,
            }))
            setPage(0)
          }}
        >
          👥 +5K seguidores
        </Button>

        {/* Refresh */}
        <Button
          id="leads-refresh"
          variant="ghost"
          size="icon"
          onClick={fetchLeads}
          disabled={loading}
          title="Atualizar"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {/* ── Barra de Ações ── */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          {/* Aprovar selecionados — só aparece se há seleção */}
          {selectedIds.size > 0 && (
            <Button
              id="btn-approve-selected"
              variant="secondary"
              size="sm"
              onClick={handleApproveSelected}
              className="gap-2"
            >
              <CheckSquare className="h-4 w-4" />
              Aprovar {selectedIds.size} selecionado
              {selectedIds.size !== 1 ? "s" : ""}
            </Button>
          )}

          {/* Disparar approaches */}
          <Button
            id="btn-disparar-approaches"
            size="sm"
            onClick={handleDispararApproaches}
            disabled={approvedPendingCount === 0}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {selectedIds.size > 0 ? "Disparar Selecionados" : "Disparar Approaches"}
            {approvedPendingCount > 0 && (
              <span className="ml-1 bg-primary-foreground/20 text-xs rounded-full px-1.5">
                {selectedIds.size > 0
                  ? leads.filter(l => selectedIds.has(l.id) && ((l.status as any) === "approved" || (l.status as any) === "aprovado") && !l.approached).length
                  : approvedPendingCount}
              </span>
            )}
          </Button>
        </div>

        {/* Contador */}
        <p className="text-sm text-muted-foreground">
          {loading ? "Carregando..." : `${totalCount} leads encontrados`}
        </p>
      </div>

      {/* ── Tabela ── */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="w-[44px] pl-4">
                  <Checkbox
                    checked={isAllSelected}
                    // indeterminate state via data attribute
                    data-state={
                      isIndeterminate
                        ? "indeterminate"
                        : isAllSelected
                        ? "checked"
                        : "unchecked"
                    }
                    onCheckedChange={handleSelectAll}
                    aria-label="Selecionar todos"
                  />
                </TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Seguidores</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scraped em</TableHead>
                <TableHead className="text-right pr-4">Ações</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                /* Skeleton rows */
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell className="pl-4">
                      <div className="h-4 w-4 bg-muted rounded" />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="h-3 w-32 bg-muted rounded" />
                        <div className="h-3 w-24 bg-muted/50 rounded" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-3 w-12 bg-muted rounded" />
                    </TableCell>
                    <TableCell>
                      <div className="h-3 w-28 bg-muted rounded" />
                    </TableCell>
                    <TableCell>
                      <div className="h-5 w-20 bg-muted rounded-full" />
                    </TableCell>
                    <TableCell>
                      <div className="h-3 w-20 bg-muted rounded" />
                    </TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-muted-foreground"
                  >
                    Nenhum lead encontrado com os filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => {
                  const statusCfg = getStatusConfig(lead.status)
                  const isSelected = selectedIds.has(lead.id)

                  return (
                    <TableRow
                      key={lead.id}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isSelected && "bg-primary/5 hover:bg-primary/10"
                      )}
                      onClick={() => setModalLead(lead)}
                    >
                      {/* Checkbox — para a propagação do click */}
                      <TableCell
                        className="pl-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(c) =>
                            handleSelectOne(lead.id, c as boolean)
                          }
                          aria-label={`Selecionar @${lead.instagram_username}`}
                        />
                      </TableCell>

                      {/* Perfil */}
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            @{lead.instagram_username}
                          </p>
                          {lead.full_name && (
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                              {lead.full_name}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Seguidores */}
                      <TableCell className="text-sm font-medium">
                        {formatFollowers(lead.followers_count)}
                      </TableCell>

                      {/* WhatsApp */}
                      <TableCell className="text-sm text-muted-foreground">
                        {formatWhatsApp(lead.whatsapp)}
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-xs font-medium border",
                            statusCfg.className
                          )}
                        >
                          {statusCfg.label}
                        </Badge>
                      </TableCell>

                      {/* Scraped em */}
                      <TableCell className="text-xs text-muted-foreground">
                        {lead.scraped_at
                          ? new Date(lead.scraped_at).toLocaleDateString(
                              "pt-BR"
                            )
                          : "—"}
                      </TableCell>

                      {/* Ação */}
                      <TableCell
                        className="text-right pr-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => setModalLead(lead)}
                        >
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Paginação ── */}
      {totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Mostrando {pageStart}–{pageEnd} de {totalCount} resultados
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="text-xs">
              Página {page + 1} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Modal de Detalhes ── */}
      <LeadDetailsModal
        lead={modalLead}
        open={!!modalLead}
        onClose={() => setModalLead(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}
