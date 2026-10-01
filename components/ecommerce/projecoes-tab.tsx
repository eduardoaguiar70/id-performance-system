"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { AlertTriangle, Loader2, Lock, Save, Target } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { preverMensal, previsaoFechamento, simularCenario } from "@/lib/ecommerce/projecao";
import {
  SERIE_1,
  SERIE_2,
  GRID,
  TEXTO_EIXO,
  fmtBRL,
  fmtInt,
  fmtX,
  ChartCard,
  LegendaItem,
  eixoProps,
} from "./shared";

interface Totais {
  investimento_meta: number;
  investimento_google: number;
  faturamento: number;
  pedidos: number;
  sessoes: number;
  sessoes_midia: number;
}

interface Resposta {
  fontes: { ga4: { ok: boolean } };
  linhas: (Totais & { dimensao: string })[];
  totais: Totais;
}

type Metrica = "faturamento" | "sessoes";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const rotuloMes = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
const investimentoDe = (t: Totais) => t.investimento_meta + t.investimento_google;

function datas() {
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
  const inicioHistorico = new Date(hoje.getFullYear(), hoje.getMonth() - 24, 1);
  const inicioBase = new Date(hoje);
  inicioBase.setDate(hoje.getDate() - 29);
  return {
    hoje,
    inicioMes,
    fimMesAnterior,
    inicioHistorico,
    inicioBase,
    diasNoMes: new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate(),
    mesChave: iso(inicioMes).slice(0, 7),
  };
}

// 24 meses completos até o mês anterior; meses sem dado viram zero e os zeros iniciais
// (antes do cliente ter dados) são descartados para não distorcer o modelo.
function serieMensal(historico: Resposta, campo: Metrica, hoje: Date) {
  const valores = new Map(historico.linhas.map((l) => [l.dimensao, l[campo]]));
  const meses: { mes: string; real: number }[] = [];
  for (let i = 24; i >= 1; i--) {
    const m = rotuloMes(new Date(hoje.getFullYear(), hoje.getMonth() - i, 1));
    meses.push({ mes: m, real: valores.get(m) ?? 0 });
  }
  const primeiro = meses.findIndex((m) => m.real > 0);
  return primeiro === -1 ? [] : meses.slice(primeiro);
}

