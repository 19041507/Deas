import { tokenFromRequest } from "./auth";
import { prisma } from "./prisma";
import { ensureUserColumns } from "./ensure-user-columns";

export async function getAuthed(req: Request) {
  const userId = tokenFromRequest(req);
  if (!userId) return { userId: null, user: null, account: null };
  await ensureUserColumns();
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { account: true } });
  return { userId, user, account: user?.account ?? null };
}

export function normalizeAccount(account: any) {
  if (!account) return null;
  return {
    ...account,
    availableBalance: Number(account.availableBalance),
    limit: Number(account.limit),
    debt: Number(account.debt),
    preApproved: Number(account.preApproved),
    loansTotal: Number(account.loansTotal),
    estimatedIncome: Number(account.estimatedIncome),
  };
}

// Legacy compat
export type Db = ReturnType<typeof normalizeAccount>;
