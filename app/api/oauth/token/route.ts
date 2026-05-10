/**
 * POST /api/oauth/token
 *
 * Endpoint de token OAuth do Deas Finance.
 * Troca o authorization code por um access token.
 *
 * Body esperado:
 *   grant_type:    "authorization_code"
 *   client_id:     "deas_client_001"
 *   client_secret: (valor do DEAS_CLIENT_SECRET)
 *   code:          (code recebido no callback)
 *   redirect_uri:  (mesma redirect_uri usada na autorização)
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

const DEAS_CLIENT_ID     = process.env.DEAS_CLIENT_ID     ?? "deas_client_001";
const DEAS_CLIENT_SECRET = process.env.DEAS_CLIENT_SECRET ?? "";
const APP_SECRET         = process.env.APP_SECRET         ?? "";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const { grant_type, client_id, client_secret, code, redirect_uri } = body;

  if (grant_type !== "authorization_code") {
    return NextResponse.json({ error: "grant_type inválido." }, { status: 400 });
  }

  if (client_id !== DEAS_CLIENT_ID || client_secret !== DEAS_CLIENT_SECRET) {
    return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
  }

  if (!code) {
    return NextResponse.json({ error: "code obrigatório." }, { status: 400 });
  }

  // Recupera o code salvo no cookie
  const cookieStore = cookies();
  const cookieVal   = cookieStore.get("oauth_code_" + code)?.value;

  if (!cookieVal) {
    return NextResponse.json({ error: "Code inválido ou expirado." }, { status: 401 });
  }

  let payload: { code: string; userId: string; redirectUri: string; expiresAt: number };
  try {
    payload = JSON.parse(Buffer.from(cookieVal, "base64").toString());
  } catch {
    return NextResponse.json({ error: "Code corrompido." }, { status: 401 });
  }

  if (Date.now() > payload.expiresAt) {
    return NextResponse.json({ error: "Code expirado." }, { status: 401 });
  }

  if (payload.redirectUri !== redirect_uri) {
    return NextResponse.json({ error: "redirect_uri não confere." }, { status: 401 });
  }

  // Gera access token JWT (válido por 1 hora)
  const accessToken = jwt.sign(
    { sub: payload.userId, scope: "accounts balances transactions" },
    APP_SECRET,
    { expiresIn: "1h" }
  );

  return NextResponse.json({
    access_token: accessToken,
    token_type:   "Bearer",
    expires_in:   3600,
  });
}
