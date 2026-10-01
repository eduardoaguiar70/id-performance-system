"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { AlertTriangle, CalendarClock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PeriodoSelector, periodoPadrao, type Periodo } from "./periodo-selector";
import {
  SERIE_1,
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
  eixoProps,
  TabelaPeriodo,
  type ColunaTabela,
} from "./shared";

interface Metricas {
  investimento: number;
  receita: number;
  compras: number;
  impressoes: number;
  cliques: number;
  visualizacoes_pagina: number;
  adicoes_carrinho: number;
  inicios_checkout: number;
}

interface Relatorio {
  ultimo_dia_disponivel: string | null;
  linhas: (Metricas & { dimensao: string })[];
  totais: Metricas;
  pontos_diarios: { dia: string; investimento: number; roas: number }[];
}

// Fórmulas da sub-aba Meta Ads da especificação.
function derivar(m: Metricas) {
  return {
    cpa: div(m.investimento, m.compras),
    custo_visualizacao: div(m.investimento, m.visualizacoes_pagina),
    taxa_conversao: div(m.compras * 100, m.visualizacoes_pagina),
    ticket_medio: div(m.receita, m.compras),
    roas: div(m.receita, m.investimento),
    ctr: div(m.cliques * 100, m.impressoes),
  };
}

const fmtData = (iso: string) => iso.split("-").reverse().join("/");

function montarUrl(contaId: string, inicio: string, fim: string, granularidade: string) {
  return `/api/meta-ads/report?${new URLSearchParams({ conta_id: contaId, inicio, fim, granularidade }).toString()}`;
}

function TooltipDispersao({ active, payload }: { active?: boolean; payload?: { payload: Relatorio["pontos_diarios"][number] }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="border border-border bg-background px-3 py-2 text-xs shadow-lg space-y-0.5">
      <p className="font-semibold text-foreground">{p.dia}</p>
      <p className="text-muted-foreground">
        Investimento: <span className="text-foreground font-medium">{fmtBRL(p.investimento)}</span>
      </p>
      <p className="text-muted-foreground">
        ROAS: <span className="text-foreground font-medium">{fmtX(p.roas)}</span>
      </p>
    </div>
  );
}

