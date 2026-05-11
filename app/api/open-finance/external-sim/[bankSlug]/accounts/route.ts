import { handleGetAccounts } from "@/lib/open-finance/bank-simulator";

export const dynamic = "force-dynamic";

/**
 * GET /api/open-finance/external-sim/[bankSlug]/accounts
 *
 * No App Router, [bankSlug]/route.ts não captura segmentos extras como /accounts.
 * Esta rota existe para o genericAdapter conseguir buscar os dados simulados.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ bankSlug: string }> }
) {
  const { bankSlug } = await params;
  return handleGetAccounts(request, bankSlug);
}
