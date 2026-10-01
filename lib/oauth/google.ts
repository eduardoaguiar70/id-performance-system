import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type GoogleProvider = "google_ads" | "ga4";

export const GOOGLE_SCOPES: Record<GoogleProvider, string[]> = {
  google_ads: ["openid", "email", "https://www.googleapis.com/auth/adwords"],
  ga4: ["openid", "email", "https://www.googleapis.com/auth/analytics.readonly"],
};

export const STATE_COOKIE = "google_oauth_nonce";

export function isGoogleProvider(value: string | null): value is GoogleProvider {
  return value === "google_ads" || value === "ga4";
}

export function getGoogleConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

interface StatePayload {
  conta_id: string;
  provider: GoogleProvider;
  nonce: string;
  ts: number;
}

const STATE_MAX_AGE_MS = 10 * 60 * 1000;

function sign(data: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

export function createState(payload: StatePayload, secret: string) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data, secret)}`;
}

export function verifyState(state: string, secret: string): StatePayload | null {
  const [data, signature] = state.split(".");
  if (!data || !signature) return null;
  const expected = sign(data, secret);
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as StatePayload;
    if (Date.now() - payload.ts > STATE_MAX_AGE_MS) return null;
    if (!isGoogleProvider(payload.provider)) return null;
    return payload;
  } catch {
    return null;
  }
}

export class GoogleAuthError extends Error {}

// Devolve um access_token válido, renovando via refresh_token quando faltar menos de 1 min para expirar.
export async function getValidAccessToken(contaId: string, provider: GoogleProvider): Promise<string> {
  const config = getGoogleConfig();
  if (!config) throw new GoogleAuthError("Credenciais do Google OAuth ausentes.");

  const supabase = getSupabaseAdmin();
  const { data: row } = await supabase
    .from("integracoes_oauth")
    .select("access_token, refresh_token, expires_at, status")
    .eq("conta_id", contaId)
    .eq("provider", provider)
    .maybeSingle();

  if (!row || row.status !== "conectado" || !row.refresh_token) {
    throw new GoogleAuthError("Integração não conectada.");
  }

  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  if (row.access_token && expiresAt - Date.now() > 60_000) return row.access_token;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: row.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const tokens = await res.json();

  if (!res.ok || !tokens.access_token) {
    const message =
      tokens.error === "invalid_grant"
        ? "Acesso expirado ou revogado no Google. Clique em Reconectar."
        : `Falha ao renovar acesso: ${tokens.error_description ?? tokens.error ?? res.status}`;
    await supabase
      .from("integracoes_oauth")
      .update({ status: "erro", ultimo_erro: message, atualizado_em: new Date().toISOString() })
      .eq("conta_id", contaId)
      .eq("provider", provider);
    throw new GoogleAuthError(message);
  }

  await supabase
    .from("integracoes_oauth")
    .update({
      access_token: tokens.access_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .eq("conta_id", contaId)
    .eq("provider", provider);

  return tokens.access_token;
}

export interface Ga4Property {
  id: string; // "properties/123456"
  nome: string;
  conta: string;
}

export async function listGa4Properties(accessToken: string): Promise<Ga4Property[]> {
  const props: Ga4Property[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL("https://analyticsadmin.googleapis.com/v1beta/accountSummaries");
    url.searchParams.set("pageSize", "200");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message ?? `Google Analytics retornou ${res.status}`);

    for (const acc of data.accountSummaries ?? []) {
      for (const p of acc.propertySummaries ?? []) {
        props.push({ id: p.property, nome: p.displayName, conta: acc.displayName });
      }
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return props;
}
