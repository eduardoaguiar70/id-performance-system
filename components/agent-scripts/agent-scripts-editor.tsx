"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { AgentScript } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"
import {
  Save,
  Loader2,
  AlertTriangle,
  Clock,
  Bot,
  FileText,
} from "lucide-react"

// ──────────────────────────────────────────
// Script card with inline editing
// ──────────────────────────────────────────
function ScriptCard({ script }: { script: AgentScript }) {
  const [content, setContent] = useState(script.content)
  const [saving, setSaving] = useState(false)
  const isDirty = content !== script.content

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from("agent_scripts")
        .update({ content })
        .eq("id", script.id)

      if (error) throw error

      toast.success(`Script "${script.label}" salvo com sucesso!`)
      // Sync local baseline so isDirty resets
      script.content = content
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido"
      toast.error(`Erro ao salvar "${script.label}": ${msg}`)
      console.error("[AgentScriptsEditor] save error:", err)
    } finally {
      setSaving(false)
    }
  }, [content, script])

  return (
    <div
      className={`
        relative flex flex-col border bg-card transition-colors duration-200
        ${isDirty ? "border-primary/50" : "border-border/50 hover:border-border"}
      `}
    >
      {/* Dirty indicator strip */}
      {isDirty && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
      )}

      {/* Card header */}
      <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex-shrink-0 w-8 h-8 bg-primary/10 border border-primary/20 flex items-center justify-center mt-0.5">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight uppercase text-foreground leading-tight">
              {script.label}
            </h2>
            <div className="flex items-center gap-1.5 mt-1">
              <Clock className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
              <p className="text-[11px] text-muted-foreground/60">
                {script.updated_at
                  ? `Atualizado em ${formatDate(script.updated_at)}`
                  : "Nunca salvo"}
              </p>
            </div>
          </div>
        </div>

        {/* Save button */}
        <button
          id={`btn-save-script-${script.id}`}
          onClick={handleSave}
          disabled={saving || !isDirty}
          className={`
            group relative flex-shrink-0 flex items-center gap-2 px-5 py-2
            text-xs font-bold uppercase tracking-widest
            transition-all duration-200 overflow-hidden
            disabled:cursor-not-allowed
            ${isDirty && !saving
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted/40 text-muted-foreground/50 border border-border/40"
            }
          `}
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin relative z-10" />
          ) : (
            <Save className="w-3.5 h-3.5 relative z-10 group-hover:scale-110 transition-transform" />
          )}
          <span className="relative z-10">
            {saving ? "Salvando..." : "Salvar"}
          </span>
          {/* Hover shine */}
          {isDirty && !saving && (
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          )}
        </button>
      </div>

      {/* Textarea */}
      <div className="px-6 pb-6">
        <textarea
          id={`script-content-${script.id}`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          spellCheck={false}
          className={`
            w-full resize-y bg-background border px-4 py-3
            text-sm text-foreground leading-relaxed font-mono
            outline-none transition-colors duration-150
            placeholder:text-muted-foreground/30
            ${isDirty
              ? "border-primary/40 focus:border-primary"
              : "border-border focus:border-primary/60"
            }
          `}
          placeholder="Conteúdo do script..."
        />
        {isDirty && (
          <p className="text-[11px] text-primary/70 mt-1.5 font-medium">
            ● Alterações não salvas
          </p>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────
// Main editor component
// ──────────────────────────────────────────
export function AgentScriptsEditor() {
  const [scripts, setScripts] = useState<AgentScript[]>([])
  const [loading, setLoading] = useState(true)

  const fetchScripts = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("agent_scripts")
        .select("id, script_key, label, content, updated_at, updated_by")
        .order("label", { ascending: true })

      if (error) throw error
      setScripts((data as AgentScript[]) ?? [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido"
      toast.error(`Erro ao carregar scripts: ${msg}`)
      console.error("[AgentScriptsEditor] fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchScripts()
  }, [fetchScripts])

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  // ── Empty ──
  if (scripts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <FileText className="w-10 h-10 text-muted-foreground/30" />
        <p className="text-muted-foreground text-sm">
          Nenhum script encontrado na tabela{" "}
          <span className="font-mono text-xs bg-muted px-1.5 py-0.5">agent_scripts</span>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Warning banner */}
      <div className="flex items-start gap-3 border border-orange-500/30 bg-orange-500/5 px-5 py-4">
        <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-orange-300">
            Alterações entram em vigor imediatamente
          </p>
          <p className="text-xs text-orange-300/70 mt-0.5 leading-relaxed">
            Qualquer edição salva aqui afeta diretamente as próximas respostas do agente de IA{" "}
            <strong className="text-orange-300">Matheus</strong> no WhatsApp, em tempo real.
            Revise com atenção antes de salvar.
          </p>
        </div>
      </div>

      {/* Agent info strip */}
      <div className="flex items-center gap-3 border border-border/40 bg-card/60 px-5 py-3">
        <Bot className="w-4 h-4 text-primary flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Agente ativo:{" "}
          <span className="font-semibold text-foreground">Matheus · ID Performance</span>
          {" · "}
          <span className="font-mono text-primary/80">WhatsApp SDR</span>
        </p>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-green-400 font-semibold uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Ativo
        </span>
      </div>

      {/* Script cards */}
      <div className="space-y-4">
        {scripts.map((script) => (
          <ScriptCard key={script.id} script={script} />
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground/40 text-right pt-2">
        {scripts.length} script{scripts.length !== 1 ? "s" : ""} carregado{scripts.length !== 1 ? "s" : ""}
      </p>
    </div>
  )
}
