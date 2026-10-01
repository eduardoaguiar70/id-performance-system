import { chaveBalde, rotuloBalde, type Granularidade } from "@/lib/periodo";

// O Google desativa versões antigas ~1 ano após o lançamento; atualizar quando a API avisar.
const API = "https://googleads.googleapis.com/v25";

export class GoogleAdsApiError extends Error {
  constructor(message: string, public codigo: string | null) {
    super(message);
  }
}

const MENSAGENS: Record<string, string> = {
  CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION:
    "O Developer Token ainda só tem acesso a contas de teste. Solicite o acesso Explorer ou Básico no Centro de API do Google Ads (conta MCC).",
  DEVELOPER_TOKEN_NOT_APPROVED:
    "O Developer Token ainda só tem acesso a contas de teste. Solicite o acesso Explorer ou Básico no Centro de API do Google Ads (conta MCC).",
  CUSTOMER_NOT_ENABLED: "Esta conta do Google Ads está desativada ou ainda não foi ativada.",
  USER_PERMISSION_DENIED: "O e-mail conectado não tem permissão nesta conta do Google Ads.",
  DEVELOPER_TOKEN_INVALID: "Developer Token inválido. Confira GOOGLE_ADS_DEVELOPER_TOKEN no servidor.",
};

function headers(accessToken: string, loginCustomerId?: string | null) {
  const h: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "",
    "Content-Type": "application/json",
  };
  if (loginCustomerId) h["login-customer-id"] = loginCustomerId;
  return h;
}

