import { NextRequest, NextResponse } from "next/server";
import { GoogleAuthError, getValidAccessToken } from "@/lib/oauth/google";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { buscarRelatorioGa4, type Ga4Filtros } from "@/lib/ga4/report";
import { GRANULARIDADES, type Granularidade } from "@/lib/periodo";
import { buscarDiasMeta } from "@/lib/meta/snapshots";

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/ga4/report?conta_id=...&inicio=2026-09-01&fim=2026-09-30&granularidade=dia
//   &utm_source=google,facebook&utm_medium=cpc&utm_campaign=...&utm_term=...
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

  const lista = (k: string) => p.get(k)?.split(",").map((v) => v.trim()).filter(Boolean);
  const filtros: Ga4Filtros = {
    utm_source: lista("utm_source"),
    utm_medium: lista("utm_medium"),
    utm_campaign: lista("utm_campaign"),
    utm_term: lista("utm_term"),
  };

  const { data: integracao } = await getSupabaseAdmin()
    .from("integracoes_oauth")
    .select("account_identifier")
    .eq("conta_id", contaId)
    .eq("provider", "ga4")
    .maybeSingle();

  const propertyId = integracao?.account_identifier;
  if (!propertyId?.startsWith("properties/")) {
    return NextResponse.json(
      { message: "Nenhuma propriedade GA4 vinculada a este cliente. Selecione em Integrações." },
      { status: 409 }
    );
  }

  try {
    // Investimento: hoje só Meta. Google Ads entra quando o token tiver acesso de produção.
    const investimentoPorDia = new Map(
      (await buscarDiasMeta(contaId, inicio, fim)).map((d) => [d.dia, d.investimento])
    );
    const token = await getValidAccessToken(contaId, "ga4");
    const relatorio = await buscarRelatorioGa4(token, propertyId, inicio, fim, granularidade, filtros, investimentoPorDia);
    return NextResponse.json(relatorio);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar dados do GA4.";
    return NextResponse.json({ message }, { status: err instanceof GoogleAuthError ? 401 : 502 });
  }
}
