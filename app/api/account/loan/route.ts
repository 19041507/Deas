import { getAuthed, normalizeAccount, recalcScore, todayBR, uid, writeDb } from '@/lib/store';
import { fail, ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ctx = await getAuthed(req);
  if (!ctx) return fail('Não autorizado.', 401);
  const { amount } = await req.json();
  const value = Number(amount || 0);
  if (value < 100) return fail('O empréstimo mínimo é R$ 100,00.');
  const score = recalcScore(ctx.account, ctx.account.openFinancePartnerSnapshot);
  const max = Math.max(0, Math.round((score - 450) * 15));
  if (score < 560 || value > max) return fail(`Empréstimo recusado. Limite pré-aprovado atual: R$ ${max.toLocaleString('pt-BR')}.`);
  ctx.account.availableBalance += value;
  ctx.account.debt += value;
  ctx.account.loansTotal += value;
  ctx.account.creditScore = recalcScore(ctx.account, ctx.account.openFinancePartnerSnapshot);
  ctx.account.preApproved = Math.max(0, Math.round((ctx.account.creditScore - 450) * 15));
  ctx.account.updatedAt = new Date().toISOString();
  ctx.db.transactions.push({ id: uid('tx'), userId: ctx.user.id, accountId: ctx.account.id, creditor: 'Empréstimo Deas', type: 'crédito', value, status: 'pendente', date: todayBR(), createdAt: new Date().toISOString() });
  await writeDb(ctx.db);
  return ok(normalizeAccount(ctx.account));
}
