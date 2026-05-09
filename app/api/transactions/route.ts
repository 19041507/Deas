import { getAuthed } from '@/lib/store';
import { fail, ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const ctx = await getAuthed(req);
  if (!ctx) return fail('Não autorizado.', 401);
  const rows = ctx.db.transactions.filter(t => t.userId === ctx.user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return ok(rows);
}
