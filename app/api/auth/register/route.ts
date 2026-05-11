import { prisma } from "@/lib/prisma";
import { ensureUserColumns } from "@/lib/ensure-user-columns";
import { hashPassword, createToken, setCookieHeader } from "@/lib/auth";
import { seedValues } from "@/lib/account";
import { isValidCpf, sanitizeCpf } from "@/lib/cpf";
import { ok, fail } from "@/lib/http";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { name, email, password, cpf, phone, birthdate } = await req.json();

    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanName  = String(name || "").trim();
    const cleanCpf   = String(cpf || "").trim();

    // ── Validações básicas ─────────────────────────────────────────────────
    if (!cleanName || !cleanEmail || !password)
      return fail("Informe nome, e-mail e senha.");

    if (cleanName.length < 3)
      return fail("Nome deve ter pelo menos 3 caracteres.");

    if (String(password).length < 8)
      return fail("A senha precisa ter pelo menos 8 caracteres.");

    if (!/^[^@]+@[^@]+\.[^@]+$/.test(cleanEmail))
      return fail("E-mail inválido.");

    // ── Validação de CPF ───────────────────────────────────────────────────
    if (!cleanCpf)
      return fail("CPF obrigatório.");

    if (!isValidCpf(cleanCpf))
      return fail("CPF inválido. Verifique os dígitos informados.");

    const cpfDigits = sanitizeCpf(cleanCpf); // salva apenas dígitos

    await ensureUserColumns();

    // ── Unicidade ──────────────────────────────────────────────────────────
    const [existingEmail, existingCpf] = await Promise.all([
      prisma.user.findUnique({ where: { email: cleanEmail } }),
      prisma.user.findUnique({ where: { cpf: cpfDigits } }),
    ]);

    if (existingEmail) return fail("Este e-mail já está cadastrado.");
    if (existingCpf)   return fail("Este CPF já possui uma conta.");

    // ── Cria usuário e conta ───────────────────────────────────────────────
    const seed = seedValues(cleanEmail);

    const user = await prisma.user.create({
      data: {
        fullName:     cleanName,
        email:        cleanEmail,
        passwordHash: await hashPassword(password),
        cpf:          cpfDigits,  // armazena apenas dígitos, sem máscara
      },
    });

    const account = await prisma.account.create({
      data: {
        userId:           user.id,
        availableBalance: seed.balance,
        limit:            seed.limit,
        debt:             seed.debt,
        creditScore:      seed.score,
        preApproved:      seed.preApproved,
        estimatedIncome:  seed.income,
      },
    });

    await prisma.transaction.create({
      data: {
        userId:    user.id,
        accountId: account.id,
        creditor:  "Abertura de conta",
        type:      "entrada",
        value:     seed.balance,
        status:    "concluído",
        date:      new Date().toLocaleDateString("pt-BR"),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "REGISTER",
        // NUNCA loga o CPF completo em texto — apenas confirmação de presença
        details: { email: cleanEmail, cpf: "provided" },
      },
    });

    const token = createToken(user.id);
    const res = NextResponse.json(
      { user: { id: user.id, name: user.fullName, email: user.email } },
      { status: 201 }
    );
    res.headers.set("Set-Cookie", setCookieHeader(token));
    return res;
  } catch (e: any) {
    return fail(e.message || "Erro ao criar conta.", 500);
  }
}
