import { comparePassword, createToken, publicUser, readDb } from '@/lib/store';
import { fail, ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const db = await readDb();
  const user = db.users.find(u => u.email === String(email || '').trim().toLowerCase());
  if (!user || !(await comparePassword(String(password || ''), user.passwordHash))) return fail('E-mail ou senha inválidos.', 401);
  return ok({ token: createToken(user.id), user: publicUser(user) });
}
