import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { generateToken } from '../src/utils/jwt.js';
import { Role } from '@prisma/client';

describe('PRIORITY 1: Super Admin Security & Access Control Regression Tests', () => {
  let superAdminUser: any;
  let schoolStaffUser: any;
  let destinationManagerUser: any;

  let superAdminToken: string;
  let schoolStaffToken: string;
  let destinationManagerToken: string;

  beforeAll(async () => {
    // 1. Fetch the real provisioned super admin
    superAdminUser = await prisma.user.findFirst({
      where: { role: Role.SUPER_ADMIN, isActive: true },
    });
    expect(superAdminUser).toBeDefined();

    superAdminToken = generateToken({
      userId: superAdminUser.id,
      email: superAdminUser.email,
      role: superAdminUser.role,
      name: superAdminUser.name,
    });

    // 2. Create isolated school staff test user
    schoolStaffUser = await prisma.user.create({
      data: {
        email: 'test-school-staff-sec@schooldest.com',
        name: 'School Staff Security Test',
        role: Role.SCHOOL_STAFF,
        isActive: true,
        emailVerified: true,
      },
    });

    schoolStaffToken = generateToken({
      userId: schoolStaffUser.id,
      email: schoolStaffUser.email,
      role: schoolStaffUser.role,
      name: schoolStaffUser.name,
    });

    // 3. Create isolated destination manager test user
    destinationManagerUser = await prisma.user.create({
      data: {
        email: 'test-dest-manager-sec@schooldest.com',
        name: 'Destination Manager Security Test',
        role: Role.DESTINATION_MANAGER,
        isActive: true,
        emailVerified: true,
      },
    });

    destinationManagerToken = generateToken({
      userId: destinationManagerUser.id,
      email: destinationManagerUser.email,
      role: destinationManagerUser.role,
      name: destinationManagerUser.name,
    });
  });

  afterAll(async () => {
    if (schoolStaffUser) {
      await prisma.user.deleteMany({ where: { id: schoolStaffUser.id } });
    }
    if (destinationManagerUser) {
      await prisma.user.deleteMany({ where: { id: destinationManagerUser.id } });
    }
  });

  describe('Unauthenticated Direct API Access (Must Return 401)', () => {
    const adminEndpoints = [
      '/api/v1/admin/overview',
      '/api/v1/admin/destinations',
      '/api/v1/admin/schools',
      '/api/v1/admin/bookings',
      '/api/v1/admin/traveller-requests',
      '/api/v1/admin/audit-logs',
      '/api/v1/admin/settings',
    ];

    for (const endpoint of adminEndpoints) {
      it(`blocks unauthenticated GET ${endpoint} with 401`, async () => {
        const res = await request(app).get(endpoint);
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
      });
    }

    it('blocks unauthenticated POST to /api/v1/admin/destinations/onboard with 401', async () => {
      const res = await request(app).post('/api/v1/admin/destinations/onboard').send({});
      expect(res.status).toBe(401);
    });

    it('blocks tampered/malformed Bearer token with 401', async () => {
      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', 'Bearer invalid.token.payload');
      expect(res.status).toBe(401);
    });
  });

  describe('Authenticated Non-Admin Access (Must Return 403 Forbidden)', () => {
    it('school user receives 403 when requesting /api/v1/admin/overview', async () => {
      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${schoolStaffToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('school user receives 403 when requesting /api/v1/admin/schools', async () => {
      const res = await request(app)
        .get('/api/v1/admin/schools')
        .set('Authorization', `Bearer ${schoolStaffToken}`);
      expect(res.status).toBe(403);
    });

    it('destination manager receives 403 when requesting /api/v1/admin/overview', async () => {
      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${destinationManagerToken}`);
      expect(res.status).toBe(403);
    });

    it('destination manager receives 403 when requesting /api/v1/admin/destinations', async () => {
      const res = await request(app)
        .get('/api/v1/admin/destinations')
        .set('Authorization', `Bearer ${destinationManagerToken}`);
      expect(res.status).toBe(403);
    });

    it('SERVER-AUTHORITATIVE INVARIANT: Token claiming SUPER_ADMIN is rejected if database record is SCHOOL_STAFF', async () => {
      // Forge a token where the client says role is SUPER_ADMIN, but userId maps to schoolStaffUser in Postgres
      const forgedToken = generateToken({
        userId: schoolStaffUser.id,
        email: schoolStaffUser.email,
        role: 'SUPER_ADMIN', // Spoofed client-side role
        name: 'Spoofed Admin',
      });

      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${forgedToken}`);

      // Backend middleware queries PostgreSQL User record, sees actual role is SCHOOL_STAFF, and forbids access
      expect(res.status).toBe(403);
    });
  });

  describe('Authorized Super Admin Access (Must Return 200 OK)', () => {
    it('verified super admin can access /api/v1/admin/overview', async () => {
      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('schools');
      expect(res.body.data).toHaveProperty('destinations');
      expect(res.body.data).toHaveProperty('bookings');
      expect(res.body.data).toHaveProperty('traveller');
    });

    it('verified super admin can list all schools', async () => {
      const res = await request(app)
        .get('/api/v1/admin/schools')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('verified super admin can list all destinations', async () => {
      const res = await request(app)
        .get('/api/v1/admin/destinations')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('verified super admin can view traveller fleet requests', async () => {
      const res = await request(app)
        .get('/api/v1/admin/traveller-requests')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
