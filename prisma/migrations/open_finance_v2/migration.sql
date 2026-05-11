-- ============================================================
-- Open Finance v2 — Migração de schema
-- ============================================================
-- Execute depois de atualizar o schema.prisma:
--   npx prisma migrate dev --name open_finance_v2
-- ============================================================

-- Tabela de instituições financeiras
CREATE TABLE "Institution" (
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

CREATE UNIQUE INDEX "Institution_slug_key" ON "Institution"("slug");

-- Refatoração do consentimento (sem dados financeiros)
-- ATENÇÃO: Se você tiver dados existentes em OpenFinanceConsent,
-- migre-os para OpenFinanceSnapshot antes de alterar as colunas.

-- Seed das instituições de demonstração
INSERT INTO "Institution" ("id", "name", "slug", "apiBaseUrl", "active")
VALUES
    (gen_random_uuid()::text, 'DEASPay',    'deaspay',    'https://deas-pay.vercel.app',    true),
    (gen_random_uuid()::text, 'Banco Alpha', 'banco-alpha', '/api/open-finance/external-sim/banco-alpha', true),
    (gen_random_uuid()::text, 'Fintech Beta','fintech-beta','/api/open-finance/external-sim/fintech-beta',true)
ON CONFLICT ("slug") DO NOTHING;

-- Remove o antigo banco antigo da lista de bancos conectáveis.
UPDATE "Institution" SET "active" = false WHERE "slug" = 'deasbank';

-- Adiciona colunas novas em OpenFinanceConsent
ALTER TABLE "OpenFinanceConsent"
    ADD COLUMN IF NOT EXISTS "institutionId" TEXT,
    ADD COLUMN IF NOT EXISTS "accessToken" TEXT,
    ADD COLUMN IF NOT EXISTS "refreshToken" TEXT,
    ADD COLUMN IF NOT EXISTS "oauthState" TEXT,
    ADD COLUMN IF NOT EXISTS "permissions" TEXT[] DEFAULT '{}';

-- Tabela de snapshots de dados externos
CREATE TABLE "OpenFinanceSnapshot" (
    "id" TEXT NOT NULL,
    "consentId" TEXT NOT NULL,
    "availableBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "debt" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "limit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "loans" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "investments" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "estimatedIncome" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "externalScore" INTEGER,
    "requestedSalary" DECIMAL(15,2),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpenFinanceSnapshot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OpenFinanceSnapshot_consentId_fkey"
        FOREIGN KEY ("consentId") REFERENCES "OpenFinanceConsent"("id") ON DELETE CASCADE
);
