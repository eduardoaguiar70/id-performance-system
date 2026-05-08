"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export type TarefaStatus = "Pendente" | "Em Andamento" | "Concluído"

export type Tarefa = {
  id: number
  titulo: string
  responsavel: string | null
  prazo: string | null
  status: TarefaStatus
  origem?: "notion" | "frontend" | null
  notion_id?: string | null
  created_at?: string
  updated_at?: string
  criado_em?: string
  atualizado_em?: string
  [key: string]: unknown
}

export function useTarefas() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const fetchTarefas = async () => {
      setLoading(true)
      setErro(null)

      const { data, error } = await supabase
        .from("tarefas")
        .select("*")
        .order("id", { ascending: false })

      if (error) {
        console.error("[useTarefas] Erro ao buscar tarefas:", error)
        setErro(error.message)
      } else {
        console.log("[useTarefas] Tarefas recebidas:", data)
        setTarefas((data as Tarefa[]) ?? [])
      }

      setLoading(false)
    }

    fetchTarefas()

    const channel = supabase
      .channel("tarefas-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tarefas" },
        (payload) => {
          setTarefas((prev) => [payload.new as Tarefa, ...prev])
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tarefas" },
        (payload) => {
          setTarefas((prev) =>
            prev.map((t) =>
              t.id === (payload.new as Tarefa).id ? (payload.new as Tarefa) : t
            )
          )
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "tarefas" },
        (payload) => {
          setTarefas((prev) =>
            prev.filter((t) => t.id !== (payload.old as { id: number }).id)
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const updateTarefa = (id: number, updates: Partial<Tarefa>) => {
    setTarefas((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }

  return { tarefas, loading, erro, updateTarefa }
}
