/**
 * POST /api/oauth/token
 *
 * Endpoint de token OAuth do Deas Finance.
 * Troca o authorization code por um access token.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

const DEAS_CLIENT_ID     = process.env.DEAS_CLIENT_ID     ?? "deas_client_001";
const DEAS_CLIENT_SECRET = process.env.DEAS_CLIENT_SECRET ?? "";

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

  // Busca o code salvo no AuditLog
  const log = await prisma.auditLog.findFirst({
    where: { action: "OAUTH_CODE_PENDING", details: { path: ["code"], equals: code } },
    orderBy: { createdAt: "desc" },
  });

  if (!log || !log.details) {
    return NextResponse.json({ error: "Code inválido ou expirado." }, { status: 401 });
  }

  const details = log.details as { code: string; userId: string; redirectUri: string; expiresAt: number };

  if (Date.now() > details.expiresAt) {
    return NextResponse.json({ error: "Code expirado." }, { status: 401 });
  }

  if (details.redirectUri !== redirect_uri) {
    return NextResponse.json({ error: "redirect_uri não confere." }, { status: 401 });
  }

  // Invalida o code após uso
  await prisma.auditLog.update({
    where: { id: log.id },
    data: { action: "OAUTH_CODE_USED" },
  });

  // Gera access token usando o sistema de auth existente do Deas
  const accessToken = createToken(details.userId);

  return NextResponse.json({
    access_token: accessToken,
    token_type:   "Bearer",
    expires_in:   604800,
  });
}
