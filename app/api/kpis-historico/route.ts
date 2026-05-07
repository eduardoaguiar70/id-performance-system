/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"

const N8N_WEBHOOK_URL =
  "https://n8n-n8n-start.kfocge.easypanel.host/webhook/capturar-metricas"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate required fields
    if (!body.conta_id) {
      return NextResponse.json(
        { error: "Campo obrigatório: conta_id" },
        { status: 400 }
      )
    }

    if (!body.historico && (!body.date_start || !body.date_end)) {
      return NextResponse.json(
        { error: "Campos obrigatórios: date_start, date_end (ou historico: true)" },
        { status: 400 }
      )
    }

    // Server-side relay — no CORS restrictions.
    // n8n processes asynchronously; we treat any response (even non-2xx)
    // as "accepted" and let the frontend poll Supabase for the result.
    try {
      const payload: any = { conta_id: body.conta_id }
      if (body.historico) {
        payload.historico = true
      } else {
        payload.date_start = body.date_start
        payload.date_end = body.date_end
      }

      const n8nRes = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        // 30s timeout via AbortSignal
        signal: AbortSignal.timeout(30_000),
      })

      const rawText = await n8nRes.text()
      console.log(`[kpis-historico] n8n status=${n8nRes.status} body=${rawText}`)
    } catch (fetchErr) {
      // Network / timeout error reaching n8n — log but do not fail the client.
      // The workflow may still have been triggered.
      console.warn("[kpis-historico] fetch to n8n failed:", fetchErr)
    }

    // Always return 200 to the frontend so it can proceed to poll Supabase.
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno"
    console.error("[kpis-historico] unexpected error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
