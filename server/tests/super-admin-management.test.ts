import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { generateToken } from '../src/utils/jwt.js';
import { Role, SuperAdminInvitationStatus } from '@prisma/client';
import { revokeSuperAdminAccess } from '../src/controllers/admin.controller.js';

describe('Super Admin Management System & Security Regression Suite', () => {
  let primarySuperAdmin: any;
  let secondarySuperAdmin: any;
  let schoolStaffUser: any;

  let primarySuperAdminToken: string;
  let secondarySuperAdminToken: string;
  let schoolStaffToken: string;

  const testEmailToInvite = 'invited.admin.test@gmail.com';
  let createdInvitationId: string = '';
  let createdInvitationToken: string = '';

  beforeAll(async () => {
    // 1. Fetch real primary Super Admin or create if missing
    primarySuperAdmin = await prisma.user.findFirst({
      where: { role: Role.SUPER_ADMIN, isActive: true },
    });
    if (!primarySuperAdmin) {
      primarySuperAdmin = await prisma.user.create({
        data: {
          email: 'primary-super-admin@test.com',
          name: 'Primary Super Admin',
          role: Role.SUPER_ADMIN,
          isActive: true,
          emailVerified: true,
        },
      });
    }

    primarySuperAdminToken = generateToken({
      userId: primarySuperAdmin.id,
      email: primarySuperAdmin.email,
      role: primarySuperAdmin.role,
      name: primarySuperAdmin.name,
    });

    // 2. Create secondary Super Admin for revocation testing
    secondarySuperAdmin = await prisma.user.create({
      data: {
        email: 'secondary-super-admin-test@test.com',
        name: 'Secondary Super Admin Test',
        role: Role.SUPER_ADMIN,
        isActive: true,
        emailVerified: true,
      },
    });

    secondarySuperAdminToken = generateToken({
      userId: secondarySuperAdmin.id,
      email: secondarySuperAdmin.email,
      role: secondarySuperAdmin.role,
      name: secondarySuperAdmin.name,
    });

    // 3. Create regular user (SCHOOL_STAFF)
    schoolStaffUser = await prisma.user.create({
      data: {
        email: 'unauthorized-staff-mgmt@test.com',
        name: 'Unauthorized Staff',
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

    // Clean up any stale invitations from previous runs
    await prisma.superAdminInvitation.deleteMany({
      where: {
        email: { in: [testEmailToInvite, 'cancel-test@gmail.com', 'mismatch-test@gmail.com'] },
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.superAdminInvitation.deleteMany({
      where: {
        email: { in: [testEmailToInvite, 'cancel-test@gmail.com', 'mismatch-test@gmail.com'] },
      },
    });
    if (secondarySuperAdmin?.id) {
      await prisma.user.deleteMany({
        where: { id: secondarySuperAdmin.id },
      });
    }
    if (schoolStaffUser?.id) {
      await prisma.user.deleteMany({
        where: { id: schoolStaffUser.id },
      });
    }
  });

  describe('1. Access Control & Authentication Boundaries', () => {
    it('rejects unauthenticated requests to list super admins with 401', async () => {
      const res = await request(app).get('/api/v1/admin/super-admins');
      expect(res.status).toBe(401);
    });

    it('rejects non-admin (SCHOOL_STAFF) requests to list super admins with 403', async () => {
      const res = await request(app)
        .get('/api/v1/admin/super-admins')
        .set('Authorization', `Bearer ${schoolStaffToken}`);
      expect(res.status).toBe(403);
    });

    it('rejects non-admin (SCHOOL_STAFF) requests to invite super admins with 403', async () => {
      const res = await request(app)
        .post('/api/v1/admin/super-admins/invite')
        .set('Authorization', `Bearer ${schoolStaffToken}`)
        .send({ email: 'some.candidate@gmail.com' });
      expect(res.status).toBe(403);
    });

    it('rejects non-admin (SCHOOL_STAFF) requests to revoke super admin with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/super-admins/revoke/${secondarySuperAdmin.id}`)
        .set('Authorization', `Bearer ${schoolStaffToken}`)
        .send({ reason: 'Malicious attempt' });
      expect(res.status).toBe(403);
    });
  });

  describe('2. Listing Super Admins & Invitations', () => {
    it('allows authorized Super Admin to list all admins and invitations', async () => {
      const res = await request(app)
        .get('/api/v1/admin/super-admins')
        .set('Authorization', `Bearer ${primarySuperAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.superAdmins)).toBe(true);
      expect(Array.isArray(res.body.data.invitations)).toBe(true);
      expect(res.body.data.superAdmins.length).toBeGreaterThanOrEqual(2);

      // Verify structure of returned super admin items
      const adminEntry = res.body.data.superAdmins.find((a: any) => a.id === primarySuperAdmin.id);
      expect(adminEntry).toBeDefined();
      expect(adminEntry.email).toBe(primarySuperAdmin.email);
      expect(adminEntry.role).toBe('SUPER_ADMIN');
    });
  });

  describe('3. Invitation Creation & Validation', () => {
    it('rejects invalid or empty email address with 400', async () => {
      const res = await request(app)
        .post('/api/v1/admin/super-admins/invite')
        .set('Authorization', `Bearer ${primarySuperAdminToken}`)
        .send({ email: 'not-an-email' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects inviting an already active Super Admin with 409', async () => {
      const res = await request(app)
        .post('/api/v1/admin/super-admins/invite')
        .set('Authorization', `Bearer ${primarySuperAdminToken}`)
        .send({ email: primarySuperAdmin.email });

      expect(res.status).toBe(409);
      const errMsg = res.body.error?.message || res.body.message;
      expect(errMsg).toMatch(/active Super Administrator/i);
    });

    it('creates a pending invitation with secure token and 7-day expiration', async () => {
      const res = await request(app)
        .post('/api/v1/admin/super-admins/invite')
        .set('Authorization', `Bearer ${primarySuperAdminToken}`)
        .send({
          email: `  ${testEmailToInvite.toUpperCase()}  `, // Test normalization
          notes: 'Test candidate for platform administration',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.email).toBe(testEmailToInvite.toLowerCase());
      expect(res.body.data.status).toBe(SuperAdminInvitationStatus.PENDING);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.inviteUrl).toContain(res.body.data.token);

      createdInvitationId = res.body.data.id;
      createdInvitationToken = res.body.data.token;

      // Verify expiration is ~7 days in future
      const expiresAt = new Date(res.body.data.expiresAt).getTime();
      const expectedMin = Date.now() + 6 * 24 * 60 * 60 * 1000;
      expect(expiresAt).toBeGreaterThan(expectedMin);
    });

    it('rejects duplicate pending invitation for the same email with 409', async () => {
      const res = await request(app)
        .post('/api/v1/admin/super-admins/invite')
        .set('Authorization', `Bearer ${primarySuperAdminToken}`)
        .send({ email: testEmailToInvite });

      expect(res.status).toBe(409);
      const errMsg = res.body.error?.message || res.body.message;
      expect(errMsg).toMatch(/already exists/i);
    });

    it('publicly validates a valid invitation token', async () => {
      const res = await request(app)
        .get(`/api/v1/auth/super-admin-invitation/validate/${createdInvitationToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testEmailToInvite.toLowerCase());
      expect(res.body.data.invitedBy).toBe(primarySuperAdmin.name);
      expect(res.body.data.isValid).toBe(true);
    });

    it('rejects validation of non-existent token with 404', async () => {
      const res = await request(app)
        .get('/api/v1/auth/super-admin-invitation/validate/nonexistenttoken123');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. Invitation Cancellation Flow', () => {
    let cancelInviteToken: string;
    let cancelInviteId: string;

    it('allows authorized Super Admin to cancel a pending invitation', async () => {
      // Create a separate invitation to cancel
      const createRes = await request(app)
        .post('/api/v1/admin/super-admins/invite')
        .set('Authorization', `Bearer ${primarySuperAdminToken}`)
        .send({ email: 'cancel-test@gmail.com', notes: 'Will be cancelled' });

      expect(createRes.status).toBe(201);
      cancelInviteToken = createRes.body.data.token;
      cancelInviteId = createRes.body.data.id;

      // Cancel the invitation
      const cancelRes = await request(app)
        .post(`/api/v1/admin/super-admins/invitations/${cancelInviteId}/cancel`)
        .set('Authorization', `Bearer ${primarySuperAdminToken}`)
        .send({ reason: 'Position no longer needed' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.success).toBe(true);
      expect(cancelRes.body.data.status).toBe(SuperAdminInvitationStatus.CANCELLED);

      // Verify validation now returns isValid: false
      const valRes = await request(app)
        .get(`/api/v1/auth/super-admin-invitation/validate/${cancelInviteToken}`);
      expect(valRes.status).toBe(200);
      expect(valRes.body.data.isValid).toBe(false);
      expect(valRes.body.data.status).toBe('CANCELLED');
    });
  });

  describe('5. Invitation Acceptance & Identity Binding', () => {
    it('rejects acceptance if authenticated user email does not match invited email', async () => {
      // Attempt to accept with secondarySuperAdmin whose email doesn't match invited email
      const res = await request(app)
        .post('/api/v1/auth/super-admin-invitation/accept')
        .set('Authorization', `Bearer ${secondarySuperAdminToken}`)
        .send({ token: createdInvitationToken });

      expect(res.status).toBe(403);
      const errMsg = res.body.error?.message || res.body.message;
      expect(errMsg).toMatch(/does not match/i);
    });

    it('accepts invitation and grants SUPER_ADMIN role when authenticated identity matches', async () => {
      // Create a candidate user with the invited email
      let invitedCandidateUser = await prisma.user.findUnique({
        where: { email: testEmailToInvite.toLowerCase() },
      });
      if (!invitedCandidateUser) {
        invitedCandidateUser = await prisma.user.create({
          data: {
            email: testEmailToInvite.toLowerCase(),
            name: 'Invited Google Candidate',
            role: Role.SCHOOL_STAFF, // Initially standard role
            isActive: true,
            emailVerified: true,
          },
        });
      }

      const candidateToken = generateToken({
        userId: invitedCandidateUser.id,
        email: invitedCandidateUser.email,
        role: invitedCandidateUser.role,
        name: invitedCandidateUser.name,
      });

      // Accept invitation
      const acceptRes = await request(app)
        .post('/api/v1/auth/super-admin-invitation/accept')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ token: createdInvitationToken });

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.success).toBe(true);
      expect(acceptRes.body.data.user.role).toBe(Role.SUPER_ADMIN);
      expect(acceptRes.body.data.token).toBeDefined();

      // Verify in database
      const dbUser = await prisma.user.findUnique({
        where: { email: testEmailToInvite.toLowerCase() },
      });
      expect(dbUser?.role).toBe(Role.SUPER_ADMIN);

      const dbInvitation = await prisma.superAdminInvitation.findUnique({
        where: { id: createdInvitationId },
      });
      expect(dbInvitation?.status).toBe(SuperAdminInvitationStatus.ACCEPTED);
      expect(dbInvitation?.acceptedById).toBe(invitedCandidateUser.id);
    });

    it('rejects replay / already accepted invitation', async () => {
      const candidateUser = await prisma.user.findUnique({
        where: { email: testEmailToInvite.toLowerCase() },
      });
      const candidateToken = generateToken({
        userId: candidateUser!.id,
        email: candidateUser!.email,
        role: candidateUser!.role,
        name: candidateUser!.name,
      });

      const res = await request(app)
        .post('/api/v1/auth/super-admin-invitation/accept')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ token: createdInvitationToken });

      expect(res.status).toBe(400);
      const errMsg = res.body.error?.message || res.body.message;
      expect(errMsg).toMatch(/no longer active/i);
    });
  });

  describe('6. Revocation Safety & Sole Admin Protection', () => {
    it('prevents self-revocation with 400', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/super-admins/revoke/${primarySuperAdmin.id}`)
        .set('Authorization', `Bearer ${primarySuperAdminToken}`)
        .send({ reason: 'Self revocation attempt' });

      expect(res.status).toBe(400);
      const errMsg = res.body.error?.message || res.body.message;
      expect(errMsg).toMatch(/self-revocation is strictly prohibited/i);
    });

    it('successfully revokes a secondary Super Admin access without deleting user account', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/super-admins/revoke/${secondarySuperAdmin.id}`)
        .set('Authorization', `Bearer ${primarySuperAdminToken}`)
        .send({ reason: 'Routine access decommission' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).not.toBe(Role.SUPER_ADMIN);

      // Verify the user still exists in DB
      const dbUser = await prisma.user.findUnique({
        where: { id: secondarySuperAdmin.id },
      });
      expect(dbUser).toBeDefined();
      expect(dbUser?.id).toBe(secondarySuperAdmin.id);
      expect(dbUser?.role).toBe(Role.SCHOOL_STAFF); // safely demoted
    });

    it('prevents revoking the last remaining active Super Admin', async () => {
      // Demote candidate user so only primarySuperAdmin is left as super admin
      await prisma.user.updateMany({
        where: { email: testEmailToInvite.toLowerCase() },
        data: { role: Role.SCHOOL_STAFF },
      });

      // Directly verify the controller safety invariant when activeAdminCount <= 1
      let caughtError: any = null;
      const mockReq: any = {
        params: { id: 'some-target-id' },
        user: { userId: 'different-actor-id', email: 'actor@admin.com' },
        body: {},
      };
      const mockRes: any = {
        json: () => {},
      };
      const mockNext = (err: any) => {
        caughtError = err;
      };

      // Set target user mock in DB or verify logic
      // In database, if primarySuperAdmin is the only one, target user having SUPER_ADMIN role with activeCount <= 1
      // We can create a non-self target to test the controller's activeAdminCount <= 1 check
      const dummyTargetAdmin = await prisma.user.create({
        data: {
          email: 'dummy-target-admin@test.com',
          name: 'Dummy Target Admin',
          role: Role.SUPER_ADMIN,
          isActive: false, // inactive, so active count is not affected
        },
      });

      mockReq.params.id = dummyTargetAdmin.id;
      // Inactive user has role SUPER_ADMIN. Let's test revoke on it:
      await revokeSuperAdminAccess(mockReq, mockRes, mockNext);

      expect(caughtError).toBeDefined();
      expect(caughtError.message).toMatch(/sole remaining active Super Administrator/i);

      // Clean up dummy
      await prisma.user.deleteMany({ where: { id: dummyTargetAdmin.id } });
    });
  });

  describe('7. Audit Logging Verification', () => {
    it('verifies persistent audit records were created for all administrative actions', async () => {
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          action: {
            in: [
              'SUPER_ADMIN_INVITATION_CREATED',
              'SUPER_ADMIN_INVITATION_CANCELLED',
              'SUPER_ADMIN_INVITATION_ACCEPTED',
              'SUPER_ADMIN_PRIVILEGE_REVOKED',
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(auditLogs.length).toBeGreaterThanOrEqual(4);

      const createdLog = auditLogs.find((l) => l.action === 'SUPER_ADMIN_INVITATION_CREATED');
      expect(createdLog).toBeDefined();
      expect(createdLog?.userId).toBe(primarySuperAdmin.id);

      const cancelledLog = auditLogs.find((l) => l.action === 'SUPER_ADMIN_INVITATION_CANCELLED');
      expect(cancelledLog).toBeDefined();

      const acceptedLog = auditLogs.find((l) => l.action === 'SUPER_ADMIN_INVITATION_ACCEPTED');
      expect(acceptedLog).toBeDefined();

      const revokedLog = auditLogs.find((l) => l.action === 'SUPER_ADMIN_PRIVILEGE_REVOKED');
      expect(revokedLog).toBeDefined();
    });
  });
});
