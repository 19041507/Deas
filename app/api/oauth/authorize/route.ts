/**
 * GET /api/oauth/authorize
 *
 * Endpoint de autorização OAuth do Deas Finance.
 * Permite que bancos externos (ex: Larabank) solicitem acesso aos dados do usuário.
 *
 * Fluxo:
 *   1. Banco externo redireciona usuário para cá com client_id, redirect_uri, state
 *   2. Deas Finance valida o client_id
 *   3. Redireciona para a página de consentimento do usuário
 *   4. Após aprovação, envia code para o redirect_uri do banco externo
 */

import { NextResponse } from "next/server";
import { tokenFromRequest } from "@/lib/auth";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const DEAS_CLIENT_ID     = process.env.DEAS_CLIENT_ID     ?? "deas_client_001";
const APP_URL            = process.env.NEXT_PUBLIC_APP_URL ?? "https://larabankdigital2.vercel.app";

export async function GET(req: Request) {
  const url         = new URL(req.url);
  const clientId    = url.searchParams.get("client_id");
  const redirectUri = url.searchParams.get("redirect_uri");
  const state       = url.searchParams.get("state");

  // Valida client_id
  if (clientId !== DEAS_CLIENT_ID) {
    return NextResponse.json({ error: "client_id inválido." }, { status: 401 });
  }

  if (!redirectUri) {
    return NextResponse.json({ error: "redirect_uri obrigatório." }, { status: 400 });
  }

  // Verifica se o usuário está logado
  const userId = tokenFromRequest(req);
  if (!userId) {
    // Redireciona para login com parâmetros preservados
    return NextResponse.redirect(
      `${APP_URL}/login?next=${encodeURIComponent(req.url)}`
    );
  }

  // Gera authorization code
  const code = crypto.randomBytes(24).toString("hex");

  // Salva o code temporariamente via cookie (expira em 5 min)
  const payload = Buffer.from(
    JSON.stringify({ code, userId, redirectUri, expiresAt: Date.now() + 5 * 60 * 1000 })
  ).toString("base64");

  const dest = new URL(redirectUri);
  dest.searchParams.set("code", code);
  if (state) dest.searchParams.set("state", state);

  const response = NextResponse.redirect(dest.toString());
  response.cookies.set("oauth_code_" + code, payload, {
    httpOnly: true,
    maxAge:   300,
    sameSite: "lax",
  });

  return response;
}
