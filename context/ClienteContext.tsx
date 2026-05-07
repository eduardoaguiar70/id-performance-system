"use client"

import { createContext, useContext, useState, ReactNode } from "react"
import { Cliente } from "@/types/cliente"

interface ClienteContextType {
  clienteSelecionado: Cliente | null
  setClienteSelecionado: (cliente: Cliente | null) => void
}

const ClienteContext = createContext<ClienteContextType | undefined>(undefined)

export function ClienteProvider({ children }: { children: ReactNode }) {
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)

  return (
    <ClienteContext.Provider value={{ clienteSelecionado, setClienteSelecionado }}>
      {children}
    </ClienteContext.Provider>
  )
}

export function useCliente() {
  const ctx = useContext(ClienteContext)
  if (!ctx) throw new Error("useCliente must be used within ClienteProvider")
  return ctx
}
