import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { Role } from '@prisma/client';

describe('SCHOOLDEST — Neon Auth Account Resolution & Concurrency Tests', () => {
  const cleanupUserIds: string[] = [];

  afterAll(async () => {
    if (cleanupUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: cleanupUserIds } },
      });
    }
  });

  it('1. First-time user is created once with default least-privileged role SCHOOL_STAFF', async () => {
    const res = await request(app)
      .post('/api/v1/auth/neon-login')
      .send({ sessionToken: 'test-neon-token-reg-first-time-user' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('reg-first-time-user@schooldest.test');
    expect(res.body.data.user.role).toBe(Role.SCHOOL_STAFF);
    expect(res.body.data.user.neonAuthId).toBe('neon-auth-reg-first-time-user');
    expect(res.body.data.token).toBeDefined();

    cleanupUserIds.push(res.body.data.user.id);
  });

  it('2. Existing user with matching neonAuthId signs in successfully', async () => {
    // Call neon-login again with the same token
    const res = await request(app)
      .post('/api/v1/auth/neon-login')
      .send({ sessionToken: 'test-neon-token-reg-first-time-user' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('reg-first-time-user@schooldest.test');
    expect(res.body.data.user.neonAuthId).toBe('neon-auth-reg-first-time-user');
  });

  it('3. Existing email with missing neonAuthId follows safe linking policy and preserves role', async () => {
    // Create an existing user with unlinked neonAuthId (e.g. created via email/password school registration)
    const existingSchoolAdmin = await prisma.user.create({
      data: {
        email: 'unlinked-coordinator@schooldest.test',
        name: 'Unlinked Coordinator',
        role: Role.SCHOOL_ADMIN, // pre-existing administrative school role
        isActive: true,
        emailVerified: true,
        neonAuthId: null,
      },
    });
    cleanupUserIds.push(existingSchoolAdmin.id);

    // Now coordinator logs in with Google/Neon Auth using matching email
    const res = await request(app)
      .post('/api/v1/auth/neon-login')
      .send({ sessionToken: 'test-neon-token-unlinked-coordinator' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.id).toBe(existingSchoolAdmin.id);
    expect(res.body.data.user.email).toBe('unlinked-coordinator@schooldest.test');
    expect(res.body.data.user.neonAuthId).toBe('neon-auth-unlinked-coordinator');
    // Role MUST be preserved as SCHOOL_ADMIN, not downgraded or reset
    expect(res.body.data.user.role).toBe(Role.SCHOOL_ADMIN);

    // Verify in database
    const dbUser = await prisma.user.findUnique({ where: { id: existingSchoolAdmin.id } });
    expect(dbUser?.neonAuthId).toBe('neon-auth-unlinked-coordinator');
    expect(dbUser?.role).toBe(Role.SCHOOL_ADMIN);
  });

  it('4. Existing email linked to a different identity is rejected safely with 409', async () => {
    // Create an existing user with a DIFFERENT neonAuthId
    const existingOtherUser = await prisma.user.create({
      data: {
        email: 'conflicting-identity@schooldest.test',
        name: 'Original Identity Owner',
        role: Role.SCHOOL_STAFF,
        isActive: true,
        emailVerified: true,
        neonAuthId: 'original-neon-identity-id-12345',
      },
    });
    cleanupUserIds.push(existingOtherUser.id);

    // An attacker or different Google account attempts to log in with matching email but differing Neon Auth ID
    const res = await request(app)
      .post('/api/v1/auth/neon-login')
      .send({ sessionToken: 'test-neon-token-conflicting-identity' }); // produces id: 'neon-auth-conflicting-identity'

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('already associated with a different authenticated identity');

    // Verify original user was not overwritten
    const checkDb = await prisma.user.findUnique({ where: { id: existingOtherUser.id } });
    expect(checkDb?.neonAuthId).toBe('original-neon-identity-id-12345');
  });

  it('5. Concurrent first-time logins do not fail or duplicate accounts (P2002 race resolution)', async () => {
    // Fire 5 simultaneous login requests for the same new user
    const token = 'test-neon-token-concurrent-race-user';
    const concurrentRequests = Array.from({ length: 5 }, () =>
      request(app).post('/api/v1/auth/neon-login').send({ sessionToken: token })
    );

    const responses = await Promise.all(concurrentRequests);

    // ALL concurrent requests must succeed (200 OK) without any 500 Unique constraint errors
    for (const res of responses) {
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('concurrent-race-user@schooldest.test');
      expect(res.body.data.user.neonAuthId).toBe('neon-auth-concurrent-race-user');
    }

    // Verify exactly ONE user was created in PostgreSQL
    const createdUsers = await prisma.user.findMany({
      where: { email: 'concurrent-race-user@schooldest.test' },
    });
    expect(createdUsers.length).toBe(1);
    cleanupUserIds.push(createdUsers[0].id);
  });

  it('6. Case-insensitive email matching resolves properly without constraint collision', async () => {
    // Create an existing user with uppercase letters in email
    const mixedCaseUser = await prisma.user.create({
      data: {
        email: 'MixedCaseTeacher@schooldest.test',
        name: 'Mixed Case Teacher',
        role: Role.SCHOOL_STAFF,
        isActive: true,
        emailVerified: true,
        neonAuthId: null,
      },
    });
    cleanupUserIds.push(mixedCaseUser.id);

    // User logs in with lowercase token
    const res = await request(app)
      .post('/api/v1/auth/neon-login')
      .send({ sessionToken: 'test-neon-token-mixedcaseteacher' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.id).toBe(mixedCaseUser.id);
    expect(res.body.data.user.neonAuthId).toBe('neon-auth-mixedcaseteacher');
  });

  it('7. No normal login can auto-link or create a SUPER_ADMIN account', async () => {
    // Create an unprovisioned Super Admin account with no neonAuthId
    const unlinkedAdmin = await prisma.user.create({
      data: {
        email: 'unprovisioned-admin@schooldest.test',
        name: 'Unprovisioned Admin Target',
        role: Role.SUPER_ADMIN,
        isActive: true,
        emailVerified: true,
        neonAuthId: null,
      },
    });
    cleanupUserIds.push(unlinkedAdmin.id);

    // Attempting to log in with matching email MUST be forbidden with 403
    const res = await request(app)
      .post('/api/v1/auth/neon-login')
      .send({ sessionToken: 'test-neon-token-unprovisioned-admin' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Super Administrator accounts cannot be linked automatically');

    // Verify neonAuthId was NOT attached
    const checkAdmin = await prisma.user.findUnique({ where: { id: unlinkedAdmin.id } });
    expect(checkAdmin?.neonAuthId).toBeNull();
  });

  it('8. Suspended accounts are rejected with 403', async () => {
    const suspendedUser = await prisma.user.create({
      data: {
        email: 'suspended-user@schooldest.test',
        name: 'Suspended Teacher',
        role: Role.SCHOOL_STAFF,
        isActive: false, // suspended
        emailVerified: true,
        neonAuthId: 'neon-auth-suspended-user',
      },
    });
    cleanupUserIds.push(suspendedUser.id);

    const res = await request(app)
      .post('/api/v1/auth/neon-login')
      .send({ sessionToken: 'test-neon-token-suspended-user' });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('Account has been suspended');
  });

  it('9. Missing or invalid token is rejected with 400/500 cleanly without leaking DB internals', async () => {
    const resMissing = await request(app).post('/api/v1/auth/neon-login').send({});
    expect(resMissing.status).toBe(400);
    expect(resMissing.body.success).toBe(false);

    const resInvalid = await request(app)
      .post('/api/v1/auth/neon-login')
      .send({ sessionToken: 'invalid-garbage-token-xyz' });
    expect(resInvalid.status).toBeGreaterThanOrEqual(400);
    expect(resInvalid.body.success).toBe(false);
    expect(resInvalid.body.error.message).not.toContain('prisma');
    expect(resInvalid.body.error.message).not.toContain('PostgreSQL');
  });
});
