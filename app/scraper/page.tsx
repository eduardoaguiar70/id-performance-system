/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSupabase } from "@/hooks/useSupabase"
import {
  ScanSearch, Play, RefreshCw, Loader2,
  CheckCircle2, XCircle, Clock, AlertTriangle, Terminal,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { format, formatDistanceStrict } from "date-fns"
import { ptBR } from "date-fns/locale"

// ---------------------------------------------------------------------------
const WEBHOOK    = "https://n8n-n8n.aqzjch.easypanel.host/webhook/executar-scraper"
const POLL_MS    = 8_000
const LOG_LIMIT  = 20
const TIMEOUT_MS = 10 * 60 * 1_000  // 10 minutos

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------
type StatusKey = "em_andamento" | "sucesso" | "erro" | "erro_timeout"

const STATUS_CFG: Record<StatusKey, {
  label: string
  Icon: React.ElementType
  spin: boolean
  badge: string
}> = {
  em_andamento: {
    label: "Em andamento",
    Icon: Loader2,
    spin: true,
    badge: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
  },
  sucesso: {
    label: "Sucesso",
    Icon: CheckCircle2,
    spin: false,
    badge: "border-primary/40 bg-primary/10 text-primary",
  },
  erro: {
    label: "Erro",
    Icon: XCircle,
    spin: false,
    badge: "border-red-500/40 bg-red-500/10 text-red-400",
  },
  erro_timeout: {
    label: "Erro (Timeout)",
    Icon: XCircle,
    spin: false,
    badge: "border-red-500/40 bg-red-500/10 text-red-400",
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

function calcDuration(log: any): string {
  if (!log.finalizado_em) return "—"
  try {
    return formatDistanceStrict(
      new Date(log.finalizado_em),
      new Date(log.criado_em),
      { locale: ptBR }
    )
  } catch { return "—" }
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
      className={`text-[10px] text-red-400 font-mono mt-0.5 transition-all ${
        isLong && !expanded ? "truncate" : "break-words whitespace-normal"
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
export default function ScraperPage() {
  const { fetchScraperLogs } = useSupabase()

  // Stable ref — avoids stale closures no interval sem travar o dep-array
  const fetchRef = useRef(fetchScraperLogs)
  useEffect(() => { fetchRef.current = fetchScraperLogs })

  // Form
  const [query, setQuery]      = useState("")
  const [minFollowers, setMin] = useState(5_000)
  const [firing, setFiring]    = useState(false)

  // Logs
  const [logs, setLogs]           = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const isRunning = logs[0]?.status === "em_andamento" && !isTimedOut(logs[0])

  // ── Data ──────────────────────────────────────────────────────────────────
  const loadLogs = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLogsLoading(true)
      const data = await fetchRef.current(LOG_LIMIT)
      setLogs(data || [])
      setLastRefresh(new Date())
    } catch { /* silent on polls */ } finally {
      if (showLoader) setLogsLoading(false)
    }
  }, [])

  useEffect(() => { loadLogs(true) }, [loadLogs])

  // Polling inteligente — só enquanto há job rodando
  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => loadLogs(false), POLL_MS)
    return () => clearInterval(id)
  }, [isRunning, loadLogs])

  // ── Disparo ───────────────────────────────────────────────────────────────
  const handleFire = async () => {
    if (!query.trim()) { toast.error("Informe o termo de busca."); return }
    setFiring(true)
    try {
      const res = await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), min_followers: minFollowers }),
      })
      if (!res.ok) throw new Error()
      toast.success("Scraper iniciado! Monitorando execução...")
      setQuery("")
      setTimeout(() => loadLogs(false), 2_500)
    } catch {
      toast.error("Falha ao acionar o webhook do scraper.")
    } finally {
      setFiring(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full bg-background">

      {/* ── Topbar ─────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanSearch className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Scraper de Leads
          </h1>
          {isRunning && (
            <span className="flex items-center gap-1.5 ml-2 text-[10px] font-mono text-yellow-400">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse inline-block" />
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-[10px] text-muted-foreground/50 font-mono hidden sm:block">
              atualizado {format(lastRefresh, "HH:mm:ss")}
            </span>
          )}
          <button
            onClick={() => loadLogs(false)}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" /> Atualizar
          </button>
        </div>
      </div>

      {/* ── Main layout ────────────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-6">

        {/* ── LEFT — Configuração e Disparo ─────────────────────────── */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">

          {/* Form card */}
          <div className="border border-border bg-card" style={{ borderRadius: "2px" }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Terminal className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-foreground">
                Configurar Disparo
              </span>
            </div>

            <div className="p-4 space-y-4">
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
                <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                  Nicho, cidade ou palavras-chave que o scraper usará para localizar perfis.
                </p>
              </div>

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
                <p className="text-[10px] text-muted-foreground/60">
                  Perfis com menos seguidores serão descartados automaticamente.
                </p>
              </div>

              <div className="pt-1 border-t border-border">
                <button
                  onClick={handleFire}
                  disabled={isRunning || firing || !query.trim()}
                  className={[
                    "w-full flex items-center justify-center gap-2 py-2.5 px-4 mt-3",
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
            </div>
          </div>

          {/* Card de execução ativa */}
          {isRunning && logs[0] && (
            <div
              className="border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 space-y-2"
              style={{ borderRadius: "2px" }}
            >
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 text-yellow-400 animate-spin" />
                <span className="text-xs font-semibold uppercase tracking-widest text-yellow-400">
                  Em execução
                </span>
              </div>
              <p className="text-sm text-foreground font-medium truncate">
                {logs[0].query ?? logs[0].termo_busca ?? "—"}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className="font-mono">
                  Iniciado às {format(new Date(logs[0].criado_em), "HH:mm:ss", { locale: ptBR })}
                </span>
              </div>
              <p className="text-[10px] text-yellow-400/70">
                Atualizando automaticamente a cada {POLL_MS / 1000}s…
              </p>
            </div>
          )}

          {/* Info card */}
          <div
            className="border border-border bg-card px-4 py-3 space-y-2"
            style={{ borderRadius: "2px" }}
          >
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              Como funciona
            </p>
            <ul className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-primary mt-0.5">1.</span>
                Configure o nicho e o mínimo de seguidores.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary mt-0.5">2.</span>
                O webhook aciona o workflow n8n assíncrono.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary mt-0.5">3.</span>
                Os leads encontrados são salvos automaticamente na tabela de Leads.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary mt-0.5">4.</span>
                O status é atualizado em tempo real nesta tela.
              </li>
            </ul>
          </div>
        </div>

        {/* ── RIGHT — Histórico de Execuções ────────────────────────── */}
        <div className="col-span-12 lg:col-span-8">
          <div className="border border-border bg-card h-full" style={{ borderRadius: "2px" }}>

            {/* Section header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-widest text-foreground">
                Histórico de Execuções
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                últimas {LOG_LIMIT} execuções
              </span>
            </div>

            {/* Table header */}
            {!logsLoading && logs.length > 0 && (
              <div className="grid grid-cols-[1fr_100px_80px_80px_100px_80px] gap-3 px-4 py-2 border-b border-border bg-muted/20">
                {["Termo", "Status", "Leads", "Seg. Mín.", "Início", "Duração"].map(h => (
                  <span key={h} className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {h}
                  </span>
                ))}
              </div>
            )}

            {/* Rows */}
            <div className="divide-y divide-border">
              {logsLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-[1fr_100px_80px_80px_100px_80px] gap-3 px-4 py-3 items-center">
                    <Skeleton className="h-3.5 w-3/4" style={{ borderRadius: "2px" }} />
                    <Skeleton className="h-5 w-20" style={{ borderRadius: "2px" }} />
                    <Skeleton className="h-3.5 w-10" style={{ borderRadius: "2px" }} />
                    <Skeleton className="h-3.5 w-12" style={{ borderRadius: "2px" }} />
                    <Skeleton className="h-3.5 w-16" style={{ borderRadius: "2px" }} />
                    <Skeleton className="h-3.5 w-10" style={{ borderRadius: "2px" }} />
                  </div>
                ))
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                  <ScanSearch className="h-8 w-8 opacity-20" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Nenhuma execução registrada</p>
                    <p className="text-xs mt-1 opacity-60">
                      Configure um termo e inicie o scraper para ver os logs aqui.
                    </p>
                  </div>
                </div>
              ) : (
                logs.map((log, i) => {
                  const effectiveStatus = getEffectiveStatus(log)
                  const cfg = getStatusCfg(log)
                  const Icon = cfg.Icon
                  const isFirst = i === 0

                  return (
                    <div
                      key={i}
                      className={[
                        "grid grid-cols-[1fr_100px_80px_80px_100px_80px] gap-3 px-4 py-3 items-center",
                        "hover:bg-muted/10 transition-colors cursor-default",
                        isFirst && isRunning ? "bg-yellow-500/5" : "",
                      ].join(" ")}
                    >
                      {/* Termo */}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {log.query ?? log.termo_busca ?? "—"}
                        </p>
                        {effectiveStatus === "erro_timeout" && (
                          <p className="text-[10px] text-red-400 truncate font-mono mt-0.5" title="O processo excedeu o tempo limite de 10 minutos e foi interrompido pelo sistema.">
                            O processo excedeu o tempo limite de 10 minutos e foi interrompido pelo sistema.
                          </p>
                        )}
                        {effectiveStatus === "erro" && (log.detalhes || log.mensagem) && (
                          <ErrorMessage text={log.detalhes || log.mensagem} />
                        )}
                      </div>

                      {/* Status badge */}
                      <span
                        className={`flex items-center gap-1 w-fit text-[10px] font-semibold border px-2 py-0.5 ${cfg.badge}`}
                        style={{ borderRadius: "2px" }}
                      >
                        <Icon className={`h-3 w-3 flex-shrink-0 ${cfg.spin ? "animate-spin" : ""}`} />
                        {cfg.label}
                      </span>

                      {/* Leads encontrados */}
                      <span className="text-xs font-mono text-foreground">
                        {log.leads_encontrados != null
                          ? Number(log.leads_encontrados).toLocaleString("pt-BR")
                          : <span className="text-muted-foreground">—</span>}
                      </span>

                      {/* Min seguidores */}
                      <span className="text-xs font-mono text-muted-foreground">
                        {log.min_followers != null
                          ? `≥${Number(log.min_followers).toLocaleString("pt-BR")}`
                          : "—"}
                      </span>

                      {/* Início */}
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {format(new Date(log.criado_em), "dd/MM HH:mm", { locale: ptBR })}
                      </span>

                      {/* Duração */}
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {calcDuration(log)}
                      </span>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer info when running */}
            {isRunning && !logsLoading && (
              <div className="px-4 py-2.5 border-t border-border bg-yellow-500/5 flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-yellow-400" />
                <p className="text-[10px] text-yellow-400">
                  Execução em andamento — logs atualizando automaticamente a cada {POLL_MS / 1000}s
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
