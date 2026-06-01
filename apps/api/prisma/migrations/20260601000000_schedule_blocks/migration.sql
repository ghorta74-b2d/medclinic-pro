-- Migration: Schedule Blocks — bloqueos de horario (vacaciones, comida, ausencias)
-- Apply via Supabase SQL Editor if prisma db push / migrate dev is unreachable
-- ⚠️ Revisar con el equipo antes de aplicar en producción.

-- ============================================================
-- 1. NUEVO ENUM
-- ============================================================

CREATE TYPE "BlockReason" AS ENUM ('VACATION', 'MEAL', 'PERSONAL', 'OTHER');

-- ============================================================
-- 2. TABLA schedule_blocks
-- ============================================================

CREATE TABLE "schedule_blocks" (
  "id"        TEXT NOT NULL,
  "clinicId"  TEXT NOT NULL,
  "doctorId"  TEXT NOT NULL,
  "startsAt"  TIMESTAMP(3) NOT NULL,
  "endsAt"    TIMESTAMP(3) NOT NULL,
  "reason"    "BlockReason" NOT NULL DEFAULT 'OTHER',
  "note"      TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "schedule_blocks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "schedule_blocks_clinicId_startsAt_idx" ON "schedule_blocks" ("clinicId", "startsAt");
CREATE INDEX "schedule_blocks_doctorId_startsAt_idx" ON "schedule_blocks" ("doctorId", "startsAt");

ALTER TABLE "schedule_blocks"
  ADD CONSTRAINT "schedule_blocks_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "schedule_blocks"
  ADD CONSTRAINT "schedule_blocks_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 3. RLS (Row Level Security)
-- ============================================================
-- El backend usa el service role (bypassea RLS). El anon key no debe acceder:
-- sin políticas adicionales, los datos solo son alcanzables vía API.
ALTER TABLE "schedule_blocks" ENABLE ROW LEVEL SECURITY;
