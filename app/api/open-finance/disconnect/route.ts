import { getAuthed, normalizeAccount, recalcScore, writeDb } from '@/lib/store';
import { fail, ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ctx = await getAuthed(req);
  if (!ctx) return fail('Não autorizado.', 401);
  ctx.db.consents.filter(c => c.userId === ctx.user.id && !c.revokedAt).forEach(c => { c.status = 'revoked'; c.revokedAt = new Date().toISOString(); });
  ctx.account.openFinancePartnerSnapshot = null;
  ctx.account.creditScore = recalcScore(ctx.account, null);
  ctx.account.preApproved = Math.max(0, Math.round((ctx.account.creditScore - 450) * 15));
  ctx.account.updatedAt = new Date().toISOString();
  await writeDb(ctx.db);
  return ok(normalizeAccount(ctx.account));
}
