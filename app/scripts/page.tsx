import { AgentScriptsEditor } from "@/components/agent-scripts/agent-scripts-editor"
import { Bot } from "lucide-react"

export default function ScriptsPage() {
  return (
    <div className="flex-1 space-y-6 p-6 pt-6 max-w-4xl">
      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Comercial · Scripts do Agente
          </h1>
        </div>
        <p className="text-xs text-muted-foreground/60 pl-6">
          Gerencie os roteiros usados pelo agente de IA nas abordagens via WhatsApp.
        </p>
      </div>

      {/* ── Editor ── */}
      <AgentScriptsEditor />
    </div>
  )
}
