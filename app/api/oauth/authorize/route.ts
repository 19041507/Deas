/**
 * GET /api/oauth/authorize
 *
 * Endpoint de autorização OAuth do Deas Finance.
 * Permite que bancos externos (ex: Larabank) solicitem acesso aos dados do usuário.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tokenFromRequest } from "@/lib/auth";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const DEAS_CLIENT_ID = process.env.DEAS_CLIENT_ID     ?? "deas_client_001";
const APP_URL        = process.env.NEXT_PUBLIC_APP_URL ?? "https://larabankdigital2.vercel.app";

export async function GET(req: Request) {
  const url         = new URL(req.url);
  const clientId    = url.searchParams.get("client_id");
  const redirectUri = url.searchParams.get("redirect_uri");
  const state       = url.searchParams.get("state");

  if (clientId !== DEAS_CLIENT_ID) {
    return NextResponse.json({ error: "client_id inválido." }, { status: 401 });
  }

  if (!redirectUri) {
    return NextResponse.json({ error: "redirect_uri obrigatório." }, { status: 400 });
  }

  const userId = tokenFromRequest(req);
  if (!userId) {
    return NextResponse.redirect(`${APP_URL}/login?next=${encodeURIComponent(req.url)}`);
  }

  // Gera authorization code e salva no AuditLog (expira em 5 min)
  const code = crypto.randomBytes(24).toString("hex");

  await prisma.auditLog.create({
    data: {
      userId,
      action: "OAUTH_CODE_PENDING",
      details: {
        code,
        userId,
        redirectUri,
        expiresAt: Date.now() + 5 * 60 * 1000,
      },
    },
  });

  const dest = new URL(redirectUri);
  dest.searchParams.set("code", code);
  if (state) dest.searchParams.set("state", state);

  return NextResponse.redirect(dest.toString());
}
