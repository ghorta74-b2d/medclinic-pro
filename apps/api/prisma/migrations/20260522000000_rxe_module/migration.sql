-- Migration: RxE Module — Receta Electrónica con QR, Landing Pública y Farmacias
-- Apply via Supabase SQL Editor if prisma db push / migrate dev is unreachable

-- ============================================================
-- 1. NUEVOS ENUMS
-- ============================================================

CREATE TYPE "DrugFraction" AS ENUM ('I', 'II', 'III', 'IV', 'V', 'VI');
CREATE TYPE "RxeStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED');
CREATE TYPE "PricingModel" AS ENUM ('CPM', 'CPC', 'FLAT_MONTHLY');
CREATE TYPE "CampaignEventType" AS ENUM ('IMPRESSION', 'CLICK');

-- ============================================================
-- 2. EXTENDER TABLA prescriptions
-- ============================================================

ALTER TABLE "prescriptions"
  ADD COLUMN "publicSlug"     TEXT UNIQUE,
  ADD COLUMN "signature"      TEXT UNIQUE,
  ADD COLUMN "qrStoragePath"  TEXT,
  ADD COLUMN "rxeStatus"      "RxeStatus",
  ADD COLUMN "rxeGeneratedAt" TIMESTAMP(3),
  ADD COLUMN "expiresAt"      TIMESTAMP(3);

-- ============================================================
-- 3. EXTENDER TABLA prescription_items
-- ============================================================

ALTER TABLE "prescription_items"
  ADD COLUMN "fraction"  "DrugFraction",
  ADD COLUMN "boughtQty" INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- 4. NUEVA TABLA pharmacies
-- ============================================================

CREATE TABLE "pharmacies" (
  "id"         TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "logoUrl"    TEXT,
  "websiteUrl" TEXT,
  "active"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pharmacies_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- 5. NUEVA TABLA pharmacy_branches
-- ============================================================

CREATE TABLE "pharmacy_branches" (
  "id"         TEXT NOT NULL,
  "pharmacyId" TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "address"    TEXT,
  "lat"        DOUBLE PRECISION,
  "lng"        DOUBLE PRECISION,
  "phone"      TEXT,
  CONSTRAINT "pharmacy_branches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pharmacy_branches_pharmacyId_idx" ON "pharmacy_branches"("pharmacyId");

ALTER TABLE "pharmacy_branches"
  ADD CONSTRAINT "pharmacy_branches_pharmacyId_fkey"
  FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 6. NUEVA TABLA pharmacy_campaigns
-- ============================================================

CREATE TABLE "pharmacy_campaigns" (
  "id"           TEXT NOT NULL,
  "pharmacyId"   TEXT NOT NULL,
  "displayName"  TEXT NOT NULL,
  "description"  TEXT,
  "ctaLink"      TEXT NOT NULL,
  "ctaLabel"     TEXT NOT NULL DEFAULT 'Comprar',
  "displayPhone" TEXT,
  "priority"     INTEGER NOT NULL DEFAULT 0,
  "geoStates"    TEXT[] NOT NULL DEFAULT '{}',
  "startsAt"     TIMESTAMP(3),
  "endsAt"       TIMESTAMP(3),
  "active"       BOOLEAN NOT NULL DEFAULT true,
  "pricingModel" "PricingModel" NOT NULL DEFAULT 'FLAT_MONTHLY',
  "rateCents"    INTEGER NOT NULL DEFAULT 0,
  "stripePriceId" TEXT,
  "stripeSubId"  TEXT,
  "impressions"  INTEGER NOT NULL DEFAULT 0,
  "clicks"       INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "pharmacy_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pharmacy_campaigns_active_startsAt_endsAt_idx"
  ON "pharmacy_campaigns"("active", "startsAt", "endsAt");

ALTER TABLE "pharmacy_campaigns"
  ADD CONSTRAINT "pharmacy_campaigns_pharmacyId_fkey"
  FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 7. NUEVA TABLA campaign_events
-- ============================================================

CREATE TABLE "campaign_events" (
  "id"         TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "type"       "CampaignEventType" NOT NULL,
  "rxSlug"     TEXT,
  "geoState"   TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "campaign_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "campaign_events_campaignId_type_createdAt_idx"
  ON "campaign_events"("campaignId", "type", "createdAt");

ALTER TABLE "campaign_events"
  ADD CONSTRAINT "campaign_events_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "pharmacy_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- 8. NUEVA TABLA rx_events
-- ============================================================

CREATE TABLE "rx_events" (
  "id"             TEXT NOT NULL,
  "prescriptionId" TEXT NOT NULL,
  "type"           TEXT NOT NULL,
  "metadata"       JSONB,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rx_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rx_events_prescriptionId_createdAt_idx"
  ON "rx_events"("prescriptionId", "createdAt");

ALTER TABLE "rx_events"
  ADD CONSTRAINT "rx_events_prescriptionId_fkey"
  FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 9. RLS (Row Level Security) para nuevas tablas
-- ============================================================

-- Tablas de plataforma (sin clinicId): acceso solo por service role
ALTER TABLE "pharmacies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pharmacy_branches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pharmacy_campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaign_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rx_events" ENABLE ROW LEVEL SECURITY;

-- Políticas: service role bypasses RLS automáticamente en Supabase
-- Las rutas públicas usan el service role client del backend → acceso garantizado
-- Sin políticas adicionales: Anon key NO puede acceder (datos solo via API)
