"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { AlertTriangle, CheckCircle2, Loader2, Lock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PeriodoSelector, periodoPadrao, type Periodo } from "./periodo-selector";
import {
  GRID,
  div,
  fmtBRL,
  fmtInt,
  fmtPct,
  fmtX,
  periodoAnterior,
  KpiTile,
  ChartCard,
  Funil,
  LegendaItem,
  TooltipConteudo,
  eixoProps,
} from "./shared";

interface Totais {
  investimento_meta: number;
  investimento_google: number;
  faturamento: number;
  pedidos: number;
  sessoes: number;
}

type Fonte = { ok: true; detalhe?: string } | { ok: false; motivo: string };

interface Resposta {
  fontes: Record<"ga4" | "meta" | "google_ads", Fonte>;
  linhas: (Totais & { dimensao: string })[];
  totais: Totais;
  funil: { visualizacoes_pagina: number; adicoes_carrinho: number; inicios_checkout: number; compras: number };
  canais: { canal: string; receita: number }[];
}

// Cores fixas por entidade (paleta dark validada em #171717).
const COR_META = "#3987e5";
const COR_GOOGLE = "#d95926";
const COR_FATURAMENTO = "#199e70";
const COR_CANAL: Record<string, string> = {
  "Meta Ads": "#3987e5",
  "Google Ads": "#d95926",
  "TikTok Ads": "#199e70",
  "Tráfego Direto": "#c98500",
  "Busca Orgânica": "#d55181",
  "E-mail / Newsletter": "#008300",
  Outros: "#6b6b6b",
};

const NOMES_FONTE = { ga4: "Google Analytics 4", meta: "Meta Ads", google_ads: "Google Ads" } as const;

function derivar(t: Totais) {
  const investimento = t.investimento_meta + t.investimento_google;
  return {
    investimento,
    cpa: div(investimento, t.pedidos),
    taxa_conversao: div(t.pedidos * 100, t.sessoes),
    ticket_medio: div(t.faturamento, t.pedidos),
    roas: div(t.faturamento, investimento),
  };
}

function KpiPendente({ label, motivo }: { label: string; motivo: string }) {
  return (
    <div className="border border-dashed border-border/60 bg-card/50 p-4 flex flex-col gap-2 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground truncate">{label}</p>
      <p className="text-xl font-bold tracking-tight text-muted-foreground/50">—</p>
      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
        <Lock className="w-3 h-3" /> {motivo}
      </p>
    </div>
  );
}

function PainelFontes({ fontes }: { fontes: Resposta["fontes"] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(NOMES_FONTE) as (keyof typeof NOMES_FONTE)[]).map((k) => {
        const f = fontes[k];
        const Icone = f.ok ? (f.detalhe ? AlertTriangle : CheckCircle2) : XCircle;
        return (
          <span
            key={k}
            title={f.ok ? f.detalhe : f.motivo}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] border",
              f.ok && !f.detalhe && "border-green-500/30 text-green-400",
              f.ok && f.detalhe && "border-yellow-500/30 text-yellow-400",
              !f.ok && "border-border text-muted-foreground"
            )}
          >
            <Icone className="w-3 h-3" />
            {NOMES_FONTE[k]}
            <span className="text-muted-foreground">
              · {f.ok ? f.detalhe ?? "ok" : f.motivo.includes("não conectado") ? "não conectado" : "indisponível"}
            </span>
          </span>
        );
      })}
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] border border-border text-muted-foreground">
        <Lock className="w-3 h-3" /> Shopify · não conectado
      </span>
    </div>
  );
}

