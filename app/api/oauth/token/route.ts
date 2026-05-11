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

const DEAS_CLIENT_ID = process.env.DEAS_CLIENT_ID ?? "deas_client_001";
const DEAS_CLIENT_SECRET = process.env.DEAS_CLIENT_SECRET ?? "deas_secret_k9x2m7p4n8q1r6t3w5y8";

type TokenBody = {
  grant_type?: string;
  client_id?: string;
  client_secret?: string;
  code?: string;
  redirect_uri?: string;
};

async function readTokenBody(req: Request): Promise<TokenBody> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return await req.json().catch(() => ({}));
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return {};
    return {
      grant_type: String(form.get("grant_type") ?? ""),
      client_id: String(form.get("client_id") ?? ""),
      client_secret: String(form.get("client_secret") ?? ""),
      code: String(form.get("code") ?? ""),
      redirect_uri: String(form.get("redirect_uri") ?? ""),
    };
  }

  // Fallback: alguns clientes enviam texto urlencoded sem content-type correto.
  const raw = await req.text().catch(() => "");
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    const params = new URLSearchParams(raw);
    return {
      grant_type: params.get("grant_type") ?? undefined,
      client_id: params.get("client_id") ?? undefined,
      client_secret: params.get("client_secret") ?? undefined,
      code: params.get("code") ?? undefined,
      redirect_uri: params.get("redirect_uri") ?? undefined,
    };
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/oauth/token", method: "POST" });
}

export async function POST(req: Request) {
  try {
    const body = await readTokenBody(req);
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

    if (!redirect_uri) {
      return NextResponse.json({ error: "redirect_uri obrigatório." }, { status: 400 });
    }

    // Evita query JSON avançada que pode quebrar dependendo da versão do Prisma/Postgres.
    // Buscamos os códigos recentes e filtramos em JS para impedir erro 500 no Vercel.
    const logs = await prisma.auditLog.findMany({
      where: { action: "OAUTH_CODE_PENDING" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const log = logs.find((item) => {
      const details = item.details as { code?: string } | null;
      return details?.code === code;
    });

    if (!log || !log.details) {
      return NextResponse.json({ error: "Code inválido ou expirado." }, { status: 401 });
    }

    const details = log.details as {
      code: string;
      userId: string;
      redirectUri: string;
      expiresAt: number;
    };

    if (Date.now() > details.expiresAt) {
      return NextResponse.json({ error: "Code expirado." }, { status: 401 });
    }

    if (details.redirectUri !== redirect_uri) {
      return NextResponse.json(
        {
          error: "redirect_uri não confere.",
          expected: details.redirectUri,
          received: redirect_uri,
        },
        { status: 401 },
      );
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
    console.error("Erro na rota /api/oauth/token:", error);
    return NextResponse.json(
      {
        error: "Erro interno no token do Deas Finance.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
