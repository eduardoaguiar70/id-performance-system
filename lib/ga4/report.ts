import { chaveBalde, rotuloBalde, type Granularidade } from "@/lib/periodo";

export type { Granularidade };

export interface Ga4Filtros {
  utm_source?: string[];
  utm_medium?: string[];
  utm_campaign?: string[];
  utm_term?: string[];
}

export interface Ga4Linha {
  dimensao: string;
  investimento: number;
  sessoes: number;
  sessoes_midia: number;
  usuarios_ativos: number;
  visualizacoes_pagina: number;
  adicoes_carrinho: number;
  inicios_checkout: number;
  compras: number;
  receita: number;
}

export interface Ga4Origem {
  source_medium: string;
  sessoes: number;
  compras: number;
  receita: number;
}

export interface Ga4Relatorio {
  property_id: string;
  periodo: { inicio: string; fim: string; granularidade: Granularidade };
  linhas: Ga4Linha[];
  totais: Omit<Ga4Linha, "dimensao">;
  origens: Ga4Origem[];
  opcoes_filtro: Required<Ga4Filtros>;
}

const DIMENSAO_UTM: Record<keyof Ga4Filtros, string> = {
  utm_source: "sessionSource",
  utm_medium: "sessionMedium",
  utm_campaign: "sessionCampaignName",
  utm_term: "sessionManualTerm",
};

// Ordem importa: os índices são usados para ler metricValues.
const METRICAS = [
  "sessions",
  "activeUsers",
  "screenPageViews",
  "addToCarts",
  "checkouts",
  "ecommercePurchases",
  "purchaseRevenue",
];

// Canais do GA4 considerados mídia paga para "% Sessões Mídia".
const CANAIS_PAGOS = new Set([
  "Paid Search",
  "Paid Social",
  "Paid Shopping",
  "Paid Video",
  "Paid Other",
  "Display",
  "Cross-network",
  "Audio",
]);

interface ReportRow {
  dimensionValues: { value: string }[];
  metricValues: { value: string }[];
}

function buildFiltro(filtros: Ga4Filtros) {
  const expressions = (Object.keys(DIMENSAO_UTM) as (keyof Ga4Filtros)[])
    .filter((k) => filtros[k]?.length)
    .map((k) => ({
      filter: { fieldName: DIMENSAO_UTM[k], inListFilter: { values: filtros[k] } },
    }));
  return expressions.length ? { andGroup: { expressions } } : undefined;
}

// GA4 é sempre consultado por dia e agrupado aqui, para o investimento (vindo de outras fontes) usar os mesmos baldes.
const num = (v?: string) => Number(v ?? 0) || 0;

function linhaVazia(dimensao: string): Ga4Linha {
  return {
    dimensao,
    investimento: 0,
    sessoes: 0,
    sessoes_midia: 0,
    usuarios_ativos: 0,
    visualizacoes_pagina: 0,
    adicoes_carrinho: 0,
    inicios_checkout: 0,
    compras: 0,
    receita: 0,
  };
}

function somarMetricas(alvo: Ga4Linha, m: { value: string }[], pago: boolean) {
  alvo.sessoes += num(m[0]?.value);
  if (pago) alvo.sessoes_midia += num(m[0]?.value);
  alvo.usuarios_ativos += num(m[1]?.value);
  alvo.visualizacoes_pagina += num(m[2]?.value);
  alvo.adicoes_carrinho += num(m[3]?.value);
  alvo.inicios_checkout += num(m[4]?.value);
  alvo.compras += num(m[5]?.value);
  alvo.receita += num(m[6]?.value);
}

export async function buscarRelatorioGa4(
  accessToken: string,
  propertyId: string,
  inicio: string,
  fim: string,
  granularidade: Granularidade,
  filtros: Ga4Filtros,
  investimentoPorDia: Map<string, number>
): Promise<Ga4Relatorio> {
  const dateRanges = [{ startDate: inicio, endDate: fim }];
  const dimensionFilter = buildFiltro(filtros);
  const metrics = METRICAS.map((name) => ({ name }));

  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/${propertyId}:batchRunReports`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        // 0: série temporal quebrada por canal (para total e sessões de mídia)
        {
          dateRanges,
          dimensions: [{ name: "date" }, { name: "sessionDefaultChannelGroup" }],
          metrics,
          dimensionFilter,
          limit: 100000,
        },
        // 1: origens de tráfego (treemap)
        {
          dateRanges,
          dimensions: [{ name: "sessionSourceMedium" }],
          metrics: [{ name: "sessions" }, { name: "ecommercePurchases" }, { name: "purchaseRevenue" }],
          dimensionFilter,
          orderBys: [{ metric: { metricName: "purchaseRevenue" }, desc: true }],
          limit: 50,
        },
        // 2: valores disponíveis para os filtros de UTM (sem aplicar filtro)
        {
          dateRanges,
          dimensions: Object.values(DIMENSAO_UTM).map((name) => ({ name })),
          metrics: [{ name: "sessions" }],
          limit: 10000,
        },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `GA4 Data API retornou ${res.status}`);

  const [serie, origens, opcoes] = data.reports as { rows?: ReportRow[] }[];

  const porDimensao = new Map<string, Ga4Linha>();
  const totais = linhaVazia("Total");
  for (const row of serie.rows ?? []) {
    const v = row.dimensionValues[0].value;
    const chave = chaveBalde(`${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`, granularidade);
    const pago = CANAIS_PAGOS.has(row.dimensionValues[1].value);
    const linha = porDimensao.get(chave) ?? linhaVazia(chave);
    somarMetricas(linha, row.metricValues, pago);
    somarMetricas(totais, row.metricValues, pago);
    porDimensao.set(chave, linha);
  }

  investimentoPorDia.forEach((valor, dia) => {
    if (dia < inicio || dia > fim) return;
    const chave = chaveBalde(dia, granularidade);
    const linha = porDimensao.get(chave) ?? linhaVazia(chave);
    linha.investimento += valor;
    totais.investimento += valor;
    porDimensao.set(chave, linha);
  });

  const linhas = Array.from(porDimensao.values())
    .sort((a, b) => a.dimensao.localeCompare(b.dimensao))
    .map((l) => ({ ...l, dimensao: rotuloBalde(l.dimensao, granularidade) }));

  const sets = { utm_source: new Set<string>(), utm_medium: new Set<string>(), utm_campaign: new Set<string>(), utm_term: new Set<string>() };
  const chavesUtm = Object.keys(DIMENSAO_UTM) as (keyof Ga4Filtros)[];
  for (const row of opcoes.rows ?? []) {
    chavesUtm.forEach((k, i) => {
      const v = row.dimensionValues[i].value;
      if (v && v !== "(not set)" && v !== "(data not available)") sets[k].add(v);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { dimensao: _omit, ...totaisSemDimensao } = totais;

  return {
    property_id: propertyId,
    periodo: { inicio, fim, granularidade },
    linhas,
    totais: totaisSemDimensao,
    origens: (origens.rows ?? []).map((r) => ({
      source_medium: r.dimensionValues[0].value,
      sessoes: num(r.metricValues[0].value),
      compras: num(r.metricValues[1].value),
      receita: num(r.metricValues[2].value),
    })),
    opcoes_filtro: {
      utm_source: Array.from(sets.utm_source).sort(),
      utm_medium: Array.from(sets.utm_medium).sort(),
      utm_campaign: Array.from(sets.utm_campaign).sort(),
      utm_term: Array.from(sets.utm_term).sort(),
    },
  };
}
