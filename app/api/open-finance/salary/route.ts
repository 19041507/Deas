import { getAuthed, normalizeAccount, recalcScore, todayBR, uid, writeDb } from '@/lib/store';
import { fail, ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ctx = await getAuthed(req);
  if (!ctx) return fail('Não autorizado.', 401);
  const { amount } = await req.json();
  const value = Number(amount || 0);
  if (value <= 0) return fail('Informe o valor do salário/renda.');
  const consent = ctx.db.consents.find(c => c.userId === ctx.user.id && c.status === 'active' && !c.revokedAt);
  if (!consent) return fail('Conecte o DeasBank antes de trazer salário.');
  const maxExternal = Number(consent.partnerSnapshot?.externalBalance || 0) + 15000;
  const received = Math.min(value, maxExternal);
  ctx.account.availableBalance += received;
  ctx.account.estimatedIncome += Math.round(received * 0.08);
  ctx.account.openFinancePartnerSnapshot = { ...(ctx.account.openFinancePartnerSnapshot || {}), requestedSalary: received, estimatedIncome: Math.round(received * 0.2), salaryPortability: true };
  ctx.account.creditScore = recalcScore(ctx.account, ctx.account.openFinancePartnerSnapshot);
  ctx.account.preApproved = Math.max(0, Math.round((ctx.account.creditScore - 450) * 15));
  ctx.account.updatedAt = new Date().toISOString();
  consent.requestedSalary = received;
  consent.partnerSnapshot = { ...(consent.partnerSnapshot || {}), requestedSalary: received, salaryPortability: true };
  ctx.db.transactions.push({ id: uid('tx'), userId: ctx.user.id, accountId: ctx.account.id, creditor: 'Salário recebido via Open Finance', type: 'entrada', value: received, status: 'pago', date: todayBR(), createdAt: new Date().toISOString() });
  await writeDb(ctx.db);
  return ok({ account: normalizeAccount(ctx.account), received });
}
