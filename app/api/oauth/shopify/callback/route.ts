import { NextRequest, NextResponse } from "next/server";
import {
  SHOPIFY_SCOPES,
  SHOPIFY_STATE_COOKIE,
  getShopifyConfig,
  isShopDomain,
  verificarHmacShopify,
  verificarStateShopify,
} from "@/lib/oauth/shopify";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function voltarParaIntegracoes(req: NextRequest, params: Record<string, string>) {
  const url = new URL("/integracoes", req.nextUrl.origin);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = NextResponse.redirect(url);
  res.cookies.set(SHOPIFY_STATE_COOKIE, "", { path: "/api/oauth/shopify", maxAge: 0 });
  return res;
}

// GET /api/oauth/shopify/callback?code=...&hmac=...&shop=...&state=...&timestamp=...
export async function GET(req: NextRequest) {
  const config = getShopifyConfig();
  if (!config) {
    return voltarParaIntegracoes(req, { oauth: "error", provider: "shopify", message: "Credenciais do app Shopify ausentes." });
  }

  const params = req.nextUrl.searchParams;
  const shop = params.get("shop");
  const state = verificarStateShopify(params.get("state") ?? "", config.apiSecret);
  const nonceCookie = req.cookies.get(SHOPIFY_STATE_COOKIE)?.value;

  // Nada é gravado antes de provar que a requisição veio da Shopify e corresponde à instalação que iniciamos.
  if (
    !verificarHmacShopify(params, config.apiSecret) ||
    !isShopDomain(shop) ||
    !state ||
    state.shop !== shop ||
    !nonceCookie ||
    nonceCookie !== state.nonce
  ) {
    return voltarParaIntegracoes(req, {
      oauth: "error",
      provider: "shopify",
      message: "Instalação inválida ou expirada. Tente conectar novamente.",
    });
  }

  const contaId = state.conta_id;
  const supabase = getSupabaseAdmin();

  const salvarErro = async (message: string) => {
    await supabase.from("integracoes_oauth").upsert(
      { conta_id: contaId, provider: "shopify", account_identifier: shop, status: "erro", ultimo_erro: message, atualizado_em: new Date().toISOString() },
      { onConflict: "conta_id,provider" }
    );
    return voltarParaIntegracoes(req, { oauth: "error", provider: "shopify", cliente: contaId, message });
  };

  const code = params.get("code");
  if (!code) return salvarErro("Código de autorização ausente.");

  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: config.apiKey, client_secret: config.apiSecret, code }),
  });
  const tokens = (await tokenRes.json().catch(() => ({}))) as { access_token?: string; scope?: string; error_description?: string };

  if (!tokenRes.ok || !tokens.access_token) {
    return salvarErro(`Falha na troca do código: ${tokens.error_description ?? tokenRes.status}`);
  }

  const concedidos = new Set((tokens.scope ?? "").split(","));
  const faltando = SHOPIFY_SCOPES.filter((s) => !concedidos.has(s));
  if (faltando.length) return salvarErro(`Permissões não concedidas: ${faltando.join(", ")}.`);

  const { error } = await supabase.from("integracoes_oauth").upsert(
    {
      conta_id: contaId,
      provider: "shopify",
      account_identifier: shop,
      access_token: tokens.access_token,
      refresh_token: null,
      expires_at: null,
      scopes: tokens.scope,
      status: "conectado",
      ultimo_erro: null,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "conta_id,provider" }
  );

  if (error) {
    return voltarParaIntegracoes(req, { oauth: "error", provider: "shopify", cliente: contaId, message: `Erro ao salvar conexão: ${error.message}` });
  }
  return voltarParaIntegracoes(req, { oauth: "success", provider: "shopify", cliente: contaId });
}
