import { prisma } from "@/lib/prisma";
import { tokenFromRequest } from "@/lib/auth";
import { ok, unauth } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const userId = tokenFromRequest(req);
  if (!userId) return unauth();
  const consents = await prisma.openFinanceConsent.findMany({ where: { userId, status: "ativo" }, orderBy: { createdAt: "desc" } });
  return ok(consents.map(c => ({ ...c, externalBalance: Number(c.externalBalance ?? 0), externalDebt: Number(c.externalDebt ?? 0), externalLimit: Number(c.externalLimit ?? 0), externalLoans: Number(c.externalLoans ?? 0), externalInvestments: Number(c.externalInvestments ?? 0), requestedSalary: Number(c.requestedSalary ?? 0), estimatedIncome: Number(c.estimatedIncome ?? 0) })));
}