export function VisaoGeralTab({ contaId }: { contaId: string }) {
  const [periodo, setPeriodo] = useState<Periodo>(periodoPadrao);
  const [atual, setAtual] = useState<Resposta | null>(null);
  const [anterior, setAnterior] = useState<Resposta | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setErro(null);
    const ant = periodoAnterior(periodo.inicio, periodo.fim);
    const url = (inicio: string, fim: string) =>
      `/api/ecommerce/visao-geral?${new URLSearchParams({ conta_id: contaId, inicio, fim, granularidade: periodo.granularidade })}`;
    const buscar = (u: string) =>
      fetch(u, { signal: controller.signal }).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message ?? "Erro ao carregar a visão geral.");
        return data as Resposta;
      });

    Promise.all([buscar(url(periodo.inicio, periodo.fim)), buscar(url(ant.inicio, ant.fim))])
      .then(([a, b]) => {
        setAtual(a);
        setAnterior(b);
      })
      .catch((e: Error) => e.name !== "AbortError" && setErro(e.message))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [contaId, periodo]);

  const kpis = useMemo(() => {
    if (!atual) return null;
    const d = derivar(atual.totais);
    const dAnt = anterior ? derivar(anterior.totais) : null;
    const t = atual.totais;
    const tAnt = anterior?.totais;
    return [
      { label: "Investimento", valor: fmtBRL(d.investimento), atual: d.investimento, anterior: dAnt?.investimento ?? null, menorMelhor: true },
      { label: "Faturamento (GA4)", valor: fmtBRL(t.faturamento), atual: t.faturamento, anterior: tAnt?.faturamento ?? null },
      { label: "Pedidos (GA4)", valor: fmtInt(t.pedidos), atual: t.pedidos, anterior: tAnt?.pedidos ?? null },
      { label: "CPA", valor: fmtBRL(d.cpa), atual: d.cpa, anterior: dAnt?.cpa ?? null, menorMelhor: true },
      { label: "Taxa de Conversão", valor: fmtPct(d.taxa_conversao), atual: d.taxa_conversao, anterior: dAnt?.taxa_conversao ?? null },
      { label: "Ticket Médio", valor: fmtBRL(d.ticket_medio), atual: d.ticket_medio, anterior: dAnt?.ticket_medio ?? null },
      { label: "ROAS Blended", valor: fmtX(d.roas), atual: d.roas, anterior: dAnt?.roas ?? null },
    ];
  }, [atual, anterior]);

  const serie = useMemo(() => atual?.linhas ?? [], [atual]);
  const canais = useMemo(() => {
    const lista = (atual?.canais ?? []).filter((c) => c.receita > 0);
    const total = lista.reduce((s, c) => s + c.receita, 0);
    return lista.map((c) => ({ ...c, pct: total > 0 ? (c.receita / total) * 100 : 0 }));
  }, [atual]);

  const ga4Ok = atual?.fontes.ga4.ok ?? false;
  const temGoogle = atual?.fontes.google_ads.ok ?? false;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 border border-border/50 bg-card p-4">
        <PeriodoSelector value={periodo} onChange={setPeriodo} />
        <div className="flex items-center justify-between gap-3">
          {atual ? <PainelFontes fontes={atual.fontes} /> : <span />}
          {loading && atual && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />}
        </div>
      </div>

      {erro && (
        <div className="px-4 py-3 border border-red-500/30 bg-red-500/5 text-sm text-foreground/80 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          {erro}
        </div>
      )}

      {atual && !ga4Ok && (
        <div className="px-4 py-3 border border-yellow-500/30 bg-yellow-500/5 text-sm text-foreground/80 flex items-center gap-3 flex-wrap">
          <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <span className="flex-1">
            Faturamento, pedidos e conversão vêm do GA4 até o Shopify ser conectado. Conecte o GA4 deste cliente para ver esses números.
          </span>
          <Link href="/integracoes" className="text-xs text-primary hover:underline">
            Ir para Integrações →
          </Link>
        </div>
      )}

      {!atual && loading ? (
        <div className="flex items-center justify-center min-h-[300px] text-muted-foreground gap-2 text-sm">
          <Loader2 className="w-5 h-5 animate-spin" /> Consolidando fontes de dados...
        </div>
      ) : atual && kpis ? (
        <div className={cn("flex flex-col gap-6 transition-opacity", loading && "opacity-60")}>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {kpis.map((k) => (
              <KpiTile key={k.label} {...k} />
            ))}
            <KpiPendente label="ROI" motivo="Requer Shopify + custos" />
            <KpiPendente label="CAC (novos clientes)" motivo="Requer Shopify" />
            <KpiPendente label="LTV" motivo="Requer Shopify" />
          </div>

          <ChartCard
            titulo="Faturamento × investimento em anúncios"
            legenda={
              <div className="flex flex-wrap gap-4">
                <LegendaItem cor={COR_META} label="Investimento Meta" />
                {temGoogle && <LegendaItem cor={COR_GOOGLE} label="Investimento Google" />}
                <LegendaItem cor={COR_FATURAMENTO} label="Faturamento" />
              </div>
            }
          >
            {derivar(atual.totais).investimento === 0 && atual.totais.faturamento === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem investimento nem faturamento no período.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  {/* Investimento e faturamento são ambos R$: um único eixo, sem distorção de escala. */}
                  <ComposedChart data={serie} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="dimensao" {...eixoProps} minTickGap={24} />
                    <YAxis {...eixoProps} width={72} tickFormatter={(v) => fmtBRL(Number(v)).replace(",00", "")} />
                    <Tooltip cursor={{ fill: "hsl(0 0% 100% / 0.04)" }} content={<TooltipConteudo formato={(v) => fmtBRL(v)} />} />
                    <Bar dataKey="investimento_meta" name="Investimento Meta" stackId="inv" fill={COR_META} radius={temGoogle ? 0 : [4, 4, 0, 0]} maxBarSize={28} />
                    {temGoogle && (
                      <Bar dataKey="investimento_google" name="Investimento Google" stackId="inv" fill={COR_GOOGLE} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    )}
                    <Line type="monotone" dataKey="faturamento" name="Faturamento" stroke={COR_FATURAMENTO} strokeWidth={2} dot={serie.length <= 1 ? { r: 4 } : false} activeDot={{ r: 5, stroke: "#171717", strokeWidth: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ChartCard titulo="Funil de conversão do e-commerce (GA4)">
              {!ga4Ok ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Requer GA4 conectado.</p>
              ) : (
                <>
                  <Funil
                    etapas={[
                      { label: "Visualizações de página", valor: atual.funil.visualizacoes_pagina },
                      { label: "Adições ao carrinho", valor: atual.funil.adicoes_carrinho },
                      { label: "Início do checkout", valor: atual.funil.inicios_checkout },
                      { label: "Compras", valor: atual.funil.compras },
                    ]}
                  />
                  {atual.funil.visualizacoes_pagina > 0 && atual.funil.adicoes_carrinho === 0 && (
                    <p className="text-[11px] text-yellow-400/80">
                      Nenhum evento de e-commerce (add_to_cart, begin_checkout, purchase) registrado no GA4 deste cliente.
                    </p>
                  )}
                </>
              )}
            </ChartCard>

            <ChartCard titulo="Participação da receita por canal (GA4)">
              {canais.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  {ga4Ok ? "Nenhuma receita atribuída no período." : "Requer GA4 conectado."}
                </p>
              ) : (
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="h-52 w-52 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={canais} dataKey="receita" nameKey="canal" innerRadius="60%" outerRadius="100%" stroke="#171717" strokeWidth={2} isAnimationActive={false}>
                          {canais.map((c) => (
                            <Cell key={c.canal} fill={COR_CANAL[c.canal]} />
                          ))}
                        </Pie>
                        <Tooltip content={<TooltipConteudo formato={(v) => fmtBRL(v)} />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="flex-1 min-w-[180px] space-y-1.5">
                    {canais.map((c) => (
                      <li key={c.canal} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COR_CANAL[c.canal] }} />
                        <span className="flex-1 text-muted-foreground">{c.canal}</span>
                        <span className="tabular-nums text-foreground">{fmtBRL(c.receita)}</span>
                        <span className="tabular-nums text-muted-foreground w-12 text-right">{c.pct.toFixed(1)}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </ChartCard>
          </div>

          <div className="border border-dashed border-border/60 bg-card/50 p-5 flex items-center gap-3 text-sm text-muted-foreground">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong className="text-foreground/80">Tendência LTV × CAC</strong> — disponível após conectar o Shopify (precisa
              do histórico de compras por cliente).
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
