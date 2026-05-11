import { prisma } from "@/lib/prisma";
import { ensureUserColumns } from "@/lib/ensure-user-columns";
import { comparePassword, createToken, setCookieHeader } from "@/lib/auth";
import { fail } from "@/lib/http";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail || !password) return fail("Informe e-mail e senha.");
    await ensureUserColumns();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user || !(await comparePassword(password, user.passwordHash))) return fail("E-mail ou senha incorretos.");
    await prisma.auditLog.create({ data: { userId: user.id, action: "LOGIN" } });
    const token = createToken(user.id);
    const res = NextResponse.json({ user: { id: user.id, name: user.fullName, email: user.email, photoURL: user.photoUrl } });
    res.headers.set("Set-Cookie", setCookieHeader(token));
    return res;
  } catch (e: any) { return fail(e.message || "Erro ao fazer login.", 500); }
}
