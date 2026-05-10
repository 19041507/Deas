/**
 * POST /api/open-finance/disconnect
 *
 * Revoga o consentimento Open Finance com uma instituição.
 *
 * Fluxo correto:
 *   1. Usuário solicita revogação
 *   2. Deas Finance notifica o banco externo via DELETE /consents/:id
 *   3. Marca consentimento local como "revogado"
 *   4. Recalcula score sem os dados desse banco
 *   5. Registra auditoria
 */

import { prisma } from "@/lib/prisma";
import { tokenFromRequest } from "@/lib/auth";
import { refreshScore } from "@/lib/account";
import { getAdapter } from "@/lib/open-finance/adapters";
import { ok, fail, unauth } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const userId = tokenFromRequest(req);
  if (!userId) return unauth();

  const { id } = await req.json().catch(() => ({}));
  if (!id) return fail("ID do consentimento obrigatório.");

  const consent = await prisma.openFinanceConsent.findFirst({
    where: { id, userId, status: "ativo" },
    include: { institution: true },
  });
  if (!consent) return fail("Consentimento ativo não encontrado.");

  // Notifica o banco externo sobre a revogação (falha silenciosa — não bloqueia)
  if (consent.accessToken) {
    const adapter = getAdapter(consent.institution.slug);
    await adapter.revokeConsent(
      consent.accessToken,
      consent.institution.apiBaseUrl,
      consent.id
    );
  }

  // Revoga localmente
  await prisma.openFinanceConsent.update({
    where: { id: consent.id },
    data: { status: "revogado", accessToken: null, refreshToken: null },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "OF_CONSENT_REVOKED",
      details: {
        consentId:      consent.id,
        institutionId:  consent.institutionId,
        institutionName: consent.institution.name,
      },
    },
  });

  // Recalcula score sem os dados da instituição revogada
  await refreshScore(userId);

  return ok({ ok: true });
}
