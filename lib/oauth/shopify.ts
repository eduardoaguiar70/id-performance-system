import crypto from "crypto";

// Escopos de leitura usados pelas abas Pedidos, Produtos e Clientes.
// Pedidos com mais de 60 dias exigem também read_all_orders (pedido de aprovação à Shopify).
export const SHOPIFY_SCOPES = ["read_orders", "read_products", "read_customers", "read_inventory"];

export const SHOPIFY_STATE_COOKIE = "shopify_oauth_nonce";

const SHOP_DOMAIN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

export function isShopDomain(shop: string | null): shop is string {
  return !!shop && SHOP_DOMAIN.test(shop);
}

export function getShopifyConfig() {
  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;
  const redirectUri = process.env.SHOPIFY_REDIRECT_URI;
  if (!apiKey || !apiSecret || !redirectUri) return null;
  return { apiKey, apiSecret, redirectUri };
}

const iguais = (a: string, b: string) =>
  a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Shopify assina a query do callback: remove `hmac`, ordena os parâmetros e aplica HMAC-SHA256 hex com o secret.
export function verificarHmacShopify(params: URLSearchParams, secret: string) {
  const hmac = params.get("hmac");
  if (!hmac) return false;
  const mensagem = Array.from(params.entries())
    .filter(([k]) => k !== "hmac" && k !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const esperado = crypto.createHmac("sha256", secret).update(mensagem).digest("hex");
  return iguais(hmac, esperado);
}

interface StateShopify {
  conta_id: string;
  shop: string;
  nonce: string;
  ts: number;
}

const STATE_MAX_AGE_MS = 10 * 60 * 1000;

export function criarStateShopify(payload: StateShopify, secret: string) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${crypto.createHmac("sha256", secret).update(data).digest("base64url")}`;
}

export function verificarStateShopify(state: string, secret: string): StateShopify | null {
  const [data, assinatura] = state.split(".");
  if (!data || !assinatura) return null;
  if (!iguais(assinatura, crypto.createHmac("sha256", secret).update(data).digest("base64url"))) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as StateShopify;
    if (Date.now() - payload.ts > STATE_MAX_AGE_MS) return null;
    return payload;
  } catch {
    return null;
  }
}
