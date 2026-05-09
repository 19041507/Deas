import { getAuthed, normalizeAccount, recalcScore, todayBR, uid, writeDb } from '@/lib/store';
import { fail, ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ctx = await getAuthed(req);
  if (!ctx) return fail('Não autorizado.', 401);
  const { amount, creditor } = await req.json();
  const value = Number(amount || 0);
  if (value <= 0) return fail('Informe um valor maior que zero.');
  if (ctx.account.availableBalance < value) return fail('Saldo disponível insuficiente.');
  ctx.account.availableBalance -= value;
  ctx.account.creditScore = recalcScore(ctx.account, ctx.account.openFinancePartnerSnapshot);
  ctx.account.preApproved = Math.max(0, Math.round((ctx.account.creditScore - 450) * 15));
  ctx.account.updatedAt = new Date().toISOString();
  ctx.db.transactions.push({ id: uid('tx'), userId: ctx.user.id, accountId: ctx.account.id, creditor: creditor || 'Pix enviado', type: 'saída', value: -value, status: 'pago', date: todayBR(), createdAt: new Date().toISOString() });
  await writeDb(ctx.db);
  return ok(normalizeAccount(ctx.account));
}
