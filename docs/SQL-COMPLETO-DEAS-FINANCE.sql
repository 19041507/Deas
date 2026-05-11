-- SQL completo de emergência para o banco Neon do Deas Finance.
-- Use apenas se o deploy automático com prisma db push não sincronizar o banco.

ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;
ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "cpf" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON public."User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_cpf_key" ON public."User"("cpf");

CREATE TABLE IF NOT EXISTS public."Account" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "availableBalance" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "limit" DECIMAL(15, 2) NOT NULL DEFAULT 2500,
  "debt" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "creditScore" INTEGER NOT NULL DEFAULT 500,
  "preApproved" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "loansTotal" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "estimatedIncome" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Account_userId_key" ON public."Account"("userId");

CREATE TABLE IF NOT EXISTS public."Transaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "creditor" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "value" DECIMAL(15, 2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'concluído',
  "date" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."Institution" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "apiBaseUrl" TEXT NOT NULL,
  "logoUrl" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "canShareData" BOOLEAN NOT NULL DEFAULT true,
  "canReceiveData" BOOLEAN NOT NULL DEFAULT true,
  "canInitiatePayment" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Institution_slug_key" ON public."Institution"("slug");

CREATE TABLE IF NOT EXISTS public."OpenFinanceConsent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pendente',
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "oauthState" TEXT,
  "permissions" TEXT[] NOT NULL DEFAULT '{}',
  "validUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpenFinanceConsent_pkey" PRIMARY KEY ("id")
);
ALTER TABLE public."OpenFinanceConsent" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."OpenFinanceConsent" ADD COLUMN IF NOT EXISTS "accessToken" TEXT;
ALTER TABLE public."OpenFinanceConsent" ADD COLUMN IF NOT EXISTS "refreshToken" TEXT;
ALTER TABLE public."OpenFinanceConsent" ADD COLUMN IF NOT EXISTS "oauthState" TEXT;
ALTER TABLE public."OpenFinanceConsent" ADD COLUMN IF NOT EXISTS "permissions" TEXT[];
ALTER TABLE public."OpenFinanceConsent" ALTER COLUMN "permissions" SET DEFAULT '{}';
UPDATE public."OpenFinanceConsent" SET "permissions" = '{}' WHERE "permissions" IS NULL;
ALTER TABLE public."OpenFinanceConsent" ALTER COLUMN "permissions" SET NOT NULL;

CREATE TABLE IF NOT EXISTS public."OpenFinanceSnapshot" (
  "id" TEXT NOT NULL,
  "consentId" TEXT NOT NULL,
  "availableBalance" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "debt" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "limit" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "loans" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "investments" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "estimatedIncome" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "externalScore" INTEGER,
  "requestedSalary" DECIMAL(15, 2),
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpenFinanceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."AuditLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "details" JSONB,
  "ip" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE public."OpenFinanceConsent"
DROP COLUMN IF EXISTS "institutionName",
DROP COLUMN IF EXISTS "externalBalance",
DROP COLUMN IF EXISTS "externalDebt",
DROP COLUMN IF EXISTS "externalLimit",
DROP COLUMN IF EXISTS "externalLoans",
DROP COLUMN IF EXISTS "externalInvestments",
DROP COLUMN IF EXISTS "externalScore",
DROP COLUMN IF EXISTS "requestedSalary",
DROP COLUMN IF EXISTS "estimatedIncome";

INSERT INTO public."Institution" (
  "id", "name", "slug", "apiBaseUrl", "logoUrl", "active", "canShareData", "canReceiveData", "canInitiatePayment"
)
VALUES (
  'inst_larabank_001', 'Larabank', 'larabank', 'https://larabankdigital2.vercel.app', NULL, true, true, true, false
)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "apiBaseUrl" = EXCLUDED."apiBaseUrl",
  "active" = true,
  "canShareData" = true,
  "canReceiveData" = true,
  "canInitiatePayment" = false;
