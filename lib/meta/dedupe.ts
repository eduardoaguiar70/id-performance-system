interface CapturaMeta {
  conta_id?: string | null;
  conta_nome?: string | null;
  periodo_inicio?: string | null;
  criado_em?: string | null;
}

// O n8n recaptura o mesmo dia várias vezes em kpi_snapshots (parcial → completo).
// Mantém só a captura mais recente de cada conta+dia; somar todas infla os totais.
export function ultimaCapturaPorDia<T extends CapturaMeta>(rows: T[]): T[] {
  const porDia = new Map<string, T>();
  for (const r of rows) {
    const chave = `${r.conta_id ?? r.conta_nome}|${String(r.periodo_inicio).slice(0, 10)}`;
    const atual = porDia.get(chave);
    if (!atual || String(r.criado_em ?? "") > String(atual.criado_em ?? "")) porDia.set(chave, r);
  }
  return Array.from(porDia.values());
}
