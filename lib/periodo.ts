export type Granularidade = "dia" | "semana" | "mes" | "ano";

export const GRANULARIDADES: Granularidade[] = ["dia", "semana", "mes", "ano"];

// Semana = segunda a domingo; a chave é a segunda-feira (AAAA-MM-DD), que ordena corretamente como texto.
export function chaveBalde(diaIso: string, g: Granularidade) {
  if (g === "dia") return diaIso;
  if (g === "mes") return diaIso.slice(0, 7);
  if (g === "ano") return diaIso.slice(0, 4);
  const d = new Date(`${diaIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export function rotuloBalde(chave: string, g: Granularidade) {
  const [a, m, d] = chave.split("-");
  if (g === "dia") return `${d}/${m}/${a}`;
  if (g === "semana") return `Sem ${d}/${m}/${a}`;
  if (g === "mes") return `${m}/${a}`;
  return a;
}
