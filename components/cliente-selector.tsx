"use client"

import { useEffect, useState } from "react"
import { Building2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useCliente } from "@/context/ClienteContext"
import { Cliente } from "@/types/cliente"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

export function ClienteSelector() {
  const { clienteSelecionado, setClienteSelecionado } = useCliente()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchClientes() {
      try {
        const { data, error } = await supabase
          .from("contas_ativas")
          .select("conta_id, conta_nome")
          .eq("ativo", true)
          .order("conta_nome", { ascending: true })

        if (error) throw error

        setClientes(data || [])
      } catch (err) {
        console.error("Erro ao buscar clientes:", err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchClientes()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <Skeleton className="h-9 w-[160px]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <Building2 className="h-4 w-4" />
        <span>Erro ao carregar</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={clienteSelecionado?.conta_id || ""}
        onValueChange={(value) => {
          const cliente = clientes.find((c) => c.conta_id === value)
          setClienteSelecionado(cliente || null)
        }}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Selecionar cliente..." />
        </SelectTrigger>
        <SelectContent>
          {clientes.map((cliente) => (
            <SelectItem key={cliente.conta_id} value={cliente.conta_id}>
              {cliente.conta_nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
