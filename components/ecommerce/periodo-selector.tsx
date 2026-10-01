"use client";

import { cn } from "@/lib/utils";

export type Granularidade = "dia" | "semana" | "mes" | "ano";
export type PresetPeriodo = "este_mes" | "7" | "15" | "30" | "365" | "personalizado";

export interface Periodo {
  preset: PresetPeriodo;
  inicio: string;
  fim: string;
  granularidade: Granularidade;
}

const PRESETS: { id: PresetPeriodo; label: string }[] = [
  { id: "este_mes", label: "Este mês" },
  { id: "7", label: "7 dias" },
  { id: "15", label: "15 dias" },
  { id: "30", label: "30 dias" },
  { id: "365", label: "365 dias" },
  { id: "personalizado", label: "Personalizado" },
];

const GRANULARIDADES: { id: Granularidade; label: string }[] = [
  { id: "dia", label: "Dia" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
  { id: "ano", label: "Ano" },
];

function isoLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// "Últimos N dias" inclui hoje.
export function intervaloDoPreset(preset: Exclude<PresetPeriodo, "personalizado">) {
  const hoje = new Date();
  if (preset === "este_mes") {
    return { inicio: isoLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), fim: isoLocal(hoje) };
  }
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - (Number(preset) - 1));
  return { inicio: isoLocal(inicio), fim: isoLocal(hoje) };
}

export function periodoPadrao(): Periodo {
  return { preset: "30", ...intervaloDoPreset("30"), granularidade: "dia" };
}

const segmentoBase =
  "px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border border-border transition-colors -ml-px first:ml-0";
const segmentoAtivo = "bg-primary text-primary-foreground border-primary relative z-10";
const segmentoInativo = "bg-card text-muted-foreground hover:text-foreground";

export function PeriodoSelector({ value, onChange }: { value: Periodo; onChange: (p: Periodo) => void }) {
  const inputClass =
    "bg-background border border-border px-2 py-1.5 text-xs outline-none focus:border-primary [color-scheme:dark]";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex" role="group" aria-label="Período">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={value.preset === p.id}
            onClick={() =>
              onChange(
                p.id === "personalizado"
                  ? { ...value, preset: p.id }
                  : { ...value, preset: p.id, ...intervaloDoPreset(p.id) }
              )
            }
            className={cn(segmentoBase, value.preset === p.id ? segmentoAtivo : segmentoInativo)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {value.preset === "personalizado" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="date"
            aria-label="Data inicial"
            value={value.inicio}
            max={value.fim}
            onChange={(e) => e.target.value && onChange({ ...value, inicio: e.target.value })}
            className={inputClass}
          />
          até
          <input
            type="date"
            aria-label="Data final"
            value={value.fim}
            min={value.inicio}
            max={isoLocal(new Date())}
            onChange={(e) => e.target.value && onChange({ ...value, fim: e.target.value })}
            className={inputClass}
          />
        </div>
      )}

      <div className="flex ml-auto" role="group" aria-label="Agrupar por">
        {GRANULARIDADES.map((g) => (
          <button
            key={g.id}
            type="button"
            aria-pressed={value.granularidade === g.id}
            onClick={() => onChange({ ...value, granularidade: g.id })}
            className={cn(segmentoBase, value.granularidade === g.id ? segmentoAtivo : segmentoInativo)}
          >
            {g.label}
          </button>
        ))}
      </div>
    </div>
  );
}