async function lerErro(res: Response): Promise<GoogleAdsApiError> {
  const body = await res.json().catch(() => null);
  const detalhe = body?.error?.details?.[0]?.errors?.[0];
  const codigo = detalhe?.errorCode ? (Object.values(detalhe.errorCode)[0] as string) : null;
  const mensagem =
    (codigo && MENSAGENS[codigo]) ?? detalhe?.message ?? body?.error?.message ?? `Google Ads retornou ${res.status}`;
  return new GoogleAdsApiError(mensagem, codigo);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GaqlRow = Record<string, any>;

export async function gaqlSearch(
  accessToken: string,
  customerId: string,
  query: string,
  loginCustomerId?: string | null
): Promise<GaqlRow[]> {
  const rows: GaqlRow[] = [];
  let pageToken: string | undefined;
  do {
    const res = await fetch(`${API}/customers/${customerId}/googleAds:search`, {
      method: "POST",
      headers: headers(accessToken, loginCustomerId),
      body: JSON.stringify({ query, ...(pageToken ? { pageToken } : {}) }),
    });
    if (!res.ok) throw await lerErro(res);
    const data = await res.json();
    rows.push(...(data.results ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return rows;
}

// ---------------------------------------------------------------------------
// Vínculo salvo em integracoes_oauth.account_identifier:
//   "customers/1234567890"                 → acesso direto
//   "customers/1234567890|login=9876543210" → acesso via conta de administrador (MCC)
// ---------------------------------------------------------------------------
export interface VinculoAds {
  customerId: string;
  loginCustomerId: string | null;
}

export function serializarVinculo(v: VinculoAds) {
  return `customers/${v.customerId}${v.loginCustomerId ? `|login=${v.loginCustomerId}` : ""}`;
}

export function parseVinculo(valor: string | null | undefined): VinculoAds | null {
  const m = valor?.match(/^customers\/(\d+)(?:\|login=(\d+))?$/);
  return m ? { customerId: m[1], loginCustomerId: m[2] ?? null } : null;
}

export const formatarCustomerId = (id: string) => id.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1-$2-$3");

// ---------------------------------------------------------------------------
// Listagem de contas
// ---------------------------------------------------------------------------
export interface ContaAds {
  id: string; // valor serializado do vínculo
  nome: string;
  grupo: string;
  erro?: string;
}

export async function listarContasAds(accessToken: string): Promise<ContaAds[]> {
  const res = await fetch(`${API}/customers:listAccessibleCustomers`, { headers: headers(accessToken) });
  if (!res.ok) throw await lerErro(res);
  const ids: string[] = ((await res.json()).resourceNames ?? []).map((r: string) => r.replace("customers/", ""));

  const contas: ContaAds[] = [];
  await Promise.all(
    ids.map(async (id) => {
      try {
        const [info] = await gaqlSearch(
          accessToken,
          id,
          "SELECT customer.id, customer.descriptive_name, customer.manager, customer.test_account FROM customer"
        );
        const c = info.customer;
        const nome = c.descriptiveName || formatarCustomerId(id);

        if (!c.manager) {
          contas.push({
            id: serializarVinculo({ customerId: id, loginCustomerId: null }),
            nome: `${nome}${c.testAccount ? " (teste)" : ""} · ${formatarCustomerId(id)}`,
            grupo: "Contas com acesso direto",
          });
          return;
        }

        // Conta de administrador: lista as contas de anúncio que ela gerencia.
        const filhas = await gaqlSearch(
          accessToken,
          id,
          "SELECT customer_client.id, customer_client.descriptive_name, customer_client.test_account " +
            "FROM customer_client WHERE customer_client.manager = false AND customer_client.status = 'ENABLED'"
        );
        for (const f of filhas) {
          const cc = f.customerClient;
          contas.push({
            id: serializarVinculo({ customerId: String(cc.id), loginCustomerId: id }),
            nome: `${cc.descriptiveName || formatarCustomerId(String(cc.id))}${cc.testAccount ? " (teste)" : ""} · ${formatarCustomerId(String(cc.id))}`,
            grupo: `Via administrador ${nome}`,
          });
        }
      } catch (err) {
        contas.push({
          id: serializarVinculo({ customerId: id, loginCustomerId: null }),
          nome: formatarCustomerId(id),
          grupo: "Contas sem acesso",
          erro: err instanceof Error ? err.message : "Sem acesso",
        });
      }
    })
  );

  return contas.sort((a, b) => a.grupo.localeCompare(b.grupo) || a.nome.localeCompare(b.nome));
}

// ---------------------------------------------------------------------------
// Relatório
// ---------------------------------------------------------------------------
export interface AdsLinha {
  dimensao: string;
  investimento: number;
  impressoes: number;
  cliques: number;
  compras: number;
  receita: number;
}

// Tipos de campanha exibidos no gráfico empilhado; o resto vira "Outros".
export const TIPOS_CAMPANHA = ["SEARCH", "PERFORMANCE_MAX", "SHOPPING", "VIDEO", "DISPLAY"] as const;
export type TipoCampanha = (typeof TIPOS_CAMPANHA)[number] | "OUTROS";

export interface AdsRelatorio {
  conta: string;
  moeda: string | null;
  periodo: { inicio: string; fim: string; granularidade: Granularidade };
  linhas: AdsLinha[];
  totais: Omit<AdsLinha, "dimensao">;
  receita_por_tipo: ({ dimensao: string } & Record<TipoCampanha, number>)[];
  tipos_presentes: TipoCampanha[];
}

const num = (v: unknown) => Number(v ?? 0) || 0;

export async function buscarRelatorioAds(
  accessToken: string,
  vinculo: VinculoAds,
  inicio: string,
  fim: string,
  granularidade: Granularidade
): Promise<AdsRelatorio> {
  const rows = await gaqlSearch(
    accessToken,
    vinculo.customerId,
    "SELECT segments.date, campaign.advertising_channel_type, customer.currency_code, " +
      "metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value " +
      `FROM campaign WHERE segments.date BETWEEN '${inicio}' AND '${fim}'`,
    vinculo.loginCustomerId
  );

  const vazia = (dimensao: string): AdsLinha => ({ dimensao, investimento: 0, impressoes: 0, cliques: 0, compras: 0, receita: 0 });
  const porBalde = new Map<string, AdsLinha>();
  const porTipo = new Map<string, Record<TipoCampanha, number>>();
  const tipos = new Set<TipoCampanha>();
  const totais = vazia("Total");
  let moeda: string | null = null;

  for (const r of rows) {
    const chave = chaveBalde(r.segments.date, granularidade);
    const m = r.metrics ?? {};
    const valores = {
      investimento: num(m.costMicros) / 1_000_000,
      impressoes: num(m.impressions),
      cliques: num(m.clicks),
      compras: num(m.conversions),
      receita: num(m.conversionsValue),
    };
    moeda ??= r.customer?.currencyCode ?? null;

    const linha = porBalde.get(chave) ?? vazia(chave);
    (Object.keys(valores) as (keyof typeof valores)[]).forEach((k) => {
      linha[k] += valores[k];
      totais[k] += valores[k];
    });
    porBalde.set(chave, linha);

    const canal = r.campaign?.advertisingChannelType as string;
    const tipo: TipoCampanha = (TIPOS_CAMPANHA as readonly string[]).includes(canal) ? (canal as TipoCampanha) : "OUTROS";
    tipos.add(tipo);
    const balde =
      porTipo.get(chave) ?? { SEARCH: 0, PERFORMANCE_MAX: 0, SHOPPING: 0, VIDEO: 0, DISPLAY: 0, OUTROS: 0 };
    balde[tipo] += valores.receita;
    porTipo.set(chave, balde);
  }

  const chaves = Array.from(porBalde.keys()).sort();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { dimensao: _omit, ...totaisSemDimensao } = totais;

  return {
    conta: vinculo.customerId,
    moeda,
    periodo: { inicio, fim, granularidade },
    linhas: chaves.map((k) => ({ ...porBalde.get(k)!, dimensao: rotuloBalde(k, granularidade) })),
    totais: totaisSemDimensao,
    receita_por_tipo: chaves.map((k) => ({ dimensao: rotuloBalde(k, granularidade), ...porTipo.get(k)! })),
    tipos_presentes: [...TIPOS_CAMPANHA, "OUTROS" as const].filter((t) => tipos.has(t)),
  };
}
