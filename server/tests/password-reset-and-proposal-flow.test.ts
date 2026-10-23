import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { generateToken } from '../src/utils/jwt.js';

describe('SCHOOLDEST — Password Recovery & Proposal Decision Workflow Tests', () => {
  let superAdminUser: any;
  let superAdminToken: string;

  let testPasswordUser: any;
  let resetTokenReceived: string;

  let destManagerUser: any;
  let destManagerToken: string;
  let testDestination: any;

  beforeAll(async () => {
    // 1. Fetch or create Super Admin
    superAdminUser = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN', isActive: true },
    });

    if (!superAdminUser) {
      superAdminUser = await prisma.user.create({
        data: {
          email: 'admin.workflow.test@schooldest.com',
          name: 'Super Admin Workflow Test',
          role: 'SUPER_ADMIN',
          neonAuthId: 'test-admin-neon-workflow',
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

    // 2. Create a test user with a password for recovery tests
    const hashedPassword = await bcrypt.hash('InitialPassword123!', 10);
    testPasswordUser = await prisma.user.create({
      data: {
        email: `pwd.reset.test.${Date.now()}@schooldest.com`,
        name: 'Password Reset Tester',
        role: 'SCHOOL_STAFF',
        passwordHash: hashedPassword,
        isActive: true,
        emailVerified: true,
      },
    });

    // 3. Create a Destination Manager
    destManagerUser = await prisma.user.create({
      data: {
        email: `manager.proposal.${Date.now()}@schooldest.com`,
        name: 'Venue Proposal Manager',
        role: 'DESTINATION_MANAGER',
        isActive: true,
        emailVerified: true,
      },
    });

    destManagerToken = generateToken({
      userId: destManagerUser.id,
      email: destManagerUser.email,
      role: destManagerUser.role,
      name: destManagerUser.name,
    });
  });

  afterAll(async () => {
    // Clean up test data
    try {
      if (testDestination?.id) {
        await prisma.notification.deleteMany({
          where: { userId: destManagerUser.id },
        });
        await prisma.destinationStaff.deleteMany({
          where: { destinationId: testDestination.id },
        });
        await prisma.destination.delete({
          where: { id: testDestination.id },
        });
      }

      if (destManagerUser?.id) {
        await prisma.user.delete({ where: { id: destManagerUser.id } }).catch(() => {});
      }

      if (testPasswordUser?.id) {
        await prisma.user.delete({ where: { id: testPasswordUser.id } }).catch(() => {});
      }
    } catch (e) {
      console.warn('Cleanup warning:', e);
    }
  });

  describe('PHASE 2: Password Recovery Flow', () => {
    it('should return neutral success message for non-existent email without leaking user presence', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent.user.123456@schooldest.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('If an account exists');
    });

    it('should return resetToken for an existing password account in test environment', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testPasswordUser.email });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      resetTokenReceived = res.body.resetToken || res.body.data?.resetToken;
      expect(resetTokenReceived).toBeDefined();
    });

    it('should reject reset password with an invalid or tampered token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'invalid-tampered-token-123',
          newPassword: 'BrandNewSecurePassword123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.message).toContain('invalid or has expired');
    });

    it('should reject reset password if new password is too short (< 8 chars)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetTokenReceived,
          newPassword: 'short',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.message).toContain('at least 8 characters');
    });

    it('should successfully update password with valid token and allow subsequent password login', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetTokenReceived,
          newPassword: 'BrandNewSecurePassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('successfully');

      // Verify that user can sign in with new password
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testPasswordUser.email,
          password: 'BrandNewSecurePassword123!',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.data?.token).toBeDefined();
    });
  });

  describe('PHASE 4: Destination Proposal Submission & Super Admin Decision Processing', () => {
    it('should allow destination manager to submit onboarding proposal with PENDING_APPROVAL status', async () => {
      const slug = `aqua-kingdom-test-${Date.now()}`;
      testDestination = await prisma.destination.create({
        data: {
          name: 'Aqua Kingdom Adventure',
          businessName: 'Aqua Kingdom Adventures Pvt Ltd',
          slug,
          category: 'Amusement & Waterpark',
          description: 'Premier water and splash theme park for educational groups.',
          address: 'Sector 32, Chandigarh Road',
          city: 'Ludhiana',
          state: 'Punjab',
          pincode: '141001',
          officialEmail: 'info@aquakingdomtest.com',
          contactPhone: '+91 98765 43210',
          managerName: destManagerUser.name,
          status: 'PENDING_APPROVAL',
          isVerified: false,
          staff: {
            create: {
              userId: destManagerUser.id,
              role: 'MANAGER',
            },
          },
        },
      });

      expect(testDestination.id).toBeDefined();
      expect(testDestination.status).toBe('PENDING_APPROVAL');
    });

    it('should reflect pending destination proposal in Super Admin overview metrics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data?.destinations?.pendingApproval).toBeGreaterThanOrEqual(1);
    });

    it('should allow Super Admin to request changes with actionable feedback notes', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/destinations/${testDestination.id}/proposal-decision`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          decision: 'CHANGES_REQUESTED',
          notes: 'Please upload at least 4 photos and provide teacher complimentary ratio.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data?.status).toBe('DRAFT');

      // Verify notification created for manager
      const notifications = await prisma.notification.findMany({
        where: { userId: destManagerUser.id },
      });

      expect(notifications.length).toBeGreaterThanOrEqual(1);
      const revisionNotice = notifications.find((n) => n.title.includes('Changes Requested'));
      expect(revisionNotice).toBeDefined();
      expect(revisionNotice?.message).toContain('Please upload at least 4 photos');
    });

    it('should allow Super Admin to approve proposal and publish destination live', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/destinations/${testDestination.id}/proposal-decision`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          decision: 'APPROVED',
          notes: 'All compliance verified.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data?.status).toBe('PUBLISHED');
      expect(res.body.data?.isVerified).toBe(true);

      // Verify approval notification created for manager
      const notifications = await prisma.notification.findMany({
        where: { userId: destManagerUser.id },
      });

      const approvalNotice = notifications.find((n) => n.title.includes('Approved'));
      expect(approvalNotice).toBeDefined();
    });
  });
});
