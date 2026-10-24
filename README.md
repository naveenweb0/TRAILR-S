# TRAILR'S — B2B School Destination Booking Platform

**SCHOOLDEST** is an enterprise-grade B2B destination booking platform connecting schools directly with amusement parks, waterparks, science centres, planetariums, zoos, and educational attractions across India (such as *Hardy's World Ludhiana*, *Pushpa Gujral Science City Kapurthala*, and *Wonderla*).

The platform replaces fragmented travel agency intermediaries with a unified ecosystem comprising three specialized portals:
1. **School Portal**: Educational discovery, live destination-specific availability calendars, complimentary teacher ratio calculation, and structured excursion booking with optional transport assistance.
2. **Destination Portal**: Venue listing management, ticket tiers, daily group capacity limits, blackout dates, Cloudinary photo gallery management, and an incoming booking review inbox (accept, reject with reason, or propose alternative dates).
3. **Super Admin Platform**: Complete ecosystem oversight, destination & school verification, global booking audits, and the **Dedicated Traveller-Service Request Management Queue** where student transport requests are handled independently without burdening venues.

---

## 🏗️ Architecture & Integrations

- **Database**: **Neon PostgreSQL** using pooled connection string for application queries and direct connection string for Prisma schema migrations.
- **Authentication**: **Neon Auth** (Managed Better Auth) with Google OAuth 2.0 and server-authoritative role enforcement.
- **Media Storage**: **Cloudinary** global CDN for destination cover banners, gallery albums, and school badges with server-side signature generation.
- **Frontend**: React 18 + Vite + Tailwind CSS + Lucide Icons + `@cloudinary/react` / `@cloudinary/url-gen`.
- **Backend API**: Node.js + Express + Prisma ORM + Vitest.

---

## 🔒 Security Invariants

1. **Neon Auth Google OAuth**:
   - Google sign-in strictly provisions new accounts as `SCHOOL_STAFF`.
   - Google sign-in **never** grants `SUPER_ADMIN` privileges automatically.
2. **Authoritative Neon PostgreSQL Role Gate**:
   - Super Administrator accounts must be explicitly provisioned in Neon PostgreSQL by linking their verified `neonAuthId`.
   - Attempts to access administrator endpoints via unprovisioned Google accounts are rejected with **HTTP 403 Forbidden**.
3. **Collision Protection**:
   - If an account is already linked to a different `neonAuthId`, the system rejects the request with **HTTP 409 Conflict**.
4. **Tenant Isolation**:
   - Schools cannot view or mutate other schools' booking records.
   - Destinations cannot view or mutate other destinations' listings or private bookings.
5. **Zero Client Secrets**:
   - `CLOUDINARY_API_SECRET` is kept strictly on the backend.
   - Database credentials are never exposed to the frontend.

---

## 🚀 Environment Variables

### Client (`client/.env`)
```env
# Public backend API URL
VITE_API_BASE_URL="http://localhost:5001/api/v1"

# Neon Auth Service URL (from Neon Console -> Auth)
VITE_NEON_AUTH_URL="https://[your-neon-auth-subdomain].neon.tech"

# Cloudinary Cloud Name (Browser safe)
VITE_CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
```

### Server (`server/.env`)
```env
PORT=5001
NODE_ENV=development
CLIENT_ORIGIN="http://localhost:5173"
JWT_SECRET="your_secure_jwt_secret_key"

# Neon PostgreSQL Database
# Pooled connection string (for high concurrency API traffic):
DATABASE_URL="postgresql://[user]:[password]@[neon-hostname]-pooler.[region].neon.tech/neondb?sslmode=require"

# Direct connection string (for Prisma push & migrations):
DIRECT_URL="postgresql://[user]:[password]@[neon-hostname].[region].neon.tech/neondb?sslmode=require"

# Neon Auth (Managed Better Auth & Google OAuth)
NEON_AUTH_URL="https://[your-neon-auth-subdomain].neon.tech"
NEON_AUTH_JWKS_URL="https://[your-neon-auth-subdomain].neon.tech/.well-known/jwks.json"
ALLOW_DEV_AUTH_MOCK="false"

# Cloudinary CDN & Asset Storage (SERVER ONLY - NEVER EXPOSE TO CLIENT)
CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
CLOUDINARY_API_KEY="your_cloudinary_api_key"
CLOUDINARY_API_SECRET="your_cloudinary_api_secret"
CLOUDINARY_URL="cloudinary://[api_key]:[api_secret]@[cloud_name]"
```

---

## 🛠️ Super Admin Provisioning in Neon PostgreSQL

1. Retrieve the administrator's **Neon Auth ID** from the Neon Console under **Auth** -> **Users**.
2. Run the idempotent provisioning script in the Neon SQL Editor ([server/prisma/provision-super-admin.sql](file:///Users/naveenmaan/Desktop/b2b/server/prisma/provision-super-admin.sql)):

```sql
UPDATE "User"
SET
  "role" = 'SUPER_ADMIN'::"Role",
  "neonAuthId" = 'PASTE_VERIFIED_NEON_AUTH_ID_HERE',
  "isActive" = true,
  "emailVerified" = true,
  "updatedAt" = NOW()
WHERE "email" = 'admin@schooldest.com'
  AND ("neonAuthId" IS NULL OR "neonAuthId" = 'PASTE_VERIFIED_NEON_AUTH_ID_HERE');
```

---

## 💻 Local Development

```bash
# 1. Install & build server
cd server
npm install
npm run build

# 2. Synchronize Neon Database & Seed
npm run db:push
npm run db:seed

# 3. Install & build client
cd ../client
npm install
npm run build

# 4. Run Servers
npm run dev:server # runs backend on port 5001
npm run dev:client # runs frontend on port 5173
```

---

## 🧪 Integration Test Suite

```bash
cd server
npm test
```

### Verified Test Scenarios (23 / 23 Tests):
- **Health & Discovery**: Public destination discovery and capacity querying.
- **Standard Booking**: Booking without transport routed directly to venue inbox.
- **Transport Workflow**: Booking with transport creating linked `TravellerServiceRequest` in Super Admin queue.
- **RBAC & Isolation**: Strict school and destination data isolation.
- **Neon Auth Security**: Rejection of unlinked admins, privilege escalation prevention, and verified admin login.
- **Neon Database Integrity**: Read-only connection health check and schema verification on real Neon DB.
- **Cloudinary Media Storage**: Authorized venue cover and gallery uploads, ownership check, and clean asset deletion.
