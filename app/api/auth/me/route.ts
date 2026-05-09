import { getAuthed, normalizeAccount, publicUser } from '@/lib/store';
import { fail, ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const ctx = await getAuthed(req);
  if (!ctx) return fail('Sessão expirada. Faça login novamente.', 401);
  return ok({ user: publicUser(ctx.user), account: normalizeAccount(ctx.account) });
}
