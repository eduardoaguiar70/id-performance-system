import { NextRequest, NextResponse } from "next/server";
import { GoogleAuthError, getValidAccessToken } from "@/lib/oauth/google";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { GoogleAdsApiError, buscarRelatorioAds, parseVinculo } from "@/lib/google-ads/api";
import { GRANULARIDADES, type Granularidade } from "@/lib/periodo";

// As datas entram na consulta GAQL; só aceitar o formato exato.
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/google-ads/report?conta_id=...&inicio=2026-09-01&fim=2026-09-30&granularidade=dia
export async function GET(req: NextRequest) {
  if (!req.cookies.get("sb-auth-token")?.value) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const p = req.nextUrl.searchParams;
  const contaId = p.get("conta_id");
  const inicio = p.get("inicio");
  const fim = p.get("fim");
  const granularidade = (p.get("granularidade") ?? "dia") as Granularidade;

  if (!contaId || !inicio || !fim || !DATA_ISO.test(inicio) || !DATA_ISO.test(fim)) {
    return NextResponse.json({ message: "Informe conta_id, inicio e fim (AAAA-MM-DD)." }, { status: 400 });
  }
  if (!GRANULARIDADES.includes(granularidade)) {
    return NextResponse.json({ message: "granularidade deve ser dia, semana, mes ou ano." }, { status: 400 });
  }

  const { data: integracao } = await getSupabaseAdmin()
    .from("integracoes_oauth")
    .select("account_identifier, status")
    .eq("conta_id", contaId)
    .eq("provider", "google_ads")
    .maybeSingle();

  const vinculo = parseVinculo(integracao?.account_identifier);
  if (!integracao || integracao.status !== "conectado" || !vinculo) {
    return NextResponse.json(
      { message: "Nenhuma conta do Google Ads vinculada a este cliente. Selecione em Integrações." },
      { status: 409 }
    );
  }

  try {
    const token = await getValidAccessToken(contaId, "google_ads");
    return NextResponse.json(await buscarRelatorioAds(token, vinculo, inicio, fim, granularidade));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar dados do Google Ads.";
    const status = err instanceof GoogleAuthError ? 401 : err instanceof GoogleAdsApiError ? 403 : 502;
    return NextResponse.json({ message }, { status });
  }
}
