/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSupabase } from "@/hooks/useSupabase"
import {
  Play, RefreshCw, CheckCircle2, XCircle,
  Clock, Loader2, Terminal, ScanSearch,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const WEBHOOK    = "https://n8n-n8n.aqzjch.easypanel.host/webhook/executar-scraper"
const POLL_MS    = 8_000
const TIMEOUT_MS = 10 * 60 * 1_000  // 10 minutos

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------
type StatusKey = "em_andamento" | "sucesso" | "erro" | "erro_timeout"

const STATUS_CFG: Record<StatusKey, {
  label: string
  Icon: React.ElementType
  spin: boolean
  badge: string
  row: string
}> = {
  em_andamento: {
    label: "Em andamento",
    Icon: Loader2,
    spin: true,
    badge: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
    row: "border-l-2 border-l-yellow-500/40",
  },
  sucesso: {
    label: "Sucesso",
    Icon: CheckCircle2,
    spin: false,
    badge: "border-primary/40 bg-primary/10 text-primary",
    row: "border-l-2 border-l-primary/40",
  },
  erro: {
    label: "Erro",
    Icon: XCircle,
    spin: false,
    badge: "border-red-500/40 bg-red-500/10 text-red-400",
    row: "border-l-2 border-l-red-500/40",
  },
  erro_timeout: {
    label: "Erro (Timeout)",
    Icon: XCircle,
    spin: false,
    badge: "border-red-500/40 bg-red-500/10 text-red-400",
    row: "border-l-2 border-l-red-500/40",
  },
}

function isTimedOut(log: any): boolean {
  if (log?.status !== "em_andamento") return false
  const started = log.iniciado_em ?? log.criado_em
  if (!started) return false
  return Date.now() - new Date(started).getTime() > TIMEOUT_MS
}

function getEffectiveStatus(log: any): StatusKey {
  return isTimedOut(log) ? "erro_timeout" : (log.status as StatusKey)
}

function getStatusCfg(log: any) {
  return STATUS_CFG[getEffectiveStatus(log)] ?? STATUS_CFG.erro
}

// ---------------------------------------------------------------------------
// Componente de Mensagem de Erro Expansível
// ---------------------------------------------------------------------------
function ErrorMessage({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  if (!text) return null
  const isLong = text.length > 80

  return (
    <p
      className={`text-[10px] text-red-400 font-mono mt-1 transition-all ${
        isLong && !expanded ? "line-clamp-1" : "break-words whitespace-normal"
      } ${isLong ? "cursor-pointer hover:opacity-80" : ""}`}
      onClick={(e) => {
        if (isLong) {
          e.preventDefault()
          e.stopPropagation()
          setExpanded((prev) => !prev)
        }
      }}
      title={isLong && !expanded ? text : undefined}
    >
      {text}
    </p>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ScraperControl() {
  const { fetchScraperLogs } = useSupabase()

  // Keep a stable ref to fetchScraperLogs so the polling interval
  // never holds a stale closure (useSupabase recreates functions each render).
  const fetchRef = useRef(fetchScraperLogs)
  useEffect(() => { fetchRef.current = fetchScraperLogs })

  // Form state
  const [query, setQuery]           = useState("")
  const [minFollowers, setMin]      = useState(5_000)
  const [firing, setFiring]         = useState(false)

  // Logs state
  const [logs, setLogs]             = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(true)

  // Derived: is the most recent log still running?
  const isRunning = logs[0]?.status === "em_andamento" && !isTimedOut(logs[0])

  // ── Data fetching ────────────────────────────────────────────────────────

  // Stable loadLogs — uses ref internally so deps array stays empty.
  const loadLogs = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLogsLoading(true)
      const data = await fetchRef.current()
      setLogs(data || [])
    } catch { /* silent on background polls */ } finally {
      if (showLoader) setLogsLoading(false)
    }
  }, [])

  // Initial fetch on mount
  useEffect(() => { loadLogs(true) }, [loadLogs])

  // Smart polling — only while a job is running; stops automatically otherwise.
  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => loadLogs(false), POLL_MS)
    return () => clearInterval(id)
  }, [isRunning, loadLogs])

  // ── Webhook dispatch ─────────────────────────────────────────────────────

  const handleFire = async () => {
    if (!query.trim()) {
      toast.error("Informe o termo de busca antes de disparar.")
      return
    }
    setFiring(true)
    try {
      const res = await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), min_followers: minFollowers }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success("Scraper iniciado! Monitorando execução...")
      setQuery("")
      // Small delay to allow n8n to write the first log row
      setTimeout(() => loadLogs(false), 2_500)
    } catch {
      toast.error("Falha ao acionar o webhook do scraper.")
    } finally {
      setFiring(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="col-span-12 border border-border bg-card" style={{ borderRadius: "2px" }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-widest text-foreground">
            Controle do Scraper
          </span>
          {isRunning && (
            <span className="ml-1 flex items-center gap-1.5 text-[10px] font-mono text-yellow-400">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse inline-block" />
              LIVE
            </span>
          )}
        </div>
        <button
          onClick={() => loadLogs(false)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
        >
          <RefreshCw className="h-2.5 w-2.5" />
          Atualizar
        </button>
      </div>

      {/* ── Body: form (left) + logs (right) ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">

        {/* ── Left: Disparo Manual ──────────────────────────────────────── */}
        <div className="p-4 flex flex-col gap-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Disparo Manual
          </p>

          <div className="space-y-3">
            {/* Termo de busca */}
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Termo de Busca
              </Label>
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !isRunning && !firing && handleFire()}
                placeholder="Ex: Moda feminina São Paulo"
                className="h-8 text-xs bg-background border-border"
                style={{ borderRadius: "2px" }}
                disabled={isRunning || firing}
              />
            </div>

            {/* Mínimo de seguidores */}
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Mínimo de Seguidores
              </Label>
              <Input
                type="number"
                value={minFollowers}
                onChange={e => setMin(Math.max(0, Number(e.target.value)))}
                className="h-8 text-xs bg-background border-border font-mono"
                style={{ borderRadius: "2px" }}
                disabled={isRunning || firing}
                min={0}
                step={1000}
              />
            </div>

            {/* Botão de disparo */}
            <button
              onClick={handleFire}
              disabled={isRunning || firing || !query.trim()}
              className={[
                "w-full flex items-center justify-center gap-2 py-2 px-4",
                "text-xs font-semibold uppercase tracking-widest border",
                "transition-all duration-200",
                isRunning || firing || !query.trim()
                  ? "border-border text-muted-foreground cursor-not-allowed opacity-50"
                  : "border-primary text-primary hover:bg-primary hover:text-primary-foreground cursor-pointer",
              ].join(" ")}
              style={{ borderRadius: "2px" }}
            >
              {firing ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Iniciando...</>
              ) : isRunning ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Executando — aguarde</>
              ) : (
                <><Play className="h-3.5 w-3.5" /> Iniciar Scraper</>
              )}
            </button>
          </div>

          {/* Execução ativa — card de status inline */}
          {isRunning && logs[0] && (
            <div
              className="border border-yellow-500/30 bg-yellow-500/5 px-3 py-2.5 space-y-1"
              style={{ borderRadius: "2px" }}
            >
              <div className="flex items-center gap-1.5">
                <ScanSearch className="h-3 w-3 text-yellow-400" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-400">
                  Em execução
                </p>
              </div>
              <p className="text-xs text-foreground truncate font-medium">
                {logs[0].query ?? logs[0].termo_busca ?? "—"}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono">
                Iniciado às {format(new Date(logs[0].criado_em), "HH:mm:ss", { locale: ptBR })}
              </p>
            </div>
          )}
        </div>

        {/* ── Right: Feed de Logs ───────────────────────────────────────── */}
        <div className="flex flex-col">
          <div className="px-4 py-2.5 border-b border-border">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              Últimas Execuções
            </p>
          </div>

          <div className="divide-y divide-border">
            {logsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-4 py-3 space-y-1.5">
                  <Skeleton className="h-3.5 w-2/3" style={{ borderRadius: "2px" }} />
                  <Skeleton className="h-3 w-1/3" style={{ borderRadius: "2px" }} />
                </div>
              ))
            ) : logs.length === 0 ? (
              <div className="px-4 py-8 flex flex-col items-center gap-2 text-muted-foreground">
                <Terminal className="h-6 w-6 opacity-20" />
                <p className="text-xs text-center">Nenhuma execução registrada.</p>
              </div>
            ) : (
              logs.map((log, i) => {
                const effectiveStatus = getEffectiveStatus(log)
                const cfg = getStatusCfg(log)
                const Icon = cfg.Icon
                return (
                  <div
                    key={i}
                    className={`px-4 py-3 flex items-start justify-between gap-3 hover:bg-muted/10 transition-colors cursor-default ${cfg.row}`}
                  >
                    {/* Left: query + meta */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {log.query ?? log.termo_busca ?? "—"}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                        {log.leads_encontrados != null && (
                          <span className="text-[10px] font-mono text-primary font-semibold">
                            {Number(log.leads_encontrados).toLocaleString("pt-BR")} leads
                          </span>
                        )}
                        {log.min_followers != null && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ≥{Number(log.min_followers).toLocaleString("pt-BR")} seg.
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {format(
                            new Date(log.finalizado_em ?? log.criado_em),
                            "dd/MM HH:mm",
                            { locale: ptBR }
                          )}
                        </span>
                      </div>
                      {effectiveStatus === "erro_timeout" && (
                        <p className="text-[10px] text-red-400 mt-1 line-clamp-2 font-mono" title="O processo excedeu o tempo limite de 10 minutos e foi interrompido pelo sistema.">
                          O processo excedeu o tempo limite de 10 minutos e foi interrompido pelo sistema.
                        </p>
                      )}
                      {effectiveStatus === "erro" && (log.detalhes || log.mensagem) && (
                        <ErrorMessage text={log.detalhes || log.mensagem} />
                      )}
                    </div>

                    {/* Right: badge */}
                    <span
                      className={`flex items-center gap-1 shrink-0 text-[10px] font-semibold border px-2 py-0.5 ${cfg.badge}`}
                      style={{ borderRadius: "2px" }}
                    >
                      <Icon className={`h-3 w-3 ${cfg.spin ? "animate-spin" : ""}`} />
                      {cfg.label}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
