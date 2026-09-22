import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/oauth/google/authorize?provider=google_ads|ga4&conta_id=...
//
// PRÓXIMA ETAPA (ainda não implementada):
//   1. Validar `provider` (google_ads | ga4) e `conta_id` (deve existir em contas_ativas).
//   2. Montar a URL de autorização do Google OAuth 2.0
//      (https://accounts.google.com/o/oauth2/v2/auth) com:
//        - client_id (do app Google Cloud, por variável de ambiente)
//        - redirect_uri apontando para /api/oauth/google/callback
//        - scope adequado ao provider:
//            google_ads -> https://www.googleapis.com/auth/adwords
//            ga4        -> https://www.googleapis.com/auth/analytics.readonly
//        - access_type=offline (para obter refresh_token)
//        - prompt=consent
//        - state assinado contendo { conta_id, provider } para recuperar
//          o contexto no callback (evitar CSRF: validar no callback).
//   3. Antes de redirecionar, fazer upsert em `integracoes_oauth`
//      (conta_id, provider) com status = 'pendente'.
//   4. Retornar NextResponse.redirect(authUrl) em vez do JSON abaixo.
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get("provider");
  const contaId = req.nextUrl.searchParams.get("conta_id");

  return NextResponse.json(
    {
      status: "not_configured",
      message: "OAuth ainda não configurado",
      provider,
      conta_id: contaId,
    },
    { status: 501 }
  );
}
