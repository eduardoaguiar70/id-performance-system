import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/oauth/shopify/install?conta_id=...&shop=minhaloja.myshopify.com
//
// PRÓXIMA ETAPA (ainda não implementada):
//   1. Validar `conta_id` (existe em contas_ativas) e `shop` (formato
//      *.myshopify.com).
//   2. Montar a URL de instalação do app Shopify:
//      https://{shop}/admin/oauth/authorize com:
//        - client_id (API key do app Shopify, por variável de ambiente)
//        - scope (ex: read_orders, read_products, read_customers)
//        - redirect_uri apontando para /api/oauth/shopify/callback
//        - state assinado contendo { conta_id, shop } para validar no
//          callback (evitar CSRF).
//   3. Antes de redirecionar, fazer upsert em `integracoes_oauth`
//      (conta_id, provider='shopify') com status = 'pendente' e
//      account_identifier = shop.
//   4. Retornar NextResponse.redirect(installUrl) em vez do JSON abaixo.
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const contaId = req.nextUrl.searchParams.get("conta_id");
  const shop = req.nextUrl.searchParams.get("shop");

  return NextResponse.json(
    {
      status: "not_configured",
      message: "OAuth ainda não configurado",
      conta_id: contaId,
      shop,
    },
    { status: 501 }
  );
}
