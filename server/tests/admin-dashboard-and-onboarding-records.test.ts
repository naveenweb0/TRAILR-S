import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { generateToken } from '../src/utils/jwt.js';
import { Role, DestinationStatus, VerificationStatus, BookingStatus, TravellerStatus } from '@prisma/client';

describe('SCHOOLDEST — Admin Dashboard & Complete Onboarding Records Suite', () => {
  let superAdminUser: any;
  let superAdminToken: string;
  let unauthorizedToken: string;

  // Test records
  let testSchool: any;
  let testDestination: any;
  let testBooking: any;
  let testTravellerRequest: any;

  beforeAll(async () => {
    // 1. Resolve Super Admin
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

    // 2. Generate unauthorized token (SCHOOL_STAFF) from real user in DB
    const schoolStaffUser = await prisma.user.create({
      data: {
        email: `staff-unauth-${Date.now()}@testschool.edu.in`,
        name: 'Unauthorized School Staff',
        role: Role.SCHOOL_STAFF,
        isActive: true,
        emailVerified: true,
      },
    });

    unauthorizedToken = generateToken({
      userId: schoolStaffUser.id,
      email: schoolStaffUser.email,
      role: schoolStaffUser.role,
      name: schoolStaffUser.name,
    });

    // 3. Create test school record
    testSchool = await prisma.school.create({
      data: {
        name: 'Test Cambridge International School',
        board: 'Cambridge',
        schoolType: 'Private Day School',
        address: '100 Knowledge Boulevard, Sector 62',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201309',
        officialEmail: `cambridge-${Date.now()}@testschool.edu.in`,
        contactPhone: '+91 98765 43210',
        contactPerson: 'Dr. Arvinder Singh',
        designation: 'Excursion Dean',
        approximateStrength: 2400,
        website: 'https://cambridgetest.edu.in',
        verificationStatus: VerificationStatus.PENDING,
        verificationNotes: 'Pending board certificate review.',
      },
    });

    // 4. Create test destination proposal record
    testDestination = await prisma.destination.create({
      data: {
        name: 'Super Aqua Adventure Hub',
        businessName: 'Aqua Adventure Holidays LLP',
        slug: `super-aqua-${Date.now()}`,
        category: 'Amusement & Waterpark',
        description: 'World-class water slides and educational physics park.',
        address: 'Mile 42, Grand Trunk Expressway',
        city: 'Gurugram',
        state: 'Haryana',
        pincode: '122001',
        officialEmail: `aqua-${Date.now()}@adventurehub.com`,
        contactPhone: '+91 99999 11111',
        managerName: 'Rajesh Mehra',
        status: DestinationStatus.PENDING_APPROVAL,
        isVerified: false,
        openingTime: '09:00',
        closingTime: '18:30',
        weeklyOperatingDays: 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
        minGroupSize: 30,
        maxGroupSize: 1800,
        ticketTypes: {
          create: [
            {
              name: 'Student Day Pass',
              category: 'STUDENT',
              basePrice: 450,
              minQuantity: 20,
              maxQuantity: 1500,
            },
            {
              name: 'Teacher Pass',
              category: 'TEACHER',
              basePrice: 300,
              minQuantity: 1,
              maxQuantity: 100,
            },
          ],
        },
        images: {
          create: [
            {
              url: 'https://res.cloudinary.com/schooldest/image/upload/v1/test_cover.jpg',
              caption: 'Wave pool and adventure slides',
              isCover: true,
            },
          ],
        },
      },
      include: {
        images: true,
        ticketTypes: true,
      },
    });

    // 5. Create test booking
    const bookingRef = `SCH-TEST-${Date.now().toString().slice(-6)}`;
    testBooking = await prisma.booking.create({
      data: {
        bookingReference: bookingRef,
        schoolId: testSchool.id,
        destinationId: testDestination.id,
        createdById: superAdminUser.id,
        visitDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        studentCount: 85,
        teacherCount: 5,
        totalGroupSize: 90,
        originalQuoteAmount: 450 * 85 + 300 * 5,
        confirmedQuoteAmount: 450 * 85 + 300 * 5,
        status: BookingStatus.ACCEPTED,
        requiresTransport: true,
        priceItems: {
          create: [
            {
              description: 'Student Admission Pass',
              category: 'TICKET',
              unitPrice: 450,
              quantity: 85,
              totalPrice: 38250,
            },
            {
              description: 'Teacher Admission Pass',
              category: 'TICKET',
              unitPrice: 300,
              quantity: 5,
              totalPrice: 1500,
            },
          ],
        },
        statusHistory: {
          create: [
            {
              fromStatus: BookingStatus.SUBMITTED,
              toStatus: BookingStatus.ACCEPTED,
              reason: 'Proposal confirmed and reserved.',
              changedByUserId: superAdminUser.id,
            },
          ],
        },
      },
    });

    // 6. Create test traveller request linked to the booking
    testTravellerRequest = await prisma.travellerServiceRequest.create({
      data: {
        schoolId: testSchool.id,
        destinationId: testDestination.id,
        bookingId: testBooking.id,
        passengerCount: 90,
        preferredVehicle: 'Deluxe AC Coach 45-Seater (2 Buses)',
        pickupAddress: testSchool.address,
        pickupCity: testSchool.city,
        pickupTime: '06:30 AM',
        status: TravellerStatus.NEW,
        quoteAmount: 24000,
        acPreference: 'AC',
      },
    });
  });

  afterAll(async () => {
    // Clean up test records
    if (testTravellerRequest?.id) {
      await prisma.travellerServiceRequest.deleteMany({ where: { id: testTravellerRequest.id } });
    }
    if (testBooking?.id) {
      await prisma.bookingPriceItem.deleteMany({ where: { bookingId: testBooking.id } });
      await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: testBooking.id } });
      await prisma.booking.deleteMany({ where: { id: testBooking.id } });
    }
    if (testDestination?.id) {
      await prisma.destinationImage.deleteMany({ where: { destinationId: testDestination.id } });
      await prisma.ticketType.deleteMany({ where: { destinationId: testDestination.id } });
      await prisma.auditLog.deleteMany({ where: { entityId: testDestination.id } });
      await prisma.destination.deleteMany({ where: { id: testDestination.id } });
    }
    if (testSchool?.id) {
      await prisma.auditLog.deleteMany({ where: { entityId: testSchool.id } });
      await prisma.school.deleteMany({ where: { id: testSchool.id } });
    }
  });

  // TEST 1: Accurate Dashboard Counts & Metrics
  it('1. GET /api/v1/admin/overview returns authoritative Neon PostgreSQL counts with documented status rules', async () => {
    const res = await request(app)
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { destinations, schools, bookings, traveller, totalEstimatedValue } = res.body.data;

    // Destinations: distinguishes total, published, pendingApproval, draft
    expect(destinations).toBeDefined();
    expect(typeof destinations.total).toBe('number');
    expect(typeof destinations.published).toBe('number');
    expect(typeof destinations.pendingApproval).toBe('number');
    expect(destinations.total).toBeGreaterThanOrEqual(destinations.published);

    // Schools: distinguishes total and verified
    expect(schools).toBeDefined();
    expect(typeof schools.total).toBe('number');
    expect(typeof schools.verified).toBe('number');

    // Bookings: distinguishes total and accepted
    expect(bookings).toBeDefined();
    expect(typeof bookings.total).toBe('number');
    expect(typeof bookings.accepted).toBe('number');

    // Traveller: distinguishes total and new
    expect(traveller).toBeDefined();
    expect(typeof traveller.total).toBe('number');
    expect(typeof traveller.new).toBe('number');

    // Gross Booking Value
    expect(typeof totalEstimatedValue).toBe('number');
    expect(totalEstimatedValue).toBeGreaterThanOrEqual(0);
  });

  // TEST 2: Complete Destination Records & Persisted Onboarding Data
  it('2. GET /api/v1/admin/destinations/:id returns complete destination record with UUID, managers, tickets, gallery, bookings, and auditLogs', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/destinations/${testDestination.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const dest = res.body.data;
    expect(dest.id).toBe(testDestination.id);
    expect(dest.name).toBe('Super Aqua Adventure Hub');
    expect(dest.category).toBe('Amusement & Waterpark');
    expect(dest.city).toBe('Gurugram');
    expect(dest.state).toBe('Haryana');
    expect(dest.pincode).toBe('122001');
    expect(dest.managerName).toBe('Rajesh Mehra');
    expect(dest.status).toBe('PENDING_APPROVAL');
    expect(dest.isVerified).toBe(false);

    // Timestamps
    expect(dest.createdAt).toBeDefined();
    expect(dest.updatedAt).toBeDefined();

    // Relations
    expect(Array.isArray(dest.ticketTypes)).toBe(true);
    expect(dest.ticketTypes.length).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(dest.images)).toBe(true);
    expect(dest.images[0].url).toContain('cloudinary');

    // Audit logs & bookings array included for complete timeline
    expect(Array.isArray(dest.auditLogs)).toBe(true);
    expect(Array.isArray(dest.bookings)).toBe(true);
  });

  // TEST 3: Actionable Pending Proposal — Request Changes Workflow
  it('3. PUT /api/v1/admin/destinations/:id/proposal-decision can request changes with review notes', async () => {
    const feedbackNotes = 'Please verify local municipal fire clearance and upload 2 additional photos.';
    const res = await request(app)
      .put(`/api/v1/admin/destinations/${testDestination.id}/proposal-decision`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        decision: 'CHANGES_REQUESTED',
        notes: feedbackNotes,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('DRAFT');
    expect(res.body.data.isVerified).toBe(false);

    // Verify audit log persisted
    const audit = await prisma.auditLog.findFirst({
      where: {
        entityType: 'Destination',
        entityId: testDestination.id,
        action: 'DESTINATION_PROPOSAL_REQUEST_CHANGES',
      },
    });
    expect(audit).toBeDefined();
    expect(audit?.details).toContain(feedbackNotes);
  });

  // TEST 4: Actionable Pending Proposal — Approval & Public Discovery
  it('4. PUT /api/v1/admin/destinations/:id/proposal-decision can approve destination and set status to PUBLISHED', async () => {
    const res = await request(app)
      .put(`/api/v1/admin/destinations/${testDestination.id}/proposal-decision`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        decision: 'APPROVED',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PUBLISHED');
    expect(res.body.data.isVerified).toBe(true);

    // Check that public directory can discover this published destination
    const publicRes = await request(app).get('/api/v1/destinations');
    expect(publicRes.status).toBe(200);
    const found = publicRes.body.data.find((d: any) => d.id === testDestination.id);
    expect(found).toBeDefined();
  });

  // TEST 5: Complete School Management Records & Details
  it('5. GET /api/v1/admin/schools/:id returns complete school records with UUID, board, contact details, bookings, and auditLogs', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/schools/${testSchool.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const school = res.body.data;
    expect(school.id).toBe(testSchool.id);
    expect(school.name).toBe('Test Cambridge International School');
    expect(school.board).toBe('Cambridge');
    expect(school.contactPerson).toBe('Dr. Arvinder Singh');
    expect(school.approximateStrength).toBe(2400);
    expect(school.verificationStatus).toBe('PENDING');

    // Timestamps
    expect(school.createdAt).toBeDefined();
    expect(school.updatedAt).toBeDefined();

    // Related Bookings and Audit logs
    expect(Array.isArray(school.bookings)).toBe(true);
    expect(school.bookings.length).toBeGreaterThanOrEqual(1);
    expect(school.bookings[0].bookingReference).toBe(testBooking.bookingReference);
    expect(Array.isArray(school.auditLogs)).toBe(true);
  });

  // TEST 6: School Verification Management Actions
  it('6. PUT /api/v1/admin/schools/:id/verification verifies school and records audit log with notes', async () => {
    const reviewNote = 'Institution board credentials and coordinator authorization letter confirmed.';
    const res = await request(app)
      .put(`/api/v1/admin/schools/${testSchool.id}/verification`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        verificationStatus: 'VERIFIED',
        verificationNotes: reviewNote,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.verificationStatus).toBe('VERIFIED');
    expect(res.body.data.verificationNotes).toBe(reviewNote);

    // Verify audit log persisted
    const audit = await prisma.auditLog.findFirst({
      where: {
        entityType: 'School',
        entityId: testSchool.id,
        action: 'SCHOOL_VERIFICATION_UPDATED',
      },
    });
    expect(audit).toBeDefined();
    expect(audit?.details).toContain(reviewNote);
  });

  // TEST 7: Global Booking Management & Itemized Financial Snapshot
  it('7. GET /api/v1/admin/bookings/:id returns itemized quote snapshot, visitor counts, and separate fleet status', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/bookings/${testBooking.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const b = res.body.data;
    expect(b.bookingReference).toBe(testBooking.bookingReference);
    expect(b.totalGroupSize).toBe(90);
    expect(b.studentCount).toBe(85);
    expect(b.teacherCount).toBe(5);
    expect(b.requiresTransport).toBe(true);
    expect(b.status).toBe('ACCEPTED');

    // Itemized price items snapshot
    expect(Array.isArray(b.priceItems)).toBe(true);
    expect(b.priceItems.length).toBe(2);
    expect(b.priceItems[0].description).toBe('Student Admission Pass');

    // Separate Fleet Request Status
    expect(b.travellerRequest).toBeDefined();
    expect(b.travellerRequest.status).toBe('NEW');
    expect(b.travellerRequest.quoteAmount).toBe(24000);

    // Status History
    expect(Array.isArray(b.statusHistory)).toBe(true);
    expect(b.statusHistory[0].toStatus).toBe('ACCEPTED');
  });

  // TEST 8: Dedicated Fleet Coordination Queue Management
  it('8. PUT /api/v1/admin/traveller-requests/:id transitions fleet status and assigns transport partner notes', async () => {
    const res = await request(app)
      .put(`/api/v1/admin/traveller-requests/${testTravellerRequest.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        status: 'QUOTE_PREPARED',
        vehicleDetails: '2x 45-Seater BharatBenz AC Coaches (Sharma Travels)',
        quoteAmount: 22500,
        adminNotes: 'Negotiated discount; school coordinator notified.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('QUOTE_PREPARED');
    expect(res.body.data.quoteAmount).toBe(22500);
    expect(res.body.data.vehicleDetails).toContain('Sharma Travels');
  });

  // TEST 9: Security Enforcement — Unauthorized Users Cannot Access Admin APIs
  it('9. Unauthorized users (SCHOOL_STAFF) are blocked with 403 Forbidden from all admin endpoints', async () => {
    const endpoints = [
      { method: 'get', url: '/api/v1/admin/overview' },
      { method: 'get', url: '/api/v1/admin/destinations' },
      { method: 'get', url: `/api/v1/admin/destinations/${testDestination.id}` },
      { method: 'get', url: '/api/v1/admin/schools' },
      { method: 'get', url: `/api/v1/admin/schools/${testSchool.id}` },
      { method: 'get', url: '/api/v1/admin/bookings' },
      { method: 'get', url: '/api/v1/admin/traveller-requests' },
    ];

    for (const ep of endpoints) {
      const res = await (request(app) as any)[ep.method](ep.url).set(
        'Authorization',
        `Bearer ${unauthorizedToken}`
      );
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    }
  });

  // TEST 10: Server-side validation prevents invalid status updates
  it('10. Invalid proposal decisions or verification statuses are strictly rejected with 400 Bad Request', async () => {
    const invalidProposalRes = await request(app)
      .put(`/api/v1/admin/destinations/${testDestination.id}/proposal-decision`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ decision: 'INVALID_STATUS' });

    expect(invalidProposalRes.status).toBe(400);

    const invalidSchoolRes = await request(app)
      .put(`/api/v1/admin/schools/${testSchool.id}/verification`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ verificationStatus: 'UNKNOWN_STATUS' });

    expect(invalidSchoolRes.status).toBe(400);
  });
});
