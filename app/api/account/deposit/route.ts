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
  if (!val || val <= 0 || val > 1000000) return fail("Valor inválido. Máximo: R$ 1.000.000,00");
  const account = await prisma.account.findUnique({ where: { userId } });
  if (!account) return fail("Conta não encontrada.");
  const updated = await prisma.account.update({ where: { userId }, data: { availableBalance: { increment: val } } });
  const tx = await prisma.transaction.create({ data: { userId, accountId: account.id, creditor: "Depósito Deas Finance", type: "entrada", value: val, status: "concluído", date: todayBR() } });
  await prisma.auditLog.create({ data: { userId, action: "DEPOSIT", details: { amount: val } } });
  await refreshScore(userId);
  return ok({ balance: Number(updated.availableBalance), transaction: { ...tx, value: Number(tx.value) } });
}
