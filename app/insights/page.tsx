"use client"

import { useState, useRef, useEffect } from "react"
import { useCliente } from "@/context/ClienteContext"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Sparkles, Zap, BarChart2, Users, CalendarDays, RefreshCw } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Mensagem {
  role: "user" | "assistant"
  conteudo: string
  timestamp: Date
}

const QUICK_PROMPTS = [
  { icon: BarChart2, label: "Resumo de KPIs", prompt: "Me dê um resumo dos principais KPIs da agência esta semana." },
  { icon: Users,     label: "Clientes ativos", prompt: "Quais são os nossos clientes ativos atualmente?" },
  { icon: CalendarDays, label: "Reuniões recentes", prompt: "Quais reuniões aconteceram nos últimos 7 dias?" },
  { icon: Zap,       label: "Alertas críticos", prompt: "Existe alguma campanha com performance crítica que precise de atenção agora?" },
]

export default function InsightsPage() {
  const { clienteSelecionado } = useCliente()
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [input, setInput] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [conversaId, setConversaId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [mensagens, enviando])

  // Saudação dinâmica ao trocar de cliente
  useEffect(() => {
    setConversaId(null)
    const greet: Mensagem = {
      role: "assistant",
      timestamp: new Date(),
      conteudo: clienteSelecionado
        ? `Olá! Sou o Assistente da ID Performance. Estou focado em **${clienteSelecionado.conta_nome}**, mas posso consultar outras contas se precisar. O que vamos analisar hoje?`
        : "Olá! Sou o Assistente Geral da ID Performance. Tenho acesso aos KPIs, Reuniões e Tarefas de **toda a agência**. Como posso te ajudar a escalar resultados hoje?",
    }
    setMensagens([greet])
  }, [clienteSelecionado])

  const enviarMensagem = async (texto?: string) => {
    const conteudo = (texto ?? input).trim()
    if (!conteudo || enviando) return

    const novaMensagem: Mensagem = { role: "user", conteudo, timestamp: new Date() }
    setMensagens(prev => [...prev, novaMensagem])
    setInput("")
    setEnviando(true)
    textareaRef.current?.focus()

    try {
      const res = await fetch("https://n8n-n8n-start.kfocge.easypanel.host/webhook/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id:  clienteSelecionado?.conta_id || null,
          conversa_id: conversaId,
          mensagem:    conteudo,
          usuario:     "analista@idperformance.com.br"
        })
      })

      const data = await res.json()

      if (data.status === "ok") {
        if (!conversaId && data.conversa_id) setConversaId(data.conversa_id)
        setMensagens(prev => [...prev, { role: "assistant", conteudo: data.resposta, timestamp: new Date() }])
      } else {
        setMensagens(prev => [...prev, {
          role: "assistant",
          conteudo: "Ocorreu um erro ao processar sua mensagem. Tente novamente.",
          timestamp: new Date()
        }])
      }
    } catch {
      setMensagens(prev => [...prev, {
        role: "assistant",
        conteudo: "Não foi possível conectar ao agente. Verifique sua conexão.",
        timestamp: new Date()
      }])
    } finally {
      setEnviando(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      enviarMensagem()
    }
  }

  const handleReset = () => {
    setConversaId(null)
    const greet: Mensagem = {
      role: "assistant",
      timestamp: new Date(),
      conteudo: clienteSelecionado
        ? `Conversa reiniciada! Estou focado em **${clienteSelecionado.conta_nome}**. O que mais posso analisar?`
        : "Conversa reiniciada! Sou o Assistente Geral da ID Performance. Como posso ajudar?",
    }
    setMensagens([greet])
    setInput("")
  }

  const showQuickPrompts = mensagens.length <= 1

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]" style={{ background: "hsl(var(--background))" }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-6 py-4 border-b flex items-center justify-between"
        style={{
          background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          {/* Animated AI orb */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" style={{ animationDuration: "2.5s" }} />
            <div
              className="relative h-10 w-10 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, #7c3aed 100%)" }}
            >
              <Sparkles className="h-5 w-5 text-white" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">Assistente IA</h2>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                style={{ background: "hsl(var(--primary)/0.15)", color: "hsl(var(--primary))" }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                Online
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {clienteSelecionado
                ? <>Focado em <span className="font-semibold text-foreground">{clienteSelecionado.conta_nome}</span> · acesso à agência completa</>
                : "Acesso à agência completa — KPIs, Reuniões e Tarefas"}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-muted-foreground hover:text-foreground gap-2 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Nova conversa
        </Button>
      </div>

      {/* ── Messages area ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scroll-smooth">

        {mensagens.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
              msg.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            {/* Avatar */}
            {msg.role === "assistant" ? (
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-md mt-1"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, #7c3aed 100%)" }}
              >
                <Sparkles className="h-4 w-4 text-white" />
              </div>
            ) : (
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-md mt-1"
                style={{ background: "linear-gradient(135deg, #374151 0%, #1f2937 100%)", color: "#d1d5db" }}
              >
                JD
              </div>
            )}

            {/* Bubble */}
            <div className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"} max-w-[75%]`}>
              <div
                className={`px-4 py-3 text-sm shadow-sm ${
                  msg.role === "assistant"
                    ? "rounded-2xl rounded-tl-none prose prose-sm dark:prose-invert max-w-none"
                    : "rounded-2xl rounded-tr-none text-white"
                }`}
                style={
                  msg.role === "assistant"
                    ? {
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                      }
                    : {
                        background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.85) 100%)",
                      }
                }
              >
                {msg.role === "assistant"
                  ? <ReactMarkdown>{msg.conteudo}</ReactMarkdown>
                  : msg.conteudo
                }
              </div>
              {/* Timestamp */}
              <span className="text-[10px] text-muted-foreground px-1">
                {format(msg.timestamp, "HH:mm", { locale: ptBR })}
              </span>
            </div>
          </div>
        ))}

        {/* ── Typing indicator ── */}
        {enviando && (
          <div className="flex gap-3 animate-in fade-in duration-300">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-md"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, #7c3aed 100%)" }}
            >
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div
              className="rounded-2xl rounded-tl-none px-5 py-4 shadow-sm"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
            >
              <div className="flex gap-1.5 items-center">
                {[0, 150, 300].map(delay => (
                  <span
                    key={delay}
                    className="h-2 w-2 rounded-full animate-bounce"
                    style={{
                      animationDelay: `${delay}ms`,
                      background: "hsl(var(--primary))",
                      opacity: 0.7,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Quick prompts (shown only at start) ── */}
        {showQuickPrompts && !enviando && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">Sugestões rápidas</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_PROMPTS.map(({ icon: Icon, label, prompt }) => (
                <button
                  key={label}
                  onClick={() => enviarMensagem(prompt)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group"
                  style={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(var(--primary)/0.5)"
                    ;(e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--primary)/0.05)"
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(var(--border))"
                    ;(e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--card))"
                  }}
                >
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "hsl(var(--primary)/0.1)" }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: "hsl(var(--primary))" }} />
                  </div>
                  <span className="text-foreground/80 group-hover:text-foreground transition-colors">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ──────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-6 py-4 border-t"
        style={{ background: "hsl(var(--card)/0.6)", backdropFilter: "blur(12px)" }}
      >
        <div
          className="flex gap-3 items-end rounded-2xl px-4 py-3 transition-all duration-200"
          style={{
            background: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            boxShadow: "0 2px 8px hsl(var(--primary)/0.08)",
          }}
          onFocus={e => (e.currentTarget.style.borderColor = "hsl(var(--primary)/0.5)")}
          onBlur={e => (e.currentTarget.style.borderColor = "hsl(var(--border))")}
        >
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              clienteSelecionado
                ? `Pergunte sobre ${clienteSelecionado.conta_nome}...`
                : "Pergunte sobre qualquer cliente ou sobre a agência..."
            }
            className="resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 min-h-[24px] max-h-[140px] text-sm placeholder:text-muted-foreground/60 leading-relaxed"
            rows={1}
            disabled={enviando}
          />
          <Button
            onClick={() => enviarMensagem()}
            disabled={enviando || !input.trim()}
            size="icon"
            className="h-8 w-8 flex-shrink-0 rounded-xl transition-all duration-200 disabled:opacity-30"
            style={{
              background: input.trim() && !enviando
                ? "linear-gradient(135deg, hsl(var(--primary)) 0%, #7c3aed 100%)"
                : undefined,
            }}
          >
            {enviando
              ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              : <Send className="h-3.5 w-3.5" />
            }
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </div>
    </div>
  )
}
