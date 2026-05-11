/**
 * POST /api/oauth/token
 *
 * Endpoint de token OAuth do Deas Finance.
 * Troca o authorization code por um access token.
 *
 * Ajustes:
 * - aceita JSON e application/x-www-form-urlencoded;
 * - evita filtro Prisma JSON path, que pode quebrar em alguns Postgres/Prisma;
 * - retorna erro em JSON com log no Vercel em vez de derrubar a rota sem explicação.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

const DEAS_CLIENT_ID = process.env.DEAS_CLIENT_ID ?? "deas_client_001";
const DEAS_CLIENT_SECRET = process.env.DEAS_CLIENT_SECRET ?? "deas_secret_k9x2m7p4n8q1r6t3w5y8";

type TokenBody = {
  grant_type?: string;
  client_id?: string;
  client_secret?: string;
  code?: string;
  redirect_uri?: string;
};

async function readBody(req: Request): Promise<TokenBody> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    return Object.fromEntries(params.entries());
  }

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    return {
      grant_type: String(form.get("grant_type") ?? ""),
      client_id: String(form.get("client_id") ?? ""),
      client_secret: String(form.get("client_secret") ?? ""),
      code: String(form.get("code") ?? ""),
      redirect_uri: String(form.get("redirect_uri") ?? ""),
    };
  }

  return await req.json().catch(() => ({}));
}

function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function POST(req: Request) {
  try {
    const body = await readBody(req);
    const grantType = String(body.grant_type ?? "");
    const clientId = String(body.client_id ?? "");
    const clientSecret = String(body.client_secret ?? "");
    const code = String(body.code ?? "");
    const redirectUri = String(body.redirect_uri ?? "");

    if (grantType !== "authorization_code") {
      return jsonError("grant_type inválido.", 400);
    }

    if (clientId !== DEAS_CLIENT_ID || clientSecret !== DEAS_CLIENT_SECRET) {
      return jsonError("Credenciais inválidas.", 401);
    }

    if (!code) {
      return jsonError("code obrigatório.", 400);
    }

    if (!redirectUri) {
      return jsonError("redirect_uri obrigatório.", 400);
    }

    // Busca os codes recentes sem usar JSON path no banco.
    // Isso evita erro 500 em deploys onde o Prisma/Postgres não aceita esse filtro.
    const pendingLogs = await prisma.auditLog.findMany({
      where: { action: "OAUTH_CODE_PENDING" },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const log = pendingLogs.find((item) => {
      const details = item.details as any;
      return details?.code === code;
    });

    if (!log || !log.details) {
      return jsonError("Code inválido ou expirado.", 401);
    }

    const details = log.details as {
      code: string;
      userId: string;
      redirectUri: string;
      expiresAt: number;
    };

    if (Date.now() > Number(details.expiresAt)) {
      return jsonError("Code expirado.", 401);
    }

    if (details.redirectUri !== redirectUri) {
      return jsonError("redirect_uri não confere.", 401, {
        expected: details.redirectUri,
        received: redirectUri,
      });
    }

    await prisma.auditLog.update({
      where: { id: log.id },
      data: { action: "OAUTH_CODE_USED" },
    });

    const accessToken = createToken(details.userId);

    return NextResponse.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 604800,
    });
  } catch (error) {
    console.error("[Deas OAuth Token] Erro ao trocar code por token:", error);
    return jsonError("Erro interno ao trocar code por token no Deas Finance.", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
