import { handleRevokeConsent } from "@/lib/open-finance/bank-simulator";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/open-finance/external-sim/[bankSlug]/consents/[consentId]
 *
 * Rota usada pelo genericAdapter para notificar revogação de consentimento.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ bankSlug: string; consentId: string }> }
) {
  await params; // mantém compatibilidade com Next.js 15
  return handleRevokeConsent();
}
