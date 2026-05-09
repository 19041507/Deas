import { getAuthed, publicUser, writeDb } from '@/lib/store';
import { fail, ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ctx = await getAuthed(req);
  if (!ctx) return fail('Não autorizado.', 401);
  const { photoUrl } = await req.json();
  if (!photoUrl) return fail('Informe a URL/base64 da foto.');
  ctx.user.photoUrl = String(photoUrl);
  await writeDb(ctx.db);
  return ok({ user: publicUser(ctx.user) });
}
