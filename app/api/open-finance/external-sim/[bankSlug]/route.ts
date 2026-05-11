/**
 * Simulação de API de banco externo — apenas para demonstração.
 *
 * Importante no Next.js App Router:
 * - /api/open-finance/external-sim/[bankSlug] cai neste arquivo.
 * - /api/open-finance/external-sim/[bankSlug]/accounts NÃO cai aqui.
 * - /api/open-finance/external-sim/[bankSlug]/consents/[consentId] NÃO cai aqui.
 *
 * Por isso as rotas aninhadas ficam em:
 * - [bankSlug]/accounts/route.ts
 * - [bankSlug]/consents/[consentId]/route.ts
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      message: "Banco simulado encontrado. Use /accounts para consultar dados da conta.",
    },
    { status: 200 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Rota não encontrada. Use /consents/[consentId] para revogar." },
    { status: 404 }
  );
}
