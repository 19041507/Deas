import { prisma } from "@/lib/prisma";
import { hashPassword, createToken, setCookieHeader } from "@/lib/auth";
import { seedValues } from "@/lib/account";
import { ok, fail } from "@/lib/http";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanName = String(name || "").trim();
    if (!cleanName || !cleanEmail || !password) return fail("Informe nome, e-mail e senha.");
    if (String(password).length < 6) return fail("A senha precisa ter pelo menos 6 caracteres.");
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(cleanEmail)) return fail("E-mail inválido.");
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) return fail("Este e-mail já está cadastrado.");
    const seed = seedValues(cleanEmail);
    const user = await prisma.user.create({
      data: { fullName: cleanName, email: cleanEmail, passwordHash: await hashPassword(password) }
    });
    const account = await prisma.account.create({
      data: { userId: user.id, availableBalance: seed.balance, limit: seed.limit, debt: seed.debt, creditScore: seed.score, preApproved: seed.preApproved, estimatedIncome: seed.income }
    });
    await prisma.transaction.create({
      data: { userId: user.id, accountId: account.id, creditor: "Abertura de conta Deas Finance", type: "entrada", value: seed.balance, status: "concluído", date: new Date().toLocaleDateString("pt-BR") }
    });
    await prisma.auditLog.create({ data: { userId: user.id, action: "REGISTER", details: { email: cleanEmail } } });
    const token = createToken(user.id);
    const res = NextResponse.json({ user: { id: user.id, name: user.fullName, email: user.email, photoURL: user.photoUrl } }, { status: 201 });
    res.headers.set("Set-Cookie", setCookieHeader(token));
    return res;
  } catch (e: any) { return fail(e.message || "Erro ao criar conta.", 500); }
}
