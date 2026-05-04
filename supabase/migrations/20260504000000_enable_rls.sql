-- ============================================================
-- MedClinic Pro — Row Level Security (RLS) Migration
-- ============================================================
-- PURPOSE: Enable defense-in-depth for multi-tenant data.
--
-- IMPORTANT: The Fastify API uses SUPABASE_SERVICE_ROLE_KEY which
-- bypasses RLS. These policies protect against:
--   1. Direct DB access attempts with a user JWT (anon key)
--   2. Future API routes that accidentally use the anon client
--   3. Supabase Studio / psql access with a non-superuser role
--
-- HOW TO APPLY:
--   Option A: supabase db push (from project root with supabase CLI)
--   Option B: Supabase Dashboard → SQL Editor → paste and run
--   Option C: psql $DIRECT_URL -f supabase/migrations/20260504000000_enable_rls.sql
--
-- VERIFY AFTER APPLYING:
--   SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public' ORDER BY tablename;
-- ============================================================

-- ── Helper function ──────────────────────────────────────────
-- Returns the clinic_id stored in the authenticated user's JWT metadata.
-- Supabase stores custom claims in user_metadata (set by the app on signup/invite).
CREATE OR REPLACE FUNCTION auth.clinic_id()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'clinic_id',
    auth.jwt() -> 'app_metadata' ->> 'clinic_id'
  )
$$;

-- ── CLINICS ──────────────────────────────────────────────────
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

-- Only service_role (API) can manage clinics directly
CREATE POLICY "clinics_service_role_all" ON clinics
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read their own clinic
CREATE POLICY "clinics_read_own" ON clinics
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (id = auth.clinic_id());

-- ── DOCTORS ──────────────────────────────────────────────────
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doctors_service_role_all" ON doctors
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "doctors_tenant_select" ON doctors
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ("clinicId" = auth.clinic_id());

CREATE POLICY "doctors_tenant_insert" ON doctors
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ("clinicId" = auth.clinic_id());

CREATE POLICY "doctors_tenant_update" ON doctors
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING ("clinicId" = auth.clinic_id())
  WITH CHECK ("clinicId" = auth.clinic_id());

CREATE POLICY "doctors_tenant_delete" ON doctors
  AS PERMISSIVE FOR DELETE TO authenticated
  USING ("clinicId" = auth.clinic_id());

-- ── PATIENTS ─────────────────────────────────────────────────
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patients_service_role_all" ON patients
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "patients_tenant_select" ON patients
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ("clinicId" = auth.clinic_id());

CREATE POLICY "patients_tenant_insert" ON patients
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ("clinicId" = auth.clinic_id());

CREATE POLICY "patients_tenant_update" ON patients
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING ("clinicId" = auth.clinic_id())
  WITH CHECK ("clinicId" = auth.clinic_id());

CREATE POLICY "patients_tenant_delete" ON patients
  AS PERMISSIVE FOR DELETE TO authenticated
  USING ("clinicId" = auth.clinic_id());

-- ── APPOINTMENT TYPES ─────────────────────────────────────────
ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointment_types_service_role_all" ON appointment_types
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "appointment_types_tenant_select" ON appointment_types
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ("clinicId" = auth.clinic_id());

CREATE POLICY "appointment_types_tenant_insert" ON appointment_types
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ("clinicId" = auth.clinic_id());

CREATE POLICY "appointment_types_tenant_update" ON appointment_types
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING ("clinicId" = auth.clinic_id())
  WITH CHECK ("clinicId" = auth.clinic_id());

CREATE POLICY "appointment_types_tenant_delete" ON appointment_types
  AS PERMISSIVE FOR DELETE TO authenticated
  USING ("clinicId" = auth.clinic_id());

-- ── APPOINTMENTS ──────────────────────────────────────────────
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments_service_role_all" ON appointments
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "appointments_tenant_select" ON appointments
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ("clinicId" = auth.clinic_id());

CREATE POLICY "appointments_tenant_insert" ON appointments
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ("clinicId" = auth.clinic_id());

CREATE POLICY "appointments_tenant_update" ON appointments
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING ("clinicId" = auth.clinic_id())
  WITH CHECK ("clinicId" = auth.clinic_id());

CREATE POLICY "appointments_tenant_delete" ON appointments
  AS PERMISSIVE FOR DELETE TO authenticated
  USING ("clinicId" = auth.clinic_id());

-- ── CLINICAL NOTES ────────────────────────────────────────────
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinical_notes_service_role_all" ON clinical_notes
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "clinical_notes_tenant_select" ON clinical_notes
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ("clinicId" = auth.clinic_id());

CREATE POLICY "clinical_notes_tenant_insert" ON clinical_notes
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ("clinicId" = auth.clinic_id());

CREATE POLICY "clinical_notes_tenant_update" ON clinical_notes
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING ("clinicId" = auth.clinic_id())
  WITH CHECK ("clinicId" = auth.clinic_id());

-- NOM-004: Clinical notes cannot be deleted, only amended — deny DELETE for authenticated users
CREATE POLICY "clinical_notes_no_delete" ON clinical_notes
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);

