import { getAuthed, normalizeAccount } from '@/lib/store';
import { fail, ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const ctx = await getAuthed(req);
  if (!ctx) return fail('Não autorizado.', 401);
  return ok(normalizeAccount(ctx.account));
}
