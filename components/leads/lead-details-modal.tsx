"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lead, LeadStatus } from "@/lib/types"
import { formatFollowers, formatWhatsApp, formatDate } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import {
  ExternalLink,
  Phone,
  Users,
  Calendar,
  AtSign,
  Link2,
  Info,
} from "lucide-react"

// STATUS_CONFIG aceita tanto valores em inglês quanto em português
// (o banco usa 'pendente', 'aprovado', etc.)
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  // Português (valores reais do banco)
  pendente: {
    label: "Pendente",
    className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  },
  aprovado: {
    label: "Aprovado",
    className: "bg-green-500/10 text-green-400 border-green-500/20",
  },
  rejeitado: {
    label: "Rejeitado",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  abordado: {
    label: "Abordado",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  // Inglês (compatibilidade)
  pending: {
    label: "Pendente",
    className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  },
  approved: {
    label: "Aprovado",
    className: "bg-green-500/10 text-green-400 border-green-500/20",
  },
  rejected: {
    label: "Rejeitado",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  approached: {
    label: "Abordado",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  error: {
    label: "Erro Inválido",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  erro: {
    label: "Erro Inválido",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
}

// Fallback para status desconhecido
const DEFAULT_STATUS_CONFIG = {
  label: "Desconhecido",
  className: "bg-muted text-muted-foreground border-border",
}

/** Retorna a configuração de exibição do status, com fallback seguro */
function getStatusConfig(status: string) {
  return STATUS_CONFIG[status?.toLowerCase()] ?? DEFAULT_STATUS_CONFIG
}

interface LeadDetailsModalProps {
  lead: Lead | null
  open: boolean
  onClose: () => void
  onStatusChange: (id: string, status: LeadStatus) => void
}

export function LeadDetailsModal({
  lead,
  open,
  onClose,
  onStatusChange,
}: LeadDetailsModalProps) {
  const [loading, setLoading] = useState<"approving" | "rejecting" | null>(null)

  if (!lead) return null

  const statusCfg = getStatusConfig(lead.status)

  // ── Aprovar lead direto do modal ──
  const handleApprove = async () => {
    setLoading("approving")
    const { error } = await supabase
      .from("leads")
      .update({
        status: "approved",
        selected: true,
        selected_at: new Date().toISOString(),
      })
      .eq("id", lead.id)

    if (error) {
      toast.error("Erro ao aprovar lead.")
    } else {
      toast.success(`@${lead.instagram_username} aprovado!`)
      onStatusChange(lead.id, "approved")
    }
    setLoading(null)
  }

  // ── Rejeitar lead direto do modal ──
  const handleReject = async () => {
    setLoading("rejecting")
    const { error } = await supabase
      .from("leads")
      .update({ status: "rejected" })
      .eq("id", lead.id)

    if (error) {
      toast.error("Erro ao rejeitar lead.")
    } else {
      toast.success(`@${lead.instagram_username} rejeitado.`)
      onStatusChange(lead.id, "rejected")
    }
    setLoading(null)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AtSign className="h-5 w-5 text-primary" />
            Detalhes do Lead
          </DialogTitle>
        </DialogHeader>

        {/* ── Avatar + Nome ── */}
        <div className="flex items-center gap-4 mt-2">
          {/* Avatar placeholder */}
          <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <AtSign className="h-8 w-8 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={lead.instagram_url}
                target="_blank"
                rel="noreferrer"
                className="text-lg font-bold text-primary hover:underline flex items-center gap-1"
              >
                @{lead.instagram_username}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <Badge className={`text-xs ${statusCfg.className}`}>
                {statusCfg.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {lead.full_name || "—"}
            </p>
          </div>
        </div>

        {/* ── Grid de Info ── */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          {/* Seguidores */}
          <div className="rounded-lg bg-muted/40 p-3 flex items-center gap-3">
            <Users className="h-4 w-4 text-primary flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Seguidores</p>
              <p className="text-sm font-semibold">
                {formatFollowers(lead.followers_count)}
              </p>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="rounded-lg bg-muted/40 p-3 flex items-center gap-3">
            <Phone className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                WhatsApp
                {lead.whatsapp_source ? (
                  <span className="ml-1 text-muted-foreground/60">
                    ({lead.whatsapp_source})
                  </span>
                ) : null}
              </p>
              <p className="text-sm font-semibold truncate">
                {formatWhatsApp(lead.whatsapp)}
              </p>
            </div>
          </div>

          {/* Scraped em */}
          <div className="rounded-lg bg-muted/40 p-3 flex items-center gap-3">
            <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Scraped em</p>
              <p className="text-sm font-semibold">
                {formatDate(lead.scraped_at)}
              </p>
            </div>
          </div>

          {/* Link Externo */}
          {lead.external_url ? (
            <div className="rounded-lg bg-muted/40 p-3 flex items-center gap-3">
              <Link2 className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Link externo</p>
                <a
                  href={lead.external_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-primary hover:underline truncate block"
                >
                  {lead.external_url.replace(/^https?:\/\//, "")}
                </a>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-muted/40 p-3 flex items-center gap-3 opacity-50">
              <Link2 className="h-4 w-4 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Link externo</p>
                <p className="text-sm">—</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Bio ── */}
        {lead.bio && (
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Bio</p>
            </div>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {lead.bio}
            </p>
          </div>
        )}

        {/* ── Ações ── */}
        <div className="flex gap-2 pt-2 border-t border-border">
          {lead.status !== "approved" && lead.status !== "approached" && (
            <Button
              className="flex-1"
              onClick={handleApprove}
              disabled={!!loading}
            >
              {loading === "approving" ? "Aprovando..." : "✓ Aprovar"}
            </Button>
          )}
          {lead.status !== "rejected" && lead.status !== "approached" && (
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleReject}
              disabled={!!loading}
            >
              {loading === "rejecting" ? "Rejeitando..." : "✗ Rejeitar"}
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={!!loading}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Exporta STATUS_CONFIG e getStatusConfig para reuso na tabela
export { STATUS_CONFIG, getStatusConfig }
