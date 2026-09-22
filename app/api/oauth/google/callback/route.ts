import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/oauth/google/callback?code=...&state=...
//
// PRÓXIMA ETAPA (ainda não implementada):
//   1. Validar e decodificar `state` (contém { conta_id, provider }) para
//      evitar CSRF; rejeitar se ausente/inválido.
//   2. Trocar o `code` pelo par access_token/refresh_token via POST em
//      https://oauth2.googleapis.com/token (client_id, client_secret,
//      code, redirect_uri, grant_type=authorization_code).
//   3. Buscar o identificador da conta conectada (customer_id do Google
//      Ads ou property_id do GA4) para preencher `account_identifier`.
//   4. Persistir em `integracoes_oauth` (upsert por conta_id + provider):
//        access_token, refresh_token, expires_at, scopes,
//        account_identifier, status = 'conectado', ultimo_erro = null,
//        atualizado_em = now().
//   5. Em caso de erro (code ausente, troca de token falhar, etc.):
//        status = 'erro', ultimo_erro = <mensagem>.
//   6. Redirecionar de volta para /integracoes (com query param de
//      sucesso/erro para exibir toast no client).
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  return NextResponse.json(
    {
      status: "not_configured",
      message: "OAuth ainda não configurado",
      code,
      state,
    },
    { status: 501 }
  );
}
