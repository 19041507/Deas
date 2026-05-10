/**
 * GET /api/open-finance/provider/accounts
 *
 * Expõe dados do Deas Finance para bancos externos que queiram consultá-los.
 * Torna o Deas Finance um "banco transmissor" além de receptor.
 *
 * Autenticação entre servidores: Bearer token (client_id + client_secret em produção).
 *
 * Formato de resposta segue o contrato padrão Open Finance definido em
 * /lib/open-finance/types.ts — qualquer banco parceiro que implemente
 * o mesmo contrato consegue consumir estes dados.
 */

import { prisma } from "@/lib/prisma";
import { tokenFromRequest } from "@/lib/auth";
import { ok, unauth } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Aceita autenticação de usuário (sessão) ou server-to-server (API key futura)
  const userId = tokenFromRequest(req);
  if (!userId) return unauth();

  const account = await prisma.account.findUnique({ where: { userId } });
  if (!account) return unauth();

  const transactions = await prisma.transaction.findMany({
    where:   { userId },
    orderBy: { createdAt: "desc" },
    take:    20,
    select: { id: true, type: true, creditor: true, value: true, date: true },
  });

  // Formato padrão Open Finance — mesma estrutura que os bancos externos retornam
  return ok({
    account: {
      availableBalance: Number(account.availableBalance),
      debt:             Number(account.debt),
      limit:            Number(account.limit),
      estimatedIncome:  Number(account.estimatedIncome),
      loans:            Number(account.loansTotal),
      investments:      0,
      creditScore:      account.creditScore,
    },
    transactions: transactions.map((t) => ({
      id:          t.id,
      type:        t.type === "entrada" ? "entrada" : "saída",
      description: t.creditor,
      amount:      Number(t.value),
      date:        t.date,
    })),
  });
}
