import { createSeedAccount, createToken, hashPassword, publicUser, readDb, uid, writeDb } from '@/lib/store';
import { fail, ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { name, fullName, email, password } = await req.json();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(name || fullName || '').trim();
  if (!cleanName || !cleanEmail || !password) return fail('Informe nome, e-mail e senha.');
  if (String(password).length < 6) return fail('A senha precisa ter pelo menos 6 caracteres.');
  const db = await readDb();
  if (db.users.some(u => u.email === cleanEmail)) return fail('Esse e-mail já está cadastrado.');
  const user = { id: uid('usr'), fullName: cleanName, email: cleanEmail, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() };
  const account = createSeedAccount(user.id, cleanEmail);
  db.users.push(user);
  db.accounts.push(account);
  db.transactions.push({ id: uid('tx'), userId: user.id, accountId: account.id, creditor: 'Abertura de conta', type: 'entrada', value: account.availableBalance, status: 'pago', date: new Date().toLocaleDateString('pt-BR'), createdAt: new Date().toISOString() });
  await writeDb(db);
  return ok({ token: createToken(user.id), user: publicUser(user) }, 201);
}
