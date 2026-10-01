"use client"

import { createContext, useContext, useState, useMemo, useEffect, ReactNode } from "react"
import { usePathname } from "next/navigation"
import { Cliente } from "@/types/cliente"
import { supabase } from "@/lib/supabase"

const URL_PARAM = "cliente"

interface ClienteContextType {
  clienteSelecionado: Cliente | null
  setClienteSelecionado: (cliente: Cliente | null) => void
  restaurandoCliente: boolean
}

const ClienteContext = createContext<ClienteContextType | undefined>(undefined)

export function ClienteProvider({ children }: { children: ReactNode }) {
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [restored, setRestored] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const contaId = new URLSearchParams(window.location.search).get(URL_PARAM)
    if (!contaId) {
      setRestored(true)
      return
    }
    supabase
      .from("contas_ativas")
      .select("conta_id, conta_nome")
      .eq("conta_id", contaId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setClienteSelecionado({ conta_id: data.conta_id, conta_nome: data.conta_nome })
        setRestored(true)
      })
  }, [])

  // Mantém ?cliente= na URL em toda navegação; só começa após restaurar, senão apagaria o param no primeiro render.
  useEffect(() => {
    if (!restored) return
    const url = new URL(window.location.href)
    const atual = url.searchParams.get(URL_PARAM)
    const desejado = clienteSelecionado?.conta_id ?? null
    if (atual === desejado) return
    if (desejado) url.searchParams.set(URL_PARAM, desejado)
    else url.searchParams.delete(URL_PARAM)
    window.history.replaceState(window.history.state, "", url.toString())
  }, [clienteSelecionado, pathname, restored])

  const value = useMemo(
    () => ({ clienteSelecionado, setClienteSelecionado, restaurandoCliente: !restored }),
    [clienteSelecionado, restored]
  )

  return (
    <ClienteContext.Provider value={value}>
      {children}
    </ClienteContext.Provider>
  )
}

export function useCliente() {
  const ctx = useContext(ClienteContext)
  if (!ctx) throw new Error("useCliente must be used within ClienteProvider")
  return ctx
}
