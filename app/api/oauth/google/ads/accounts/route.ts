import { NextRequest, NextResponse } from "next/server";
import { GoogleAuthError, getValidAccessToken } from "@/lib/oauth/google";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { GoogleAdsApiError, listarContasAds, parseVinculo } from "@/lib/google-ads/api";

function erroResposta(err: unknown) {
  const message = err instanceof Error ? err.message : "Erro ao consultar o Google Ads.";
  const status = err instanceof GoogleAuthError ? 401 : err instanceof GoogleAdsApiError ? 403 : 502;
  return NextResponse.json({ message }, { status });
}

// GET: lista as contas de anúncio acessíveis pelo login conectado ao cliente.
export async function GET(req: NextRequest) {
  if (!req.cookies.get("sb-auth-token")?.value) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const contaId = req.nextUrl.searchParams.get("conta_id");
  if (!contaId) return NextResponse.json({ message: "conta_id obrigatório." }, { status: 400 });

  try {
    const token = await getValidAccessToken(contaId, "google_ads");
    return NextResponse.json({ contas: await listarContasAds(token) });
  } catch (err) {
    return erroResposta(err);
  }
}

// POST: vincula a conta de anúncio escolhida ao cliente.
export async function POST(req: NextRequest) {
  if (!req.cookies.get("sb-auth-token")?.value) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { conta_id, account_id } = (await req.json().catch(() => ({}))) as { conta_id?: string; account_id?: string };
  if (!conta_id || !parseVinculo(account_id)) {
    return NextResponse.json({ message: "conta_id e account_id válidos são obrigatórios." }, { status: 400 });
  }

  try {
    const token = await getValidAccessToken(conta_id, "google_ads");
    const conta = (await listarContasAds(token)).find((c) => c.id === account_id);
    if (!conta) return NextResponse.json({ message: "Conta não pertence a este login." }, { status: 400 });
    if (conta.erro) return NextResponse.json({ message: conta.erro }, { status: 403 });
  } catch (err) {
    return erroResposta(err);
  }

  const { error } = await getSupabaseAdmin()
    .from("integracoes_oauth")
    .update({ account_identifier: account_id, atualizado_em: new Date().toISOString() })
    .eq("conta_id", conta_id)
    .eq("provider", "google_ads");

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
