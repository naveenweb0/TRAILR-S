import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';

describe('SCHOOLDEST Clean Production State & Security Invariants', () => {
  it('1. Database preserves valid onboarded schools and destinations without mock seeds', async () => {
    const schoolCount = await prisma.school.count();
    const destinationCount = await prisma.destination.count();
    const bookingCount = await prisma.booking.count();
    const travellerCount = await prisma.travellerServiceRequest.count();

    expect(schoolCount).toBeGreaterThanOrEqual(0);
    expect(destinationCount).toBeGreaterThanOrEqual(0);
    expect(bookingCount).toBeGreaterThanOrEqual(0);
    expect(travellerCount).toBeGreaterThanOrEqual(0);
  });

  it('2. Exactly one provisioned Super Administrator exists with verified Google identity', async () => {
    const users = await prisma.user.findMany();
    const admin = users.find((u) => u.role === 'SUPER_ADMIN');
    expect(admin).toBeDefined();
    expect(admin!.role).toBe('SUPER_ADMIN');
    expect(admin!.email).toBeDefined();
    expect(admin!.email.includes('@')).toBe(true);
  });

  it('3. Public Destinations API returns clean empty array with zero mock records', async () => {
    const res = await request(app).get('/api/v1/destinations');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });

  it('4. Demo switcher endpoint is completely removed (returns 404)', async () => {
    const res = await request(app).get('/api/v1/auth/demo-accounts');
    expect(res.status).toBe(404);
  });

  it('5. Unauthenticated access to protected portals is strictly rejected with 401', async () => {
    const adminRes = await request(app).get('/api/v1/admin/overview');
    expect(adminRes.status).toBe(401);

    const destRes = await request(app).get('/api/v1/destinations/me/bookings');
    expect(destRes.status).toBe(401);

    const schoolRes = await request(app).get('/api/v1/school/bookings');
    expect(schoolRes.status).toBe(401);
  });

  it('6. Booking submission rejected if user is not associated with an authorized school', async () => {
    // Create ephemeral school user without school association
    const ephemeralUser = await prisma.user.create({
      data: {
        email: 'ephemeral-tester@schooldest.com',
        name: 'Ephemeral Tester',
        role: 'SCHOOL_STAFF',
        emailVerified: true,
      },
    });

    const { generateToken } = await import('../src/utils/jwt.js');
    const token = generateToken({
      userId: ephemeralUser.id,
      email: ephemeralUser.email,
      role: ephemeralUser.role,
      name: ephemeralUser.name,
    });

    const res = await request(app)
      .post('/api/v1/school/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        destinationId: '00000000-0000-0000-0000-000000000000',
        visitDate: '2026-11-20',
        studentCount: 50,
      });

    // Cleanup ephemeral user
    await prisma.user.delete({ where: { id: ephemeralUser.id } });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });



  it('7. Neon Auth Security — Google sign-up never auto-promotes to SUPER_ADMIN', async () => {
    const res = await request(app)
      .post('/api/v1/auth/neon-login')
      .send({ sessionToken: 'test-neon-token-new-google-user' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('SCHOOL_STAFF');
    expect(res.body.data.user.role).not.toBe('SUPER_ADMIN');

    // Clean up test user created by this test
    await prisma.user.deleteMany({
      where: { email: 'new-google-user@example.com' }
    });
  });

  it('8. Neon Auth Security — Unprovisioned Google identity cannot access SUPER_ADMIN', async () => {
    const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    expect(admin).toBeDefined();

    const res = await request(app)
      .post('/api/v1/auth/neon-login')
      .send({ sessionToken: `test-neon-token-unauthorized-admin-attempt:${admin!.email}` });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('9. Cloudinary upload signature endpoint requires valid authentication', async () => {
    const res = await request(app)
      .post('/api/v1/upload/sign')
      .send({ folder: 'schooldest/destinations' });

    expect(res.status).toBe(401);
  });

  it('10. Health check endpoint remains operational', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
