"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from "recharts";
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
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
  impressoes: number;
  cliques: number;
  compras: number;
  receita: number;
}

type TipoCampanha = "SEARCH" | "PERFORMANCE_MAX" | "SHOPPING" | "VIDEO" | "DISPLAY" | "OUTROS";

interface Relatorio {
  linhas: Linha[];
  totais: Omit<Linha, "dimensao">;
  receita_por_tipo: ({ dimensao: string } & Record<TipoCampanha, number>)[];
  tipos_presentes: TipoCampanha[];
}

// Cor fixa por tipo de campanha (segue a entidade, nunca o ranking). Paleta dark validada em #171717.
const TIPOS: Record<TipoCampanha, { label: string; cor: string }> = {
  SEARCH: { label: "Pesquisa", cor: "#3987e5" },
  PERFORMANCE_MAX: { label: "Performance Max", cor: "#d95926" },
  SHOPPING: { label: "Shopping", cor: "#199e70" },
  VIDEO: { label: "YouTube / Vídeo", cor: "#c98500" },
  DISPLAY: { label: "Display", cor: "#d55181" },
  OUTROS: { label: "Outros", cor: "#6b6b6b" },
};

// Fórmulas da sub-aba Google Ads da especificação.
function derivar(l: Omit<Linha, "dimensao">) {
  return {
    cpa: div(l.investimento, l.compras),
    cpc: div(l.investimento, l.cliques),
    ctr: div(l.cliques * 100, l.impressoes),
    taxa_conversao: div(l.compras * 100, l.cliques),
    ticket_medio: div(l.receita, l.compras),
    roas: div(l.receita, l.investimento),
  };
}

const fmtDec = (v: number | null) =>
  v === null ? "—" : v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

function montarUrl(contaId: string, inicio: string, fim: string, granularidade: string) {
  const p = new URLSearchParams({ conta_id: contaId, inicio, fim, granularidade });
  return `/api/google-ads/report?${p.toString()}`;
}

type Erro = { mensagem: string; tipo: "sem_conta" | "sem_acesso" | "outro" };

