-- Migration: add_password_reset_tokens
-- Aplicar en: Supabase Dashboard → SQL Editor
-- https://supabase.com/dashboard/project/gzojhcjymqtjswxqgkgk/sql/new

CREATE TABLE "password_reset_tokens" (
  "id"          TEXT NOT NULL,
  "tokenHash"   TEXT NOT NULL,
  "doctorId"    TEXT NOT NULL,
  "expiresAt"   TIMESTAMP(3) NOT NULL,
  "usedAt"      TIMESTAMP(3),
  "ipAddress"   TEXT,
  "userAgent"   TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");
CREATE INDEX "password_reset_tokens_doctorId_idx" ON "password_reset_tokens"("doctorId");
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

ALTER TABLE "password_reset_tokens"
  ADD CONSTRAINT "password_reset_tokens_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "doctors"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
