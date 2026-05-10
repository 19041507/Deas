/**
 * Simulação de API de banco externo — apenas para demonstração.
 * Rota: GET /api/open-finance/external-sim/[bankSlug]/...
 *       DELETE /api/open-finance/external-sim/[bankSlug]/...
 */

import { NextResponse } from "next/server";
import { handleGetAccounts, handleRevokeConsent } from "@/lib/open-finance/bank-simulator";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bankSlug: string }> }
) {
  const { bankSlug } = await params;
  const url = new URL(request.url);

  if (url.pathname.endsWith("/accounts")) {
    return handleGetAccounts(request, bankSlug);
  }

  return NextResponse.json({ error: "Rota não encontrada." }, { status: 404 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ bankSlug: string }> }
) {
  await params; // Next.js 15 exige await mesmo sem usar o valor
  const url = new URL(request.url);

  if (url.pathname.includes("/consents/")) {
    return handleRevokeConsent();
  }

  return NextResponse.json({ error: "Rota não encontrada." }, { status: 404 });
}