-- ── PRESCRIPTIONS ─────────────────────────────────────────────
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prescriptions_service_role_all" ON prescriptions
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "prescriptions_tenant_select" ON prescriptions
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ("clinicId" = auth.clinic_id());

CREATE POLICY "prescriptions_tenant_insert" ON prescriptions
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ("clinicId" = auth.clinic_id());

CREATE POLICY "prescriptions_tenant_update" ON prescriptions
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING ("clinicId" = auth.clinic_id())
  WITH CHECK ("clinicId" = auth.clinic_id());

CREATE POLICY "prescriptions_tenant_delete" ON prescriptions
  AS PERMISSIVE FOR DELETE TO authenticated
  USING ("clinicId" = auth.clinic_id());

-- ── LAB RESULTS ───────────────────────────────────────────────
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lab_results_service_role_all" ON lab_results
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "lab_results_tenant_select" ON lab_results
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ("clinicId" = auth.clinic_id() AND "deletedAt" IS NULL);

CREATE POLICY "lab_results_tenant_insert" ON lab_results
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ("clinicId" = auth.clinic_id());

CREATE POLICY "lab_results_tenant_update" ON lab_results
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING ("clinicId" = auth.clinic_id())
  WITH CHECK ("clinicId" = auth.clinic_id());

-- NOM-004: Hard deletes are forbidden for lab results — soft delete only (set deletedAt)
CREATE POLICY "lab_results_no_hard_delete" ON lab_results
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);

-- ── SERVICES (billing catalog) ────────────────────────────────
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services_service_role_all" ON services
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "services_tenant_select" ON services
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ("clinicId" = auth.clinic_id());

CREATE POLICY "services_tenant_insert" ON services
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ("clinicId" = auth.clinic_id());

CREATE POLICY "services_tenant_update" ON services
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING ("clinicId" = auth.clinic_id())
  WITH CHECK ("clinicId" = auth.clinic_id());

CREATE POLICY "services_tenant_delete" ON services
  AS PERMISSIVE FOR DELETE TO authenticated
  USING ("clinicId" = auth.clinic_id());

-- ── INVOICES ──────────────────────────────────────────────────
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_service_role_all" ON invoices
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "invoices_tenant_select" ON invoices
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ("clinicId" = auth.clinic_id());

CREATE POLICY "invoices_tenant_insert" ON invoices
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ("clinicId" = auth.clinic_id());

CREATE POLICY "invoices_tenant_update" ON invoices
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING ("clinicId" = auth.clinic_id())
  WITH CHECK ("clinicId" = auth.clinic_id());

CREATE POLICY "invoices_tenant_delete" ON invoices
  AS PERMISSIVE FOR DELETE TO authenticated
  USING ("clinicId" = auth.clinic_id());

-- ── INVOICE ITEMS (no clinicId — access via parent invoice) ───
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_items_service_role_all" ON invoice_items
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "invoice_items_tenant_select" ON invoice_items
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items."invoiceId"
      AND invoices."clinicId" = auth.clinic_id()
  ));

-- ── PAYMENT RECORDS ───────────────────────────────────────────
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_records_service_role_all" ON payment_records
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "payment_records_tenant_select" ON payment_records
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = payment_records."invoiceId"
      AND invoices."clinicId" = auth.clinic_id()
  ));

-- ── AUDIT LOGS (append-only) ──────────────────────────────────
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_service_role_all" ON audit_logs
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Admins can read their clinic's audit log
CREATE POLICY "audit_logs_tenant_select" ON audit_logs
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ("clinicId" = auth.clinic_id());

-- Authenticated users can insert (via API) but NEVER update or delete
CREATE POLICY "audit_logs_insert_only" ON audit_logs
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ("clinicId" = auth.clinic_id());

CREATE POLICY "audit_logs_no_update" ON audit_logs
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "audit_logs_no_delete" ON audit_logs
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);

-- ── NOTIFICATIONS ─────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_service_role_all" ON notifications
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── CATALOG TABLES (shared, read-only for authenticated) ──────
-- medications, cie10_codes, insurances are catalogs with no clinicId.
-- Service role manages them; authenticated users can only read.

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medications_service_role_all" ON medications
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "medications_read_authenticated" ON medications
  AS PERMISSIVE FOR SELECT TO authenticated USING (true);

ALTER TABLE cie10_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cie10_service_role_all" ON cie10_codes
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "cie10_read_authenticated" ON cie10_codes
  AS PERMISSIVE FOR SELECT TO authenticated USING (true);

ALTER TABLE insurances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insurances_service_role_all" ON insurances
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "insurances_read_authenticated" ON insurances
  AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ── PASSWORD RESET TOKENS ─────────────────────────────────────
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "password_reset_tokens_service_role_all" ON password_reset_tokens
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
-- No direct user access — managed entirely by the API with service_role

-- ── VERIFY ────────────────────────────────────────────────────
-- After running, validate with:
--   SELECT tablename, rowsecurity
--   FROM pg_tables
--   WHERE schemaname = 'public'
--   ORDER BY tablename;
--
--   SELECT schemaname, tablename, policyname, cmd, qual
--   FROM pg_policies
--   WHERE schemaname = 'public'
--   ORDER BY tablename, policyname;
