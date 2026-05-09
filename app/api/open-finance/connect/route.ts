import { prisma } from "@/lib/prisma";
import { tokenFromRequest } from "@/lib/auth";
import { ok, fail, unauth } from "@/lib/http";
import { seedValues } from "@/lib/account";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const userId = tokenFromRequest(req);
  if (!userId) return unauth();
  const { institutionName } = await req.json();
  if (!institutionName) return fail("Nome da instituição obrigatório.");
  const existing = await prisma.openFinanceConsent.findFirst({ where: { userId, institutionName, status: "ativo" } });
  if (existing) return fail("Esta instituição já está conectada.");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const seed = seedValues((user?.email || "") + institutionName);
  const validUntil = new Date(); validUntil.setFullYear(validUntil.getFullYear() + 1);
  const consent = await prisma.openFinanceConsent.create({
    data: { userId, institutionName, status: "ativo", externalBalance: seed.balance * 0.8, externalDebt: seed.debt * 0.6, externalLimit: seed.limit * 0.7, externalLoans: seed.preApproved * 0.3, externalInvestments: seed.balance * 0.4, externalScore: seed.score, estimatedIncome: seed.income, validUntil }
  });
  await prisma.auditLog.create({ data: { userId, action: "OF_CONNECT", details: { institutionName } } });
  return ok({ ...consent, externalBalance: Number(consent.externalBalance), externalScore: consent.externalScore });
}
