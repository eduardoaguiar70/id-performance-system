import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_SCOPES,
  STATE_COOKIE,
  createState,
  getGoogleConfig,
  isGoogleProvider,
} from "@/lib/oauth/google";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Retorna a URL de consentimento do Google; o frontend faz o redirect.
export async function GET(req: NextRequest) {
  if (!req.cookies.get("sb-auth-token")?.value) {
    return NextResponse.json({ status: "unauthorized", message: "Sessão expirada. Faça login novamente." }, { status: 401 });
  }

  const config = getGoogleConfig();
  if (!config) {
    return NextResponse.json(
      { status: "not_configured", message: "Credenciais do Google OAuth ausentes no .env.local" },
      { status: 501 }
    );
  }

  const provider = req.nextUrl.searchParams.get("provider");
  const contaId = req.nextUrl.searchParams.get("conta_id");

  if (!isGoogleProvider(provider) || !contaId) {
    return NextResponse.json({ status: "bad_request", message: "provider ou conta_id inválido." }, { status: 400 });
  }

  const { data: conta } = await getSupabaseAdmin()
    .from("contas_ativas")
    .select("conta_id")
    .eq("conta_id", contaId)
    .maybeSingle();
  if (!conta) {
    return NextResponse.json({ status: "bad_request", message: "Cliente não encontrado." }, { status: 400 });
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const state = createState({ conta_id: contaId, provider, nonce, ts: Date.now() }, config.clientSecret);

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SCOPES[provider].join(" "));
  // offline + consent garantem que o Google devolva refresh_token também em reconexões
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent select_account");
  url.searchParams.set("state", state);

  const res = NextResponse.json({ status: "ok", url: url.toString() });
  res.cookies.set(STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/oauth/google",
    maxAge: 600,
  });
  return res;
}
