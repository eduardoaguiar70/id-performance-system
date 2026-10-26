# Código Completo — Sistema ID Performance

> Exportado em 2026-09-22 para análise por IA externa.
> Stack: Next.js 14 App Router · TypeScript · Supabase · n8n · Tailwind CSS

---

## Índice

1. [Arquitetura e Stack](#arquitetura)
2. [Configuração (next.config / tailwind / middleware)](#config)
3. [Lib (supabase, types, utils)](#lib)
4. [Context e Hooks](#hooks)
5. [Actions (server)](#actions)
6. [API Routes](#api-routes)
7. [Layout e Componentes Globais](#layout)
8. [Dashboard](#dashboard)
9. [Páginas — Clientes](#clientes)
10. [Páginas — KPIs](#kpis)
11. [Páginas — Campanhas](#campanhas)
12. [Páginas — Reuniões](#reunioes)
13. [Páginas — Tarefas](#tarefas)
14. [Páginas — Customer Success / NPS](#cs)
15. [Páginas — Leads / Scraper / Follow-up / Flow Builder / Scripts](#comercial)
16. [Páginas — Insights (Chat IA)](#insights)
17. [Páginas — Integrações / Criativos](#config-pages)
18. [Componentes de UI (shadcn/ui)](#ui)

---

## 1. Arquitetura e Stack {#arquitetura}

```
Sistema ID Performance — Plataforma de Gestão para Agência de Marketing Digital

Frontend:
  - Next.js 14 App Router (TypeScript)
  - Tailwind CSS com tema escuro (CSS custom properties)
  - Shadcn/UI components
  - Recharts (gráficos)
  - ReactMarkdown + remark-gfm (renderização de IA)
  - date-fns (formatação de datas, locale ptBR)

Backend / Banco de Dados:
  - Supabase (PostgreSQL + Auth + Realtime)
  - Dois clientes Supabase:
      supabase       → dados (sem sessão, chave anon)
      supabaseAuth   → autenticação (com sessão)
  - RLS no Supabase (algumas tabelas desativado para uso anon)

Automação (n8n):
  - Hospedado em: https://n8n-n8n-start.kfocge.easypanel.host
  - Webhooks chamados diretamente do frontend (fetch POST)
  - Webhooks: /webhook/capturar-metricas, /webhook/kpis-analise-ia,
              /webhook/chat, /webhook/gerar-relatorio-nps,
              /webhook/executar-scraper, /webhook/editar-tarefa,
              /webhook/nova-tarefa, /webhook/carga-inicial,
              /webhook/tarefas, /webhook/reuniao

Auth:
  - Supabase Auth (signInWithPassword)
  - Cookie manual: sb-auth-token
  - Middleware Next.js protege todas as rotas exceto /login e /api

Tabelas Supabase principais:
  contas_ativas, clientes, leads, tarefas, meeting_summaries,
  kpi_snapshots, kpi_analises, google_ads_snapshots,
  campaign_snapshots, ad_snapshots, google_campaign_snapshots,
  google_ad_snapshots, feedbacks_cs, nps_disparos, nps_relatorios,
  nps_configuracoes, nps_clientes, followup_logs, scraper_logs,
  agent_scripts, configuracoes_integracoes, configuracoes_alertas
```

---

## 2. Configuração {#config}

### middleware.ts

```typescript
import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|gif|woff|woff2|ttf)$/)
  ) {
    const response = NextResponse.next()
    response.headers.set("x-pathname", pathname)
    return response
  }

  // Check auth cookie
  const token = request.cookies.get("sb-auth-token")?.value
  if (!token) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const response = NextResponse.next()
  response.headers.set("x-pathname", pathname)
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
```

---

## 3. Lib {#lib}

### lib/supabase.ts

```typescript
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Data client (no session persistence)
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
})

// Auth client (with session)
export const supabaseAuth = createClient(url, anonKey, {
  auth: { persistSession: true, storageKey: "sb-auth-token" },
})
```

### lib/types.ts

```typescript
export type LeadStatus = "pending" | "approved" | "rejected" | "approached" | "error"

export interface Lead {
  id: string
  instagram_username: string
  instagram_url: string
  full_name: string
  followers_count: number
  bio: string
  external_url: string
  whatsapp: string
  whatsapp_source: string
  status: LeadStatus
  qualificacao?: string | null
  approached: boolean
  approached_at: string | null
  erro_msg?: string | null
  selected: boolean
  selected_at: string | null
  deleted?: boolean
  scraped_at: string
  created_at: string
  updated_at: string
}

export interface LeadsFilters {
  status: LeadStatus | "all"
  hasWhatsApp: boolean
  minFollowers: number | null
  search: string
}

export interface Creative {
  id: number
  url: string
  type: "image" | "video"
  insights?: string
  created_at: string
}

export interface Briefing {
  id: number
  client_name: string
  objective: string
  target_audience: string
  budget: string
  deadline: string
  content: string
  created_at: string
}

export interface Campaign {
  id: number
  name: string
  platform: "meta" | "google"
  status: "active" | "paused" | "error"
  cpc: number
  ctr: number
  roas: number
  budget_spent: number
  budget_limit: number
  alerts?: string[]
}

export interface Meeting {
  id: number
  title: string
  date: string
  transcript: string
  action_items: string[]
  decisions: string[]
  next_steps: string[]
}

export interface AgentScript {
  id: number
  script_key: string
  label: string
  content: string
  updated_at: string | null
  updated_by: string | null
}
```

### lib/utils.ts

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return String(count)
}

export function formatWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  return phone
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })
}
```

---

## 4. Context e Hooks {#hooks}

### types/cliente.ts

```typescript
export interface Cliente {
  conta_id: string
  conta_nome: string
}

export interface ContaAtiva extends Cliente {
  id: string
  ativo: boolean
  criado_em: string
}
```

### context/ClienteContext.tsx

```tsx
"use client"
import { createContext, useContext, useState, ReactNode } from "react"
import type { Cliente } from "@/types/cliente"

interface ClienteContextType {
  clienteSelecionado: Cliente | null
  setClienteSelecionado: (c: Cliente | null) => void
}

const ClienteContext = createContext<ClienteContextType>({
  clienteSelecionado: null,
  setClienteSelecionado: () => {},
})

export function ClienteProvider({ children }: { children: ReactNode }) {
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  return (
    <ClienteContext.Provider value={{ clienteSelecionado, setClienteSelecionado }}>
      {children}
    </ClienteContext.Provider>
  )
}

export function useCliente() {
  return useContext(ClienteContext)
}
```

### hooks/useSupabase.ts

```typescript
import { supabase } from "@/lib/supabase"
export { supabase }

export function useSupabase() {
  const fetchLatestKpiSnapshot = async (contaNome?: string) => {
    let q = supabase.from("kpi_snapshots").select("*").order("criado_em", { ascending: false }).limit(1)
    if (contaNome) q = q.eq("conta_nome", contaNome)
    const { data } = await q
    return data?.[0] ?? null
  }

  const fetchKpiHistory = async (contaNome?: string, limit = 8) => {
    let q = supabase.from("kpi_snapshots").select("*").order("periodo_inicio", { ascending: false }).limit(limit)
    if (contaNome) q = q.eq("conta_nome", contaNome)
    const { data } = await q
    return data ?? []
  }

  const fetchMeetings = async () => {
    const { data } = await supabase.from("meeting_summaries").select("*").order("data_reuniao", { ascending: false })
    return data ?? []
  }

  const fetchLatestTaskSnapshot = async () => {
    const { data } = await supabase.from("tarefas").select("*").order("criado_em", { ascending: false }).limit(20)
    return data ?? []
  }

  const fetchLatestKpiAnalysis = async (contaNome?: string) => {
    let q = supabase.from("kpi_analises").select("*").order("criado_em", { ascending: false }).limit(1).maybeSingle()
    if (contaNome) q = (supabase.from("kpi_analises").select("*").eq("conta_nome", contaNome).order("criado_em", { ascending: false }).limit(1).maybeSingle())
    const { data } = await q
    return data ?? null
  }

  const fetchScraperLogs = async (limit = 10) => {
    const { data } = await supabase.from("scraper_logs").select("*").order("criado_em", { ascending: false }).limit(limit)
    return data ?? []
  }

  return { supabase, fetchLatestKpiSnapshot, fetchKpiHistory, fetchMeetings, fetchLatestTaskSnapshot, fetchLatestKpiAnalysis, fetchScraperLogs }
}
```

### hooks/useNps.ts

```typescript
import { supabase } from '@/lib/supabase'

const NPS_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_N8N_WEBHOOK_NPS_RELATORIO ??
  'https://n8n-n8n-start.kfocge.easypanel.host/webhook/gerar-relatorio-nps'

export interface NpsDisparo {
  id: string
  cliente_nome: string | null
  cliente_whatsapp: string | null
  empresa: string | null
  status: string | null
  mensagem_texto: string | null
  mensagem_2: string | null
  mensagem_3: string | null
  mensagem_4: string | null
  mensagem_5: string | null
  respostas_cliente: string | null
  nps_score: number | null
  nps_classificacao: string | null
  data_agendamento: string | null
  criado_em: string | null
  enviado_em?: string | null
}

export interface NpsRelatorio {
  id: string
  conteudo_markdown: string
  criado_em: string
}

export interface NpsConfiguracoes {
  id: number
  mensagem_texto: string | null
  mensagem_2: string | null
  mensagem_3: string | null
  mensagem_4: string | null
  mensagem_5: string | null
  instrucoes_diretoria: string | null
  atualizado_em: string | null
}

export interface NpsCliente {
  id: string
  nome_cliente: string
  empresa: string | null
  whatsapp: string
  status_ativo: boolean
  ultimo_nps_em: string | null
  proximo_nps_em: string | null
}

export function useNps() {
  const fetchAllDisparos = async (): Promise<NpsDisparo[]> => {
    const { data, error } = await supabase.from('nps_disparos').select('*').order('data_agendamento', { ascending: false })
    if (error) throw error
    return (data ?? []) as NpsDisparo[]
  }

  const fetchLatestRelatorio = async (): Promise<NpsRelatorio | null> => {
    const { data, error } = await supabase.from('nps_relatorios').select('id, conteudo_markdown, criado_em').order('criado_em', { ascending: false }).limit(1).maybeSingle()
    if (error) throw error
    return data as NpsRelatorio | null
  }

  const triggerGerarRelatorio = async (): Promise<void> => {
    const res = await fetch(NPS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger: 'manual', timestamp: new Date().toISOString() }),
    })
    if (!res.ok) throw new Error(`Webhook respondeu com status ${res.status}`)
  }

  const createDisparo = async (payload: {
    cliente_nome: string; cliente_whatsapp: string; empresa?: string
    mensagem_texto: string; mensagem_2?: string; mensagem_3?: string
    mensagem_4?: string; mensagem_5?: string; data_agendamento: string | null
  }): Promise<void> => {
    const { error } = await supabase.from('nps_disparos').insert(payload)
    if (error) throw error
  }

  const updateDisparo = async (id: string, payload: {
    mensagem_texto: string; mensagem_2?: string; mensagem_3?: string
    mensagem_4?: string; mensagem_5?: string; data_agendamento: string | null
  }): Promise<void> => {
    const { error } = await supabase.from('nps_disparos').update(payload).eq('id', id)
    if (error) throw error
  }

  const fetchConfiguracoes = async (): Promise<NpsConfiguracoes | null> => {
    const { data, error } = await supabase.from('nps_configuracoes').select('*').eq('id', 1).maybeSingle()
    if (error) throw error
    return data as NpsConfiguracoes | null
  }

  const updateConfiguracoes = async (payload: {
    mensagem_texto: string; mensagem_2?: string; mensagem_3?: string
    mensagem_4?: string; mensagem_5?: string; instrucoes_diretoria?: string
  }): Promise<void> => {
    const { error } = await supabase.from('nps_configuracoes').upsert({ id: 1, ...payload, atualizado_em: new Date().toISOString() }, { onConflict: 'id' })
    if (error) throw error
  }

  const fetchClientes = async (): Promise<NpsCliente[]> => {
    const { data, error } = await supabase.from('nps_clientes').select('*').order('nome_cliente', { ascending: true })
    if (error) throw error
    return (data ?? []) as NpsCliente[]
  }

  const createCliente = async (payload: { nome_cliente: string; empresa?: string; whatsapp: string }): Promise<void> => {
    const { error } = await supabase.from('nps_clientes').insert({ ...payload, status_ativo: true })
    if (error) throw error
  }

  const updateClienteStatus = async (id: string, status_ativo: boolean): Promise<void> => {
    const { error } = await supabase.from('nps_clientes').update({ status_ativo }).eq('id', id)
    if (error) throw error
  }

  const deleteCliente = async (id: string): Promise<void> => {
    const { error } = await supabase.from('nps_clientes').delete().eq('id', id)
    if (error) throw error
  }

  const dispararNpsLote = async (clienteIds: string[], dataAgendamento?: string | null): Promise<number> => {
    if (clienteIds.length === 0) return 0
    const config = await fetchConfiguracoes()
    if (!config?.mensagem_texto) throw new Error('Nenhuma mensagem configurada.')
    const { data: clientes, error: clientesError } = await supabase.from('nps_clientes').select('id, nome_cliente, whatsapp, empresa').in('id', clienteIds)
    if (clientesError) throw clientesError
    if (!clientes || clientes.length === 0) throw new Error('Nenhum cliente encontrado.')
    const rows = clientes.map((c) => ({
      cliente_nome: c.nome_cliente, cliente_whatsapp: c.whatsapp,
      empresa: c.empresa ?? null, mensagem_texto: config.mensagem_texto,
      mensagem_2: config.mensagem_2 ?? null, mensagem_3: config.mensagem_3 ?? null,
      mensagem_4: config.mensagem_4 ?? null, mensagem_5: config.mensagem_5 ?? null,
      status: 'pendente', data_agendamento: dataAgendamento || new Date().toISOString(),
    }))
    const { error: insertError } = await supabase.from('nps_disparos').insert(rows)
    if (insertError) throw insertError
    return rows.length
  }

  return { fetchAllDisparos, fetchLatestRelatorio, triggerGerarRelatorio, createDisparo, updateDisparo, fetchConfiguracoes, updateConfiguracoes, fetchClientes, createCliente, updateClienteStatus, deleteCliente, dispararNpsLote }
}
```

### hooks/useTarefas.ts

```typescript
"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export type TarefaStatus = "Pendente" | "Em Andamento" | "Concluído"

export interface Tarefa {
  id: number
  titulo: string
  responsavel: string | null
  prazo: string | null
  status: string | null
  origem: string | null
  notion_id: string | null
  criado_em: string | null
}

export function useTarefas() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const fetchTarefas = async () => {
      const { data, error } = await supabase
        .from("tarefas")
        .select("*")
        .order("criado_em", { ascending: false })
      if (error) { setErro(error.message); setLoading(false); return }
      setTarefas((data ?? []) as Tarefa[])
      setLoading(false)
    }

    fetchTarefas()

    // Supabase Realtime subscription
    const channel = supabase
      .channel("tarefas-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tarefas" }, (payload) => {
        setTarefas((prev) => [payload.new as Tarefa, ...prev])
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tarefas" }, (payload) => {
        setTarefas((prev) => prev.map((t) => t.id === (payload.new as Tarefa).id ? (payload.new as Tarefa) : t))
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "tarefas" }, (payload) => {
        setTarefas((prev) => prev.filter((t) => t.id !== (payload.old as Tarefa).id))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const updateTarefa = (id: number, updates: Partial<Tarefa>) => {
    setTarefas((prev) => prev.map((t) => t.id === id ? { ...t, ...updates } : t))
  }

  return { tarefas, loading, erro, updateTarefa }
}
```

---

## 5. Actions (Server) {#actions}

### lib/actions/tarefas.ts

```typescript
"use server"
import type { Tarefa } from "@/hooks/useTarefas"

export async function editarTarefa(data: {
  tarefa_id: number; notion_id: string | null
  titulo: string; responsavel: string | null
  prazo: string | null; status: string
}) {
  const webhookUrl = "https://n8n-n8n-start.kfocge.easypanel.host/webhook/editar-tarefa"
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Webhook retornou ${res.status}`)
}

export async function criarTarefa(data: {
  titulo: string; responsavel: string; prazo: string; status: string
}) {
  const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_NOVA_TAREFA
  if (!webhookUrl) throw new Error("Webhook URL não configurada.")
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Webhook retornou ${res.status}`)
}

export async function sincronizarNotion(tarefas: Tarefa[]) {
  const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_CARGA_INICIAL
  if (!webhookUrl) throw new Error("Webhook URL não configurada.")
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tarefas }),
  })
  if (!res.ok) throw new Error(`Webhook retornou ${res.status}`)
}

export async function gerarInsightsTarefas(tarefas: Tarefa[]): Promise<string> {
  const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_TAREFAS
  if (!webhookUrl) throw new Error("Webhook URL não configurada.")
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tarefas }),
  })
  if (!res.ok) throw new Error(`Webhook retornou ${res.status}`)
  const data = await res.json()
  return data.insights ?? data.resultado ?? data.resposta ?? JSON.stringify(data)
}
```

---

## 6. API Routes {#api-routes}

### app/api/kpis-historico/route.ts

```typescript
import { NextRequest, NextResponse } from "next/server"

const N8N_WEBHOOK = "https://n8n-n8n-start.kfocge.easypanel.host/webhook/capturar-metricas"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    fetch(N8N_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {})
    return NextResponse.json({ status: "ok", message: "Importação iniciada." })
  } catch {
    return NextResponse.json({ status: "ok" })
  }
}
```

### app/api/parse-pdf/route.ts

```typescript
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse")
    const data = await pdfParse(buffer)
    return NextResponse.json({ text: data.text })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
