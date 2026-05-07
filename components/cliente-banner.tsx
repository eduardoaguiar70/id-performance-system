"use client"

import { X } from "lucide-react"
import { useCliente } from "@/context/ClienteContext"

export function ClienteBanner() {
  const { clienteSelecionado, setClienteSelecionado } = useCliente()

  if (!clienteSelecionado) return null

  return (
    <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-sm">
      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
      <span className="text-muted-foreground">Visualizando:</span>
      <span className="font-medium">{clienteSelecionado.conta_nome}</span>
      <button 
        onClick={() => setClienteSelecionado(null)} 
        className="ml-auto text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
