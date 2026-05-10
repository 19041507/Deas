/**
 * Simulação de API de banco externo — apenas para demonstração.
 *
 * Em produção, cada banco teria sua própria API independente.
 * Esta rota simula as respostas que um banco real retornaria.
 *
 * Rotas atendidas:
 *   GET  /api/open-finance/external-sim/[bankSlug]/accounts
 *   DELETE /api/open-finance/external-sim/[bankSlug]/consents/[id]
 */

import { NextResponse } from "next/server";
import { handleGetAccounts, handleRevokeConsent } from "@/lib/open-finance/bank-simulator";

export const dynamic = "force-dynamic";

type Params = { params: { bankSlug: string } };

export async function GET(request: Request, { params }: Params) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path.endsWith("/accounts")) {
    return handleGetAccounts(request, params.bankSlug);
  }

  return NextResponse.json({ error: "Rota não encontrada." }, { status: 404 });
}

export async function DELETE(request: Request, { params }: Params) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path.includes("/consents/")) {
    return handleRevokeConsent();
  }

  return NextResponse.json({ error: "Rota não encontrada." }, { status: 404 });
}