function TooltipProjecao({
  active,
  payload,
  label,
  formato,
}: {
  active?: boolean;
  payload?: { payload: Record<string, number | number[] | string | null> }[];
  label?: string;
  formato: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const faixa = p.faixa as number[] | null;
  return (
    <div className="border border-border bg-background px-3 py-2 text-xs shadow-lg space-y-0.5">
      <p className="font-semibold text-foreground">{label}</p>
      {typeof p.real === "number" && (
        <p className="text-muted-foreground">
          Real: <span className="text-foreground font-medium">{formato(p.real)}</span>
        </p>
      )}
      {typeof p.projetado === "number" && faixa && (
        <>
          <p className="text-muted-foreground">
            Projeção: <span className="text-foreground font-medium">{formato(p.projetado)}</span>
          </p>
          <p className="text-muted-foreground">
            Faixa (80%): {formato(faixa[0])} – {formato(faixa[1])}
          </p>
        </>
      )}
    </div>
  );
}

function Slider({
  label,
  valor,
  onChange,
  min,
  max,
  passo,
  formato,
}: {
  label: string;
  valor: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  passo: number;
  formato: (v: number) => string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-center justify-between text-xs">
        <span className="font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="tabular-nums font-semibold text-foreground">{formato(valor)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={passo}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[hsl(var(--primary))]"
      />
    </label>
  );
}

const pctSinal = (v: number) => `${v > 0 ? "+" : ""}${v}%`;

export function ProjecoesTab({ contaId }: { contaId: string }) {
  const d = useMemo(datas, []);
  const [historico, setHistorico] = useState<Resposta | null>(null);
  const [mesAtual, setMesAtual] = useState<Resposta | null>(null);
  const [base, setBase] = useState<Resposta | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [metrica, setMetrica] = useState<Metrica>("faturamento");

  const [meta, setMeta] = useState<number | null>(null);
  const [metaInput, setMetaInput] = useState("");
  const [metaIndisponivel, setMetaIndisponivel] = useState<string | null>(null);
  const [salvandoMeta, setSalvandoMeta] = useState(false);

  const [deltaOrcamento, setDeltaOrcamento] = useState(0);
  const [deltaConversao, setDeltaConversao] = useState(0);
  const [ticket, setTicket] = useState<number | null>(null);
  const [margem, setMargem] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setErro(null);
    const buscar = (inicio: Date, fim: Date, granularidade: string) =>
      fetch(
        `/api/ecommerce/visao-geral?${new URLSearchParams({ conta_id: contaId, inicio: iso(inicio), fim: iso(fim), granularidade })}`,
        { signal: controller.signal }
      ).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message ?? "Erro ao carregar dados.");
        return data as Resposta;
      });

    Promise.all([
      buscar(d.inicioHistorico, d.fimMesAnterior, "mes"),
      buscar(d.inicioMes, d.hoje, "mes"),
      buscar(d.inicioBase, d.hoje, "mes"),
      fetch(`/api/ecommerce/metas?conta_id=${encodeURIComponent(contaId)}&mes=${d.mesChave}`, { signal: controller.signal }).then(
        async (res) => ({ status: res.status, data: await res.json().catch(() => ({})) })
      ),
    ])
      .then(([h, m, b, metaRes]) => {
        setHistorico(h);
        setMesAtual(m);
        setBase(b);
        const t = b.totais;
        setTicket(t.pedidos > 0 ? Math.round(t.faturamento / t.pedidos) : null);
        if (metaRes.status === 200) {
          setMeta(metaRes.data.valor);
          setMetaInput(metaRes.data.valor ? String(metaRes.data.valor) : "");
          setMetaIndisponivel(null);
        } else {
          setMetaIndisponivel(metaRes.data.message ?? "Metas indisponíveis.");
        }
      })
      .catch((e: Error) => e.name !== "AbortError" && setErro(e.message))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [contaId, d]);

  // Série mensal completa (meses sem dado entram como zero) + previsão dos 3 meses a partir do atual.
  const projecao = useMemo(() => {
    if (!historico) return null;
    const serie = serieMensal(historico, metrica, d.hoje);
    const previsao = preverMensal(serie.map((m) => m.real));

    const pontos: Record<string, number | number[] | string | null>[] = serie.map((m, i) => ({
      mes: m.mes,
      real: m.real,
      // a linha tracejada parte do último mês real para ficar contínua
      projetado: previsao && i === serie.length - 1 ? m.real : null,
      faixa: previsao && i === serie.length - 1 ? [m.real, m.real] : null,
    }));
    previsao?.previsao.forEach((v, h) => {
      const m = new Date(d.hoje.getFullYear(), d.hoje.getMonth() + h, 1);
      pontos.push({ mes: rotuloMes(m), real: null, projetado: v, faixa: [previsao.inferior[h], previsao.superior[h]] });
    });
    return { pontos, previsao, meses: serie.length };
  }, [historico, metrica, d]);

  const fechamento = useMemo(() => {
    if (!mesAtual) return null;
    const acumulado = mesAtual.totais.faturamento;
    return { acumulado, previsto: previsaoFechamento(acumulado, d.hoje.getDate(), d.diasNoMes) };
  }, [mesAtual, d]);

  // What-If: base = últimos 30 dias. Sessões pagas escalam linearmente com o orçamento; orgânicas não mudam.
  const simulacao = useMemo(() => {
    if (!base || ticket === null) return null;
    const t = base.totais;
    const margemNum = margem.trim() === "" ? null : Number(margem);
    const r = simularCenario(
      { faturamento: t.faturamento, pedidos: t.pedidos, sessoes: t.sessoes, sessoes_midia: t.sessoes_midia, investimento: investimentoDe(t) },
      {
        deltaOrcamentoPct: deltaOrcamento,
        deltaConversaoPct: deltaConversao,
        ticket,
        margemPct: margemNum !== null && Number.isFinite(margemNum) ? margemNum : null,
      }
    );
    if (!r) return null;
    return { ...r, fator: r.base.receita > 0 ? r.cenario.receita / r.base.receita : null, comMargem: margemNum !== null };
  }, [base, ticket, deltaOrcamento, deltaConversao, margem]);

  const curvaWhatIf = useMemo(() => {
    if (!simulacao) return [];
    const prevFaturamento = historico
      ? preverMensal(serieMensal(historico, "faturamento", d.hoje).map((m) => m.real))
      : null;
    return [0, 1, 2].map((h) => {
      const baseMes = prevFaturamento?.previsao[h] ?? simulacao.base.receita;
      return {
        mes: rotuloMes(new Date(d.hoje.getFullYear(), d.hoje.getMonth() + h, 1)),
        base: baseMes,
        cenario: simulacao.fator !== null ? baseMes * simulacao.fator : simulacao.cenario.receita,
      };
    });
  }, [simulacao, historico, d]);

  const salvarMeta = async () => {
    const valor = Number(metaInput.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(valor) || valor < 0) {
      toast.error("Informe um valor válido para a meta.");
      return;
    }
    setSalvandoMeta(true);
    try {
      const res = await fetch("/api/ecommerce/metas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conta_id: contaId, mes: d.mesChave, valor }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Erro ao salvar meta.");
      setMeta(valor);
      toast.success("Meta do mês salva.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar meta.");
    } finally {
      setSalvandoMeta(false);
    }
  };

  const formatoMetrica = metrica === "faturamento" ? fmtBRL : fmtInt;
  const ga4Ok = historico?.fontes.ga4.ok ?? false;

  if (loading && !historico) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-muted-foreground gap-2 text-sm">
        <Loader2 className="w-5 h-5 animate-spin" /> Carregando histórico de 24 meses...
      </div>
    );
  }

  if (erro) {
    return (
      <div className="px-4 py-3 border border-red-500/30 bg-red-500/5 text-sm text-foreground/80 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
        {erro}
      </div>
    );
  }

  const progressoAtual = meta && fechamento ? (fechamento.acumulado / meta) * 100 : null;
  const progressoPrevisto = meta && fechamento ? (fechamento.previsto / meta) * 100 : null;

  return (
    <div className="flex flex-col gap-6">
      {!ga4Ok && (
        <div className="px-4 py-3 border border-yellow-500/30 bg-yellow-500/5 text-sm text-foreground/80 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          As projeções de faturamento usam o GA4 até o Shopify ser conectado. Conecte o GA4 deste cliente em Integrações.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="border border-border/50 bg-card p-4 flex flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Previsão de fechamento do mês</p>
          <p className="text-2xl font-bold tracking-tight">{fechamento ? fmtBRL(fechamento.previsto) : "—"}</p>
          <p className="text-[11px] text-muted-foreground">
            {fechamento ? `${fmtBRL(fechamento.acumulado)} acumulado em ${d.hoje.getDate()} de ${d.diasNoMes} dias (run-rate)` : ""}
          </p>
        </div>

        <div className="border border-border/50 bg-card p-4 flex flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Target className="w-3 h-3" /> Meta de faturamento · {rotuloMes(d.inicioMes)}
          </p>
          {metaIndisponivel ? (
            <p className="text-[11px] text-yellow-400/80 break-words [overflow-wrap:anywhere]">{metaIndisponivel}</p>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  value={metaInput}
                  onChange={(e) => setMetaInput(e.target.value)}
                  inputMode="decimal"
                  placeholder="Ex.: 150000"
                  aria-label="Meta de faturamento do mês"
                  className="flex-1 min-w-0 bg-background border border-border px-3 py-1.5 text-sm outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={salvarMeta}
                  disabled={salvandoMeta}
                  className="px-3 border border-border text-muted-foreground hover:text-primary hover:border-primary disabled:opacity-50"
                  aria-label="Salvar meta"
                >
                  {salvandoMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
              </div>
              {meta && progressoAtual !== null && progressoPrevisto !== null ? (
                <div className="space-y-1">
                  <div className="h-2 bg-muted/30 relative overflow-hidden" role="progressbar" aria-valuenow={Math.round(progressoAtual)} aria-valuemin={0} aria-valuemax={100}>
                    <div className="absolute inset-y-0 left-0 bg-primary/30" style={{ width: `${Math.min(100, progressoPrevisto)}%` }} />
                    <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${Math.min(100, progressoAtual)}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    <span className="text-foreground font-semibold">{progressoAtual.toFixed(1)}%</span> alcançado ·{" "}
                    {progressoPrevisto.toFixed(0)}% previsto no fechamento
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">Cadastre a meta do mês para acompanhar o progresso.</p>
              )}
            </>
          )}
        </div>

        <div className="border border-dashed border-border/60 bg-card/50 p-4 flex flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Data estimada de ruptura de estoque</p>
          <p className="text-2xl font-bold tracking-tight text-muted-foreground/50">—</p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Lock className="w-3 h-3" /> Requer Shopify (estoque e giro por produto)
          </p>
        </div>
      </div>

      {/* Previsão */}
      <ChartCard
        titulo="Previsão para os próximos 3 meses"
        legenda={
          <div className="flex items-center gap-4 flex-wrap">
            <LegendaItem cor={SERIE_1} label="Real" />
            <LegendaItem cor={SERIE_2} label="Projeção" />
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="w-3 h-2.5" style={{ background: `${SERIE_2}33` }} /> Faixa 80%
            </span>
            <div className="flex" role="group" aria-label="Métrica projetada">
              {(["faturamento", "sessoes"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={metrica === m}
                  onClick={() => setMetrica(m)}
                  className={cn(
                    "px-3 py-1 text-[11px] font-semibold uppercase tracking-wider border border-border -ml-px first:ml-0",
                    metrica === m ? "bg-primary text-primary-foreground border-primary relative z-10" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {m === "faturamento" ? "Faturamento" : "Sessões"}
                </button>
              ))}
            </div>
          </div>
        }
      >
        {!projecao?.previsao ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Histórico insuficiente: são necessários pelo menos 3 meses completos com {metrica === "faturamento" ? "faturamento" : "sessões"}.
          </p>
        ) : (
          <>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={projecao.pontos} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="mes" {...eixoProps} minTickGap={16} />
                  <YAxis {...eixoProps} width={72} tickFormatter={(v) => (metrica === "faturamento" ? fmtBRL(Number(v)).replace(",00", "") : fmtInt(Number(v)))} />
                  <Tooltip cursor={{ stroke: TEXTO_EIXO, strokeDasharray: "3 3" }} content={<TooltipProjecao formato={formatoMetrica} />} />
                  <Area dataKey="faixa" stroke="none" fill={SERIE_2} fillOpacity={0.2} isAnimationActive={false} connectNulls={false} />
                  <Line type="monotone" dataKey="real" name="Real" stroke={SERIE_1} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: "#171717", strokeWidth: 2 }} connectNulls={false} />
                  <Line type="monotone" dataKey="projetado" name="Projeção" stroke={SERIE_2} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: SERIE_2, strokeWidth: 0 }} connectNulls={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-muted-foreground/70">
              Modelo: {projecao.previsao.metodo === "holt-winters" ? "Holt-Winters (tendência + sazonalidade anual)" : "Holt (tendência; sazonalidade entra com 24+ meses de histórico)"} ·{" "}
              {projecao.meses} meses de histórico. A faixa sombreada é o intervalo de 80% entre o cenário pessimista e o otimista.
            </p>
          </>
        )}
      </ChartCard>

      {/* What-If */}
      <ChartCard titulo="Simulador What-If (base: últimos 30 dias)">
        {!simulacao ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            O simulador precisa de sessões e pedidos nos últimos 30 dias para calcular a conversão e o ticket médio.
          </p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-8">
            <div className="flex flex-col gap-5">
              <Slider label="Orçamento de tráfego" valor={deltaOrcamento} onChange={setDeltaOrcamento} min={-50} max={100} passo={5} formato={pctSinal} />
              <Slider label="Taxa de conversão" valor={deltaConversao} onChange={setDeltaConversao} min={-50} max={100} passo={5} formato={pctSinal} />
              {ticket !== null && (
                <Slider
                  label="Ticket médio"
                  valor={ticket}
                  onChange={setTicket}
                  min={Math.max(1, Math.round((base!.totais.faturamento / base!.totais.pedidos) * 0.5))}
                  max={Math.round((base!.totais.faturamento / base!.totais.pedidos) * 2)}
                  passo={1}
                  formato={fmtBRL}
                />
              )}
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Margem bruta (%) · opcional</span>
                <input
                  value={margem}
                  onChange={(e) => setMargem(e.target.value.replace(/[^\d.,]/g, "").replace(",", "."))}
                  inputMode="decimal"
                  placeholder="Ex.: 45"
                  className="bg-background border border-border px-3 py-1.5 text-sm outline-none focus:border-primary"
                />
              </label>
              <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                Premissas: sessões de mídia paga crescem na mesma proporção do orçamento; sessões orgânicas não mudam.
                Sem margem, o resultado é receita − investimento em mídia.
              </p>
            </div>

            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { label: "Receita / mês", b: fmtBRL(simulacao.base.receita), c: fmtBRL(simulacao.cenario.receita) },
                  { label: "Pedidos / mês", b: fmtInt(simulacao.base.pedidos), c: fmtInt(simulacao.cenario.pedidos) },
                  { label: "Investimento", b: fmtBRL(simulacao.base.investimento), c: fmtBRL(simulacao.cenario.investimento) },
                  { label: "ROAS", b: fmtX(simulacao.base.roas), c: fmtX(simulacao.cenario.roas) },
                  {
                    label: simulacao.comMargem ? "Lucro estimado" : "Receita − mídia",
                    b: fmtBRL(simulacao.base.resultado),
                    c: fmtBRL(simulacao.cenario.resultado),
                  },
                ].map((k) => (
                  <div key={k.label} className="border border-border/50 bg-background/40 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{k.label}</p>
                    <p className="text-lg font-bold tracking-tight">{k.c}</p>
                    <p className="text-[11px] text-muted-foreground">atual: {k.b}</p>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex gap-4 mb-2">
                  <LegendaItem cor={SERIE_1} label="Projeção atual" />
                  <LegendaItem cor={SERIE_2} label="Cenário simulado" />
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={curvaWhatIf} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={GRID} vertical={false} />
                      <XAxis dataKey="mes" {...eixoProps} />
                      <YAxis {...eixoProps} width={72} tickFormatter={(v) => fmtBRL(Number(v)).replace(",00", "")} />
                      <Tooltip
                        cursor={{ stroke: TEXTO_EIXO, strokeDasharray: "3 3" }}
                        formatter={(v: unknown) => fmtBRL(Number(v))}
                        contentStyle={{ background: "hsl(0 0% 5%)", border: "1px solid hsl(0 0% 16%)", fontSize: 12 }}
                      />
                      <Line dataKey="base" name="Projeção atual" stroke={SERIE_1} strokeWidth={2} dot={{ r: 4, fill: SERIE_1, strokeWidth: 0 }} isAnimationActive={false} />
                      <Line dataKey="cenario" name="Cenário simulado" stroke={SERIE_2} strokeWidth={2} dot={{ r: 4, fill: SERIE_2, strokeWidth: 0 }} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </ChartCard>
    </div>
  );
}
