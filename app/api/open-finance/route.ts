/**
 * GET /api/open-finance
 *
 * Retorna os consentimentos do usuário com o último snapshot de cada banco.
 * Inclui dados da instituição (nome, slug) e o status da conexão.
 */

import { prisma } from "@/lib/prisma";
import { tokenFromRequest } from "@/lib/auth";
import { ok, unauth } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const userId = tokenFromRequest(req);
  if (!userId) return unauth();

  const consents = await prisma.openFinanceConsent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      institution: {
        select: { id: true, name: true, slug: true, logoUrl: true },
      },
      snapshots: {
        orderBy: { syncedAt: "desc" },
        take: 1, // apenas o snapshot mais recente
      },
    },
  });

  return ok(
    consents.map((c) => {
      const snap = c.snapshots[0] ?? null;
      return {
        id:              c.id,
        status:          c.status,
        permissions:     c.permissions,
        validUntil:      c.validUntil,
        createdAt:       c.createdAt,
        institution:     c.institution,
        lastSyncedAt:    snap?.syncedAt ?? null,
        // Dados financeiros do último snapshot (null se ainda não sincronizou)
        externalBalance: snap ? Number(snap.availableBalance) : null,
        externalDebt:    snap ? Number(snap.debt) : null,
        externalLimit:   snap ? Number(snap.limit) : null,
        externalLoans:   snap ? Number(snap.loans) : null,
        externalInvestments: snap ? Number(snap.investments) : null,
        externalScore:   snap?.externalScore ?? null,
        estimatedIncome: snap ? Number(snap.estimatedIncome) : null,
        requestedSalary: snap ? Number(snap.requestedSalary ?? 0) : 0,
      };
    })
  );
}