```

### app/api/auth/setup/route.ts

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ user: data.user })
}
```

---

## 7. Layout e Componentes Globais {#layout}

### app/layout.tsx

```tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { headers } from "next/headers"
import { Toaster } from "@/components/ui/sonner"
import { ClienteProvider } from "@/context/ClienteContext"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ID Performance — Sistema de Gestão",
  description: "Plataforma de gestão para agência de marketing digital",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const headerList = headers()
  const pathname = headerList.get("x-pathname") ?? "/"
  const isLoginPage = pathname.startsWith("/login")

  return (
    <html lang="pt-BR" data-theme="dark" className="dark">
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        <ClienteProvider>
          {isLoginPage ? (
            <main className="min-h-screen">{children}</main>
          ) : (
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto">{children}</main>
              </div>
            </div>
          )}
          <Toaster />
        </ClienteProvider>
      </body>
    </html>
  )
}
```

### app/login/page.tsx

```tsx
"use client"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabaseAuth } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error("Credenciais inválidas")
      setLoading(false)
      return
    }
    if (data.session) {
      document.cookie = `sb-auth-token=${data.session.access_token}; path=/; max-age=3600`
    }
    const next = params.get("next") ?? "/dashboard"
    router.push(next)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm p-8 border border-border bg-card rounded-sm space-y-6">
        <h1 className="text-2xl font-bold text-center">ID Performance</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

### components/layout/sidebar.tsx

```tsx
"use client"
import { memo, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Users, Image as ImageIcon, Megaphone,
  TrendingUp, MessageSquare, CheckSquare, ScanSearch, Bot,
  LogOut, Building2, Heart, Settings, Send, GitMerge,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { supabaseAuth } from "@/lib/supabase"

interface NavItem { name: string; href: string; icon: React.ElementType }
interface NavGroup { label: string | null; items: NavItem[] }

const groups: NavGroup[] = [
  { label: null, items: [{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard }] },
  { label: "Agente ID", items: [{ name: "Agente ID", href: "/insights", icon: Bot }] },
  {
    label: "Gestão",
    items: [
      { name: "Clientes", href: "/clientes", icon: Building2 },
      { name: "Customer Success", href: "/customer-success", icon: Heart },
    ],
  },
  {
    label: "Comercial",
    items: [
      { name: "Leads", href: "/leads", icon: Users },
      { name: "Follow-ups", href: "/followup-logs", icon: Send },
      { name: "Flow Builder", href: "/flow-builder", icon: GitMerge },
      { name: "Scraper", href: "/scraper", icon: ScanSearch },
    ],
  },
  {
    label: "Analytics & ADS",
    items: [
      { name: "Campanhas", href: "/campanhas", icon: Megaphone },
      { name: "KPIs", href: "/kpis", icon: TrendingUp },
    ],
  },
  {
    label: "Organização",
    items: [
      { name: "Reuniões", href: "/reunioes", icon: MessageSquare },
      { name: "Tarefas", href: "/tarefas", icon: CheckSquare },
    ],
  },
  { label: "Utilidades", items: [{ name: "Criativos", href: "/criativos", icon: ImageIcon }] },
  { label: "Configurações", items: [{ name: "Integrações", href: "/integracoes", icon: Settings }] },
]

function SidebarComponent() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = useCallback(async () => {
    await supabaseAuth.auth.signOut()
    document.cookie = "sb-auth-token=; path=/; max-age=0"
    router.push("/login")
    router.refresh()
  }, [router])

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card text-card-foreground">
      <div className="flex h-16 items-center px-6 border-b border-border flex-shrink-0">
        <Image src="/id-logo-horizontal.png" alt="ID Performance Digital" width={320} height={80} priority className="h-11 w-auto object-contain" />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {groups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "pt-3" : ""}>
            {group.label && (
              <div className="px-3 pb-1.5">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 select-none">{group.label}</span>
              </div>
            )}
            {group.items.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link key={item.name} href={item.href}
                  className={cn("group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                  )}
                >
                  <item.icon className={cn("mr-3 h-4 w-4 flex-shrink-0",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-secondary-foreground"
                  )} aria-hidden="true" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-border p-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-sm font-medium flex-shrink-0">ID</div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium truncate">ID Performance</span>
            <span className="text-xs text-muted-foreground">Admin</span>
          </div>
          <button onClick={handleLogout} title="Sair" className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export const Sidebar = memo(SidebarComponent)
```

### components/layout/header.tsx

```tsx
"use client"
import { Bell, Plus, Search } from "lucide-react"
import { ClienteSelector } from "@/components/cliente-selector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Pesquisar..." className="pl-9 bg-background" />
      </div>
      <div className="flex items-center gap-3">
        <ClienteSelector />
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Bell className="h-5 w-5" />
        </Button>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" /> Novo Projeto
        </Button>
      </div>
    </header>
  )
}
```

### components/cliente-selector.tsx

```tsx
"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useCliente } from "@/context/ClienteContext"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { ContaAtiva } from "@/types/cliente"

export function ClienteSelector() {
  const [contas, setContas] = useState<ContaAtiva[]>([])
  const [loading, setLoading] = useState(true)
  const { clienteSelecionado, setClienteSelecionado } = useCliente()

  useEffect(() => {
    supabase.from("contas_ativas").select("*").eq("ativo", true).order("conta_nome")
      .then(({ data }) => { setContas((data ?? []) as ContaAtiva[]); setLoading(false) })
  }, [])

  if (loading) return <Skeleton className="h-9 w-40" />

  return (
    <Select
      value={clienteSelecionado?.conta_id ?? ""}
      onValueChange={(v) => {
        const conta = contas.find(c => c.conta_id === v)
        setClienteSelecionado(conta ? { conta_id: conta.conta_id, conta_nome: conta.conta_nome } : null)
      }}
    >
      <SelectTrigger className="w-44 h-9 text-sm">
        <SelectValue placeholder="Selecionar cliente" />
      </SelectTrigger>
      <SelectContent>
        {contas.map(c => (
          <SelectItem key={c.conta_id} value={c.conta_id}>{c.conta_nome}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

### components/cliente-banner.tsx

```tsx
"use client"
import { useCliente } from "@/context/ClienteContext"
import { Building2, X } from "lucide-react"

export function ClienteBanner() {
  const { clienteSelecionado, setClienteSelecionado } = useCliente()
  if (!clienteSelecionado) return null
  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-sm text-sm">
      <div className="flex items-center gap-2 text-primary">
        <Building2 className="h-3.5 w-3.5" />
        <span className="font-medium">{clienteSelecionado.conta_nome}</span>
      </div>
      <button onClick={() => setClienteSelecionado(null)} className="text-primary/60 hover:text-primary">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
```

---

## 8. Dashboard {#dashboard}

### app/dashboard/page.tsx

```tsx
// Importa e renderiza os widgets:
// - AgencyMetrics (métricas da agência)
// - ClientMetrics (métricas do cliente selecionado)
// - FocusWidget (widget de foco)
// - InsightFeed (feed de insights em tempo real via Supabase Realtime)
// - ScraperControl (controle do scraper de leads)
// Ver docs/dashboard-analytics-codigo.md para código completo
```

> **Nota:** O código completo do dashboard está em `docs/dashboard-analytics-codigo.md`.

### components/dashboard/scraper-control.tsx (resumido)

```tsx
// Controle do scraper Instagram via webhook n8n
// WEBHOOK: https://n8n-n8n-start.kfocge.easypanel.host/webhook/executar-scraper
// - Form: query (termo de busca) + minFollowers
// - Poll: a cada 8s enquanto job em andamento (status = "em_andamento")
// - Timeout: 10 minutos — exibe "erro_timeout"
// - Logs: tabela scraper_logs no Supabase (query, leads_encontrados, status, etc.)
```

---

## 9. Páginas — Clientes {#clientes}

### app/clientes/page.tsx

```tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

// Tabela: clientes
// Busca flexível: detecta colunas automaticamente (nome, status, nicho, kpi, email, whatsapp)
// Features:
//   - Listagem + busca por texto
//   - Modal "Novo Cliente" (cria via supabase.from("clientes").insert())
//   - Após criar: cross-reference automático nas tabelas contas_ativas, kpi_snapshots, leads, meeting_summaries, tarefas
//   - Link para perfil: /clientes/[id]

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
// ... (código completo acima na seção de leitura)
// Funções key:
//   pick() — lê campo flexível por lista de chaves possíveis
//   detectKey() — detecta qual coluna existe no objeto
//   crossReference(nome) — busca nas 5 tabelas em paralelo
//   buildFieldMap(row) — monta mapeamento lógico→coluna
//   handleCreate() — insere via supabase
```

### app/clientes/[id]/page.tsx

```tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

// Perfil detalhado de um cliente
// Dados carregados em paralelo:
//   - clientes (by id)
//   - feedbacks_cs (by nome ou whatsapp, OR filter)
//   - kpi_snapshots (by conta_nome, latest)
//   - kpi_analises (by conta_nome, latest)
//   - google_ads_snapshots (by conta_nome, latest)
// 
// Lógica de CPA unificado:
//   - Se tem Meta E Google: CPA Médio = (spend_meta + spend_google) / (leads_meta + conversoes_google)
//   - Se só Meta: CPA (Meta Ads)
//   - Se só Google: CPA (Google Ads)
//
// Campos editáveis inline:
//   - Contato (responsavel_nome, whatsapp)
//   - Observações (observacoes)
//
// Componente AlertasConfig para configurar limites de CPA

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { AlertasConfig } from "@/components/clientes/alertas-config"
```

---

## 10. Páginas — KPIs {#kpis}

### app/kpis/page.tsx

```tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

// Painel de KPIs — métricas de performance de campanhas
//
// Webhooks chamados:
//   - POST https://n8n-n8n-start.kfocge.easypanel.host/webhook/capturar-metricas  (atualizar KPIs)
//   - POST /api/kpis-historico  (proxy para o mesmo webhook com historico=true ou date range)
//   - POST https://n8n-n8n-start.kfocge.easypanel.host/webhook/kpis-analise-ia  (gerar análise IA)
//
// Tabelas lidas:
//   - kpi_snapshots (Meta Ads daily rows)
//   - google_ads_snapshots (Google Ads daily rows)
//   - kpi_analises (análises geradas por IA)
//   - clientes (para detectar meta_ads_id / google_ads_id)
//
// Função aggregateHybridRows():
//   - Agrega múltiplos rows diários de Meta + Google em snapshot unificado
//   - Recalcula ROAS, CAC, CPL, CPM, CPC, CTR, taxa_conversao
//
// UI:
//   - Tabs: "Métricas de Performance" | "Análise IA"
//   - Date range picker com Calendar (react-day-picker)
//   - Filtros de período: all/week/month/quarter
//   - Market Share de Investimento (barra Meta vs Google)
//   - Cards: ROAS, CAC, CPL, taxa_conversao, leads, CTR, investimento
//   - Seção Conversões & Vendas: receita, compras, add_to_cart, checkout
//   - Seção Topo de Funil: CPM, CPC, alcance, frequência
//   - LineChart (recharts): ROAS vs Conversão ao longo do tempo
//   - Modal análise IA: calendário para selecionar período + polling (8 tentativas x 5s)

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useSupabase } from "@/hooks/useSupabase"
import { useCliente } from "@/context/ClienteContext"
// (1254 linhas — ver código completo lido anteriormente)
```

---

## 11. Páginas — Campanhas {#campanhas}

### app/campanhas/page.tsx

```tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

// Monitor de Campanhas — drill-down campanha → anúncios
//
// Tabelas lidas:
//   Meta Ads:   campaign_snapshots, ad_snapshots
//   Google Ads: google_campaign_snapshots, google_ad_snapshots
//
// Funções de agregação:
//   aggregateCampaigns(rows) → agrupa por campaign_name, recalcula ROAS/CAC/CTR
//   aggregateAds(rows) → agrupa por ad_name, recalcula ROAS/CAC/CTR
//
// Features:
//   - Detecção automática das integrações disponíveis (meta_ads_id, google_ads_id em clientes)
//   - Tabs Meta/Google (só mostra quando tem ambos)
//   - Date range picker (máx 90 dias)
//   - Cards de campanha: spend, receita, ROAS, CPA, compras, CTR
//   - CPA comparado com alertasConfig?.meta_cpa_maximo / google_cpa_maximo
//   - Drill-down: clica na campanha → carrega anúncios desta campanha no período
//   - Cards de anúncio: spend, receita, ROAS (verde ≥5, vermelho <2), CPA, compras/impressões

import { useEffect, useState } from "react"
import { useCliente } from "@/context/ClienteContext"
import { supabase } from "@/lib/supabase"
```

---

## 12. Páginas — Reuniões {#reunioes}

### app/reunioes/page.tsx

```tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

// Gestão de Reuniões e Transcrições
//
// Webhook chamado:
//   POST process.env.NEXT_PUBLIC_N8N_WEBHOOK_REUNIAO
//   Payload: { transcricao, titulo, data, enviado_por }
//
// Upload de arquivo:
//   - .txt: lê diretamente com file.text()
//   - .pdf: POST /api/parse-pdf (usa pdf-parse no servidor)
//
// Tabela: meeting_summaries
// Campos JSONB: temas_discutidos, decisoes, action_items, bloqueios, proximos_passos, participantes
//
// UI:
//   - Cards expansíveis por clique
//   - Temas, decisões, bloqueios, próximos passos
//   - Action Items em tabela (tarefa, responsável, prazo, prioridade)
//   - Edição inline (titulo, tipo, data, resumo)
//   - Exclusão com modal de confirmação (DELETE na tabela)

import { useState, useEffect } from "react"
import { useSupabase } from "@/hooks/useSupabase"
import { supabase } from "@/hooks/useSupabase"
```

---

## 13. Páginas — Tarefas {#tarefas}

### app/tarefas/page.tsx

```tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

// Gestão de Tarefas — Kanban (Pendente | Em Andamento | Concluído)
//
// Dados em tempo real via useTarefas() (Supabase Realtime)
//
// Actions (server-side, via n8n):
//   - criarTarefa() → POST NEXT_PUBLIC_N8N_WEBHOOK_NOVA_TAREFA
//   - editarTarefa() → POST https://n8n-n8n-start.kfocge.easypanel.host/webhook/editar-tarefa
//   - gerarInsightsTarefas() → POST NEXT_PUBLIC_N8N_WEBHOOK_TAREFAS
//   - sincronizarNotion() → POST NEXT_PUBLIC_N8N_WEBHOOK_CARGA_INICIAL
//
// TarefaCard:
//   - Optimistic UI: atualiza estado local imediatamente, faz rollback se falhar
//   - Badge: "Notion" (branco) ou "Sistema" (cinza)
//   - Cartões vermelhos para tarefas vencidas
//
// parsePrazo(): suporta ISO (yyyy-MM-dd) e formato brasileiro (dd/MM/yyyy)

import { useState } from "react"
import { useTarefas, type Tarefa, type TarefaStatus } from "@/hooks/useTarefas"
import { criarTarefa, editarTarefa, gerarInsightsTarefas, sincronizarNotion } from "@/lib/actions/tarefas"
```

---

## 14. Páginas — Customer Success / NPS {#cs}

### app/customer-success/page.tsx

```tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

// Módulo de Customer Success — NPS completo
//
// Hook: useNps() — todas as operações de NPS
//
// Tabs principais:
//   1. "Feedbacks NPS" — lista de disparos com respostas + chat panel lateral
//   2. "Fila de Disparos" — disparos pendentes/enviados + edição
//   3. "Relatório IA" — relatório executivo gerado via webhook
//   4. "Clientes NPS" — gerenciamento da base de clientes para disparo
//   5. "Configurações NPS" — fluxo de mensagens (msg1-msg5) + instruções IA
//
// Escala NPS: 1-5 estrelas
//   5 = Promotor (verde), 4 = Neutro (amarelo), 1-3 = Detrator (vermelho)
//
// calcularDatasNPS():
//   - Usa o campo enviado_em do último disparo válido
//   - Próximo NPS = último + 90 dias
//
// Relatório IA:
//   - parseMarkdownSections(): parser de headers markdown para seções tipadas
//   - Tipos: resumo, fortes, gargalos, risco, acao, other
//   - Cada tipo tem cor/ícone/accentBar diferentes
//
// dispararNpsLote():
//   - Busca config de mensagens em nps_configuracoes
//   - Insere N rows em nps_disparos (uma por cliente selecionado)
//   - Sem chamada de webhook — o n8n processa automaticamente (trigger DB)

import { useState, useEffect, useMemo } from "react"
import { useNps, type NpsDisparo, type NpsRelatorio, type NpsConfiguracoes, type NpsCliente } from "@/hooks/useNps"
// (2135 linhas — componentes: StatusBadge, ClassificacaoBadge, NpsScoreBadge, NpsStars,
//  ChatPanel, RelatorioPanel, ConfiguracoesNpsPanel, ClientesNpsPanel, CustomerSuccessPage)
```

---

## 15. Páginas — Comercial {#comercial}

### app/leads/page.tsx

```tsx
import { LeadsTable } from "@/components/leads/leads-table"
import { Users } from "lucide-react"

export default function LeadsPage() {
  return (
    <div className="flex-1 space-y-6 p-6 pt-6">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h1 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Leads · Scraper Instagram
        </h1>
      </div>
      <LeadsTable />
    </div>
  )
}
```

### app/scraper/page.tsx

```tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

// Página dedicada do Scraper (versão expandida do widget do Dashboard)
//
// WEBHOOK: https://n8n-n8n-start.kfocge.easypanel.host/webhook/executar-scraper
// Payload: { query, min_followers }
//
// Features extras vs widget:
//   - Tabela completa de logs (até 20) com colunas: Termo, Status, Leads, Seg.Mín., Início, Duração
//   - calcDuration(): usa formatDistanceStrict do date-fns
//   - "Como funciona" info card
//   - Timestamp da última atualização
//
// Status: em_andamento (amarelo, spin), sucesso (verde), erro (vermelho), erro_timeout (>10min)
```

### app/followup-logs/page.tsx

```tsx
// Server Component (force-dynamic)
// Tabela: followup_logs
// Filtros via searchParams: phone (ilike) + date (hoje/7dias/data específica)
// Componente FollowupFilters (client component separado para inputs)
// Renderização: timeline com dots, cards de mensagem
```

### app/followup-logs/filters.tsx

```tsx
// Client component com inputs de filtro
// URL params: phone, date
// Opções de date: todos, hoje, 7dias, ou data específica (input[type=date])
```

### app/flow-builder/page.tsx

```tsx
import { FlowBuilderClient } from "./flow-builder-client"

export const metadata = {
  title: "Flow Builder | ID Performance",
  description: "Monte o fluxo de mensagens de follow-up automático para SUSPECTS e LEADS.",
}

export default function FlowBuilderPage() {
  return <FlowBuilderClient />
}
```

### app/flow-builder/flow-builder-client.tsx

```tsx
// Client component do Flow Builder
// Editor visual de fluxo de mensagens (WhatsApp follow-up)
// Nós do tipo MessageNode (components/flow-builder/message-node.tsx)
// Salva configuração localmente e/ou via webhook n8n
```

### app/scripts/page.tsx

```tsx
import { AgentScriptsEditor } from "@/components/agent-scripts/agent-scripts-editor"
import { Bot } from "lucide-react"

export default function ScriptsPage() {
  return (
    <div className="flex-1 space-y-6 p-6 pt-6 max-w-4xl">
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
      <AgentScriptsEditor />
    </div>
  )
}
```

---

## 16. Páginas — Insights (Chat IA) {#insights}

### app/insights/page.tsx

```tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

// Chat com Assistente IA — interface tipo WhatsApp
//
// Webhook: POST https://n8n-n8n-start.kfocge.easypanel.host/webhook/chat
// Payload: { cliente_id, conversa_id, mensagem, usuario }
// Response: { status: "ok", conversa_id, resposta }
//
// Memória de conversa: conversa_id mantém contexto na sessão
// Reset de conversa: nova saudação dinâmica baseada no cliente selecionado
//
// Renderização de respostas:
//   parseSegments() — parser de tags XML customizadas:
//     <resumo>  → ResumoBlock (azul/primário)
//     <metricas> → MetricasBlock (cinza)
//     <insight>  → InsightBlock (amarelo)
//     <action>   → ActionBlock (verde, checkboxes)
//     <provocacao> → ProvocacaoBlock (itálico cinza)
//     Markdown livre → ReactMarkdown com componentes customizados (tabelas, código, etc.)
//
// Quick Prompts (mostra apenas na primeira mensagem):
//   "Resumo de KPIs", "Clientes ativos", "Reuniões recentes", "Alertas críticos"
//
// Input: Textarea com Enter para enviar (Shift+Enter = nova linha)

import { useState, useRef, useEffect } from "react"
import { useCliente } from "@/context/ClienteContext"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
```

---

## 17. Páginas — Integrações / Criativos {#config-pages}

### app/integracoes/page.tsx

```tsx
"use client"

// Página de Integrações
// Tabela: configuracoes_integracoes (upsert por id)
//
// META ADS: card puramente informativo
//   - "Sistema Conectado" via System User Token · Graph API v21
//   - Não tem campos editáveis — gerenciado pelo backend n8n
//
// GOOGLE ADS: formulário editável
//   - google_customer_id (ex: 123-456-7890)
//   - google_developer_token (input[type=password])
//   - Salva via supabase.from("configuracoes_integracoes").upsert()

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
```

### app/criativos/page.tsx

```tsx
// Seção em Manutenção — placeholder
// Exibe ícone de Wrench + mensagem "Nova funcionalidade em breve"
import { Wrench, ImageIcon } from "lucide-react"
```

---

## 18. Componentes de UI — Resumos {#ui}

### components/leads/leads-table.tsx

```tsx
// Tabela de leads scraped do Instagram
// Tabela: leads
// Colunas: avatar, nome, @instagram, seguidores, WhatsApp, qualificação, status, data
//
// Status workflow:
//   pending → approved/rejected → approached
//   error → com mensagem de erro
//
// Filtros:
//   - Status (all/pending/approved/rejected/approached/error)
//   - hasWhatsApp (toggle)
//   - minFollowers (input numérico)
//   - search (texto livre: nome, @username, bio)
//
// Ações por lead:
//   - Aprovar / Rejeitar (update status no Supabase)
//   - Abrir perfil Instagram
//   - Abrir WhatsApp
//   - Ver detalhes (modal LeadDetailsModal)
//   - Editar (modal EditLeadModal)
//
// Paginação: client-side, 20 por página
```

### components/clientes/alertas-config.tsx

```tsx
// Configurações de Alertas de CPA por cliente
// Tabela: configuracoes_alertas (by cliente_id)
// Campos: meta_cpa_maximo, google_cpa_maximo
// Exibe CPA atual vs limite configurado (vermelho se acima)
// Props: clienteId, cpaAtualMeta, cpaAtualGoogle
```

### components/agent-scripts/agent-scripts-editor.tsx

```tsx
// Editor de scripts do agente de IA
// Tabela: agent_scripts
// Campos: script_key (imutável), label (exibição), content (editável), updated_at, updated_by
// UI: lista de scripts com textarea inline para edição do content
// Salva via supabase.from("agent_scripts").update({ content }).eq("id", id)
```

---

## Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # apenas para /api/auth/setup

# Webhooks n8n
NEXT_PUBLIC_N8N_WEBHOOK_REUNIAO=...
NEXT_PUBLIC_N8N_WEBHOOK_NOVA_TAREFA=...
NEXT_PUBLIC_N8N_WEBHOOK_CARGA_INICIAL=...
NEXT_PUBLIC_N8N_WEBHOOK_TAREFAS=...
NEXT_PUBLIC_N8N_WEBHOOK_NPS_RELATORIO=https://n8n-n8n-start.kfocge.easypanel.host/webhook/gerar-relatorio-nps
```

## Webhooks n8n — Mapeamento Completo

| Endpoint | Chamado de | Payload |
|---|---|---|
| `/webhook/capturar-metricas` | kpis/page.tsx (botão), /api/kpis-historico | `{ conta_id, conta_nome, historico?, date_start?, date_end? }` |
| `/webhook/kpis-analise-ia` | kpis/page.tsx (modal análise IA) | `{ conta_id, conta_nome, date_start, date_end }` |
| `/webhook/chat` | insights/page.tsx | `{ cliente_id, conversa_id, mensagem, usuario }` |
| `/webhook/gerar-relatorio-nps` | customer-success/page.tsx (botão gerar) | `{ trigger: "manual", timestamp }` |
| `/webhook/executar-scraper` | scraper/page.tsx, dashboard/ScraperControl | `{ query, min_followers }` |
| `/webhook/editar-tarefa` | lib/actions/tarefas.ts | `{ tarefa_id, notion_id, titulo, responsavel, prazo, status }` |
| `NEXT_PUBLIC_N8N_WEBHOOK_NOVA_TAREFA` | lib/actions/tarefas.ts | `{ titulo, responsavel, prazo, status }` |
| `NEXT_PUBLIC_N8N_WEBHOOK_CARGA_INICIAL` | lib/actions/tarefas.ts | `{ tarefas: Tarefa[] }` |
| `NEXT_PUBLIC_N8N_WEBHOOK_TAREFAS` | lib/actions/tarefas.ts | `{ tarefas: Tarefa[] }` |
| `NEXT_PUBLIC_N8N_WEBHOOK_REUNIAO` | reunioes/page.tsx | `{ transcricao, titulo, data, enviado_por }` |
