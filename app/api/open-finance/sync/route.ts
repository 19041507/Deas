/**
 * POST /api/open-finance/sync
 *
 * Sincroniza dados financeiros de todos os bancos conectados (status "ativo").
 *
 * Fluxo:
 *   1. Busca todos os consentimentos ativos do usuário
 *   2. Para cada banco: chama a API externa com o accessToken
 *   3. Salva um novo snapshot dos dados recebidos
 *   4. Recalcula o score considerando todos os bancos
 *   5. Registra auditoria
 *
 * Este endpoint substitui o antigo comportamento de apenas recarregar
 * dados do banco de dados local sem consultar APIs externas.
 */

import { prisma } from "@/lib/prisma";
import { tokenFromRequest } from "@/lib/auth";
import { ok, unauth } from "@/lib/http";
import { getAdapter } from "@/lib/open-finance/adapters";
import { refreshScore } from "@/lib/account";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const userId = tokenFromRequest(req);
  if (!userId) return unauth();

  const consents = await prisma.openFinanceConsent.findMany({
    where: { userId, status: "ativo" },
    include: { institution: true },
  });

  if (!consents.length) {
    return ok({ synced: 0, message: "Nenhum banco conectado." });
  }

  await prisma.auditLog.create({
    data: { userId, action: "OF_SYNC_STARTED", details: { count: consents.length } },
  });

  const results = await Promise.allSettled(
    consents.map(async (consent) => {
      if (!consent.accessToken) throw new Error("Token ausente.");

      const adapter = getAdapter(consent.institution.slug);

      try {
        const data = await adapter.fetchAccountData(
          consent.accessToken,
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

        return { institutionName: consent.institution.name, status: "success" };
      } catch (err: any) {
        // Marca consentimento como erro se o token expirou ou foi revogado
        if (err?.code === "TOKEN_EXPIRED" || err?.code === "CONSENT_REVOKED") {
          await prisma.openFinanceConsent.update({
            where: { id: consent.id },
            data: { status: "erro" },
          });
        }
        throw err;
      }
    })
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed    = results.filter((r) => r.status === "rejected").length;
  const errors = results
    .map((r, index) => {
      if (r.status === "fulfilled") return null;
      const consent = consents[index];
      const reason = r.reason;
      return {
        institutionName: consent?.institution?.name ?? "Banco desconhecido",
        code: reason?.code ?? "UNKNOWN",
        message: reason?.message ?? String(reason ?? "Erro desconhecido"),
      };
    })
    .filter(Boolean);

  // Recalcula score com dados atualizados de todos os bancos
  await refreshScore(userId);

  await prisma.auditLog.create({
    data: {
      userId,
      action: failed === 0 ? "OF_SYNC_SUCCESS" : "OF_SYNC_PARTIAL",
      details: { succeeded, failed, errors },
    },
  });

  return ok({
    synced:  succeeded,
    failed,
    errors,
    message: `${succeeded} banco(s) sincronizado(s)${failed ? `, ${failed} com erro` : ""}.`,
  });
}
