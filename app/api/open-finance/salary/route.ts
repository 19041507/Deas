import { prisma } from "@/lib/prisma";
import { tokenFromRequest } from "@/lib/auth";
import { refreshScore, todayBR } from "@/lib/account";
import { ok, fail, unauth } from "@/lib/http";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const userId = tokenFromRequest(req);
  if (!userId) return unauth();
  const { amount } = await req.json();
  const val = Number(amount);
  if (!val || val <= 0) return fail("Valor inválido.");
  const consent = await prisma.openFinanceConsent.findFirst({ where: { userId, status: "ativo" } });
  if (!consent) return fail("Nenhuma conexão Open Finance ativa.");
  const account = await prisma.account.findUnique({ where: { userId } });
  if (!account) return fail("Conta não encontrada.");
  await prisma.openFinanceConsent.update({ where: { id: consent.id }, data: { requestedSalary: val } });
  await prisma.account.update({ where: { userId }, data: { availableBalance: { increment: val } } });
  await prisma.transaction.create({ data: { userId, accountId: account.id, creditor: `Portabilidade salarial — ${consent.institutionName}`, type: "entrada", value: val, status: "concluído", date: todayBR() } });
  await refreshScore(userId);
  return ok({ ok: true });
}
