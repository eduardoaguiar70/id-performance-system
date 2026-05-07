/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useMemo } from "react"
import { AlertTriangle, Clock, CheckSquare, ArrowRight, CalendarDays } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { format, isAfter, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Props {
  meetings: any[]
  tasks: any
  loading: boolean
  clienteSelecionado: any | null
}

interface FocusItem {
  type: "task" | "action_item"
  label: string
  meta?: string
  urgency: "urgent" | "overdue" | "normal"
  source?: string
}

export function FocusWidget({ meetings, tasks, loading, clienteSelecionado }: Props) {
  const focusItems = useMemo<FocusItem[]>(() => {
    const items: FocusItem[] = []

    // Urgent/overdue tasks from task_snapshots
    if (tasks?.tarefas && Array.isArray(tasks.tarefas)) {
      const tarefaList = tasks.tarefas as any[]
      const now = new Date()

      const filtered = tarefaList
        .filter((t: any) => {
          if (!clienteSelecionado) return true
          return t.cliente === clienteSelecionado.conta_nome ||
                 t.conta_nome === clienteSelecionado.conta_nome
        })
        .filter((t: any) => {
          if (t.status === "Concluída") return false
          const isUrgent = t.prioridade === "Urgente" ||
                           t.status === "Urgente" || t.status === "urgent"
          const isOverdue = t.due_date && isAfter(now, parseISO(t.due_date))
          return isUrgent || isOverdue
        })
        .slice(0, 4)

      for (const t of filtered) {
        const isOverdue = t.due_date && isAfter(now, parseISO(t.due_date))
        items.push({
          type: "task",
          label: t.titulo || t.title || t.nome || "Tarefa sem título",
          meta: t.due_date
            ? `Vence ${format(parseISO(t.due_date), "dd MMM", { locale: ptBR })}`
            : undefined,
          urgency: isOverdue ? "overdue" : "urgent",
          source: t.cliente || t.conta_nome,
        })
      }
    }

    // Action items from recent meetings
    const recentMeetings = meetings
      .filter((m: any) => {
        if (!clienteSelecionado) return true
        return m.cliente === clienteSelecionado.conta_nome ||
               m.conta_nome === clienteSelecionado.conta_nome
      })
      .slice(0, 3)

    for (const meeting of recentMeetings) {
      const actionItems: string[] = []

      if (Array.isArray(meeting.action_items)) {
        actionItems.push(...meeting.action_items.slice(0, 2))
      } else if (typeof meeting.action_items === "string") {
        try {
          const parsed = JSON.parse(meeting.action_items)
          if (Array.isArray(parsed)) actionItems.push(...parsed.slice(0, 2))
        } catch { /* empty */ }
      }

      for (const action of actionItems) {
        if (items.length >= 6) break
        items.push({
          type: "action_item",
          label: typeof action === "string" ? action : action,
          urgency: "normal",
          source: meeting.cliente || meeting.titulo || "Reunião",
        })
      }
    }

    return items.slice(0, 6)
  }, [meetings, tasks, clienteSelecionado])

  const urgencyConfig = {
    overdue: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", icon: AlertTriangle, label: "Vencida" },
    urgent:  { color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30", icon: Clock, label: "Urgente" },
    normal:  { color: "text-muted-foreground", bg: "bg-muted/30 border-border", icon: CheckSquare, label: "Action" },
  }

  return (
    <div className="border border-border bg-card" style={{ borderRadius: "2px" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
          <span className="text-xs font-semibold uppercase tracking-widest text-foreground">
            Meu Foco Hoje
          </span>
        </div>
        <Link href="/tarefas">
          <button className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 cursor-pointer">
            Ver todas <ArrowRight className="h-2.5 w-2.5" />
          </button>
        </Link>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" style={{ borderRadius: "2px" }} />
          ))
        ) : focusItems.length === 0 ? (
          <div className="py-6 flex flex-col items-center gap-2 text-muted-foreground">
            <CheckSquare className="h-6 w-6 opacity-30" />
            <p className="text-xs text-center">Nenhuma tarefa urgente.<br />Está tudo em dia.</p>
          </div>
        ) : (
          focusItems.map((item, i) => {
            const cfg = urgencyConfig[item.urgency]
            const Icon = cfg.icon
            return (
              <div
                key={i}
                className={`flex items-start gap-2.5 px-3 py-2.5 border ${cfg.bg} transition-all duration-150 hover:border-primary/30 cursor-default`}
                style={{ borderRadius: "2px" }}
              >
                <Icon className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                    {item.label}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.source && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                        {item.source}
                      </span>
                    )}
                    {item.meta && (
                      <span className={`text-[10px] ${cfg.color} flex items-center gap-1`}>
                        <CalendarDays className="h-2.5 w-2.5" />
                        {item.meta}
                      </span>
                    )}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0 flex-shrink-0 border-0 ${cfg.color}`}
                  style={{ background: "transparent" }}
                >
                  {item.type === "action_item" ? "Reunião" : cfg.label}
                </Badge>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
