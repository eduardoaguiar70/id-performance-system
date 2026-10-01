import { NextRequest, NextResponse } from "next/server";
import { GoogleAuthError, getValidAccessToken, listGa4Properties } from "@/lib/oauth/google";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// GET: lista as propriedades GA4 acessíveis pelo login conectado ao cliente.
export async function GET(req: NextRequest) {
  if (!req.cookies.get("sb-auth-token")?.value) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const contaId = req.nextUrl.searchParams.get("conta_id");
  if (!contaId) return NextResponse.json({ message: "conta_id obrigatório." }, { status: 400 });

  try {
    const token = await getValidAccessToken(contaId, "ga4");
    const propriedades = await listGa4Properties(token);
    return NextResponse.json({ propriedades });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao listar propriedades.";
    return NextResponse.json({ message }, { status: err instanceof GoogleAuthError ? 401 : 502 });
  }
}

// POST: vincula a propriedade escolhida ao cliente.
export async function POST(req: NextRequest) {
  if (!req.cookies.get("sb-auth-token")?.value) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { conta_id, property_id } = (await req.json().catch(() => ({}))) as {
    conta_id?: string;
    property_id?: string;
  };
  if (!conta_id || !property_id) {
    return NextResponse.json({ message: "conta_id e property_id obrigatórios." }, { status: 400 });
  }

  try {
    const token = await getValidAccessToken(conta_id, "ga4");
    const propriedades = await listGa4Properties(token);
    if (!propriedades.some((p) => p.id === property_id)) {
      return NextResponse.json({ message: "Propriedade não pertence a este login." }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao validar propriedade.";
    return NextResponse.json({ message }, { status: err instanceof GoogleAuthError ? 401 : 502 });
  }

  const { error } = await getSupabaseAdmin()
    .from("integracoes_oauth")
    .update({ account_identifier: property_id, atualizado_em: new Date().toISOString() })
    .eq("conta_id", conta_id)
    .eq("provider", "ga4");

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
