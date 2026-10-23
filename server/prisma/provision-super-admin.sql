-- ==============================================================================
-- SCHOOLDEST — PRODUCTION SUPER ADMIN PROVISIONING TEMPLATE FOR NEON AUTH & NEON POSTGRESQL
-- ==============================================================================
-- SECURITY INVARIANTS:
-- 1. Super Admin access CANNOT be granted through public registration or unvetted Google sign-in.
-- 2. The server-authoritative authentication gate strictly checks the authenticated
--    Neon Auth ID against the provisioned record in Neon PostgreSQL.
-- 3. Super Admin records are NEVER automatically linked by email matching alone.
-- 4. Never overwrite an existing account's Neon Auth ID without pre-flight verification.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PRE-FLIGHT CHECK: Inspect the database state for the designated administrator
-- ------------------------------------------------------------------------------
-- Replace 'admin@schooldest.com' and 'PASTE_VERIFIED_NEON_AUTH_ID_HERE' before running.
-- Note: Neon Auth IDs can be retrieved from your Neon Console under Auth -> Users,
-- or from the initial sign-in attempt audit log.

SELECT
  "id",
  "email",
  "neonAuthId",
  "firebaseUid",
  "name",
  "role",
  "isActive",
  "emailVerified"
FROM "User"
WHERE "email" = 'admin@schooldest.com'
   OR "neonAuthId" = 'PASTE_VERIFIED_NEON_AUTH_ID_HERE';

-- REVIEW THE PRE-FLIGHT OUTPUT:
-- - If 0 rows returned: Proceed to SECTION 1 (Fresh Provisioning).
-- - If 1 row returned with matching email AND ("neonAuthId" IS NULL OR "neonAuthId" = 'PASTE_VERIFIED_NEON_AUTH_ID_HERE'):
--   Proceed to SECTION 2 (Idempotent Safe Link & Promotion).
-- - If a row exists with a DIFFERENT "neonAuthId": STOP! Inspect identity before proceeding. See SECTION 3 (Safe Access Recovery).

-- ------------------------------------------------------------------------------
-- SECTION 1: Fresh Provisioning (User does not yet exist in Neon PostgreSQL)
-- ------------------------------------------------------------------------------
-- Inserts a dedicated Super Admin record directly anchored by their verified Neon Auth ID.
-- Fails safely if email or Neon Auth ID is already claimed.

INSERT INTO "User" (
  "id",
  "email",
  "neonAuthId",
  "name",
  "role",
  "isActive",
  "emailVerified",
  "createdAt",
  "updatedAt"
)
VALUES (
  gen_random_uuid()::text,
  'admin@schooldest.com',
  'PASTE_VERIFIED_NEON_AUTH_ID_HERE',
  'Platform Super Admin',
  'SUPER_ADMIN'::"Role",
  true,
  true,
  NOW(),
  NOW()
);

-- ------------------------------------------------------------------------------
-- SECTION 2: Idempotent Safe Link & Promotion (Safe for Repeat Execution)
-- ------------------------------------------------------------------------------
-- Safely promotes an existing record ONLY IF:
-- 1. Email matches the authorized administrator.
-- 2. The account does NOT already have a conflicting Neon Auth ID belonging to another person.

UPDATE "User"
SET
  "role" = 'SUPER_ADMIN'::"Role",
  "neonAuthId" = 'PASTE_VERIFIED_NEON_AUTH_ID_HERE',
  "isActive" = true,
  "emailVerified" = true,
  "updatedAt" = NOW()
WHERE "email" = 'admin@schooldest.com'
  AND ("neonAuthId" IS NULL OR "neonAuthId" = 'PASTE_VERIFIED_NEON_AUTH_ID_HERE');

-- ------------------------------------------------------------------------------
-- SECTION 3: Safe Access Recovery / Neon Auth ID Rotation
-- ------------------------------------------------------------------------------
-- Use this ONLY when the platform owner has rotated their Google account or lost access.
-- Requires specifying BOTH the old and new verified Neon Auth IDs for audit safety.

/*
UPDATE "User"
SET
  "neonAuthId" = 'NEW_VERIFIED_NEON_AUTH_ID_HERE',
  "updatedAt" = NOW()
WHERE "email" = 'admin@schooldest.com'
  AND "role" = 'SUPER_ADMIN'::"Role"
  AND "neonAuthId" = 'OLD_VERIFIED_NEON_AUTH_ID_HERE';
*/

-- ------------------------------------------------------------------------------
-- SECTION 4: Audit Verification
-- ------------------------------------------------------------------------------
-- Run this query to confirm the active Super Admin identity mapping in Neon:

SELECT
  "id",
  "email",
  "neonAuthId",
  "name",
  "role",
  "isActive",
  "emailVerified",
  "lastLoginAt",
  "updatedAt"
FROM "User"
WHERE "role" = 'SUPER_ADMIN'::"Role";
