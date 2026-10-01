import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// integracoes_oauth guarda tokens e fica protegida por RLS; aqui expomos só os campos de status.
export async function GET(req: NextRequest) {
  if (!req.cookies.get("sb-auth-token")?.value) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const contaId = req.nextUrl.searchParams.get("conta_id");
  if (!contaId) {
    return NextResponse.json({ message: "conta_id obrigatório." }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("integracoes_oauth")
    .select("provider, account_identifier, status, ultimo_erro, atualizado_em")
    .eq("conta_id", contaId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ integracoes: data ?? [] });
}
