import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_SCOPES,
  STATE_COOKIE,
  getGoogleConfig,
  verifyState,
} from "@/lib/oauth/google";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

function redirectToPage(req: NextRequest, params: Record<string, string>) {
  const url = new URL("/integracoes", req.nextUrl.origin);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, "", { path: "/api/oauth/google", maxAge: 0 });
  return res;
}

// id_token veio direto do endpoint de token do Google via TLS, então só decodificamos.
function emailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString());
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const config = getGoogleConfig();
  if (!config) {
    return redirectToPage(req, { oauth: "error", message: "Credenciais do Google OAuth ausentes." });
  }

  const stateParam = req.nextUrl.searchParams.get("state") ?? "";
  const state = verifyState(stateParam, config.clientSecret);
  const nonceCookie = req.cookies.get(STATE_COOKIE)?.value;

  if (!state || !nonceCookie || nonceCookie !== state.nonce) {
    return redirectToPage(req, { oauth: "error", message: "Sessão de conexão inválida ou expirada. Tente novamente." });
  }

  const { conta_id, provider } = state;
  const supabase = getSupabaseAdmin();

  const saveError = async (message: string) => {
    await supabase.from("integracoes_oauth").upsert(
      { conta_id, provider, status: "erro", ultimo_erro: message, atualizado_em: new Date().toISOString() },
      { onConflict: "conta_id,provider" }
    );
    return redirectToPage(req, { oauth: "error", provider, cliente: conta_id, message });
  };

  const googleError = req.nextUrl.searchParams.get("error");
  if (googleError) {
    return saveError(googleError === "access_denied" ? "Acesso negado pelo usuário." : `Google retornou: ${googleError}`);
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) return saveError("Código de autorização ausente.");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokens = (await tokenRes.json()) as GoogleTokenResponse;

  if (!tokenRes.ok || tokens.error) {
    return saveError(`Falha na troca do código: ${tokens.error_description ?? tokens.error ?? tokenRes.status}`);
  }

  const requiredScope = GOOGLE_SCOPES[provider][2];
  if (!tokens.scope.split(" ").includes(requiredScope)) {
    return saveError("Permissão necessária não foi concedida. Marque todas as caixas na tela do Google.");
  }

  if (!tokens.refresh_token) {
    return saveError("Google não retornou refresh_token. Remova o acesso do app em myaccount.google.com/permissions e conecte novamente.");
  }

  const { error } = await supabase.from("integracoes_oauth").upsert(
    {
      conta_id,
      provider,
      // GA4 guarda aqui a propriedade escolhida; reconectar não pode apagá-la.
      ...(provider === "ga4" ? {} : { account_identifier: emailFromIdToken(tokens.id_token) }),
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scopes: tokens.scope,
      status: "conectado",
      ultimo_erro: null,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "conta_id,provider" }
  );

  if (error) {
    return redirectToPage(req, { oauth: "error", provider, cliente: conta_id, message: `Erro ao salvar conexão: ${error.message}` });
  }

  return redirectToPage(req, { oauth: "success", provider, cliente: conta_id });
}
