/**
 * GET /api/open-finance
 *
 * Retorna os consentimentos do usuário com o último snapshot de cada banco.
 * Inclui dados da instituição (nome, slug) e o status da conexão.
 *
 * Correção DEASPay:
 * - Ao abrir a tela, faz uma sincronização automática e leve do DEASPay se o
 *   último snapshot estiver zerado, ausente ou antigo. Isso resolve conexões
 *   feitas antes do provider do DEASPay expor saldo/limite/score corretamente.
 */

import { prisma } from "@/lib/prisma";
import { tokenFromRequest } from "@/lib/auth";
import { ok, unauth } from "@/lib/http";
import { getAdapter } from "@/lib/open-finance/adapters";
import { refreshScore } from "@/lib/account";

export const dynamic = "force-dynamic";

function snapshotLooksEmpty(snap: any) {
  if (!snap) return true;
  return (
    Number(snap.availableBalance ?? 0) === 0 &&
    Number(snap.debt ?? 0) === 0 &&
    Number(snap.limit ?? 0) === 0 &&
    Number(snap.estimatedIncome ?? 0) === 0 &&
    Number(snap.externalScore ?? 0) === 0
  );
}

function snapshotIsOld(snap: any) {
  if (!snap?.syncedAt) return true;
  return Date.now() - new Date(snap.syncedAt).getTime() > 60_000;
}

async function autoSyncDeaspay(userId: string) {
  const deaspayConsents = await prisma.openFinanceConsent.findMany({
    where: { userId, status: "ativo", institution: { slug: "deaspay" }, accessToken: { not: null } },
    include: {
      institution: true,
      snapshots: { orderBy: { syncedAt: "desc" }, take: 1 },
    },
  });

  let synced = 0;

  for (const consent of deaspayConsents) {
    const lastSnap = consent.snapshots[0] ?? null;

    // Evita bater na API em todo refresh, mas corrige snapshot antigo/zerado.
    if (!snapshotLooksEmpty(lastSnap) && !snapshotIsOld(lastSnap)) continue;

    try {
      const adapter = getAdapter(consent.institution.slug);
      const data = await adapter.fetchAccountData(
        consent.accessToken!,
        consent.institution.apiBaseUrl
      );

      await prisma.openFinanceSnapshot.create({
        data: {
          consentId:        consent.id,
          availableBalance: data.availableBalance,
          debt:             data.debt,
          limit:            data.limit,
          loans:            data.loans,
          investments:      data.investments,
          estimatedIncome:  data.estimatedIncome,
          externalScore:    data.externalScore,
        },
      });
      synced++;
    } catch (err: any) {
      console.error("[OF autoSyncDeaspay] Falha ao sincronizar DEASPay:", err);
      await prisma.auditLog.create({
        data: {
          userId,
          action: "OF_DEASPAY_AUTO_SYNC_FAILED",
          details: {
            consentId: consent.id,
            error: err?.message ?? String(err ?? "Erro desconhecido"),
            code: err?.code ?? "UNKNOWN",
          },
        },
      }).catch(() => null);
    }
  }

  if (synced > 0) {
    await refreshScore(userId).catch((err) => console.error("[OF autoSyncDeaspay] Falha ao recalcular score:", err));
  }
}

export async function GET(req: Request) {
  const userId = tokenFromRequest(req);
  if (!userId) return unauth();

  // Garante que o DEASPay exibido seja sempre o dado real mais recente possível.
  await autoSyncDeaspay(userId);

  const consents = await prisma.openFinanceConsent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      institution: {
        select: { id: true, name: true, slug: true, logoUrl: true },
      },
      snapshots: {
        orderBy: { syncedAt: "desc" },
        take: 1,
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
