import { NextResponse } from "next/server";
import { getLarabankClientId, getLarabankClientSecret } from "@/lib/open-finance/providers/larabank";

export const dynamic = "force-dynamic";

function cleanBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export async function GET() {
  const base = cleanBaseUrl(process.env.LARABANK_API_BASE_URL ?? "https://larabankdigital2.vercel.app");
  const clientId = getLarabankClientId();
  const secret = getLarabankClientSecret();

  return NextResponse.json({
    ok: true,
    larabankApiBaseUrl: base,
    authorizationUrl: process.env.LARABANK_AUTH_URL ?? `${base}/api/oauth/authorize`,
    tokenUrlsTriedInOrder: [
      process.env.LARABANK_TOKEN_URL,
      `${base}/api/oauth/token`,
      `${base}/api/open-finance/token`,
    ].filter(Boolean),
    hasLarabankClientId: Boolean(clientId),
    larabankClientIdPreview: clientId ? `${clientId.slice(0, 6)}...` : null,
    hasLarabankClientSecret: Boolean(secret),
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/open-finance/callback`,
  });
}
