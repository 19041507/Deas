import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

export type User = { id: string; fullName: string; email: string; passwordHash: string; photoUrl?: string; createdAt: string };
export type Account = { id: string; userId: string; bankName: string; availableBalance: number; debt: number; limit: number; creditScore: number; preApproved: number; loansTotal: number; estimatedIncome: number; updatedAt: string; openFinancePartnerSnapshot?: any };
export type Transaction = { id: string; userId: string; accountId: string; creditor: string; type: string; value: number; status: string; date: string; createdAt: string };
export type Consent = { id: string; userId: string; sourceBank: string; targetBank: string; status: string; sharedScore: boolean; sharedTransactions: boolean; sharedBalance: boolean; createdAt: string; revokedAt?: string; requestedSalary?: number; partnerSnapshot?: any };
export type Db = { users: User[]; accounts: Account[]; transactions: Transaction[]; consents: Consent[] };

const PHOTO_URL = 'https://plus.unsplash.com/premium_photo-1692241091501-984a8a0c35ef?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDE2fHx8ZW58MHx8fHx8';
const STATE_ID = 'deasfinance-main-state';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma = globalThis.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

function emptyDb(): Db {
  return { users: [], accounts: [], transactions: [], consents: [] };
}

function safeDb(value: any): Db {
  return {
    users: Array.isArray(value?.users) ? value.users : [],
    accounts: Array.isArray(value?.accounts) ? value.accounts : [],
    transactions: Array.isArray(value?.transactions) ? value.transactions : [],
    consents: Array.isArray(value?.consents) ? value.consents : []
  };
}

export function uid(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(10).toString('hex')}`;
}

export function todayBR() {
  return new Date().toLocaleDateString('pt-BR');
}

export async function readDb(): Promise<Db> {
  const row = await prisma.appState.findUnique({ where: { id: STATE_ID } });
  if (!row) {
    const db = emptyDb();
    await writeDb(db);
    return db;
  }
  return safeDb(row.data);
}

export async function writeDb(db: Db) {
  const clean = safeDb(db);
  await prisma.appState.upsert({
    where: { id: STATE_ID },
    create: { id: STATE_ID, data: clean },
    update: { data: clean }
  });
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

function secret() {
  return process.env.APP_SECRET || 'deasfinance-dev-secret-change-me';
}

export function createToken(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyToken(token?: string | null) {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.userId as string;
  } catch {
    return null;
  }
}

export function tokenFromRequest(req: Request) {
  const auth = req.headers.get('authorization') || '';
  return verifyToken(auth.replace(/^Bearer\s+/i, ''));
}

export function publicUser(user: User) {
  return { uid: user.id, id: user.id, name: user.fullName, displayName: user.fullName, email: user.email, photoURL: user.photoUrl || PHOTO_URL };
}

export function createSeedAccount(userId: string, email: string): Account {
  const h = Math.abs([...email].reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0, 0));
  const balance = 1500 + (h % 12000);
  const debt = h % 4200;
  const score = recalcScore({ availableBalance: balance, debt, limit: 2500 + (h % 10000), loansTotal: 0, estimatedIncome: 2200 + (h % 5200) });
  return { id: uid('acc'), userId, bankName: 'Deas Finance', availableBalance: balance, debt, limit: 2500 + (h % 10000), creditScore: score, preApproved: Math.max(0, Math.round((score - 450) * 15)), loansTotal: 0, estimatedIncome: 2200 + (h % 5200), updatedAt: new Date().toISOString() };
}

export function recalcScore(account: Partial<Account>, partner: any = {}) {
  const balance = Number(account.availableBalance || 0);
  const debt = Number(account.debt || 0);
  const limit = Number(account.limit || 0);
  const income = Number(account.estimatedIncome || 0) + Number(partner?.estimatedIncome || 0);
  const partnerScore = Number(partner?.creditScore || partner?.externalScore || 0);
  let score = 500;
  score += Math.min(160, balance / 120);
  score += Math.min(120, limit / 130);
  score += Math.min(130, income / 90);
  score -= Math.min(180, debt / 45);
  score -= Math.min(80, Number(account.loansTotal || 0) / 100);
  if (partnerScore > 0) score = score * 0.72 + partnerScore * 0.28;
  return Math.max(300, Math.min(950, Math.round(score)));
}

export function normalizeAccount(account: Account) {
  return {
    balance: Number(account.availableBalance || 0),
    availableBalance: Number(account.availableBalance || 0),
    debt: Number(account.debt || 0),
    limit: Number(account.limit || 0),
    creditScore: Number(account.creditScore || 500),
    preApproved: Number(account.preApproved || 0),
    loansTotal: Number(account.loansTotal || 0),
    estimatedIncome: Number(account.estimatedIncome || 0),
    openFinancePartnerSnapshot: account.openFinancePartnerSnapshot || null
  };
}

export async function getAuthed(req: Request) {
  const userId = tokenFromRequest(req);
  if (!userId) return null;
  const db = await readDb();
  const user = db.users.find(u => u.id === userId);
  const account = db.accounts.find(a => a.userId === userId);
  if (!user || !account) return null;
  return { db, user, account };
}
