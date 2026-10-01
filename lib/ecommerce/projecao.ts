export interface Previsao {
  metodo: "holt-winters" | "holt";
  previsao: number[];
  inferior: number[];
  superior: number[];
}

// z para intervalo de 80% (otimista × pessimista).
const Z_80 = 1.2816;

function desvioPadrao(erros: number[]) {
  if (erros.length < 2) return 0;
  const media = erros.reduce((s, e) => s + e, 0) / erros.length;
  return Math.sqrt(erros.reduce((s, e) => s + (e - media) ** 2, 0) / (erros.length - 1));
}

function intervalo(previsao: number[], sd: number): Pick<Previsao, "inferior" | "superior"> {
  // A incerteza cresce com o horizonte (√h); faturamento não fica negativo.
  return {
    inferior: previsao.map((v, i) => Math.max(0, v - Z_80 * sd * Math.sqrt(i + 1))),
    superior: previsao.map((v, i) => v + Z_80 * sd * Math.sqrt(i + 1)),
  };
}

// Holt (tendência linear amortecida pela suavização exponencial dupla).
function holt(serie: number[], horizonte: number, alpha = 0.5, beta = 0.2): Previsao {
  let nivel = serie[0];
  let tendencia = serie[1] - serie[0];
  const erros: number[] = [];
  for (let t = 1; t < serie.length; t++) {
    const previsto = nivel + tendencia;
    erros.push(serie[t] - previsto);
    const nivelAnterior = nivel;
    nivel = alpha * serie[t] + (1 - alpha) * (nivel + tendencia);
    tendencia = beta * (nivel - nivelAnterior) + (1 - beta) * tendencia;
  }
  const previsao = Array.from({ length: horizonte }, (_, h) => Math.max(0, nivel + (h + 1) * tendencia));
  return { metodo: "holt", previsao, ...intervalo(previsao, desvioPadrao(erros)) };
}

// Holt-Winters aditivo com sazonalidade de 12 meses; exige ao menos 2 ciclos completos.
function holtWinters(serie: number[], horizonte: number, alpha = 0.3, beta = 0.1, gamma = 0.3): Previsao {
  const m = 12;
  const media = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const ciclo1 = serie.slice(0, m);
  const ciclo2 = serie.slice(m, 2 * m);

  let nivel = media(ciclo1);
  let tendencia = (media(ciclo2) - media(ciclo1)) / m;
  const sazonal = ciclo1.map((v) => v - nivel);
  const erros: number[] = [];

  for (let t = m; t < serie.length; t++) {
    const s = sazonal[t % m];
    erros.push(serie[t] - (nivel + tendencia + s));
    const nivelAnterior = nivel;
    nivel = alpha * (serie[t] - s) + (1 - alpha) * (nivel + tendencia);
    tendencia = beta * (nivel - nivelAnterior) + (1 - beta) * tendencia;
    sazonal[t % m] = gamma * (serie[t] - nivel) + (1 - gamma) * s;
  }

  const n = serie.length;
  const previsao = Array.from({ length: horizonte }, (_, h) =>
    Math.max(0, nivel + (h + 1) * tendencia + sazonal[(n + h) % m])
  );
  return { metodo: "holt-winters", previsao, ...intervalo(previsao, desvioPadrao(erros)) };
}

// Série mensal completa (sem o mês corrente parcial). Retorna null quando não há histórico suficiente.
export function preverMensal(serie: number[], horizonte = 3): Previsao | null {
  if (serie.length < 3 || serie.every((v) => v === 0)) return null;
  return serie.length >= 24 ? holtWinters(serie, horizonte) : holt(serie, horizonte);
}

// Run-rate: acumulado ÷ dias decorridos × dias do mês.
export function previsaoFechamento(acumulado: number, diaAtual: number, diasNoMes: number) {
  return diaAtual > 0 ? (acumulado / diaAtual) * diasNoMes : 0;
}

export interface BaseSimulacao {
  faturamento: number;
  pedidos: number;
  sessoes: number;
  sessoes_midia: number;
  investimento: number;
}

export interface ResultadoCenario {
  receita: number;
  pedidos: number;
  investimento: number;
  roas: number | null;
  resultado: number;
}

// What-If: sessões de mídia paga escalam linearmente com o orçamento; orgânicas não mudam.
// Sem margem, resultado = receita − investimento em mídia; com margem, receita × margem − investimento.
export function simularCenario(
  b: BaseSimulacao,
  opcoes: { deltaOrcamentoPct: number; deltaConversaoPct: number; ticket: number; margemPct: number | null }
): { base: ResultadoCenario; cenario: ResultadoCenario } | null {
  if (b.sessoes <= 0 || b.pedidos <= 0) return null;
  const conversao = b.pedidos / b.sessoes;
  const margem = opcoes.margemPct === null ? null : opcoes.margemPct / 100;
  const resultado = (receita: number, investimento: number) =>
    margem === null ? receita - investimento : receita * margem - investimento;
  const roas = (receita: number, investimento: number) => (investimento > 0 ? receita / investimento : null);

  const sessoes = b.sessoes - b.sessoes_midia + b.sessoes_midia * (1 + opcoes.deltaOrcamentoPct / 100);
  const pedidos = sessoes * conversao * (1 + opcoes.deltaConversaoPct / 100);
  const receita = pedidos * opcoes.ticket;
  const investimento = b.investimento * (1 + opcoes.deltaOrcamentoPct / 100);

  return {
    base: {
      receita: b.faturamento,
      pedidos: b.pedidos,
      investimento: b.investimento,
      roas: roas(b.faturamento, b.investimento),
      resultado: resultado(b.faturamento, b.investimento),
    },
    cenario: { receita, pedidos, investimento, roas: roas(receita, investimento), resultado: resultado(receita, investimento) },
  };
}
