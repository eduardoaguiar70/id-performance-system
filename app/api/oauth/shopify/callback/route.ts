import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/oauth/shopify/callback?code=...&shop=...&state=...&hmac=...
//
// PRÓXIMA ETAPA (ainda não implementada):
//   1. Validar o `hmac` da query string com o client_secret do app Shopify
//      (garante que a requisição veio da Shopify).
//   2. Validar e decodificar `state` (contém { conta_id, shop }) para
//      evitar CSRF; rejeitar se ausente/inválido ou se `shop` não bater.
//   3. Trocar o `code` pelo access_token via POST em
//      https://{shop}/admin/oauth/access_token (client_id, client_secret,
//      code).
//   4. Persistir em `integracoes_oauth` (upsert por conta_id + provider):
//        access_token, account_identifier = shop, scopes,
//        status = 'conectado', ultimo_erro = null, atualizado_em = now().
//      (Shopify não usa refresh_token — o access_token é de longa duração
//      até ser revogado.)
//   5. Em caso de erro (hmac inválido, code ausente, troca falhar, etc.):
//        status = 'erro', ultimo_erro = <mensagem>.
//   6. Redirecionar de volta para /integracoes (com query param de
//      sucesso/erro para exibir toast no client).
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const shop = req.nextUrl.searchParams.get("shop");
  const state = req.nextUrl.searchParams.get("state");

  return NextResponse.json(
    {
      status: "not_configured",
      message: "OAuth ainda não configurado",
      code,
      shop,
      state,
    },
    { status: 501 }
  );
}