function Funil({ etapas }: { etapas: { label: string; valor: number }[] }) {
  const topo = etapas[0]?.valor || 0;
  return (
    <div className="flex flex-col gap-1">
      {etapas.map((e, i) => {
        const anterior = i > 0 ? etapas[i - 1].valor : null;
        const passagem = anterior ? (e.valor / anterior) * 100 : null;
        return (
          <div key={e.label}>
            {passagem !== null && (
              <p className="text-[11px] text-muted-foreground pl-1 py-1">
                ↓ {anterior === 0 ? "—" : `${passagem.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% passam para a próxima etapa`}
              </p>
            )}
            <div className="flex items-center gap-3">
              <span className="w-40 text-xs text-muted-foreground flex-shrink-0">{e.label}</span>
              <div className="flex-1 h-6 bg-muted/20 relative">
                <div
                  className="h-full rounded-r"
                  style={{ width: topo > 0 ? `max(2px, ${(e.valor / topo) * 100}%)` : "0", background: SERIE_1 }}
                />
              </div>
              <span className="w-24 text-right text-sm font-semibold tabular-nums">{fmtInt(e.valor)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MetaAdsTab({ contaId }: { contaId: string }) {
  const [periodo, setPeriodo] = useState<Periodo>(periodoPadrao);
  const [atual, setAtual] = useState<Relatorio | null>(null);
  const [anterior, setAnterior] = useState<Relatorio | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setErro(null);
    const ant = periodoAnterior(periodo.inicio, periodo.fim);
    const buscar = (url: string) =>
      fetch(url, { signal: controller.signal }).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message ?? "Erro ao buscar dados do Meta Ads.");
        return data as Relatorio;
      });

    Promise.all([
      buscar(montarUrl(contaId, periodo.inicio, periodo.fim, periodo.granularidade)),
      buscar(montarUrl(contaId, ant.inicio, ant.fim, periodo.granularidade)),
    ])
      .then(([a, b]) => {
        setAtual(a);
        setAnterior(b);
      })
      .catch((err: Error) => err.name !== "AbortError" && setErro(err.message))
      .finally(() => !controller.signal.aborted && setLoading(false));

    return () => controller.abort();
  }, [contaId, periodo]);

  const irParaUltimosDados = (ultimo: string) => {
    const fim = new Date(`${ultimo}T00:00:00Z`);
    const inicio = new Date(fim.getTime() - 29 * 86_400_000);
    setPeriodo((p) => ({ ...p, preset: "personalizado", inicio: inicio.toISOString().slice(0, 10), fim: ultimo }));
  };

  const kpis = useMemo(() => {
    if (!atual) return null;
    const t = atual.totais;
    const d = derivar(t);
    const tAnt = anterior?.totais;
    const dAnt = tAnt ? derivar(tAnt) : null;
    return [
      { label: "Investimento", valor: fmtBRL(t.investimento), atual: t.investimento, anterior: tAnt?.investimento ?? null, menorMelhor: true },
      { label: "Receita Gerenciador", valor: fmtBRL(t.receita), atual: t.receita, anterior: tAnt?.receita ?? null },
      { label: "ROAS Gerenciador", valor: fmtX(d.roas), atual: d.roas, anterior: dAnt?.roas ?? null },
      { label: "Compras", valor: fmtInt(t.compras), atual: t.compras, anterior: tAnt?.compras ?? null },
      { label: "CPA", valor: fmtBRL(d.cpa), atual: d.cpa, anterior: dAnt?.cpa ?? null, menorMelhor: true },
      { label: "Visualizações da Página", valor: fmtInt(t.visualizacoes_pagina), atual: t.visualizacoes_pagina, anterior: tAnt?.visualizacoes_pagina ?? null },
      { label: "Custo por Visualização", valor: fmtBRL(d.custo_visualizacao), atual: d.custo_visualizacao, anterior: dAnt?.custo_visualizacao ?? null, menorMelhor: true },
      { label: "Taxa de Conversão", valor: fmtPct(d.taxa_conversao), atual: d.taxa_conversao, anterior: dAnt?.taxa_conversao ?? null },
      { label: "Ticket Médio", valor: fmtBRL(d.ticket_medio), atual: d.ticket_medio, anterior: dAnt?.ticket_medio ?? null },
      { label: "CTR", valor: fmtPct(d.ctr), atual: d.ctr, anterior: dAnt?.ctr ?? null },
    ];
  }, [atual, anterior]);

  const semDados = atual !== null && atual.linhas.length === 0;
  const ultimo = atual?.ultimo_dia_disponivel ?? null;
  const dadosDesatualizados = ultimo !== null && ultimo < periodo.fim;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 border border-border/50 bg-card p-4">
        <PeriodoSelector value={periodo} onChange={setPeriodo} />
        <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground/70">
          <span>Fonte: coleta automática do n8n (System User · Graph API).</span>
          {loading && atual && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      {erro && (
        <div className="px-4 py-3 border border-red-500/30 bg-red-500/5 text-sm text-foreground/80 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          {erro}
        </div>
      )}

      {dadosDesatualizados && (
        <div className="px-4 py-3 border border-yellow-500/30 bg-yellow-500/5 text-sm text-foreground/80 flex items-center gap-3 flex-wrap">
          <CalendarClock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <span className="flex-1">
            Os dados do Meta deste cliente vão só até <strong>{fmtData(ultimo!)}</strong>. A coleta do n8n parou de gravar depois dessa data.
          </span>
          {semDados && (
            <button
              type="button"
              onClick={() => irParaUltimosDados(ultimo!)}
              className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10"
            >
              Ver últimos 30 dias com dados
            </button>
          )}
        </div>
      )}

      {!atual && loading ? (
        <div className="flex items-center justify-center min-h-[300px] text-muted-foreground gap-2 text-sm">
          <Loader2 className="w-5 h-5 animate-spin" /> Carregando dados do Meta Ads...
        </div>
      ) : atual && ultimo === null ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground border border-border/50 bg-card gap-2 text-center px-6">
          <AlertTriangle className="h-10 w-10 opacity-40" />
          <p className="text-base font-medium text-foreground">Nenhum dado do Meta Ads para este cliente</p>
          <p className="text-sm">A coleta do n8n ainda não gravou nenhum dia para esta conta.</p>
        </div>
      ) : atual && kpis ? (
        <div className={cn("flex flex-col gap-6 transition-opacity", loading && "opacity-60")}>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {kpis.map((k) => (
              <KpiTile key={k.label} {...k} />
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ChartCard titulo="Investimento × ROAS por dia">
              {atual.pontos_diarios.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Sem investimento no período.</p>
              ) : (
                <>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid stroke={GRID} />
                        <XAxis
                          type="number"
                          dataKey="investimento"
                          name="Investimento"
                          {...eixoProps}
                          tickFormatter={(v) => fmtBRL(Number(v)).replace(",00", "")}
                        />
                        <YAxis type="number" dataKey="roas" name="ROAS" {...eixoProps} width={40} tickFormatter={(v) => `${Number(v).toFixed(1)}x`} />
                        <ZAxis range={[80, 80]} />
                        <Tooltip cursor={{ stroke: TEXTO_EIXO, strokeDasharray: "3 3" }} content={<TooltipDispersao />} />
                        <Scatter data={atual.pontos_diarios} fill={SERIE_1} stroke="#171717" strokeWidth={2} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[11px] text-muted-foreground/70">
                    Cada ponto é um dia. Se o ROAS cai nos dias de maior investimento, o orçamento passou do ponto ideal de escala.
                  </p>
                </>
              )}
            </ChartCard>

            <ChartCard titulo="Funil do anúncio">
              <Funil
                etapas={[
                  { label: "Impressões", valor: atual.totais.impressoes },
                  { label: "Cliques", valor: atual.totais.cliques },
                  { label: "Visualizações da página", valor: atual.totais.visualizacoes_pagina },
                  { label: "Compras", valor: atual.totais.compras },
                ]}
              />
              {atual.totais.cliques > 0 && atual.totais.visualizacoes_pagina === 0 ? (
                <p className="text-[11px] text-yellow-400/80">
                  A coleta do n8n não está gravando visualizações da página (landing_page_views). Por isso Custo por
                  Visualização e Taxa de Conversão aparecem como &quot;—&quot;.
                </p>
              ) : atual.totais.cliques > 0 && atual.totais.visualizacoes_pagina / atual.totais.cliques < 0.6 && (
                <p className="text-[11px] text-yellow-400/80">
                  Menos de 60% dos cliques viram visualização da página — pode indicar site lento ou pixel com falha.
                </p>
              )}
            </ChartCard>
          </div>

          <TabelaMeta linhas={atual.linhas} totais={atual.totais} />
          <p className="text-[11px] text-muted-foreground/60">
            Compras são calculadas a partir do CAC gravado pela coleta (investimento ÷ CAC), pois a tabela não armazena o número de compras diretamente.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function TabelaMeta({ linhas, totais }: { linhas: (Metricas & { dimensao: string })[]; totais: Metricas }) {
  const colunas: ColunaTabela<Metricas>[] = [
    { label: "Investimento Tráfego", valor: (l) => fmtBRL(l.investimento) },
    { label: "Visualizações da Página", valor: (l) => fmtInt(l.visualizacoes_pagina) },
    { label: "Compras", valor: (l) => fmtInt(l.compras) },
    { label: "Receita Gerenciador", valor: (l) => fmtBRL(l.receita) },
    { label: "CPA", valor: (l) => fmtBRL(derivar(l).cpa) },
    { label: "Custo por Visualização", valor: (l) => fmtBRL(derivar(l).custo_visualizacao) },
    { label: "Taxa de Conversão", valor: (l) => fmtPct(derivar(l).taxa_conversao) },
    { label: "Ticket Médio", valor: (l) => fmtBRL(derivar(l).ticket_medio) },
    { label: "ROAS Gerenciador", valor: (l) => fmtX(derivar(l).roas) },
  ];
  return <TabelaPeriodo linhas={linhas} totais={totais} colunas={colunas} />;
}
