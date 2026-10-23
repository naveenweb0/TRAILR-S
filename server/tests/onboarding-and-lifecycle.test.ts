import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { generateToken } from '../src/utils/jwt.js';
import { Role, VerificationStatus, DestinationStatus } from '@prisma/client';

describe('PRIORITIES 2, 3, 4 & 5: School & Destination Onboarding and Admin Approval Lifecycle', () => {
  let superAdminUser: any;
  let superAdminToken: string;

  let schoolUser: any;
  let schoolToken: string;
  let createdSchoolId: string;

  let destUser: any;
  let destToken: string;
  let createdDestId: string;

  beforeAll(async () => {
    // 1. Fetch provisioned Super Admin
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

    // 2. Create isolated new user for School Onboarding
    schoolUser = await prisma.user.create({
      data: {
        email: 'test-school-principal@schooldest.com',
        name: 'Principal Sharma',
        role: Role.SCHOOL_STAFF,
        isActive: true,
        emailVerified: true,
      },
    });

    schoolToken = generateToken({
      userId: schoolUser.id,
      email: schoolUser.email,
      role: schoolUser.role,
      name: schoolUser.name,
    });

    // 3. Create isolated new user for Destination Onboarding
    destUser = await prisma.user.create({
      data: {
        email: 'test-dest-partner@schooldest.com',
        name: 'Park Director Mehta',
        role: Role.SCHOOL_STAFF, // Fresh user before onboarding
        isActive: true,
        emailVerified: true,
      },
    });

    destToken = generateToken({
      userId: destUser.id,
      email: destUser.email,
      role: destUser.role,
      name: destUser.name,
    });
  });

  afterAll(async () => {
    // Safe isolated cleanup of test entities
    if (createdSchoolId) {
      await prisma.schoolStaff.deleteMany({ where: { schoolId: createdSchoolId } });
      await prisma.school.deleteMany({ where: { id: createdSchoolId } });
    }
    if (createdDestId) {
      await prisma.destinationImage.deleteMany({ where: { destinationId: createdDestId } });
      await prisma.ticketType.deleteMany({ where: { destinationId: createdDestId } });
      await prisma.destinationStaff.deleteMany({ where: { destinationId: createdDestId } });
      await prisma.destination.deleteMany({ where: { id: createdDestId } });
    }
    if (schoolUser) {
      await prisma.user.deleteMany({ where: { id: schoolUser.id } });
    }
    if (destUser) {
      await prisma.user.deleteMany({ where: { id: destUser.id } });
    }
  });

  describe('Priority 2: School Onboarding Flow', () => {
    it('1. Before onboarding, status endpoint reports NOT_STARTED', async () => {
      const res = await request(app)
        .get('/api/v1/school/onboarding-status')
        .set('Authorization', `Bearer ${schoolToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isOnboarded).toBe(false);
      expect(res.body.data.status).toBe('NOT_STARTED');
    });

    it('2. Rejects submission with missing required fields (e.g. missing officialEmail)', async () => {
      const res = await request(app)
        .post('/api/v1/school/onboard')
        .set('Authorization', `Bearer ${schoolToken}`)
        .send({
          name: 'Delhi Heritage Public School',
          city: 'New Delhi',
          // officialEmail missing
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('3. Successfully registers school with PENDING verification status and links user transactionally', async () => {
      const res = await request(app)
        .post('/api/v1/school/onboard')
        .set('Authorization', `Bearer ${schoolToken}`)
        .send({
          name: 'Delhi Heritage Public School',
          board: 'CBSE',
          schoolType: 'Private Day School',
          address: 'Sector 14, Phase 2, Dwarka',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110078',
          officialEmail: 'info@delhiheritage.edu.in',
          contactPhone: '+91 98111 22334',
          contactPerson: 'Principal Sharma',
          designation: 'Principal',
          approximateStrength: 2800,
          website: 'https://delhiheritage.edu.in',
          gstNumber: '07AAAAA0000A1Z5',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.school).toBeDefined();
      expect(res.body.data.school.verificationStatus).toBe(VerificationStatus.PENDING);
      expect(res.body.data.user.role).toBe(Role.SCHOOL_ADMIN);

      createdSchoolId = res.body.data.school.id;

      // Verify database record
      const dbSchool = await prisma.school.findUnique({
        where: { id: createdSchoolId },
        include: { staff: true },
      });
      expect(dbSchool).toBeDefined();
      expect(dbSchool!.verificationStatus).toBe(VerificationStatus.PENDING);
      expect(dbSchool!.staff.length).toBe(1);
      expect(dbSchool!.staff[0].userId).toBe(schoolUser.id);
      expect(dbSchool!.staff[0].role).toBe('ADMIN');
    });

    it('4. Subsequent call prevents duplicate school creation and returns existing record', async () => {
      const res = await request(app)
        .post('/api/v1/school/onboard')
        .set('Authorization', `Bearer ${schoolToken}`)
        .send({
          name: 'Duplicate Attempt School',
          officialEmail: 'duplicate@test.edu.in',
          contactPhone: '+91 98111 22334',
          contactPerson: 'Principal Sharma',
          address: 'Anywhere',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isExisting).toBe(true);
      expect(res.body.data.school.id).toBe(createdSchoolId);
    });

    it('5. Status endpoint reports isOnboarded: true and status: PENDING', async () => {
      const res = await request(app)
        .get('/api/v1/school/onboarding-status')
        .set('Authorization', `Bearer ${schoolToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isOnboarded).toBe(true);
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.school.id).toBe(createdSchoolId);
    });
  });

  describe('Priorities 3 & 4: Destination Onboarding & Cloudinary Image Metadata', () => {
    it('1. Before onboarding, destination status endpoint reports NOT_STARTED', async () => {
      const res = await request(app)
        .get('/api/v1/destinations/me/onboarding-status')
        .set('Authorization', `Bearer ${destToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isOnboarded).toBe(false);
      expect(res.body.data.status).toBe('NOT_STARTED');
    });

    it('2. Successfully creates destination proposal with PENDING_APPROVAL and Cloudinary image metadata', async () => {
      const res = await request(app)
        .post('/api/v1/destinations/onboard')
        .set('Authorization', `Bearer ${destToken}`)
        .send({
          name: 'WonderSplash Adventure Waterpark',
          category: 'Waterpark',
          businessName: 'WonderSplash Entertainment LLP',
          officialEmail: 'partnerships@wondersplash.com',
          contactPhone: '+91 98222 33445',
          managerName: 'Park Director Mehta',
          googleProfile: 'https://maps.google.com/?cid=123456789',
          description: 'A 25-acre international standard aquatic theme park with specialized educational hydrology tours.',
          address: 'NH-48, KM Stone 62',
          city: 'Gurugram',
          state: 'Haryana',
          pincode: '122001',
          openingTime: '10:00',
          closingTime: '18:30',
          minGroupSize: '25',
          maxGroupSize: '1200',
          bookingLeadDays: '3',
          studentTicketPrice: '499',
          teacherTicketPrice: '299',
          complimentaryStaffRatio: '15',
          safetyInfo: 'Trained life-guards on duty; on-site emergency ICU ambulance.',
          accessibilityInfo: 'All pools have shallow zero-entry wheelchair ramps.',
          images: [
            {
              url: 'https://res.cloudinary.com/fzwn0nve/image/upload/v1729600000/schooldest/proposals/wave_pool.jpg',
              publicId: 'schooldest/proposals/wave_pool',
              caption: 'Mega Wave Pool & Student Activity Zone',
              isCover: true,
              sortOrder: 0,
            },
            {
              url: 'https://res.cloudinary.com/fzwn0nve/image/upload/v1729600000/schooldest/proposals/water_slides.jpg',
              publicId: 'schooldest/proposals/water_slides',
              caption: 'Multi-lane Racer Slides',
              isCover: false,
              sortOrder: 1,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.destination).toBeDefined();
      expect(res.body.data.destination.status).toBe(DestinationStatus.PENDING_APPROVAL);
      expect(res.body.data.destination.isVerified).toBe(false);
      expect(res.body.data.user.role).toBe(Role.DESTINATION_MANAGER);

      createdDestId = res.body.data.destination.id;

      // Verify database records
      const dbDest = await prisma.destination.findUnique({
        where: { id: createdDestId },
        include: {
          images: true,
          ticketTypes: true,
          staff: true,
        },
      });

      expect(dbDest).toBeDefined();
      expect(dbDest!.status).toBe(DestinationStatus.PENDING_APPROVAL);
      expect(dbDest!.staff.length).toBe(1);
      expect(dbDest!.staff[0].userId).toBe(destUser.id);
      expect(dbDest!.staff[0].role).toBe('MANAGER');

      // Verify Cloudinary images persisted in database
      expect(dbDest!.images.length).toBe(2);
      const coverImage = dbDest!.images.find((img) => img.isCover);
      expect(coverImage).toBeDefined();
      expect(coverImage!.publicId).toBe('schooldest/proposals/wave_pool');

      // Verify ticket types
      expect(dbDest!.ticketTypes.length).toBe(2);
      const studentTicket = dbDest!.ticketTypes.find((t) => t.category === 'STUDENT');
      expect(studentTicket).toBeDefined();
      expect(studentTicket!.basePrice).toBe(499);
      expect(studentTicket!.complimentaryStaffRatio).toBe(15);
    });

    it('3. Subsequent call prevents duplicate proposal creation and returns existing record', async () => {
      const res = await request(app)
        .post('/api/v1/destinations/onboard')
        .set('Authorization', `Bearer ${destToken}`)
        .send({
          name: 'Duplicate Venue',
          category: 'Waterpark',
          businessName: 'Another Business',
          officialEmail: 'another@test.com',
          contactPhone: '+91 99999 88888',
          managerName: 'Mehta',
          description: 'A duplicate test venue.',
          address: 'Road',
          city: 'City',
          state: 'State',
          pincode: '123456',
          studentTicketPrice: '500',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isExisting).toBe(true);
      expect(res.body.data.destination.id).toBe(createdDestId);
    });

    it('4. Destination status endpoint reports isOnboarded: true and status: PENDING_APPROVAL', async () => {
      const res = await request(app)
        .get('/api/v1/destinations/me/onboarding-status')
        .set('Authorization', `Bearer ${destToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isOnboarded).toBe(true);
      expect(res.body.data.status).toBe('PENDING_APPROVAL');
      expect(res.body.data.destination.id).toBe(createdDestId);
    });
  });

  describe('Priority 5: Super Admin Portal Management & Status Approvals', () => {
    it('1. Super Admin can view the pending school in listAllSchools', async () => {
      const res = await request(app)
        .get('/api/v1/admin/schools')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const school = res.body.data.find((s: any) => s.id === createdSchoolId);
      expect(school).toBeDefined();
      expect(school.verificationStatus).toBe('PENDING');
    });

    it('2. Super Admin can approve school verification to VERIFIED', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/schools/${createdSchoolId}/verification`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          verificationStatus: 'VERIFIED',
          verificationNotes: 'Official CBSE affiliation number and campus verified by admin.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.verificationStatus).toBe('VERIFIED');

      // Verify in DB
      const dbSchool = await prisma.school.findUnique({ where: { id: createdSchoolId } });
      expect(dbSchool!.verificationStatus).toBe('VERIFIED');
    });

    it('3. Super Admin can view the pending destination proposal in listAllDestinations', async () => {
      const res = await request(app)
        .get('/api/v1/admin/destinations')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const dest = res.body.data.find((d: any) => d.id === createdDestId);
      expect(dest).toBeDefined();
      expect(dest.status).toBe('PENDING_APPROVAL');
    });

    it('4. Super Admin can approve and publish destination (sets PUBLISHED and isVerified: true)', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/destinations/${createdDestId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          status: 'PUBLISHED',
          isVerified: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PUBLISHED');
      expect(res.body.data.isVerified).toBe(true);

      // Verify in DB
      const dbDest = await prisma.destination.findUnique({ where: { id: createdDestId } });
      expect(dbDest!.status).toBe('PUBLISHED');
      expect(dbDest!.isVerified).toBe(true);
    });

    it('5. Audit log correctly recorded both administrative actions', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const schoolLog = res.body.data.find((l: any) => l.action === 'SCHOOL_VERIFICATION_UPDATED' && l.entityId === createdSchoolId);
      const destLog = res.body.data.find((l: any) => l.action === 'DESTINATION_STATUS_UPDATED' && l.entityId === createdDestId);

      expect(schoolLog).toBeDefined();
      expect(destLog).toBeDefined();
    });
  });
});
