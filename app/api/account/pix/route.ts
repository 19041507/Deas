import { prisma } from "@/lib/prisma";
import { tokenFromRequest } from "@/lib/auth";
import { refreshScore, todayBR } from "@/lib/account";
import { ok, fail, unauth } from "@/lib/http";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const userId = tokenFromRequest(req);
  if (!userId) return unauth();
  const { amount, creditor, description } = await req.json();
  const val = Number(amount);
  if (!val || val <= 0) return fail("Valor inválido.");
  if (!creditor?.trim()) return fail("Informe o favorecido.");
  const account = await prisma.account.findUnique({ where: { userId } });
  if (!account) return fail("Conta não encontrada.");
  if (Number(account.availableBalance) < val) return fail("Saldo insuficiente para realizar o Pix.");
  if (val > 50000) return fail("Limite por Pix: R$ 50.000,00");
  const updated = await prisma.account.update({ where: { userId }, data: { availableBalance: { decrement: val } } });
  const tx = await prisma.transaction.create({ data: { userId, accountId: account.id, creditor: creditor.trim(), type: "saída", value: -val, status: "concluído", date: todayBR() } });
  await prisma.auditLog.create({ data: { userId, action: "PIX", details: { amount: val, creditor, description } } });
  await refreshScore(userId);
  return ok({ balance: Number(updated.availableBalance), transaction: { ...tx, value: Number(tx.value) }, txId: tx.id });
}
