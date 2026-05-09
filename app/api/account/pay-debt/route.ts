import { getAuthed, normalizeAccount, recalcScore, todayBR, uid, writeDb } from '@/lib/store';
import { fail, ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ctx = await getAuthed(req);
  if (!ctx) return fail('Não autorizado.', 401);
  const { amount } = await req.json();
  const requested = Number(amount || 0);
  if (requested <= 0) return fail('Informe um valor maior que zero.');
  const paid = Math.min(requested, ctx.account.debt, ctx.account.availableBalance);
  if (paid <= 0) return fail('Não há dívida ou saldo suficiente para pagar.');
  ctx.account.availableBalance -= paid;
  ctx.account.debt -= paid;
  ctx.account.creditScore = recalcScore(ctx.account, ctx.account.openFinancePartnerSnapshot);
  ctx.account.preApproved = Math.max(0, Math.round((ctx.account.creditScore - 450) * 15));
  ctx.account.updatedAt = new Date().toISOString();
  ctx.db.transactions.push({ id: uid('tx'), userId: ctx.user.id, accountId: ctx.account.id, creditor: 'Pagamento de dívida', type: 'saída', value: -paid, status: 'pago', date: todayBR(), createdAt: new Date().toISOString() });
  await writeDb(ctx.db);
  return ok(normalizeAccount(ctx.account));
}
