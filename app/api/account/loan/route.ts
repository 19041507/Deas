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
  if (!val || val < 100) return fail("Valor mínimo: R$ 100,00");
  const account = await prisma.account.findUnique({ where: { userId } });
  if (!account) return fail("Conta não encontrada.");
  if (val > Number(account.preApproved)) return fail(`Valor excede o pré-aprovado de ${Number(account.preApproved).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`);
  await prisma.account.update({ where: { userId }, data: { availableBalance: { increment: val }, debt: { increment: val }, loansTotal: { increment: val }, preApproved: { decrement: val } } });
  const tx = await prisma.transaction.create({ data: { userId, accountId: account.id, creditor: "Empréstimo Deas Finance", type: "crédito", value: val, status: "concluído", date: todayBR() } });
  await prisma.auditLog.create({ data: { userId, action: "LOAN", details: { amount: val } } });
  await refreshScore(userId);
  return ok({ transaction: { ...tx, value: Number(tx.value) } });
}