export function GoogleAdsTab({ contaId }: { contaId: string }) {
  const [periodo, setPeriodo] = useState<Periodo>(periodoPadrao);
  const [atual, setAtual] = useState<Relatorio | null>(null);
  const [anterior, setAnterior] = useState<Relatorio | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<Erro | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setErro(null);

    const ant = periodoAnterior(periodo.inicio, periodo.fim);
    const buscar = (url: string) =>
      fetch(url, { signal: controller.signal }).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw Object.assign(new Error(data.message ?? "Erro ao buscar dados do Google Ads."), { status: res.status });
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
      .catch((err: Error & { status?: number }) => {
        if (err.name === "AbortError") return;
        setAtual(null);
        setErro({
          mensagem: err.message,
          tipo: err.status === 409 ? "sem_conta" : err.status === 403 ? "sem_acesso" : "outro",
        });
      })
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
      { label: "Investimento", valor: fmtBRL(t.investimento), atual: t.investimento, anterior: tAnt?.investimento ?? null, menorMelhor: true },
      { label: "Receita Gerenciador", valor: fmtBRL(t.receita), atual: t.receita, anterior: tAnt?.receita ?? null },
      { label: "ROAS Gerenciador", valor: fmtX(d.roas), atual: d.roas, anterior: dAnt?.roas ?? null },
      { label: "Compras", valor: fmtDec(t.compras), atual: t.compras, anterior: tAnt?.compras ?? null },
      { label: "CPA", valor: fmtBRL(d.cpa), atual: d.cpa, anterior: dAnt?.cpa ?? null, menorMelhor: true },
      { label: "Cliques", valor: fmtInt(t.cliques), atual: t.cliques, anterior: tAnt?.cliques ?? null },
      { label: "CPC", valor: fmtBRL(d.cpc), atual: d.cpc, anterior: dAnt?.cpc ?? null, menorMelhor: true },
      { label: "CTR", valor: fmtPct(d.ctr), atual: d.ctr, anterior: dAnt?.ctr ?? null },
      { label: "Taxa de Conversão", valor: fmtPct(d.taxa_conversao), atual: d.taxa_conversao, anterior: dAnt?.taxa_conversao ?? null },
      { label: "Ticket Médio", valor: fmtBRL(d.ticket_medio), atual: d.ticket_medio, anterior: dAnt?.ticket_medio ?? null },
    ];
  }, [atual, anterior]);

  const serie = useMemo(
    () => (atual?.linhas ?? []).map((l) => ({ ...l, ctr: derivar(l).ctr ?? 0, cpc: derivar(l).cpc ?? 0 })),
    [atual]
  );
  const umPonto = serie.length <= 1;
  const temReceita = (atual?.totais.receita ?? 0) > 0;

  if (erro && erro.tipo !== "outro") {
    const semAcesso = erro.tipo === "sem_acesso";
    const Icone = semAcesso ? ShieldAlert : AlertTriangle;
    return (
      <div className="flex flex-col gap-6">
        <div className="border border-border/50 bg-card p-4">
          <PeriodoSelector value={periodo} onChange={setPeriodo} />
        </div>
        <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground border border-border/50 bg-card gap-2 text-center px-6">
          <Icone className={cn("h-10 w-10", semAcesso ? "text-yellow-400/70" : "opacity-40")} />
          <p className="text-base font-medium text-foreground">
            {semAcesso ? "O Google Ads recusou o acesso" : "Google Ads não configurado para este cliente"}
          </p>
          <p className="text-sm max-w-xl">{erro.mensagem}</p>
          <Link href="/integracoes" className="mt-2 text-sm text-primary hover:underline">
            Ir para Integrações →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 border border-border/50 bg-card p-4">
        <PeriodoSelector value={periodo} onChange={setPeriodo} />
        {loading && atual && (
          <div className="flex justify-end">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
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
          <Loader2 className="w-5 h-5 animate-spin" /> Buscando dados no Google Ads...
        </div>
      ) : atual && kpis ? (
        <div className={cn("flex flex-col gap-6 transition-opacity", loading && "opacity-60")}>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {kpis.map((k) => (
              <KpiTile key={k.label} {...k} />
            ))}
          </div>

          <ChartCard
            titulo="Receita por tipo de campanha"
            legenda={
              temReceita ? (
                <div className="flex flex-wrap gap-4">
                  {atual.tipos_presentes.map((t) => (
                    <LegendaItem key={t} cor={TIPOS[t].cor} label={TIPOS[t].label} />
                  ))}
                </div>
              ) : undefined
            }
          >
            {!temReceita ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma receita de conversão no período.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={atual.receita_por_tipo} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="dimensao" {...eixoProps} minTickGap={24} />
                    <YAxis {...eixoProps} width={72} tickFormatter={(v) => fmtBRL(Number(v)).replace(",00", "")} />
                    <Tooltip
                      cursor={{ stroke: TEXTO_EIXO, strokeDasharray: "3 3" }}
                      content={<TooltipConteudo formato={(v) => fmtBRL(v)} />}
                    />
                    {atual.tipos_presentes.map((t) => (
                      <Area
                        key={t}
                        type="monotone"
                        dataKey={t}
                        name={TIPOS[t].label}
                        stackId="receita"
                        stroke="#171717"
                        strokeWidth={2}
                        fill={TIPOS[t].cor}
                        fillOpacity={0.9}
                        activeDot={{ r: 4, stroke: "#171717", strokeWidth: 2, fill: TIPOS[t].cor }}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          {/* CTR e CPC têm unidades diferentes: dois gráficos em vez de um com dois eixos */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ChartCard titulo="CTR (cliques ÷ impressões)">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={serie} margin={{ top: 8, right: 56, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="dimensao" {...eixoProps} minTickGap={24} />
                    <YAxis {...eixoProps} width={48} tickFormatter={(v) => `${Number(v).toFixed(1)}%`} />
                    <Tooltip cursor={{ stroke: TEXTO_EIXO, strokeDasharray: "3 3" }} content={<TooltipConteudo formato={(v) => fmtPct(v)} />} />
                    <Line type="monotone" dataKey="ctr" name="CTR" stroke={SERIE_1} strokeWidth={2} dot={umPonto ? { r: 4 } : false} activeDot={{ r: 5, stroke: "#171717", strokeWidth: 2 }}>
                      <LabelList dataKey="ctr" content={rotuloFinal(serie.length, SERIE_1, fmtPct)} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard titulo="CPC médio (investimento ÷ cliques)">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={serie} margin={{ top: 8, right: 64, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="dimensao" {...eixoProps} minTickGap={24} />
                    <YAxis {...eixoProps} width={56} tickFormatter={(v) => fmtBRL(Number(v))} />
                    <Tooltip cursor={{ stroke: TEXTO_EIXO, strokeDasharray: "3 3" }} content={<TooltipConteudo formato={(v) => fmtBRL(v)} />} />
                    <Line type="monotone" dataKey="cpc" name="CPC" stroke={SERIE_1} strokeWidth={2} dot={umPonto ? { r: 4 } : false} activeDot={{ r: 5, stroke: "#171717", strokeWidth: 2 }}>
                      <LabelList dataKey="cpc" content={rotuloFinal(serie.length, SERIE_1, fmtBRL)} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <TabelaGoogleAds linhas={atual.linhas} totais={atual.totais} />
          <p className="text-[11px] text-muted-foreground/60">
            &quot;Compras&quot; e &quot;Receita&quot; seguem as conversões configuradas como principais na conta do Google Ads.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function TabelaGoogleAds({ linhas, totais }: { linhas: Linha[]; totais: Omit<Linha, "dimensao"> }) {
  const colunas: ColunaTabela<Omit<Linha, "dimensao">>[] = [
    { label: "Investimento", valor: (l) => fmtBRL(l.investimento) },
    { label: "Cliques", valor: (l) => fmtInt(l.cliques) },
    { label: "Compras", valor: (l) => fmtDec(l.compras) },
    { label: "Receita Gerenciador", valor: (l) => fmtBRL(l.receita) },
    { label: "CPA", valor: (l) => fmtBRL(derivar(l).cpa) },
    { label: "CPC", valor: (l) => fmtBRL(derivar(l).cpc) },
    { label: "Taxa de Conversão", valor: (l) => fmtPct(derivar(l).taxa_conversao) },
    { label: "Ticket Médio", valor: (l) => fmtBRL(derivar(l).ticket_medio) },
    { label: "ROAS Gerenciador", valor: (l) => fmtX(derivar(l).roas) },
  ];
  return <TabelaPeriodo linhas={linhas} totais={totais} colunas={colunas} />;
}
