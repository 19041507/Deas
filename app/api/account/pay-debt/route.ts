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
  const account = await prisma.account.findUnique({ where: { userId } });
  if (!account) return fail("Conta não encontrada.");
  if (Number(account.availableBalance) < val) return fail("Saldo insuficiente.");
  if (Number(account.debt) <= 0) return fail("Nenhuma dívida pendente.");
  const payAmount = Math.min(val, Number(account.debt));
  await prisma.account.update({ where: { userId }, data: { availableBalance: { decrement: payAmount }, debt: { decrement: payAmount } } });
  const tx = await prisma.transaction.create({ data: { userId, accountId: account.id, creditor: "Pagamento de dívida", type: "pagamento", value: -payAmount, status: "concluído", date: todayBR() } });
  await refreshScore(userId);
  return ok({ transaction: { ...tx, value: Number(tx.value) } });
}
