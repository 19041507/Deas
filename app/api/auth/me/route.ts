import { prisma } from "@/lib/prisma";
import { ensureUserColumns } from "@/lib/ensure-user-columns";
import { tokenFromRequest } from "@/lib/auth";
import { ok, unauth } from "@/lib/http";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const userId = tokenFromRequest(req);
  if (!userId) return unauth();
  await ensureUserColumns();
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { account: true } });
  if (!user?.account) return unauth();
  const a = user.account;
  return ok({
    user: { id: user.id, name: user.fullName, email: user.email, photoURL: user.photoUrl },
    account: { balance: Number(a.availableBalance), limit: Number(a.limit), debt: Number(a.debt), creditScore: a.creditScore, preApproved: Number(a.preApproved), loansTotal: Number(a.loansTotal), estimatedIncome: Number(a.estimatedIncome) }
  });
}
