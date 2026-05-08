import { supabase } from "@/lib/supabase"

export type CriarTarefaDados = {
  titulo: string
  responsavel: string
  prazo: string
  status: string
}

export type EditarTarefaDados = {
  titulo: string
  responsavel: string | null
  prazo: string | null
  status: string
}

export async function editarTarefa(id: number, dados: EditarTarefaDados): Promise<void> {
  const { error } = await supabase
    .from("tarefas")
    .update(dados)
    .eq("id", id)

  if (error) throw new Error(error.message)
}

export async function criarTarefa(dados: CriarTarefaDados): Promise<void> {
  const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_NOVA_TAREFA
  if (!webhookUrl) throw new Error("Webhook não configurado (NEXT_PUBLIC_N8N_WEBHOOK_NOVA_TAREFA).")

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  })

  if (!response.ok) throw new Error(`Erro do webhook: ${response.status}`)
}

export async function sincronizarNotion(tarefas: unknown[]): Promise<void> {
  const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_CARGA_INICIAL
  if (!webhookUrl) throw new Error("Webhook não configurado (NEXT_PUBLIC_N8N_WEBHOOK_CARGA_INICIAL).")

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tarefas }),
  })

  if (!response.ok) throw new Error(`Erro do webhook: ${response.status}`)
}

export async function gerarInsightsTarefas(tarefas: unknown[]): Promise<string> {
  const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_TAREFAS
  if (!webhookUrl) throw new Error("Webhook não configurado (NEXT_PUBLIC_N8N_WEBHOOK_TAREFAS).")

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tarefas }),
  })

  if (!response.ok) throw new Error(`Erro do webhook: ${response.status}`)

  const data = await response.json()
  // normaliza as shapes mais comuns de resposta do n8n
  return (
    data.insight ??
    data.resultado ??
    data.message ??
    data.output ??
    data.texto ??
    JSON.stringify(data, null, 2)
  )
}
