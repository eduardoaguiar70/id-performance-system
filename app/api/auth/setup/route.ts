import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// POST /api/auth/setup
// Cria o usuário inicial do sistema usando a service role key.
// Remova ou proteja este endpoint após o primeiro uso.
export async function POST(request: Request) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada no .env.local" },
      { status: 500 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const { email, password } = body as { email?: string; password?: string }

  if (!email || !password) {
    return NextResponse.json(
      { error: "Envie { email, password } no body." },
      { status: 400 }
    )
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // confirma o e-mail automaticamente
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    ok: true,
    message: `Usuário ${data.user.email} criado e confirmado com sucesso.`,
  })
}
