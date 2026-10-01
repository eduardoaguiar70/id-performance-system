"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

// Paleta categórica (passos dark) validada contra a superfície do card #171717.
export const SERIE_1 = "#3987e5";
export const SERIE_2 = "#d95926";
export const GRID = "hsl(0 0% 16%)";
export const TEXTO_EIXO = "hsl(0 0% 55%)";

export const div = (a: number, b: number) => (b > 0 ? a / b : null);

export const fmtBRL = (v: number | null) =>
  v === null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const fmtInt = (v: number | null) => (v === null ? "—" : Math.round(v).toLocaleString("pt-BR"));
export const fmtPct = (v: number | null) =>
  v === null ? "—" : `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
export const fmtX = (v: number | null) =>
  v === null ? "—" : `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;

// Mesmo número de dias, imediatamente antes do período atual.
export function periodoAnterior(inicio: string, fim: string) {
  const ini = new Date(`${inicio}T00:00:00Z`);
  const f = new Date(`${fim}T00:00:00Z`);
  const dias = Math.round((f.getTime() - ini.getTime()) / 86_400_000) + 1;
  const fimAnt = new Date(ini.getTime() - 86_400_000);
  const iniAnt = new Date(fimAnt.getTime() - (dias - 1) * 86_400_000);
  return { inicio: iniAnt.toISOString().slice(0, 10), fim: fimAnt.toISOString().slice(0, 10) };
}

// ---------------------------------------------------------------------------
// Peças visuais
// ---------------------------------------------------------------------------
export function KpiTile({
  label,
  valor,
  atual,
  anterior,
  menorMelhor,
}: {
  label: string;
  valor: string;
  atual: number | null;
  anterior: number | null;
  menorMelhor?: boolean;
}) {
  let variacao: number | null = null;
  if (atual !== null && anterior !== null && anterior !== 0) variacao = ((atual - anterior) / anterior) * 100;
  const bom = variacao !== null && variacao !== 0 && (menorMelhor ? variacao < 0 : variacao > 0);
  const Icone = variacao === null || variacao === 0 ? Minus : variacao > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="border border-border/50 bg-card p-4 flex flex-col gap-2 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground truncate">{label}</p>
      <p className="text-xl font-bold tracking-tight text-foreground truncate">{valor}</p>
      <p
        className={cn(
          "text-[11px] font-medium flex items-center gap-1",
          variacao === null || variacao === 0 ? "text-muted-foreground" : bom ? "text-green-400" : "text-red-400"
        )}
      >
        <Icone className="w-3 h-3" />
        {variacao === null ? "sem base anterior" : `${variacao > 0 ? "+" : ""}${variacao.toFixed(1)}% vs anterior`}
      </p>
    </div>
  );
}

export function ChartCard({ titulo, legenda, children }: { titulo: string; legenda?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border border-border/50 bg-card p-5 flex flex-col gap-4 min-w-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{titulo}</h3>
        {legenda}
      </div>
      {children}
    </div>
  );
}

export function LegendaItem({ cor, label }: { cor: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className="w-3 h-0.5 rounded-full" style={{ background: cor }} />
      {label}
    </span>
  );
}

interface TooltipLinha {
  name?: string;
  value?: number;
  color?: string;
}

export function TooltipConteudo({
  active,
  payload,
  label,
  formato,
}: {
  active?: boolean;
  payload?: TooltipLinha[];
  label?: string;
  formato: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border bg-background px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-muted-foreground">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="text-foreground font-medium">{formato(Number(p.value ?? 0))}</span>
        </p>
      ))}
    </div>
  );
}

export const eixoProps = {
  tick: { fill: TEXTO_EIXO, fontSize: 11 },
  axisLine: false,
  tickLine: false,
} as const;

// Rótulo direto só no último ponto da série.
export function rotuloFinal(total: number, cor: string, formato: (v: number) => string) {
  return function RotuloFinal(props: { x?: unknown; y?: unknown; value?: unknown; index?: number }) {
    if (props.index !== total - 1) return null;
    return (
      <text x={Number(props.x) + 6} y={Number(props.y) + 4} fontSize={11} fill={cor} fontWeight={600}>
        {formato(Number(props.value ?? 0))}
      </text>
    );
  };
}


export function Funil({ etapas }: { etapas: { label: string; valor: number }[] }) {
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

export interface ColunaTabela<T> {
  label: string;
  valor: (l: T) => string;
}

export function TabelaPeriodo<T>({
  linhas,
  totais,
  colunas,
}: {
  linhas: (T & { dimensao: string })[];
  totais: T;
  colunas: ColunaTabela<T>[];
}) {
  return (
    <div className="border border-border/50 bg-card">
      <div className="px-5 py-4 border-b border-border/50">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tabela por período</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap sticky left-0 bg-card">
                Dimensão
              </th>
              {colunas.map((c) => (
                <th key={c.label} className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 ? (
              <tr>
                <td colSpan={colunas.length + 1} className="px-4 py-8 text-center text-muted-foreground">
                  Sem dados no período.
                </td>
              </tr>
            ) : (
              linhas.map((l) => (
                <tr key={l.dimensao} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium whitespace-nowrap sticky left-0 bg-card">{l.dimensao}</td>
                  {colunas.map((c) => (
                    <td key={c.label} className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap text-foreground/80">
                      {c.valor(l)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {linhas.length > 0 && (
            <tfoot>
              <tr className="border-t border-border font-semibold">
                <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-card">Total</td>
                {colunas.map((c) => (
                  <td key={c.label} className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                    {c.valor(totais)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
