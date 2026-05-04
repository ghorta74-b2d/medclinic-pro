#!/usr/bin/env node
/**
 * check-rls.js — Verify that all tenant tables in Supabase have RLS enabled
 * and at least one active policy.
 *
 * Usage:
 *   DATABASE_URL=<connection_string> node scripts/check-rls.js
 *
 * Exits with code 1 if any table is missing RLS or policies.
 * Used in CI (.github/workflows/security.yml → rls-check job).
 */

const { Client } = require('pg')

// Tables that must have RLS enabled and at least one policy
const REQUIRED_RLS_TABLES = [
  'clinics',
  'doctors',
  'patients',
  'appointment_types',
  'appointments',
  'clinical_notes',
  'prescriptions',
  'lab_results',
  'services',
  'invoices',
  'invoice_items',
  'payment_records',
  'audit_logs',
  'notifications',
  'medications',
  'cie10_codes',
  'insurances',
  'password_reset_tokens',
]

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is required')
    process.exit(1)
  }

  const client = new Client({ connectionString })
  await client.connect()

  // Query RLS status for all public tables
  const rlsQuery = `
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `

  // Query all active policies
  const policiesQuery = `
    SELECT tablename, COUNT(*) AS policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
  `

  const [rlsResult, policiesResult] = await Promise.all([
    client.query(rlsQuery),
    client.query(policiesQuery),
  ])

  await client.end()

  const rlsMap = new Map(rlsResult.rows.map(r => [r.tablename, r.rowsecurity]))
  const policyMap = new Map(policiesResult.rows.map(r => [r.tablename, parseInt(r.policy_count, 10)]))

  let violations = 0
  const rows = []

  for (const table of REQUIRED_RLS_TABLES) {
    const hasRLS = rlsMap.get(table) === true
    const policyCount = policyMap.get(table) ?? 0
    const hasPolicies = policyCount > 0

    const status = hasRLS && hasPolicies ? '✅' : '❌'
    if (!hasRLS || !hasPolicies) violations++

    rows.push({ table, rls: hasRLS ? '✅' : '❌', policies: policyCount, status })
  }

  // Print table
  console.log('\n── RLS Coverage Report ─────────────────────────────────────────\n')
  console.log('Table'.padEnd(30) + 'RLS'.padEnd(8) + 'Policies'.padEnd(12) + 'Status')
  console.log('─'.repeat(60))
  for (const r of rows) {
    console.log(r.table.padEnd(30) + r.rls.padEnd(8) + String(r.policies).padEnd(12) + r.status)
  }
  console.log('─'.repeat(60))

  if (violations === 0) {
    console.log(`\n✅ All ${REQUIRED_RLS_TABLES.length} tables have RLS enabled with active policies.\n`)
    process.exit(0)
  } else {
    console.error(`\n❌ ${violations} table(s) are missing RLS or policies. Apply supabase/migrations/20260504000000_enable_rls.sql\n`)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('❌ check-rls.js failed:', err.message)
  process.exit(1)
})
