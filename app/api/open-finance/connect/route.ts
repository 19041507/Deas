import { getAuthed, normalizeAccount, recalcScore, uid, writeDb } from '@/lib/store';
import { fail, ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ctx = await getAuthed(req);
  if (!ctx) return fail('Não autorizado.', 401);
  const { institutionName, bankName } = await req.json().catch(() => ({}));
  const targetBank = institutionName || bankName || 'DeasBank';
  const existing = ctx.db.consents.find(c => c.userId === ctx.user.id && c.targetBank === targetBank && !c.revokedAt);
  const partnerSnapshot = {
    externalBalance: Math.round(ctx.account.availableBalance * 0.32 + 1800),
    externalDebt: Math.round(ctx.account.debt * 0.25),
    externalLimit: Math.round(ctx.account.limit * 0.55 + 1200),
    externalLoans: Math.round(ctx.account.loansTotal * 0.2),
    externalInvestments: Math.round(ctx.account.availableBalance * 0.12),
    estimatedIncome: Math.round(ctx.account.estimatedIncome * 0.45),
    creditScore: Math.max(350, Math.min(950, ctx.account.creditScore + 38))
  };
  const consent = existing || { id: uid('consent'), userId: ctx.user.id, sourceBank: 'Deas Finance', targetBank, status: 'active', sharedScore: true, sharedTransactions: true, sharedBalance: true, createdAt: new Date().toISOString(), partnerSnapshot };
  consent.status = 'active';
  consent.partnerSnapshot = partnerSnapshot;
  if (!existing) ctx.db.consents.push(consent);
  ctx.account.openFinancePartnerSnapshot = partnerSnapshot;
  ctx.account.creditScore = recalcScore(ctx.account, partnerSnapshot);
  ctx.account.preApproved = Math.max(0, Math.round((ctx.account.creditScore - 450) * 15));
  ctx.account.updatedAt = new Date().toISOString();
  await writeDb(ctx.db);
  return ok({ connection: consent, account: normalizeAccount(ctx.account) });
}
