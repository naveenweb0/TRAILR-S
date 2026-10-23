import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { generateToken } from '../src/utils/jwt.js';

describe('SCHOOLDEST — Role-Based Navigation & Super Admin Dashboard Tests', () => {
  let superAdminUser: any;
  let superAdminToken: string;

  let schoolUser: any;
  let schoolToken: string;
  let schoolEntity: any;

  let destManagerUser: any;
  let destManagerToken: string;
  let destEntity: any;

  beforeAll(async () => {
    // 1. Fetch or create Super Admin
    superAdminUser = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN', isActive: true },
    });

    if (!superAdminUser) {
      superAdminUser = await prisma.user.create({
        data: {
          email: 'admin.test@schooldest.com',
          name: 'Super Admin Test',
          role: 'SUPER_ADMIN',
          neonAuthId: 'test-admin-neon-id',
          isActive: true,
          emailVerified: true,
        },
      });
    }

    superAdminToken = generateToken({
      userId: superAdminUser.id,
      email: superAdminUser.email,
      role: superAdminUser.role,
      name: superAdminUser.name,
    });

    // 2. Create isolated School User & School
    schoolUser = await prisma.user.create({
      data: {
        email: 'school.coordinator.test@schooldest.com',
        name: 'School Test Coordinator',
        role: 'SCHOOL_STAFF',
        neonAuthId: 'test-school-neon-id',
        isActive: true,
        emailVerified: true,
      },
    });

    schoolEntity = await prisma.school.create({
      data: {
        name: 'Test Academy High',
        board: 'CBSE',
        address: '123 Education Lane',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        officialEmail: 'official.academy@schooldest.com',
        contactPhone: '+91 9876543210',
        contactPerson: 'School Test Coordinator',
        verificationStatus: 'PENDING',
        approximateStrength: 1200,
        staff: {
          create: {
            userId: schoolUser.id,
            role: 'COORDINATOR',
          },
        },
      },
    });

    schoolToken = generateToken({
      userId: schoolUser.id,
      email: schoolUser.email,
      role: schoolUser.role,
      name: schoolUser.name,
      schoolId: schoolEntity.id,
    });

    // 3. Create isolated Destination Manager User & Destination
    destManagerUser = await prisma.user.create({
      data: {
        email: 'dest.manager.test@schooldest.com',
        name: 'Destination Manager Test',
        role: 'DESTINATION_MANAGER',
        neonAuthId: 'test-dest-neon-id',
        isActive: true,
        emailVerified: true,
      },
    });

    destEntity = await prisma.destination.create({
      data: {
        name: 'Test Adventure Arena',
        slug: `test-adventure-arena-${Date.now()}`,
        businessName: 'Test Adventure Arena Pvt Ltd',
        category: 'Amusement & Adventure',
        description: 'Premier school excursion park',
        address: '77 Fun Highway',
        city: 'Gurugram',
        state: 'Haryana',
        pincode: '122001',
        officialEmail: 'contact.adventure@schooldest.com',
        contactPhone: '+91 9876543211',
        managerName: 'Destination Manager Test',
        status: 'PENDING_APPROVAL',
        isVerified: false,
        minGroupSize: 30,
        maxGroupSize: 1000,
        staff: {
          create: {
            userId: destManagerUser.id,
            role: 'MANAGER',
          },
        },
      },
    });

    destManagerToken = generateToken({
      userId: destManagerUser.id,
      email: destManagerUser.email,
      role: destManagerUser.role,
      name: destManagerUser.name,
      destinationId: destEntity.id,
    });
  });

  afterAll(async () => {
    // Clean up isolated test entities
    if (schoolEntity) {
      await prisma.schoolStaff.deleteMany({ where: { schoolId: schoolEntity.id } });
      await prisma.school.deleteMany({ where: { id: schoolEntity.id } });
    }
    if (schoolUser) {
      await prisma.user.deleteMany({ where: { id: schoolUser.id } });
    }

    if (destEntity) {
      await prisma.destinationStaff.deleteMany({ where: { destinationId: destEntity.id } });
      await prisma.destination.deleteMany({ where: { id: destEntity.id } });
    }
    if (destManagerUser) {
      await prisma.user.deleteMany({ where: { id: destManagerUser.id } });
    }

    if (superAdminUser && superAdminUser.email === 'admin.test@schooldest.com') {
      await prisma.user.deleteMany({ where: { id: superAdminUser.id } });
    }
  });

  it('1. Super Admin authentication returns authoritative SUPER_ADMIN role for /admin routing', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('SUPER_ADMIN');
    expect(res.body.data.user.school).toBeNull();
    expect(res.body.data.user.destination).toBeNull();
  });

  it('2. School user authentication returns authoritative SCHOOL_STAFF role and linked school', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${schoolToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('SCHOOL_STAFF');
    expect(res.body.data.user.school).toBeDefined();
    expect(res.body.data.user.school.id).toBe(schoolEntity.id);
  });

  it('3. Destination Manager authentication returns authoritative DESTINATION_MANAGER role and linked destination', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${destManagerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('DESTINATION_MANAGER');
    expect(res.body.data.user.destination).toBeDefined();
    expect(res.body.data.user.destination.id).toBe(destEntity.id);
  });

  it('4. School user is rejected from Super Admin APIs with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${schoolToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('5. Destination Manager is rejected from Super Admin APIs with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${destManagerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('6. School user is rejected from Destination Manager management APIs with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/v1/destinations/me/profile')
      .set('Authorization', `Bearer ${schoolToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('7. Destination Manager is rejected from School booking creation APIs with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/v1/school/bookings')
      .set('Authorization', `Bearer ${destManagerToken}`)
      .send({
        destinationId: destEntity.id,
        visitDate: new Date().toISOString(),
        totalGroupSize: 50,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('8. Super Admin can manage school verification and view linked staff directly from admin API', async () => {
    // 1. Fetch school detail from admin endpoint
    const detailRes = await request(app)
      .get(`/api/v1/admin/schools/${schoolEntity.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.success).toBe(true);
    expect(detailRes.body.data.id).toBe(schoolEntity.id);
    expect(detailRes.body.data.staff.length).toBeGreaterThanOrEqual(1);
    expect(detailRes.body.data.staff[0].user.email).toBe(schoolUser.email);

    // 2. Verify school status
    const updateRes = await request(app)
      .put(`/api/v1/admin/schools/${schoolEntity.id}/verification`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        verificationStatus: 'VERIFIED',
        verificationNotes: 'Institutional credentials vetted.',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.verificationStatus).toBe('VERIFIED');
  });

  it('9. Super Admin can inspect destination detail and approve proposal to PUBLISHED directly from admin API', async () => {
    // 1. Fetch destination detail from admin endpoint
    const detailRes = await request(app)
      .get(`/api/v1/admin/destinations/${destEntity.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.success).toBe(true);
    expect(detailRes.body.data.id).toBe(destEntity.id);
    expect(detailRes.body.data.staff[0].user.email).toBe(destManagerUser.email);

    // 2. Approve and publish destination
    const statusRes = await request(app)
      .put(`/api/v1/admin/destinations/${destEntity.id}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        status: 'PUBLISHED',
        isVerified: true,
      });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.status).toBe('PUBLISHED');
    expect(statusRes.body.data.isVerified).toBe(true);
  });

  it('10. Super Admin can toggle user suspension via dedicated admin API and suspended user is rejected on subsequent requests', async () => {
    // 1. Suspend school user
    const suspendRes = await request(app)
      .put(`/api/v1/admin/users/${schoolUser.id}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ isActive: false });

    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.isActive).toBe(false);

    // 2. Suspended user request is rejected by authentication middleware
    const rejectedRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${schoolToken}`);

    expect(rejectedRes.status).toBe(401);
    const errMsg = rejectedRes.body.error?.message || rejectedRes.body.message;
    expect(errMsg).toMatch(/deactivated|suspended|not found/i);

    // 3. Re-activate user
    const activateRes = await request(app)
      .put(`/api/v1/admin/users/${schoolUser.id}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ isActive: true });

    expect(activateRes.status).toBe(200);
    expect(activateRes.body.data.isActive).toBe(true);
  });
});
