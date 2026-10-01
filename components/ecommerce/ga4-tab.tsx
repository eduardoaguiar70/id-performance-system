"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from "recharts";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PeriodoSelector, periodoPadrao, type Periodo } from "./periodo-selector";
import { MultiSelect } from "./multi-select";
import {
  SERIE_1,
  SERIE_2,
  GRID,
  TEXTO_EIXO,
  div,
  fmtBRL,
  fmtInt,
  fmtPct,
  fmtX,
  periodoAnterior,
  KpiTile,
  ChartCard,
  LegendaItem,
  TooltipConteudo,
  eixoProps,
  rotuloFinal,
  TabelaPeriodo,
  type ColunaTabela,
} from "./shared";

interface Linha {
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

interface Relatorio {
  linhas: Linha[];
  totais: Omit<Linha, "dimensao">;
  origens: { source_medium: string; sessoes: number; compras: number; receita: number }[];
  opcoes_filtro: Record<FiltroKey, string[]>;
}

type FiltroKey = "utm_source" | "utm_medium" | "utm_campaign" | "utm_term";
type Filtros = Record<FiltroKey, string[]>;

const FILTROS: { key: FiltroKey; label: string }[] = [
  { key: "utm_source", label: "Source" },
  { key: "utm_medium", label: "Medium" },
  { key: "utm_campaign", label: "Campaign" },
  { key: "utm_term", label: "Term" },
];

const FILTROS_VAZIOS: Filtros = { utm_source: [], utm_medium: [], utm_campaign: [], utm_term: [] };

// ---------------------------------------------------------------------------
// Métricas derivadas (fórmulas da especificação da sub-aba GA4)
// ---------------------------------------------------------------------------

function derivar(l: Omit<Linha, "dimensao">) {
  return {
    cpa: div(l.investimento, l.compras),
    custo_sessao: div(l.investimento, l.sessoes),
    pct_midia: div(l.sessoes_midia * 100, l.sessoes),
    taxa_conversao: div(l.compras * 100, l.sessoes),
    ticket_medio: div(l.receita, l.compras),
    roas: div(l.receita, l.investimento),
  };
}


function montarUrl(contaId: string, inicio: string, fim: string, granularidade: string, filtros: Filtros) {
  const p = new URLSearchParams({ conta_id: contaId, inicio, fim, granularidade });
  FILTROS.forEach(({ key }) => filtros[key].length && p.set(key, filtros[key].join(",")));
  return `/api/ga4/report?${p.toString()}`;
}

// ---------------------------------------------------------------------------
// Aba GA4
// ---------------------------------------------------------------------------
export function Ga4Tab({ contaId }: { contaId: string }) {
  const [periodo, setPeriodo] = useState<Periodo>(periodoPadrao);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [atual, setAtual] = useState<Relatorio | null>(null);
  const [anterior, setAnterior] = useState<Relatorio | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<{ mensagem: string; semPropriedade: boolean } | null>(null);
  const [metricaOrigem, setMetricaOrigem] = useState<"receita" | "sessoes">("sessoes");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setErro(null);

    const ant = periodoAnterior(periodo.inicio, periodo.fim);
    const buscar = (url: string) =>
      fetch(url, { signal: controller.signal }).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw Object.assign(new Error(data.message ?? "Erro ao buscar dados do GA4."), { status: res.status });
        return data as Relatorio;
      });

    Promise.all([
      buscar(montarUrl(contaId, periodo.inicio, periodo.fim, periodo.granularidade, filtros)),
      buscar(montarUrl(contaId, ant.inicio, ant.fim, periodo.granularidade, filtros)),
    ])
      .then(([a, b]) => {
        setAtual(a);
        setAnterior(b);
        // Se a seleção de origem atual tiver receita, mostra receita por padrão.
        setMetricaOrigem(a.origens.some((o) => o.receita > 0) ? "receita" : "sessoes");
      })
      .catch((err: Error & { status?: number }) => {
        if (err.name === "AbortError") return;
        setErro({ mensagem: err.message, semPropriedade: err.status === 409 });
      })
      .finally(() => !controller.signal.aborted && setLoading(false));

    return () => controller.abort();
  }, [contaId, periodo, filtros]);

  const kpis = useMemo(() => {
    if (!atual) return null;
    const d = derivar(atual.totais);
    const dAnt = anterior ? derivar(anterior.totais) : null;
    const t = atual.totais;
    const tAnt = anterior?.totais;
    return [
      { label: "Investimento", valor: fmtBRL(t.investimento), atual: t.investimento, anterior: tAnt?.investimento ?? null, menorMelhor: true },
      { label: "Sessões", valor: fmtInt(t.sessoes), atual: t.sessoes, anterior: tAnt?.sessoes ?? null },
      { label: "Compras", valor: fmtInt(t.compras), atual: t.compras, anterior: tAnt?.compras ?? null },
      { label: "Receita Analytics", valor: fmtBRL(t.receita), atual: t.receita, anterior: tAnt?.receita ?? null },
      { label: "ROAS Analytics", valor: fmtX(d.roas), atual: d.roas, anterior: dAnt?.roas ?? null },
      { label: "CPA", valor: fmtBRL(d.cpa), atual: d.cpa, anterior: dAnt?.cpa ?? null, menorMelhor: true },
      { label: "Custo por Sessão", valor: fmtBRL(d.custo_sessao), atual: d.custo_sessao, anterior: dAnt?.custo_sessao ?? null, menorMelhor: true },
      { label: "% Sessões Mídia", valor: fmtPct(d.pct_midia), atual: d.pct_midia, anterior: dAnt?.pct_midia ?? null },
      { label: "Taxa de Conversão", valor: fmtPct(d.taxa_conversao), atual: d.taxa_conversao, anterior: dAnt?.taxa_conversao ?? null },
      { label: "Ticket Médio", valor: fmtBRL(d.ticket_medio), atual: d.ticket_medio, anterior: dAnt?.ticket_medio ?? null },
    ];
  }, [atual, anterior]);

  const serie = useMemo(
    () => (atual?.linhas ?? []).map((l) => ({ ...l, taxa_conversao: derivar(l).taxa_conversao ?? 0 })),
    [atual]
  );

  const origens = useMemo(
    () =>
      [...(atual?.origens ?? [])]
        .sort((a, b) => b[metricaOrigem] - a[metricaOrigem])
        .slice(0, 10)
        .filter((o) => o[metricaOrigem] > 0),
    [atual, metricaOrigem]
  );

  const filtrosAtivos = FILTROS.some(({ key }) => filtros[key].length > 0);
  const umPonto = serie.length <= 1;

  if (erro?.semPropriedade) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground border border-border/50 bg-card gap-2 text-center px-6">
        <AlertTriangle className="h-10 w-10 opacity-40" />
        <p className="text-base font-medium text-foreground">GA4 não configurado para este cliente</p>
        <p className="text-sm">{erro.mensagem}</p>
        <Link href="/integracoes" className="mt-2 text-sm text-primary hover:underline">
          Ir para Integrações →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filtros — uma linha acima dos gráficos */}
      <div className="flex flex-col gap-3 border border-border/50 bg-card p-4">
        <PeriodoSelector value={periodo} onChange={setPeriodo} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mr-1">UTM</span>
          {FILTROS.map(({ key, label }) => (
            <MultiSelect
              key={key}
              label={label}
              options={atual?.opcoes_filtro[key] ?? []}
              value={filtros[key]}
              onChange={(v) => setFiltros((f) => ({ ...f, [key]: v }))}
            />
          ))}
          {filtrosAtivos && (
            <button
              type="button"
              onClick={() => setFiltros(FILTROS_VAZIOS)}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 ml-1"
            >
              <X className="w-3 h-3" /> Limpar filtros
            </button>
          )}
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-auto" />}
        </div>
        {filtrosAtivos && (
          <p className="text-[11px] text-muted-foreground/70">
            Filtros de UTM afetam as métricas do GA4. O investimento continua sendo o total de mídia do período.
          </p>
        )}
      </div>

      {erro && (
        <div className="px-4 py-3 border border-red-500/30 bg-red-500/5 text-sm text-foreground/80 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          {erro.mensagem}
        </div>
      )}

      {!atual && loading ? (
        <div className="flex items-center justify-center min-h-[300px] text-muted-foreground gap-2 text-sm">
          <Loader2 className="w-5 h-5 animate-spin" /> Buscando dados no Google Analytics...
        </div>
      ) : atual && kpis ? (
        <div className={cn("flex flex-col gap-6 transition-opacity", loading && "opacity-60")}>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {kpis.map((k) => (
              <KpiTile key={k.label} {...k} />
            ))}
          </div>

          {/* Gráficos de evolução: sessões e conversão em gráficos separados (escalas diferentes) */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ChartCard
              titulo="Evolução de sessões"
              legenda={
                <div className="flex gap-4">
                  <LegendaItem cor={SERIE_1} label="Sessões totais" />
                  <LegendaItem cor={SERIE_2} label="Sessões de mídia" />
                </div>
              }
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={serie} margin={{ top: 8, right: 56, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="dimensao" {...eixoProps} minTickGap={24} />
                    <YAxis {...eixoProps} width={48} tickFormatter={(v) => Number(v).toLocaleString("pt-BR")} />
                    <Tooltip
                      cursor={{ stroke: TEXTO_EIXO, strokeDasharray: "3 3" }}
                      content={<TooltipConteudo formato={(v) => fmtInt(v)} />}
                    />
                    <Line type="monotone" dataKey="sessoes" name="Sessões totais" stroke={SERIE_1} strokeWidth={2} dot={umPonto ? { r: 4 } : false} activeDot={{ r: 5, stroke: "#171717", strokeWidth: 2 }}>
                      <LabelList dataKey="sessoes" content={rotuloFinal(serie.length, SERIE_1, fmtInt)} />
                    </Line>
                    <Line type="monotone" dataKey="sessoes_midia" name="Sessões de mídia" stroke={SERIE_2} strokeWidth={2} dot={umPonto ? { r: 4 } : false} activeDot={{ r: 5, stroke: "#171717", strokeWidth: 2 }}>
                      <LabelList dataKey="sessoes_midia" content={rotuloFinal(serie.length, SERIE_2, fmtInt)} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard titulo="Taxa de conversão (compras ÷ sessões)">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={serie} margin={{ top: 8, right: 56, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="dimensao" {...eixoProps} minTickGap={24} />
                    <YAxis {...eixoProps} width={48} tickFormatter={(v) => `${Number(v).toFixed(1)}%`} />
                    <Tooltip
                      cursor={{ stroke: TEXTO_EIXO, strokeDasharray: "3 3" }}
                      content={<TooltipConteudo formato={(v) => fmtPct(v)} />}
                    />
                    <Line type="monotone" dataKey="taxa_conversao" name="Taxa de conversão" stroke={SERIE_1} strokeWidth={2} dot={umPonto ? { r: 4 } : false} activeDot={{ r: 5, stroke: "#171717", strokeWidth: 2 }}>
                      <LabelList dataKey="taxa_conversao" content={rotuloFinal(serie.length, SERIE_1, fmtPct)} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {atual.totais.compras === 0 && (
                <p className="text-[11px] text-muted-foreground/70">
                  Nenhuma compra registrada no período — verifique se o evento <code>purchase</code> está configurado no GA4.
                </p>
              )}
            </ChartCard>
          </div>

          {/* Origens de tráfego */}
          <ChartCard
            titulo="Origens de tráfego (source / medium)"
            legenda={
              <div className="flex" role="group" aria-label="Métrica das origens">
                {(["receita", "sessoes"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={metricaOrigem === m}
                    onClick={() => setMetricaOrigem(m)}
                    className={cn(
                      "px-3 py-1 text-[11px] font-semibold uppercase tracking-wider border border-border -ml-px first:ml-0",
                      metricaOrigem === m ? "bg-primary text-primary-foreground border-primary relative z-10" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {m === "receita" ? "Receita" : "Sessões"}
                  </button>
                ))}
              </div>
            }
          >
            {origens.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {metricaOrigem === "receita" ? "Nenhuma receita atribuída no período." : "Nenhuma sessão no período."}
              </p>
            ) : (
              <div style={{ height: origens.length * 36 + 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={origens} layout="vertical" margin={{ top: 0, right: 96, left: 0, bottom: 0 }} barCategoryGap={8}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="source_medium" {...eixoProps} width={220} />
                    <Tooltip
                      cursor={{ fill: "hsl(0 0% 100% / 0.04)" }}
                      content={<TooltipConteudo formato={(v) => (metricaOrigem === "receita" ? fmtBRL(v) : fmtInt(v))} />}
                    />
                    <Bar dataKey={metricaOrigem} name={metricaOrigem === "receita" ? "Receita" : "Sessões"} fill={SERIE_1} radius={[0, 4, 4, 0]} maxBarSize={22}>
                      <LabelList
                        dataKey={metricaOrigem}
                        position="right"
                        fill="hsl(0 0% 96%)"
                        fontSize={11}
                        formatter={(v: unknown) => (metricaOrigem === "receita" ? fmtBRL(Number(v)) : fmtInt(Number(v)))}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          {/* Tabela dinâmica */}
          <TabelaGa4 linhas={atual.linhas} totais={atual.totais} />
        </div>
      ) : null}
    </div>
  );
}

function TabelaGa4({ linhas, totais }: { linhas: Linha[]; totais: Omit<Linha, "dimensao"> }) {
  const colunas: ColunaTabela<Omit<Linha, "dimensao">>[] = [
    { label: "Investimento", valor: (l) => fmtBRL(l.investimento) },
    { label: "Sessões", valor: (l) => fmtInt(l.sessoes) },
    { label: "Compras", valor: (l) => fmtInt(l.compras) },
    { label: "Receita Analytics", valor: (l) => fmtBRL(l.receita) },
    { label: "CPA", valor: (l) => fmtBRL(derivar(l).cpa) },
    { label: "Custo por Sessão", valor: (l) => fmtBRL(derivar(l).custo_sessao) },
    { label: "% Sessões Mídia", valor: (l) => fmtPct(derivar(l).pct_midia) },
    { label: "Taxa de Conversão", valor: (l) => fmtPct(derivar(l).taxa_conversao) },
    { label: "Ticket Médio", valor: (l) => fmtBRL(derivar(l).ticket_medio) },
    { label: "ROAS Analytics", valor: (l) => fmtX(derivar(l).roas) },
  ];

  return <TabelaPeriodo linhas={linhas} totais={totais} colunas={colunas} />;
}
