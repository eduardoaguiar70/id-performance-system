import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getValidAccessToken } from "@/lib/oauth/google";
import { buscarRelatorioGa4 } from "@/lib/ga4/report";
import { buscarRelatorioAds, parseVinculo } from "@/lib/google-ads/api";
import { buscarDiasMeta, ultimoDiaMeta } from "@/lib/meta/snapshots";
import { GRANULARIDADES, chaveBalde, rotuloBalde, type Granularidade } from "@/lib/periodo";
import { CANAIS, classificarCanal, type Canal } from "@/lib/ecommerce/canais";

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

interface Balde {
  investimento_meta: number;
  investimento_google: number;
  faturamento: number;
  pedidos: number;
  sessoes: number;
}

type Fonte = { ok: true; detalhe?: string } | { ok: false; motivo: string };

const vazio = (): Balde => ({ investimento_meta: 0, investimento_google: 0, faturamento: 0, pedidos: 0, sessoes: 0 });

// "18/09/2026" -> "2026-09-18"
const isoDeRotuloDia = (r: string) => r.split("/").reverse().join("-");

const motivo = (err: unknown) => (err instanceof Error ? err.message : "Indisponível");

// GET /api/ecommerce/visao-geral?conta_id=...&inicio=...&fim=...&granularidade=dia
// Faturamento e pedidos vêm do GA4 até o Shopify estar conectado.
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

  const { data: integracoes } = await getSupabaseAdmin()
    .from("integracoes_oauth")
    .select("provider, account_identifier, status")
    .eq("conta_id", contaId);
  const integ = (prov: string) => integracoes?.find((i) => i.provider === prov && i.status === "conectado");

  // As três fontes rodam em paralelo; uma falhar não derruba as outras.
  const [ga4Res, metaRes, googleRes] = await Promise.allSettled([
    (async () => {
      const propertyId = integ("ga4")?.account_identifier;
      if (!propertyId?.startsWith("properties/")) throw new Error("GA4 não conectado ou sem propriedade vinculada.");
      const token = await getValidAccessToken(contaId, "ga4");
      return buscarRelatorioGa4(token, propertyId, inicio, fim, "dia", {}, new Map());
    })(),
    Promise.all([buscarDiasMeta(contaId, inicio, fim), ultimoDiaMeta(contaId)]),
    (async () => {
      const vinculo = parseVinculo(integ("google_ads")?.account_identifier);
      if (!vinculo) throw new Error("Google Ads não conectado ou sem conta vinculada.");
      const token = await getValidAccessToken(contaId, "google_ads");
      return buscarRelatorioAds(token, vinculo, inicio, fim, "dia");
    })(),
  ]);

  const baldes = new Map<string, Balde>();
  const balde = (diaIso: string) => {
    const k = chaveBalde(diaIso, granularidade);
    const b = baldes.get(k) ?? vazio();
    baldes.set(k, b);
    return b;
  };

  const fontes: Record<"ga4" | "meta" | "google_ads", Fonte> = {
    ga4: { ok: false, motivo: "" },
    meta: { ok: false, motivo: "" },
    google_ads: { ok: false, motivo: "" },
  };

  let funil = { visualizacoes_pagina: 0, adicoes_carrinho: 0, inicios_checkout: 0, compras: 0 };
  const canais = new Map<Canal, number>(CANAIS.map((c) => [c, 0]));

  if (ga4Res.status === "fulfilled") {
    const r = ga4Res.value;
    fontes.ga4 = { ok: true };
    for (const l of r.linhas) {
      const b = balde(isoDeRotuloDia(l.dimensao));
      b.faturamento += l.receita;
      b.pedidos += l.compras;
      b.sessoes += l.sessoes;
    }
    funil = {
      visualizacoes_pagina: r.totais.visualizacoes_pagina,
      adicoes_carrinho: r.totais.adicoes_carrinho,
      inicios_checkout: r.totais.inicios_checkout,
      compras: r.totais.compras,
    };
    for (const o of r.origens) {
      const c = classificarCanal(o.source_medium);
      canais.set(c, (canais.get(c) ?? 0) + o.receita);
    }
  } else {
    fontes.ga4 = { ok: false, motivo: motivo(ga4Res.reason) };
  }

  if (metaRes.status === "fulfilled") {
    const [dias, ultimo] = metaRes.value;
    fontes.meta = ultimo
      ? { ok: true, detalhe: ultimo < fim ? `Dados até ${ultimo.split("-").reverse().join("/")}` : undefined }
      : { ok: false, motivo: "Sem dados do Meta para este cliente." };
    for (const d of dias) balde(d.dia).investimento_meta += d.investimento;
  } else {
    fontes.meta = { ok: false, motivo: motivo(metaRes.reason) };
  }

  if (googleRes.status === "fulfilled") {
    fontes.google_ads = { ok: true };
    for (const l of googleRes.value.linhas) balde(isoDeRotuloDia(l.dimensao)).investimento_google += l.investimento;
  } else {
    fontes.google_ads = { ok: false, motivo: motivo(googleRes.reason) };
  }

  const totais = vazio();
  const linhas = Array.from(baldes.keys())
    .sort()
    .map((k) => {
      const b = baldes.get(k)!;
      (Object.keys(totais) as (keyof Balde)[]).forEach((m) => (totais[m] += b[m]));
      return { dimensao: rotuloBalde(k, granularidade), ...b };
    });

  return NextResponse.json({
    periodo: { inicio, fim, granularidade },
    fontes,
    linhas,
    totais,
    funil,
    canais: CANAIS.map((c) => ({ canal: c, receita: canais.get(c) ?? 0 })),
  });
}
