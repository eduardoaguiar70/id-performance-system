/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Sparkles, ChevronDown, ChevronUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import ReactMarkdown from "react-markdown"

interface Props {
  clienteSelecionado: any | null
}

interface AIMessage {
  role: "user" | "assistant"
  content: string
}

export function SpotlightSearch({ clienteSelecionado }: Props) {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [expanded, setExpanded] = useState(false)
  const [conversaId, setConversaId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const hasMessages = messages.length > 0

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim() || loading) return

    const userMsg = query.trim()
    setQuery("")
    setLoading(true)
    setExpanded(true)
    setMessages(prev => [...prev, { role: "user", content: userMsg }])

    try {
      const res = await fetch("https://n8n-n8n-start.kfocge.easypanel.host/webhook/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: clienteSelecionado?.conta_id || null,
          conversa_id: conversaId,
          mensagem: userMsg,
          usuario: "analista@idperformance.com.br",
        }),
      })
      const data = await res.json()
      if (data.status === "ok") {
        if (!conversaId && data.conversa_id) setConversaId(data.conversa_id)
        setMessages(prev => [...prev, { role: "assistant", content: data.resposta }])
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "Erro ao processar. Tente novamente." }])
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Não foi possível conectar ao agente." }])
    } finally {
      setLoading(false)
    }
  }, [query, loading, conversaId, clienteSelecionado])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === "Escape") {
      setExpanded(false)
    }
  }

  const handleClear = () => {
    setMessages([])
    setConversaId(null)
    setExpanded(false)
    setQuery("")
    inputRef.current?.focus()
  }

  return (
    <div
      className="w-full border border-border bg-card transition-all duration-300"
      style={{ borderRadius: "4px" }}
    >
      {/* Input row */}
      <form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 py-3">
        <Sparkles
          className="h-4 w-4 flex-shrink-0 transition-colors"
          style={{ color: loading ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            clienteSelecionado
              ? `Pergunte à IA sobre ${clienteSelecionado.conta_nome}, campanhas ou tarefas...`
              : "Pergunte à IA sobre campanhas, tarefas ou clientes..."
          }
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none font-mono"
          disabled={loading}
          autoComplete="off"
        />
        <div className="flex items-center gap-1">
          {hasMessages && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleClear}
              title="Limpar conversa"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          {hasMessages && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded(v => !v)}
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          )}
          <Button
            type="submit"
            size="icon"
            className="h-7 w-7 flex-shrink-0"
            disabled={!query.trim() || loading}
            style={{ borderRadius: "2px" }}
          >
            {loading ? (
              <span className="flex gap-0.5">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="h-1 w-1 rounded-full bg-primary-foreground animate-bounce"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </span>
            ) : (
              <Send className="h-3 w-3" />
            )}
          </Button>
        </div>
      </form>

      {/* Response area */}
      {expanded && hasMessages && (
        <div
          className="border-t border-border px-4 py-3 max-h-72 overflow-y-auto space-y-3"
          style={{ background: "hsl(var(--background))" }}
        >
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div
                  className="h-5 w-5 rounded-sm flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{ background: "hsl(var(--primary)/0.15)" }}
                >
                  <Sparkles className="h-3 w-3 text-primary" />
                </div>
              )}
              <div
                className={`text-xs max-w-[85%] px-3 py-2 ${
                  msg.role === "user"
                    ? "text-primary-foreground"
                    : "text-foreground prose prose-sm dark:prose-invert max-w-none"
                }`}
                style={{
                  background: msg.role === "user" ? "hsl(var(--primary))" : "hsl(var(--card))",
                  border: msg.role === "assistant" ? "1px solid hsl(var(--border))" : "none",
                  borderRadius: "2px",
                }}
              >
                {msg.role === "assistant"
                  ? <ReactMarkdown>{msg.content}</ReactMarkdown>
                  : msg.content
                }
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="h-5 w-5 rounded-sm bg-primary/15 flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-primary" />
              </div>
              <div className="flex gap-1 items-center px-3 py-2 border border-border" style={{ borderRadius: "2px" }}>
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
