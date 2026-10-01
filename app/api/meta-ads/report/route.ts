import { NextRequest, NextResponse } from "next/server";
import { GRANULARIDADES, chaveBalde, rotuloBalde, type Granularidade } from "@/lib/periodo";
import { buscarDiasMeta, ultimoDiaMeta, type DiaMeta } from "@/lib/meta/snapshots";

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

type Metricas = Omit<DiaMeta, "dia">;

const vazio = (): Metricas => ({
  investimento: 0,
  receita: 0,
  compras: 0,
  impressoes: 0,
  cliques: 0,
  visualizacoes_pagina: 0,
  adicoes_carrinho: 0,
  inicios_checkout: 0,
});

function somar(alvo: Metricas, d: Metricas) {
  (Object.keys(alvo) as (keyof Metricas)[]).forEach((k) => (alvo[k] += d[k]));
}

// GET /api/meta-ads/report?conta_id=act_...&inicio=2026-05-01&fim=2026-05-31&granularidade=dia
// Fonte: kpi_snapshots (gravado pelo n8n via System User), sem OAuth por cliente.
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

  try {
    const [dias, ultimoDia] = await Promise.all([buscarDiasMeta(contaId, inicio, fim), ultimoDiaMeta(contaId)]);

    const baldes = new Map<string, Metricas>();
    const totais = vazio();
    for (const { dia, ...m } of dias) {
      const chave = chaveBalde(dia, granularidade);
      const b = baldes.get(chave) ?? vazio();
      somar(b, m);
      somar(totais, m);
      baldes.set(chave, b);
    }

    return NextResponse.json({
      periodo: { inicio, fim, granularidade },
      ultimo_dia_disponivel: ultimoDia,
      linhas: Array.from(baldes.keys())
        .sort()
        .map((k) => ({ dimensao: rotuloBalde(k, granularidade), ...baldes.get(k)! })),
      totais,
      // Pontos diários para o gráfico Investimento × ROAS (sempre por dia, independente do agrupamento).
      pontos_diarios: dias
        .filter((d) => d.investimento > 0)
        .map((d) => ({ dia: rotuloBalde(d.dia, "dia"), investimento: d.investimento, roas: d.receita / d.investimento })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar dados do Meta Ads.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
