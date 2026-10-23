import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';

describe.skipIf(!process.env.RUN_LEGACY_DEMO_TESTS)('SCHOOLDEST B2B Platform API Integration Tests (Legacy Demo Seed)', () => {
  let adminToken: string;
  let dpsToken: string;
  let hardysManagerToken: string;
  let scienceCityId: string;
  let hardysWorldId: string;

  let skipLegacySeedTests = false;

  beforeAll(async () => {
    // 1. Try to login with legacy seed accounts if they exist
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@schooldest.com', password: 'Password123!' });
    
    if (adminRes.status !== 200) {
      console.warn('Legacy seed demo users not present in clean database. Skipping legacy seed integration tests.');
      skipLegacySeedTests = true;
      return;
    }
    adminToken = adminRes.body.data.token;

    // 2. Login as DPS Ludhiana School Admin
    const dpsRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@dpsludhiana.edu.in', password: 'Password123!' });
    if (dpsRes.status === 200) {
      dpsToken = dpsRes.body.data.token;
    }

    // 3. Login as Hardy's World Destination Manager
    const hardysRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'manager@hardysworld.com', password: 'Password123!' });
    if (hardysRes.status === 200) {
      hardysManagerToken = hardysRes.body.data.token;
    }
  });

  it('Health Check endpoint returns ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('Public Discovery: returns published approved destinations', async () => {
    const res = await request(app).get('/api/v1/destinations');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const hardys = res.body.data.find((d: any) => d.slug.includes('hardys'));
    expect(hardys).toBeDefined();
    hardysWorldId = hardys.id;

    const science = res.body.data.find((d: any) => d.slug.includes('science'));
    expect(science).toBeDefined();
    scienceCityId = science.id;
  });

  it('Destination Availability Calendar: returns daily capacity and status', async () => {
    const now = new Date();
    const res = await request(app)
      .get(`/api/v1/destinations/${hardysWorldId}/availability?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.days.length).toBeGreaterThan(25);
    expect(res.body.data.destinationId).toBe(hardysWorldId);
  });

  it('TEST B: Standard School Booking (Transport = NO) -> Direct to Destination', async () => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 20);
    const dateStr = targetDate.toISOString().split('T')[0];

    const bookingPayload = {
      destinationId: hardysWorldId,
      visitDate: dateStr,
      studentCount: 80,
      teacherCount: 6,
      staffCount: 1,
      tripPurpose: 'Class 8 Science & Adventure Excursion',
      requiresTransport: false,
      selectedFacilities: [],
    };

    const res = await request(app)
      .post('/api/v1/school/bookings')
      .set('Authorization', `Bearer ${dpsToken}`)
      .send(bookingPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bookingReference).toBeDefined();
    expect(res.body.data.status).toBe('SUBMITTED');
    expect(res.body.data.requiresTransport).toBe(false);

    const bookingId = res.body.data.id;

    // Destination reviews incoming booking
    const destInbox = await request(app)
      .get('/api/v1/destinations/me/bookings')
      .set('Authorization', `Bearer ${hardysManagerToken}`);
    expect(destInbox.status).toBe(200);
    const foundInInbox = destInbox.body.data.find((b: any) => b.id === bookingId);
    expect(foundInInbox).toBeDefined();

    // Destination accepts booking
    const acceptRes = await request(app)
      .post(`/api/v1/destinations/me/bookings/${bookingId}/accept`)
      .set('Authorization', `Bearer ${hardysManagerToken}`)
      .send({ destinationNotes: 'Confirmed for 87 visitors with picnic pavilion.' });
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.status).toBe('ACCEPTED');
  });

  it('TEST C: Transport-Required Booking (Transport = YES) -> Linked Traveller Request in Admin Queue', async () => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 22);
    // Ensure not Monday (day 1)
    if (targetDate.getDay() === 1) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    const dateStr = targetDate.toISOString().split('T')[0];

    const bookingPayload = {
      destinationId: scienceCityId,
      visitDate: dateStr,
      studentCount: 100,
      teacherCount: 8,
      tripPurpose: 'Astronomy & Dinosaur Field Trip',
      requiresTransport: true,
      transportDetails: {
        pickupAddress: 'DPS Ludhiana Campus Main Gate',
        pickupCity: 'Ludhiana',
        pickupTime: '08:00',
        passengerCount: 108,
        preferredVehicle: '2x 52-seater Luxury AC Coaches',
        numberOfVehicles: 2,
        specialInstructions: 'Police-verified drivers and speed governors mandatory.',
      },
    };

    const res = await request(app)
      .post('/api/v1/school/bookings')
      .set('Authorization', `Bearer ${dpsToken}`)
      .send(bookingPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requiresTransport).toBe(true);

    const bookingId = res.body.data.id;

    // Verify Admin dedicated traveller queue has this request!
    const adminTravellerRes = await request(app)
      .get('/api/v1/admin/traveller-requests')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminTravellerRes.status).toBe(200);
    const travellerReq = adminTravellerRes.body.data.find((tr: any) => tr.bookingId === bookingId);
    expect(travellerReq).toBeDefined();
    expect(travellerReq.passengerCount).toBe(108);

    // Admin updates quote and advances status
    const updateQuoteRes = await request(app)
      .put(`/api/v1/admin/traveller-requests/${travellerReq.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'QUOTE_PREPARED',
        vehicleDetails: '2x 52-seater BharatBenz AC Coaches (Fleet: Ludhiana Intercity)',
        quoteAmount: 22000,
        adminNotes: 'Direct toll route selected. Driver refreshments included.',
      });
    expect(updateQuoteRes.status).toBe(200);
    expect(updateQuoteRes.body.data.status).toBe('QUOTE_PREPARED');
    expect(updateQuoteRes.body.data.quoteAmount).toBe(22000);
  });

  it('TEST D: Destination Onboarding & Admin Overview', async () => {
    // 1. Admin overview stats
    const overviewRes = await request(app)
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.data.schools.total).toBeGreaterThan(0);
    expect(overviewRes.body.data.destinations.total).toBeGreaterThan(0);
    expect(overviewRes.body.data.traveller.total).toBeGreaterThan(0);

    // 2. Admin onboards a new destination
    const timestamp = Date.now();
    const newDest = {
      name: `Kurukshetra Science Centre ${timestamp}`,
      businessName: 'National Council of Science Museums',
      category: 'Science Centre & Planetarium',
      description: 'Educational science centre featuring interactive exhibits and historical panoramas.',
      city: 'Kurukshetra',
      state: 'Haryana',
      officialEmail: `info-${timestamp}@kurukshetrascience.gov.in`,
      contactPhone: '+91 1744 238050',
      managerName: 'Sunil Kumar',
      managerEmail: `manager-${timestamp}@kurukshetrascience.gov.in`,
      studentTicketPrice: 180,
      teacherTicketPrice: 120,
    };

    const onboardRes = await request(app)
      .post('/api/v1/admin/destinations/onboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newDest);
    expect(onboardRes.status).toBe(201);
    expect(onboardRes.body.data.name).toBe(newDest.name);
    expect(onboardRes.body.data.status).toBe('PUBLISHED');
  });

  it('TEST E: RBAC Security — Unauthorized role and unauthenticated access enforcement', async () => {
    // 1. Unauthenticated request without token
    const unauthRes = await request(app).get('/api/v1/admin/overview');
    expect(unauthRes.status).toBe(401);

    // 2. School trying to view admin overview
    const schoolToAdmin = await request(app)
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${dpsToken}`);
    expect(schoolToAdmin.status).toBe(403);

    // 3. School trying to access destination incoming bookings
    const schoolToDest = await request(app)
      .get('/api/v1/destinations/me/bookings')
      .set('Authorization', `Bearer ${dpsToken}`);
    expect(schoolToDest.status).toBe(403);

    // 4. Destination manager trying to view admin traveller requests
    const destToAdminTraveller = await request(app)
      .get('/api/v1/admin/traveller-requests')
      .set('Authorization', `Bearer ${hardysManagerToken}`);
    expect(destToAdminTraveller.status).toBe(403);

    // 5. Destination manager trying to create a school booking
    const destCreateBooking = await request(app)
      .post('/api/v1/school/bookings')
      .set('Authorization', `Bearer ${hardysManagerToken}`)
      .send({ destinationId: hardysWorldId, visitDate: '2026-12-01', studentCount: 50 });
    expect(destCreateBooking.status).toBe(403);
  });

  it('TEST F: Destination Rejection Workflow with Mandatory Reason', async () => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 25);
    const dateStr = targetDate.toISOString().split('T')[0];

    // School submits booking
    const res = await request(app)
      .post('/api/v1/school/bookings')
      .set('Authorization', `Bearer ${dpsToken}`)
      .send({
        destinationId: hardysWorldId,
        visitDate: dateStr,
        studentCount: 60,
        teacherCount: 4,
        tripPurpose: 'Annual Grade 6 Splash Day',
      });
    expect(res.status).toBe(201);
    const bookingId = res.body.data.id;

    // Destination rejects without reason -> should fail with 400
    const rejectWithoutReason = await request(app)
      .post(`/api/v1/destinations/me/bookings/${bookingId}/reject`)
      .set('Authorization', `Bearer ${hardysManagerToken}`)
      .send({});
    expect(rejectWithoutReason.status).toBe(400);

    // Destination rejects with clear reason
    const rejectRes = await request(app)
      .post(`/api/v1/destinations/me/bookings/${bookingId}/reject`)
      .set('Authorization', `Bearer ${hardysManagerToken}`)
      .send({ reason: 'Annual pool filtration maintenance scheduled on this date.' });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe('REJECTED');
    expect(rejectRes.body.data.rejectionReason).toBe('Annual pool filtration maintenance scheduled on this date.');

    // School views status
    const schoolBookingRes = await request(app)
      .get(`/api/v1/school/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${dpsToken}`);
    expect(schoolBookingRes.status).toBe(200);
    expect(schoolBookingRes.body.data.status).toBe('REJECTED');
  });

  it('TEST G: Destination Change Request & School Acceptance with Capacity Reallocation', async () => {
    const origDate = new Date();
    origDate.setDate(origDate.getDate() + 28);
    const origDateStr = origDate.toISOString().split('T')[0];

    const altDate = new Date();
    altDate.setDate(altDate.getDate() + 29);
    const altDateStr = altDate.toISOString().split('T')[0];

    // 1. School submits booking
    const bookingRes = await request(app)
      .post('/api/v1/school/bookings')
      .set('Authorization', `Bearer ${dpsToken}`)
      .send({
        destinationId: hardysWorldId,
        visitDate: origDateStr,
        studentCount: 50,
        teacherCount: 5,
        tripPurpose: 'Physics & Motion Study Group',
      });
    expect(bookingRes.status).toBe(201);
    const bookingId = bookingRes.body.data.id;

    // 2. Destination requests date change
    const changeReqRes = await request(app)
      .post(`/api/v1/destinations/me/bookings/${bookingId}/request-changes`)
      .set('Authorization', `Bearer ${hardysManagerToken}`)
      .send({
        proposedDate: altDateStr,
        reason: 'Large district tournament on the original date; next day offers private zone.',
      });
    expect(changeReqRes.status).toBe(200);
    expect(changeReqRes.body.data.updatedBooking.status).toBe('CHANGES_REQUESTED');
    const changeRequestId = changeReqRes.body.data.changeReq.id;

    // 3. School views and accepts proposed changes
    const acceptChangeRes = await request(app)
      .post(`/api/v1/school/bookings/${bookingId}/respond-change`)
      .set('Authorization', `Bearer ${dpsToken}`)
      .send({
        changeRequestId,
        action: 'ACCEPT',
        schoolResponseNotes: 'Alternative date confirmed with academic coordinator.',
      });
    expect(acceptChangeRes.status).toBe(200);
    expect(acceptChangeRes.body.data.status).toBe('ACCEPTED');
    expect(acceptChangeRes.body.data.visitDate.split('T')[0]).toBe(altDateStr);
  });

  it('TEST H: Date Closure & Blackout Enforcement', async () => {
    const closedDate = new Date();
    closedDate.setDate(closedDate.getDate() + 35);
    const closedDateStr = closedDate.toISOString().split('T')[0];

    // Destination sets calendar date to CLOSED
    const closeRes = await request(app)
      .post('/api/v1/destinations/me/availability')
      .set('Authorization', `Bearer ${hardysManagerToken}`)
      .send({
        date: closedDateStr,
        status: 'CLOSED',
        notes: 'Private corporate event buyout',
      });
    expect(closeRes.status).toBe(200);

    // School attempts to book on the closed date -> should fail with 400
    const attemptRes = await request(app)
      .post('/api/v1/school/bookings')
      .set('Authorization', `Bearer ${dpsToken}`)
      .send({
        destinationId: hardysWorldId,
        visitDate: closedDateStr,
        studentCount: 40,
        teacherCount: 3,
        tripPurpose: 'Grade 5 Excursion',
      });
    expect(attemptRes.status).toBe(400);
    expect(attemptRes.body.error.message).toContain('CLOSED');
  });

  it('TEST I: Price Snapshot Immutability across Destination Price Updates', async () => {
    const visitDate = new Date();
    visitDate.setDate(visitDate.getDate() + 38);
    const visitDateStr = visitDate.toISOString().split('T')[0];

    // 1. School books at current price
    const initialBooking = await request(app)
      .post('/api/v1/school/bookings')
      .set('Authorization', `Bearer ${dpsToken}`)
      .send({
        destinationId: hardysWorldId,
        visitDate: visitDateStr,
        studentCount: 30,
        teacherCount: 2,
        tripPurpose: 'Math Club Tour',
      });
    expect(initialBooking.status).toBe(201);
    const initialQuote = initialBooking.body.data.originalQuoteAmount;
    const initialBookingId = initialBooking.body.data.id;

    // 2. Fetch destination profile with ticket types
    const destProfile = await request(app)
      .get(`/api/v1/destinations/detail/${hardysWorldId}`);
    expect(destProfile.status).toBe(200);
    const studentTicket = destProfile.body.data.ticketTypes.find((t: any) => t.category === 'STUDENT');
    expect(studentTicket).toBeDefined();

    const originalPrice = studentTicket.weekdayPrice || studentTicket.basePrice;
    const newPrice = originalPrice + 100;

    // Update ticket price via manager API
    const updateTicketRes = await request(app)
      .put(`/api/v1/destinations/me/ticket-types/${studentTicket.id}`)
      .set('Authorization', `Bearer ${hardysManagerToken}`)
      .send({ weekdayPrice: newPrice, weekendPrice: newPrice + 50 });
    expect(updateTicketRes.status).toBe(200);

    // 3. Verify existing booking quote remains EXACTLY the historical snapshot
    const fetchedOldBooking = await request(app)
      .get(`/api/v1/school/bookings/${initialBookingId}`)
      .set('Authorization', `Bearer ${dpsToken}`);
    expect(fetchedOldBooking.status).toBe(200);
    expect(fetchedOldBooking.body.data.originalQuoteAmount).toBe(initialQuote);

    // 4. Revert price back to avoid corrupting seed baseline
    await request(app)
      .put(`/api/v1/destinations/me/ticket-types/${studentTicket.id}`)
      .set('Authorization', `Bearer ${hardysManagerToken}`)
      .send({ weekdayPrice: originalPrice, weekendPrice: originalPrice + 50 });
  });

  it('TEST J: Destination Isolation — Venue receives only venue booking info, not Traveller service quotes', async () => {
    // Destination inspects incoming bookings
    const destInbox = await request(app)
      .get('/api/v1/destinations/me/bookings')
      .set('Authorization', `Bearer ${hardysManagerToken}`);
    expect(destInbox.status).toBe(200);

    for (const b of destInbox.body.data) {
      // Must NOT expose internal traveller service requests, transport vendor quotes, or vehicle logistics
      expect(b.travellerRequest).toBeUndefined();
    }
  });

  it('TEST K: Concurrency & Row Lock — Simultaneous booking attempts exceeding remaining capacity', async () => {
    const raceDate = new Date();
    raceDate.setDate(raceDate.getDate() + 75);
    const raceDateStr = raceDate.toISOString().split('T')[0];

    // Clean up any previous test runs on this specific test date
    const parsedTestDate = new Date(raceDateStr);
    parsedTestDate.setUTCHours(0, 0, 0, 0);
    const existingTestBookings = await prisma.booking.findMany({
      where: { destinationId: hardysWorldId, visitDate: parsedTestDate },
      select: { id: true },
    });
    for (const eb of existingTestBookings) {
      await prisma.bookingPriceItem.deleteMany({ where: { bookingId: eb.id } });
      await prisma.bookingFacility.deleteMany({ where: { bookingId: eb.id } });
      await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: eb.id } });
      await prisma.bookingQuoteVersion.deleteMany({ where: { bookingId: eb.id } });
      await prisma.travellerServiceRequest.deleteMany({ where: { bookingId: eb.id } });
      await prisma.bookingChangeRequest.deleteMany({ where: { bookingId: eb.id } });
      await prisma.booking.delete({ where: { id: eb.id } });
    }

    // Set tight capacity for this test date: 100 max, bookedCount: 0
    await request(app)
      .post('/api/v1/destinations/me/availability')
      .set('Authorization', `Bearer ${hardysManagerToken}`)
      .send({
        date: raceDateStr,
        status: 'AVAILABLE',
        dailyCapacity: 100,
      });

    await prisma.destinationAvailability.updateMany({
      where: { destinationId: hardysWorldId, date: parsedTestDate },
      data: { bookedCount: 0 },
    });

    // Fire 2 simultaneous booking attempts: 70 students each (total 140 > 100)
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/v1/school/bookings')
        .set('Authorization', `Bearer ${dpsToken}`)
        .send({
          destinationId: hardysWorldId,
          visitDate: raceDateStr,
          studentCount: 70,
          teacherCount: 2,
          tripPurpose: 'Concurrent Booking Group A',
        }),
      request(app)
        .post('/api/v1/school/bookings')
        .set('Authorization', `Bearer ${dpsToken}`)
        .send({
          destinationId: hardysWorldId,
          visitDate: raceDateStr,
          studentCount: 70,
          teacherCount: 2,
          tripPurpose: 'Concurrent Booking Group B',
        }),
    ]);

    // Exactly one should succeed (201) and the other must be rejected due to capacity limit (400)
    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 400]);

    const failedRes = res1.status === 400 ? res1 : res2;
    expect(failedRes.body.error.message).toContain('Destination capacity reached');
  });

  it('TEST L: Neon Auth — Rejects empty session token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/neon-login')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Neon Auth session token or ID token is required');
  });

  it('TEST M: Neon Auth — Provisioned Super Admin in Neon gains access via verified Neon Auth ID', async () => {
    const verifiedAdminAuthId = 'neon-auth-super-admin';
    const adminEmail = 'admin@schooldest.com';

    // Simulate platform owner manually provisioning the Neon Auth ID in Neon PostgreSQL
    await prisma.user.update({
      where: { email: adminEmail },
      data: { neonAuthId: verifiedAdminAuthId },
    });

    const res = await request(app)
      .post('/api/v1/auth/neon-login')
      .send({ sessionToken: 'test-neon-token-super-admin' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(adminEmail);
    expect(res.body.data.user.role).toBe('SUPER_ADMIN');
    expect(res.body.data.user.neonAuthId).toBe(verifiedAdminAuthId);
  });

  it('TEST N: Neon Auth — New Google user created as SCHOOL_STAFF (never auto-promoted to admin)', async () => {
    const newAuthId = 'neon-auth-new-google-user';
    const newEmail = 'new-google-user@example.com';

    const res = await request(app)
      .post('/api/v1/auth/neon-login')
      .send({ sessionToken: 'test-neon-token-new-google-user' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(newEmail);
    // Crucial security invariant: new Google login must NOT be SUPER_ADMIN
    expect(res.body.data.user.role).toBe('SCHOOL_STAFF');
    expect(res.body.data.user.role).not.toBe('SUPER_ADMIN');
    expect(res.body.data.user.neonAuthId).toBe(newAuthId);
  });

  it('TEST O: Security Invariant — Prevents privilege escalation when Neon Auth ID is not provisioned in Neon', async () => {
    // Create a temporary super admin record without an assigned neonAuthId
    const unlinkedAdminEmail = 'target-super-admin@schooldest.com';
    await prisma.user.upsert({
      where: { email: unlinkedAdminEmail },
      update: { neonAuthId: null, role: 'SUPER_ADMIN' },
      create: {
        email: unlinkedAdminEmail,
        name: 'Unlinked Admin',
        role: 'SUPER_ADMIN',
        neonAuthId: null,
      },
    });

    // Attacker authenticates with a Google account matching the super admin email but with unprovisioned ID
    const res = await request(app)
      .post('/api/v1/auth/neon-login')
      .send({ sessionToken: 'test-neon-token-unauthorized-admin-attempt' });

    // Must be rejected with 403 Forbidden!
    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('Super Administrator accounts cannot be linked automatically via email');

    // Clean up temporary test user
    await prisma.user.delete({ where: { email: unlinkedAdminEmail } });
  });

  it('TEST P: Cross-Tenant Data Isolation — Schools cannot access or mutate other institutions data', async () => {
    // Login as St. Xavier's Coordinator
    const stXavierRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'coordinator@stxaviers.edu.in', password: 'Password123!' });
    expect(stXavierRes.status).toBe(200);
    const stXavierToken = stXavierRes.body.data.token;

    // Create a private booking as DPS Ludhiana on an open operating day (Wednesday/Thursday/Friday)
    const visitDate = new Date();
    visitDate.setDate(visitDate.getDate() + 25);
    while (visitDate.getDay() === 0 || visitDate.getDay() === 1) {
      visitDate.setDate(visitDate.getDate() + 1);
    }
    const dateStr = visitDate.toISOString().split('T')[0];

    const dpsBookingRes = await request(app)
      .post('/api/v1/school/bookings')
      .set('Authorization', `Bearer ${dpsToken}`)
      .send({
        destinationId: hardysWorldId,
        visitDate: dateStr,
        studentCount: 30,
        teacherCount: 2,
        tripPurpose: 'DPS Exclusive Science Trip',
      });
    expect(dpsBookingRes.status).toBe(201);
    const dpsBookingId = dpsBookingRes.body.data.id;

    // St. Xavier's attempts to cancel DPS Ludhiana's booking -> must fail with 404 (Not Found in tenant scope)
    const unauthorizedCancel = await request(app)
      .post(`/api/v1/school/bookings/${dpsBookingId}/cancel`)
      .set('Authorization', `Bearer ${stXavierToken}`)
      .send({ reason: 'Malicious cancellation attempt' });

    expect(unauthorizedCancel.status).toBe(404);
  });

  it('TEST Q: Capacity Recovery — Cancelling an excursion restores destination capacity', async () => {
    const recoveryDate = new Date();
    recoveryDate.setDate(recoveryDate.getDate() + 45);
    const dateStr = recoveryDate.toISOString().split('T')[0];

    // Ensure initial capacity record exists
    await request(app)
      .post('/api/v1/destinations/me/availability')
      .set('Authorization', `Bearer ${hardysManagerToken}`)
      .send({
        date: dateStr,
        status: 'AVAILABLE',
        dailyCapacity: 500,
      });

    // Create a 40-student booking
    const bookRes = await request(app)
      .post('/api/v1/school/bookings')
      .set('Authorization', `Bearer ${dpsToken}`)
      .send({
        destinationId: hardysWorldId,
        visitDate: dateStr,
        studentCount: 40,
        teacherCount: 2,
        staffCount: 0,
        tripPurpose: 'Capacity Lifecycle Test',
      });
    expect(bookRes.status).toBe(201);
    const bookingId = bookRes.body.data.id;
    const totalGroup = bookRes.body.data.totalGroupSize;

    // Verify availability bookedCount reflects the booking
    const calBefore = await request(app).get(
      `/api/v1/destinations/${hardysWorldId}/availability?year=${recoveryDate.getFullYear()}&month=${recoveryDate.getMonth() + 1}`
    );
    const dayBefore = calBefore.body.data.days.find((d: any) => d.date === dateStr);
    const bookedBefore = dayBefore.bookedCount;
    expect(bookedBefore).toBeGreaterThanOrEqual(totalGroup);

    // Cancel the booking
    const cancelRes = await request(app)
      .post(`/api/v1/school/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${dpsToken}`)
      .send({ reason: 'Weather advisory cancellation' });
    expect(cancelRes.status).toBe(200);

    // Verify availability bookedCount is restored (decremented by totalGroup)
    const calAfter = await request(app).get(
      `/api/v1/destinations/${hardysWorldId}/availability?year=${recoveryDate.getFullYear()}&month=${recoveryDate.getMonth() + 1}`
    );
    const dayAfter = calAfter.body.data.days.find((d: any) => d.date === dateStr);
    expect(dayAfter.bookedCount).toBe(bookedBefore - totalGroup);
  });

  it('TEST R: Token Security — Rejects invalid, tampered, and missing authorization tokens', async () => {
    // 1. Missing token
    const resNoToken = await request(app).get('/api/v1/school/bookings');
    expect(resNoToken.status).toBe(401);

    // 2. Tampered / malformed token
    const resTampered = await request(app)
      .get('/api/v1/school/bookings')
      .set('Authorization', 'Bearer invalid.forged.jwt.token');
    expect(resTampered.status).toBe(401);

    // 3. Forged role claim without database presence
    const resForged = await request(app)
      .get('/api/v1/admin/overview')
      .set('Authorization', 'Bearer forged-token');
    expect(resForged.status).toBe(401);
  });

  it('TEST S: Cloudinary Integration — Uploads image via environment configuration and generates CDN URLs', async () => {
    // 1. Unauthenticated upload attempt must be rejected
    const unauthRes = await request(app)
      .post('/api/v1/upload/image')
      .send({ imageUrl: 'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg' });
    expect(unauthRes.status).toBe(401);

    // 2. Authenticated upload using Cloudinary demo image
    const uploadRes = await request(app)
      .post('/api/v1/upload/image')
      .set('Authorization', `Bearer ${hardysManagerToken}`)
      .send({
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg',
        folder: 'schooldest/test',
      });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.success).toBe(true);
    expect(uploadRes.body.data.publicId).toBeDefined();
    expect(uploadRes.body.data.secureUrl).toContain('res.cloudinary.com');
    expect(uploadRes.body.data.secureUrl).toContain('fzwn0nve');
    expect(uploadRes.body.data.optimizedUrl).toBeDefined();
    expect(uploadRes.body.data.thumbnailUrl).toBeDefined();
  });

  it('TEST T: Neon Database Connectivity — Validates live PostgreSQL connection and schema integrity', async () => {
    // 1. Safe read-only health check query
    const dbResult: any = await prisma.$queryRaw`SELECT current_database(), current_user, version();`;
    expect(dbResult).toBeDefined();
    expect(dbResult.length).toBeGreaterThan(0);
    expect(dbResult[0].current_database).toBe('neondb');

    // 2. Verify seeded core entities exist in Neon PostgreSQL
    const destinationCount = await prisma.destination.count();
    const schoolCount = await prisma.school.count();
    const userCount = await prisma.user.count();

    expect(destinationCount).toBeGreaterThanOrEqual(3);
    expect(schoolCount).toBeGreaterThanOrEqual(3);
    expect(userCount).toBeGreaterThanOrEqual(4);
  });

  it('TEST U: Media Authorization & Ownership — Enforces entity-scoped permissions and Cloudinary lifecycle', async () => {
    // 1. Unauthorized attempt: School coordinator attempts to modify Hardy's World cover photo
    const unauthorizedUpload = await request(app)
      .post(`/api/v1/upload/destination/${hardysWorldId}/cover`)
      .set('Authorization', `Bearer ${dpsToken}`)
      .send({ imageUrl: 'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg' });

    expect(unauthorizedUpload.status).toBe(403);
    expect(unauthorizedUpload.body.error.message).toContain('Unauthorized: You do not have permission to manage this destination');

    // 2. Authorized upload: Hardy's World manager uploads new cover photo
    const authorizedCoverRes = await request(app)
      .post(`/api/v1/upload/destination/${hardysWorldId}/cover`)
      .set('Authorization', `Bearer ${hardysManagerToken}`)
      .send({ imageUrl: 'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg' });

    expect(authorizedCoverRes.status).toBe(200);
    expect(authorizedCoverRes.body.success).toBe(true);
    expect(authorizedCoverRes.body.data.coverImage).toContain('res.cloudinary.com');

    // 3. Authorized gallery upload: Hardy's World manager adds an attraction photo
    const galleryUploadRes = await request(app)
      .post(`/api/v1/upload/destination/${hardysWorldId}/gallery`)
      .set('Authorization', `Bearer ${hardysManagerToken}`)
      .send({
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg',
        caption: 'Rollercoaster at Sunrise',
      });

    expect(galleryUploadRes.status).toBe(201);
    expect(galleryUploadRes.body.success).toBe(true);
    const createdImageId = galleryUploadRes.body.data.id;
    expect(createdImageId).toBeDefined();

    // 4. Unauthorized deletion: School coordinator attempts to delete Hardy's World gallery image
    const unauthorizedDelete = await request(app)
      .delete(`/api/v1/upload/destination/${hardysWorldId}/gallery/${createdImageId}`)
      .set('Authorization', `Bearer ${dpsToken}`);

    expect(unauthorizedDelete.status).toBe(403);

    // 5. Authorized deletion: Hardy's World manager removes the gallery image
    const authorizedDelete = await request(app)
      .delete(`/api/v1/upload/destination/${hardysWorldId}/gallery/${createdImageId}`)
      .set('Authorization', `Bearer ${hardysManagerToken}`);

    expect(authorizedDelete.status).toBe(200);
    expect(authorizedDelete.body.success).toBe(true);

    // Verify removed from database
    const checkDb = await prisma.destinationImage.findUnique({ where: { id: createdImageId } });
    expect(checkDb).toBeNull();
  });
});

