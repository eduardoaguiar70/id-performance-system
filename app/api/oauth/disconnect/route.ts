import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const PROVIDERS = ["google_ads", "ga4", "shopify"];

// DELETE /api/oauth/disconnect?conta_id=...&provider=google_ads|ga4|shopify
// Remove o vínculo (tokens e conta escolhida) deste cliente. Reconectar cria o vínculo de novo.
export async function DELETE(req: NextRequest) {
  if (!req.cookies.get("sb-auth-token")?.value) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const contaId = req.nextUrl.searchParams.get("conta_id");
  const provider = req.nextUrl.searchParams.get("provider");
  if (!contaId || !provider || !PROVIDERS.includes(provider)) {
    return NextResponse.json({ message: "conta_id e provider válidos são obrigatórios." }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from("integracoes_oauth")
    .delete()
    .eq("conta_id", contaId)
    .eq("provider", provider);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
