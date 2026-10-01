import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  SHOPIFY_SCOPES,
  SHOPIFY_STATE_COOKIE,
  criarStateShopify,
  getShopifyConfig,
  isShopDomain,
} from "@/lib/oauth/shopify";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// GET /api/oauth/shopify/install?conta_id=...&shop=minhaloja.myshopify.com
// Retorna a URL de instalação do app na loja; o frontend faz o redirect.
export async function GET(req: NextRequest) {
  if (!req.cookies.get("sb-auth-token")?.value) {
    return NextResponse.json({ message: "Sessão expirada. Faça login novamente." }, { status: 401 });
  }

  const config = getShopifyConfig();
  if (!config) {
    return NextResponse.json(
      { status: "not_configured", message: "Credenciais do app Shopify ausentes no .env.local" },
      { status: 501 }
    );
  }

  const contaId = req.nextUrl.searchParams.get("conta_id");
  const shop = req.nextUrl.searchParams.get("shop")?.trim().toLowerCase() ?? null;
  if (!contaId || !isShopDomain(shop)) {
    return NextResponse.json({ message: "Informe um domínio válido, ex: minhaloja.myshopify.com" }, { status: 400 });
  }

  const { data: conta } = await getSupabaseAdmin()
    .from("contas_ativas")
    .select("conta_id")
    .eq("conta_id", contaId)
    .maybeSingle();
  if (!conta) return NextResponse.json({ message: "Cliente não encontrado." }, { status: 400 });

  const nonce = crypto.randomBytes(16).toString("hex");
  const state = criarStateShopify({ conta_id: contaId, shop, nonce, ts: Date.now() }, config.apiSecret);

  // Sem grant_options[]=per-user → token offline (vale para a loja, não para um usuário).
  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", config.apiKey);
  url.searchParams.set("scope", SHOPIFY_SCOPES.join(","));
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);

  const res = NextResponse.json({ status: "ok", url: url.toString() });
  res.cookies.set(SHOPIFY_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/oauth/shopify",
    maxAge: 600,
  });
  return res;
}
