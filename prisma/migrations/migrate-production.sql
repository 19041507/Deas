-- ============================================================
-- MIGRAÇÃO DE PRODUÇÃO — Deas Finance v2
-- ============================================================
-- Execute este arquivo no console SQL do seu banco (Neon, Supabase, etc.)
-- ANTES de fazer o próximo deploy na Vercel.
--
-- O que este script faz:
--   1. Adiciona coluna `cpf` na tabela User
--   2. Cria tabela Institution (nova)
--   3. Migra OpenFinanceConsent (remove colunas antigas, adiciona novas)
--   4. Cria tabela OpenFinanceSnapshot (nova)
--   5. Seed das instituições de demonstração
-- ============================================================

-- ── 1. TABELA USER — adiciona CPF ────────────────────────────────────────────

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "cpf" TEXT;

-- Índice único (ignora NULLs, então usuários sem CPF não conflitam)
CREATE UNIQUE INDEX IF NOT EXISTS "User_cpf_key" ON "User"("cpf");

-- ── 2. TABELA Institution (nova) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Institution" (
  "id"                 TEXT        NOT NULL,
  "name"               TEXT        NOT NULL,
  "slug"               TEXT        NOT NULL,
  "apiBaseUrl"         TEXT        NOT NULL,
  "logoUrl"            TEXT,
  "active"             BOOLEAN     NOT NULL DEFAULT true,
  "canShareData"       BOOLEAN     NOT NULL DEFAULT true,
  "canReceiveData"     BOOLEAN     NOT NULL DEFAULT true,
  "canInitiatePayment" BOOLEAN     NOT NULL DEFAULT false,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Institution_slug_key" ON "Institution"("slug");

-- ── 3. TABELA OpenFinanceConsent — migração ───────────────────────────────────
-- A tabela já existe. Vamos:
--   a) Adicionar colunas novas
--   b) Adicionar coluna institutionId (pode ficar NULL enquanto migramos)
--   c) Remover colunas antigas depois do seed

-- 3a. Adiciona colunas novas (IF NOT EXISTS = seguro rodar mais de uma vez)
ALTER TABLE "OpenFinanceConsent"
  ADD COLUMN IF NOT EXISTS "institutionId" TEXT,
  ADD COLUMN IF NOT EXISTS "accessToken"   TEXT,
  ADD COLUMN IF NOT EXISTS "refreshToken"  TEXT,
  ADD COLUMN IF NOT EXISTS "oauthState"    TEXT,
  ADD COLUMN IF NOT EXISTS "permissions"   TEXT[] NOT NULL DEFAULT '{}';

-- 3b. Remove colunas antigas (que foram para OpenFinanceSnapshot)
-- ATENÇÃO: Se você tiver dados importantes nessas colunas, exporte antes!
ALTER TABLE "OpenFinanceConsent"
  DROP COLUMN IF EXISTS "institutionName",
  DROP COLUMN IF EXISTS "externalBalance",
  DROP COLUMN IF EXISTS "externalDebt",
  DROP COLUMN IF EXISTS "externalLimit",
  DROP COLUMN IF EXISTS "externalLoans",
  DROP COLUMN IF EXISTS "externalInvestments",
  DROP COLUMN IF EXISTS "externalScore",
  DROP COLUMN IF EXISTS "requestedSalary",
  DROP COLUMN IF EXISTS "estimatedIncome";

-- ── 4. TABELA OpenFinanceSnapshot (nova) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS "OpenFinanceSnapshot" (
  "id"               TEXT           NOT NULL,
  "consentId"        TEXT           NOT NULL,
  "availableBalance" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "debt"             DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "limit"            DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "loans"            DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "investments"      DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "estimatedIncome"  DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "externalScore"    INTEGER,
  "requestedSalary"  DECIMAL(15, 2),
  "syncedAt"         TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OpenFinanceSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OpenFinanceSnapshot_consentId_fkey"
    FOREIGN KEY ("consentId")
    REFERENCES "OpenFinanceConsent"("id") ON DELETE CASCADE
);

-- ── 5. SEED: Instituições de demonstração ────────────────────────────────────
-- Substitua a parte de apiBaseUrl pelo domínio real do seu app na Vercel.
-- Exemplo: https://deas-finance.vercel.app/api/open-finance/external-sim/deasbank

INSERT INTO "Institution" ("id", "name", "slug", "apiBaseUrl", "active")
VALUES
  (
    'inst_deasbank_001',
    'DeasBank',
    'deasbank',
    'https://larabankdigital2.vercel.app/api/open-finance/external-sim/deasbank',
    true
  ),
  (
    'inst_alpha_001',
    'Banco Alpha',
    'banco-alpha',
    'https://larabankdigital2.vercel.app/api/open-finance/external-sim/banco-alpha',
    true
  ),
  (
    'inst_beta_001',
    'Fintech Beta',
    'fintech-beta',
    'https://larabankdigital2.vercel.app/api/open-finance/external-sim/fintech-beta',
    true
  ),
  (
    'inst_larabank_001',
    'Larabank',
    'larabank',
    'https://larabankdigital2.vercel.app',
    true
  )
ON CONFLICT ("slug") DO UPDATE SET
  "apiBaseUrl" = EXCLUDED."apiBaseUrl",
  "active"     = true;

-- ── 6. FK: Liga OpenFinanceConsent → Institution ──────────────────────────────
-- Só adiciona a FK se a coluna institutionId já tiver dados válidos.
-- Se você tiver consentimentos antigos (status ativo), eles precisam de um institutionId.
-- O comando abaixo é seguro: adiciona a FK sem quebrar registros existentes com NULL.

-- Primeiro, reseta consentimentos antigos que não têm institutionId (eram da era antiga)
UPDATE "OpenFinanceConsent"
  SET "status" = 'revogado'
  WHERE "institutionId" IS NULL AND "status" = 'ativo';

-- Agora adiciona a FK (só funciona se não houver NULLs em registros ativos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'OpenFinanceConsent_institutionId_fkey'
  ) THEN
    ALTER TABLE "OpenFinanceConsent"
      ALTER COLUMN "institutionId" SET NOT NULL,
      ADD CONSTRAINT "OpenFinanceConsent_institutionId_fkey"
        FOREIGN KEY ("institutionId") REFERENCES "Institution"("id");
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'FK já existe ou não pôde ser criada: %', SQLERRM;
END $$;

-- ── FIM ───────────────────────────────────────────────────────────────────────
-- Após rodar este script, faça o deploy normalmente na Vercel.
-- O erro "Erro ao carregar dados" será resolvido.
