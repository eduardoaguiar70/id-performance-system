import { getSupabaseAdmin } from "@/lib/supabase-admin";

export interface DiaMeta {
  dia: string;
  investimento: number;
  receita: number;
  compras: number;
  impressoes: number;
  cliques: number;
  visualizacoes_pagina: number;
  adicoes_carrinho: number;
  inicios_checkout: number;
}

const num = (v: unknown) => Number(v ?? 0) || 0;

// O n8n recaptura o mesmo dia várias vezes (valores parciais → completos), gerando linhas repetidas
// em kpi_snapshots. Só a captura mais recente de cada dia vale; somar todas infla os totais.
export async function buscarDiasMeta(contaId: string, inicio: string, fim: string): Promise<DiaMeta[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("kpi_snapshots")
    .select(
      "periodo_inicio, criado_em, investimento_total, receita_atribuida, cac, impressoes, cliques, landing_page_views, add_to_cart, initiate_checkout"
    )
    .eq("conta_id", contaId)
    .gte("periodo_inicio", inicio)
    .lte("periodo_inicio", fim)
    .order("criado_em", { ascending: true });

  if (error) throw new Error(error.message);

  const porDia = new Map<string, DiaMeta>();
  for (const r of data ?? []) {
    const investimento = num(r.investimento_total);
    const cac = num(r.cac);
    const dia = String(r.periodo_inicio).slice(0, 10);
    porDia.set(dia, {
      dia,
      investimento,
      receita: num(r.receita_atribuida),
      // kpi_snapshots não guarda compras; o n8n grava CAC = investimento ÷ compras.
      compras: cac > 0 ? Math.round(investimento / cac) : 0,
      impressoes: num(r.impressoes),
      cliques: num(r.cliques),
      visualizacoes_pagina: num(r.landing_page_views),
      adicoes_carrinho: num(r.add_to_cart),
      inicios_checkout: num(r.initiate_checkout),
    });
  }
  return Array.from(porDia.values()).sort((a, b) => a.dia.localeCompare(b.dia));
}

export async function ultimoDiaMeta(contaId: string): Promise<string | null> {
  const { data } = await getSupabaseAdmin()
    .from("kpi_snapshots")
    .select("periodo_inicio")
    .eq("conta_id", contaId)
    .order("periodo_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? String(data.periodo_inicio).slice(0, 10) : null;
}
