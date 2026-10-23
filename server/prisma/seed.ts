import { PrismaClient, Role, VerificationStatus, DestinationStatus, TicketCategory, AvailabilityStatus, BookingStatus, TravellerStatus, AcPreference } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.ALLOW_DATABASE_SEED !== 'true') {
    console.warn('⚠️ Seeding is strictly disabled to prevent accidental modification of production database.');
    console.warn('Set ALLOW_DATABASE_SEED=true explicitly only when seeding a dedicated, isolated test database.');
    return;
  }

  console.log('Seeding SchoolDest database...');

  // Clean existing tables in reverse dependency order
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.travellerServiceRequest.deleteMany({});
  await prisma.bookingStatusHistory.deleteMany({});
  await prisma.bookingChangeRequest.deleteMany({});
  await prisma.bookingQuoteVersion.deleteMany({});
  await prisma.bookingPriceItem.deleteMany({});
  await prisma.bookingFacility.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.destinationAvailability.deleteMany({});
  await prisma.destinationOperatingHours.deleteMany({});
  await prisma.ticketType.deleteMany({});
  await prisma.destinationFacility.deleteMany({});
  await prisma.destinationImage.deleteMany({});
  await prisma.destinationStaff.deleteMany({});
  await prisma.schoolStaff.deleteMany({});
  await prisma.destination.deleteMany({});
  await prisma.school.deleteMany({});
  await prisma.platformSetting.deleteMany({});
  await prisma.user.deleteMany({});

  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

  // 1. Super Admin User
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@schooldest.com',
      passwordHash: defaultPasswordHash,
      name: 'Vikas Sharma (Super Admin)',
      phone: '+91 98111 22334',
      role: Role.SUPER_ADMIN,
      neonAuthId: 'neon-auth-super-admin',
      firebaseUid: 'firebase-google-uid-super-admin',
      emailVerified: true,
      isActive: true,
    },
  });

  // 2. Destination Managers
  const hardysManager = await prisma.user.create({
    data: {
      email: 'manager@hardysworld.com',
      passwordHash: defaultPasswordHash,
      name: 'Rajesh Khurana (Park Director)',
      phone: '+91 98765 11223',
      role: Role.DESTINATION_MANAGER,
      emailVerified: true,
      isActive: true,
    },
  });

  const scienceCityManager = await prisma.user.create({
    data: {
      email: 'manager@sciencecity.com',
      passwordHash: defaultPasswordHash,
      name: 'Dr. Anita Roy (Education Head)',
      phone: '+91 98765 33445',
      role: Role.DESTINATION_MANAGER,
      emailVerified: true,
      isActive: true,
    },
  });

  const wonderlaManager = await prisma.user.create({
    data: {
      email: 'manager@wonderla.com',
      passwordHash: defaultPasswordHash,
      name: 'Karthik Rao (Operations Manager)',
      phone: '+91 98765 55667',
      role: Role.DESTINATION_MANAGER,
      emailVerified: true,
      isActive: true,
    },
  });

  // 3. School Admins & Coordinators
  const dpsAdmin = await prisma.user.create({
    data: {
      email: 'admin@dpsludhiana.edu.in',
      passwordHash: defaultPasswordHash,
      name: 'Sunita Mehra (Excursion Head)',
      phone: '+91 98123 45678',
      role: Role.SCHOOL_ADMIN,
      emailVerified: true,
      isActive: true,
    },
  });

  const stXavierAdmin = await prisma.user.create({
    data: {
      email: 'coordinator@stxaviers.edu.in',
      passwordHash: defaultPasswordHash,
      name: 'Father Joseph Thomas',
      phone: '+91 98722 33445',
      role: Role.SCHOOL_ADMIN,
      emailVerified: true,
      isActive: true,
    },
  });

  const apsAdmin = await prisma.user.create({
    data: {
      email: 'admin@apsjalandhar.edu.in',
      passwordHash: defaultPasswordHash,
      name: 'Col. R. S. Bedi (Administrator)',
      phone: '+91 98144 55667',
      role: Role.SCHOOL_ADMIN,
      emailVerified: true,
      isActive: true,
    },
  });

  // 4. Create Schools
  const dpsSchool = await prisma.school.create({
    data: {
      name: 'Delhi Public School (DPS), Ludhiana',
      logo: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=300&auto=format&fit=crop&q=80',
      board: 'CBSE',
      schoolType: 'Day-cum-Boarding Co-educational',
      address: 'Vill Bhamian Kalan, Tajpur Road',
      city: 'Ludhiana',
      state: 'Punjab',
      pincode: '141010',
      officialEmail: 'info@dpsludhiana.edu.in',
      contactPhone: '+91 161 282 2200',
      contactPerson: 'Sunita Mehra',
      designation: 'Vice Principal & Excursion Coordinator',
      approximateStrength: 2400,
      website: 'https://dpsludhiana.com',
      verificationStatus: VerificationStatus.VERIFIED,
      verificationNotes: 'Verified via CBSE affiliation certificate and official domain.',
      staff: {
        create: {
          userId: dpsAdmin.id,
          role: 'ADMIN',
          designation: 'Excursion Head',
        },
      },
    },
  });

  const stXavierSchool = await prisma.school.create({
    data: {
      name: "St. Xavier's Senior Secondary School",
      logo: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=300&auto=format&fit=crop&q=80',
      board: 'ICSE',
      schoolType: 'Private Aided School',
      address: 'Sector 44-C',
      city: 'Chandigarh',
      state: 'Chandigarh (UT)',
      pincode: '160047',
      officialEmail: 'contact@stxaviers.edu.in',
      contactPhone: '+91 172 260 1708',
      contactPerson: 'Father Joseph Thomas',
      designation: 'Principal',
      approximateStrength: 1850,
      website: 'https://stxavierschool.com',
      verificationStatus: VerificationStatus.VERIFIED,
      staff: {
        create: {
          userId: stXavierAdmin.id,
          role: 'ADMIN',
          designation: 'Principal',
        },
      },
    },
  });

  const apsSchool = await prisma.school.create({
    data: {
      name: 'Army Public School, Jalandhar Cantt',
      logo: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=300&auto=format&fit=crop&q=80',
      board: 'CBSE',
      schoolType: 'Army Welfare Education Society',
      address: 'Military Station, Jalandhar Cantt',
      city: 'Jalandhar',
      state: 'Punjab',
      pincode: '144005',
      officialEmail: 'apsjalandhar@awesindia.edu.in',
      contactPhone: '+91 181 226 6123',
      contactPerson: 'Col. R. S. Bedi',
      designation: 'Administrative Officer',
      approximateStrength: 3100,
      verificationStatus: VerificationStatus.VERIFIED,
      staff: {
        create: {
          userId: apsAdmin.id,
          role: 'ADMIN',
          designation: 'Administrator',
        },
      },
    },
  });

  // 5. Create Destinations
  // Destination A: Hardy's World
  const hardysWorld = await prisma.destination.create({
    data: {
      name: "Hardy's World Amusement & Water Park",
      businessName: "Hardy's Entertainment Ltd.",
      slug: 'hardys-world-ludhiana',
      logo: 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=300&auto=format&fit=crop&q=80',
      coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
      category: 'Amusement & Waterpark',
      description: "Punjab's largest amusement and water theme park spanning 20 acres, featuring thrill rollercoasters, wave pools, water slides, rain dance arena, ice world simulator, and certified safety personnel. Equipped with dedicated school picnic zones, hygienic student buffet halls, and sanitized locker rooms.",
      address: 'Ludhiana-Jalandhar G.T. Road, Near Ladhowal Toll',
      city: 'Ludhiana',
      state: 'Punjab',
      pincode: '141008',
      latitude: 30.9578,
      longitude: 75.7892,
      officialEmail: 'bookings@hardysworld.com',
      contactPhone: '+91 161 282 8282',
      managerName: 'Rajesh Khurana',
      website: 'https://hardysworld.com',
      status: DestinationStatus.PUBLISHED,
      isVerified: true,
      bookingLeadDays: 2,
      minGroupSize: 25,
      maxGroupSize: 1200,
      openingTime: '09:30',
      closingTime: '18:00',
      weeklyOperatingDays: 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
      safetyInfo: 'Trained life guards stationed at all pools; ISO-certified ride maintenance; first-aid medical centre with on-duty paramedic and ambulance facility on call; CCTV surveillance throughout park.',
      accessibilityInfo: 'Wheelchair ramps on all primary pathways; ground-level picnic halls; dedicated accessible restrooms in main plaza.',
      schoolPolicies: '1 complimentary ticket for accompanying teachers/staff for every 15 paying students. Student ID or authorized school letter mandatory. Strict anti-ragging & zero-alcohol environment.',
      cancellationPolicy: 'Full refund if cancelled 7+ days in advance. 50% refund up to 48 hours before date. Date rescheduling permitted once without fee.',
      refundPolicy: 'Refunds credited within 5 business days via original payment mode.',
      staff: {
        create: {
          userId: hardysManager.id,
          role: 'MANAGER',
        },
      },
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
            caption: 'Main Water Kingdom Wave Pool',
            isCover: true,
            sortOrder: 1,
          },
          {
            url: 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=1200&auto=format&fit=crop&q=80',
            caption: 'Rollercoaster Thrill Zone',
            isCover: false,
            sortOrder: 2,
          },
          {
            url: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=1200&auto=format&fit=crop&q=80',
            caption: 'Kids Aqua Playground & Spiral Slides',
            isCover: false,
            sortOrder: 3,
          },
          {
            url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80',
            caption: 'Spacious Student Dining & Picnic Shed',
            isCover: false,
            sortOrder: 4,
          },
        ],
      },
      facilities: {
        create: [
          {
            name: 'Unlimited Rides & Waterpark Access',
            category: 'ACTIVITIES',
            description: 'Access to all 28 amusement rides, wave pool, aqua slides, and rain dance floor.',
            isIncluded: true,
            extraPrice: 0,
          },
          {
            name: 'Hot Buffet Lunch Package (Veg)',
            category: 'MEALS',
            description: 'Nutritious student lunch: Dal Makhani, Paneer Butter Masala, Rice, Poori/Roti, Salad, Raita, and Gulab Jamun.',
            isIncluded: false,
            extraPrice: 160,
          },
          {
            name: 'Evening Snack Pack',
            category: 'MEALS',
            description: 'Tetra pack juice, sandwich, muffin, and chips for the return journey.',
            isIncluded: false,
            extraPrice: 65,
          },
          {
            name: 'Dedicated Student Lockers & Changing Rooms',
            category: 'LOCKERS',
            description: 'Secure, keyless wristband locker storage block for groups.',
            isIncluded: false,
            extraPrice: 30,
          },
          {
            name: 'Reserved School Picnic Pavilion',
            category: 'GENERAL',
            description: 'Exclusive shaded seating area with water dispensers for morning assembly and headcounts.',
            isIncluded: true,
            extraPrice: 0,
          },
          {
            name: 'Dedicated Bus Parking with Driver Rest Lounge',
            category: 'PARKING',
            description: 'Designated parking bays for school coaches with complimentary driver tea and water.',
            isIncluded: true,
            extraPrice: 0,
          },
        ],
      },
      ticketTypes: {
        create: [
          {
            name: 'Student All-Access Pass',
            category: TicketCategory.STUDENT,
            description: 'Includes water park, dry amusement rides, rain dance, and safety locker shared ratio.',
            basePrice: 380,
            weekdayPrice: 350,
            weekendPrice: 420,
            complimentaryStaffRatio: 15,
            minQuantity: 20,
            maxQuantity: 1500,
          },
          {
            name: 'Accompanying Teacher / Staff Pass',
            category: TicketCategory.TEACHER,
            description: 'Park entry, lounge access, and park staff assistance. 1 free staff per 15 students.',
            basePrice: 250,
            weekdayPrice: 220,
            weekendPrice: 280,
            complimentaryStaffRatio: 0,
            minQuantity: 0,
            maxQuantity: 100,
          },
          {
            name: 'Additional Adult / Guardian Pass',
            category: TicketCategory.ADULT,
            description: 'For parent chaperones or non-teaching helpers.',
            basePrice: 450,
            weekdayPrice: 420,
            weekendPrice: 500,
            complimentaryStaffRatio: 0,
            minQuantity: 0,
            maxQuantity: 100,
          },
        ],
      },
    },
  });

  // Destination B: Pushpa Gujral Science City
  const scienceCity = await prisma.destination.create({
    data: {
      name: 'Pushpa Gujral Science City',
      businessName: 'Science City Society Punjab',
      slug: 'pushpa-gujral-science-city-kapurthala',
      logo: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=300&auto=format&fit=crop&q=80',
      coverImage: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1200&auto=format&fit=crop&q=80',
      category: 'Science Centre & Planetarium',
      description: 'One of the premier science centres in Northern India spanning 72 acres. Features a giant Space Theatre, digital Planetarium, robotic Dinosaur Park, Flight & Earthquake Simulator, Innovation Hub, and interactive physical science galleries mapped to CBSE and state curricula.',
      address: 'Jalandhar-Kapurthala Road, V.P.O Rasulpur',
      city: 'Kapurthala',
      state: 'Punjab',
      pincode: '144601',
      latitude: 31.3653,
      longitude: 75.4619,
      officialEmail: 'visits@sciencecity.gov.in',
      contactPhone: '+91 1822 501963',
      managerName: 'Dr. Anita Roy',
      website: 'https://pgsciencecity.org',
      status: DestinationStatus.PUBLISHED,
      isVerified: true,
      bookingLeadDays: 2,
      minGroupSize: 20,
      maxGroupSize: 1500,
      openingTime: '09:00',
      closingTime: '17:30',
      weeklyOperatingDays: 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
      safetyInfo: 'Government-certified scientific facility; fire safety compliance; fully fenced campus; clean RO filtered drinking water points; medical infirmary.',
      accessibilityInfo: 'All gallery pavilions are barrier-free with ramps and braille guide brochures.',
      schoolPolicies: 'School authorization letter on official letterhead must be produced at entry. Students must remain with appointed teachers.',
      cancellationPolicy: 'Refund or rescheduling accepted 48 hours prior to scheduled visit.',
      staff: {
        create: {
          userId: scienceCityManager.id,
          role: 'MANAGER',
        },
      },
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1200&auto=format&fit=crop&q=80',
            caption: 'Large Dome Space Theatre & Science Galleries',
            isCover: true,
            sortOrder: 1,
          },
          {
            url: 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=1200&auto=format&fit=crop&q=80',
            caption: 'Life-size Robotic Dinosaur Park',
            isCover: false,
            sortOrder: 2,
          },
        ],
      },
      facilities: {
        create: [
          {
            name: 'General Science Galleries & Energy Park',
            category: 'ACTIVITIES',
            description: 'Hands-on physics, space, biotechnology, and renewable energy exhibitions.',
            isIncluded: true,
            extraPrice: 0,
          },
          {
            name: 'Space Theatre & 3D Laser Show',
            category: 'ACTIVITIES',
            description: 'Immersive planetarium dome film on astronomical missions.',
            isIncluded: false,
            extraPrice: 70,
          },
          {
            name: 'Flight & Earthquake Simulator Experience',
            category: 'ACTIVITIES',
            description: 'Hydraulic motion simulation experience explaining seismic waves and aerodynamics.',
            isIncluded: false,
            extraPrice: 60,
          },
          {
            name: 'Student Lunch Combo (Thali)',
            category: 'MEALS',
            description: 'Fresh cafeteria meal with chole, rice, poori, seasonal subzi, and dessert.',
            isIncluded: false,
            extraPrice: 130,
          },
          {
            name: 'Guided Scientific Tour Mentor',
            category: 'GUIDED_TOURS',
            description: 'Curriculum-aligned science communicator assigned to the group for 3 hours.',
            isIncluded: false,
            extraPrice: 400, // per group flat
          },
        ],
      },
      ticketTypes: {
        create: [
          {
            name: 'School Student Science Pass',
            category: TicketCategory.STUDENT,
            description: 'Admission to all primary galleries, Dinosaur park, and evolution exhibits.',
            basePrice: 220,
            weekdayPrice: 200,
            weekendPrice: 240,
            complimentaryStaffRatio: 12,
            minQuantity: 15,
            maxQuantity: 1800,
          },
          {
            name: 'Accompanying Teacher Pass',
            category: TicketCategory.TEACHER,
            description: 'Teacher entry pass. 1 free for every 12 students.',
            basePrice: 150,
            weekdayPrice: 140,
            weekendPrice: 160,
            complimentaryStaffRatio: 0,
            minQuantity: 0,
            maxQuantity: 80,
          },
        ],
      },
    },
  });

  // Destination C: Wonderla Amusement Park
  const wonderla = await prisma.destination.create({
    data: {
      name: 'Wonderla Amusement Park',
      businessName: 'Wonderla Holidays Ltd.',
      slug: 'wonderla-amusement-park-bengaluru',
      logo: 'https://images.unsplash.com/photo-1572932332645-31f0e7401df4?w=300&auto=format&fit=crop&q=80',
      coverImage: 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=1200&auto=format&fit=crop&q=80',
      category: 'Amusement & Adventure Park',
      description: 'India’s favourite amusement park chain with over 60 land and water rides, world-class rollercoasters, wave pools, and specialized educational mechanics workshops for STEM students.',
      address: '28th km, Mysore Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '562109',
      latitude: 12.8342,
      longitude: 77.4011,
      officialEmail: 'mail.blr@wonderla.com',
      contactPhone: '+91 80 3723 0300',
      managerName: 'Karthik Rao',
      website: 'https://wonderla.com',
      status: DestinationStatus.PUBLISHED,
      isVerified: true,
      bookingLeadDays: 3,
      minGroupSize: 30,
      maxGroupSize: 2000,
      openingTime: '10:00',
      closingTime: '18:30',
      weeklyOperatingDays: 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
      safetyInfo: 'TUV-certified rides; automated shutdown sensors; certified EMT staff and first aid clinics on site.',
      accessibilityInfo: 'Specially abled friendly with designated wheelchair lanes and low-intensity ride zones.',
      schoolPolicies: 'School uniform or official ID card compulsory for availing educational group concession rates.',
      staff: {
        create: {
          userId: wonderlaManager.id,
          role: 'MANAGER',
        },
      },
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=1200&auto=format&fit=crop&q=80',
            caption: 'Flash Tower & Recoil Coaster',
            isCover: true,
            sortOrder: 1,
          },
        ],
      },
      facilities: {
        create: [
          {
            name: 'All Land & Water Thrill Rides',
            category: 'ACTIVITIES',
            description: 'Unlimited access to all certified mechanical and water rides.',
            isIncluded: true,
            extraPrice: 0,
          },
          {
            name: 'Super Buffet Lunch (South & North Indian)',
            category: 'MEALS',
            description: 'Unlimited hygienic buffet lunch in designated school banquet zone.',
            isIncluded: false,
            extraPrice: 195,
          },
        ],
      },
      ticketTypes: {
        create: [
          {
            name: 'School Student Mega Pass',
            category: TicketCategory.STUDENT,
            description: 'Full day student pass with park entry and all rides.',
            basePrice: 580,
            weekdayPrice: 520,
            weekendPrice: 650,
            complimentaryStaffRatio: 15,
            minQuantity: 30,
            maxQuantity: 2000,
          },
          {
            name: 'Staff & Faculty Pass',
            category: TicketCategory.TEACHER,
            description: 'Faculty entry pass. 1 free per 15 students.',
            basePrice: 400,
            weekdayPrice: 380,
            weekendPrice: 450,
            complimentaryStaffRatio: 0,
            minQuantity: 0,
            maxQuantity: 100,
          },
        ],
      },
    },
  });

  // 6. Generate 60 Days of Availability for each destination
  const destinations = [hardysWorld, scienceCity, wonderla];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const dest of destinations) {
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      // Determine day of week: 0 = Sun, 1 = Mon ...
      const day = d.getDay();
      let status: AvailabilityStatus = AvailabilityStatus.AVAILABLE;
      let notes = 'Regular booking open';
      let capacity = dest.maxGroupSize;
      let booked = 0;

      // Close Monday for maintenance on Science City
      if (dest.id === scienceCity.id && day === 1) {
        status = AvailabilityStatus.CLOSED;
        notes = 'Weekly Maintenance Day';
      }

      // Past or holiday blackout example
      if (i === 14) {
        status = AvailabilityStatus.BLACKOUT;
        notes = 'State Holiday / Maintenance Closure';
      }

      // Simulate a date with high bookings
      if (i === 5) {
        status = AvailabilityStatus.LIMITED;
        booked = 850;
        notes = 'Only 350 spots remaining';
      } else if (i === 12) {
        status = AvailabilityStatus.FULLY_BOOKED;
        booked = capacity;
        notes = 'Fully reserved by registered educational groups';
      }

      await prisma.destinationAvailability.create({
        data: {
          destinationId: dest.id,
          date: d,
          status,
          dailyCapacity: capacity,
          bookedCount: booked,
          notes,
        },
      });
    }

    // Set operating hours 7 days
    for (let day = 0; day < 7; day++) {
      await prisma.destinationOperatingHours.create({
        data: {
          destinationId: dest.id,
          dayOfWeek: day,
          isOpen: !(dest.id === scienceCity.id && day === 1),
          openTime: dest.openingTime,
          closeTime: dest.closingTime,
        },
      });
    }
  }

  // 7. Seed Bookings demonstrating core workflows:
  // Date calculations
  const visitDate1 = new Date(today);
  visitDate1.setDate(today.getDate() + 8); // 8 days ahead
  const visitDate2 = new Date(today);
  visitDate2.setDate(today.getDate() + 15); // 15 days ahead
  const visitDate3 = new Date(today);
  visitDate3.setDate(today.getDate() + 22); // 22 days ahead
  const pastVisitDate = new Date(today);
  pastVisitDate.setDate(today.getDate() - 10); // 10 days ago

  // Fetch facilities and ticket types for Hardy's World
  const hardysStudentTicket = await prisma.ticketType.findFirst({
    where: { destinationId: hardysWorld.id, category: TicketCategory.STUDENT },
  });
  const hardysTeacherTicket = await prisma.ticketType.findFirst({
    where: { destinationId: hardysWorld.id, category: TicketCategory.TEACHER },
  });
  const hardysLunchFacility = await prisma.destinationFacility.findFirst({
    where: { destinationId: hardysWorld.id, name: { contains: 'Lunch' } },
  });
  const hardysLockerFacility = await prisma.destinationFacility.findFirst({
    where: { destinationId: hardysWorld.id, name: { contains: 'Lockers' } },
  });

  // BOOKING 1: DPS Ludhiana -> Hardy's World with TRANSPORT REQUIRED = YES
  // Demonstrates:
  // - Linked TravellerServiceRequest created and routed to Super Admin dedicated queue
  // - Admin can inspect and prepare quote
  // - Destination gets booking details WITHOUT the transport coordination burden!
  const booking1 = await prisma.booking.create({
    data: {
      bookingReference: 'BK-2026-HW-001',
      schoolId: dpsSchool.id,
      destinationId: hardysWorld.id,
      createdById: dpsAdmin.id,
      visitDate: visitDate1,
      arrivalTime: '09:45',
      departureTime: '17:00',
      studentCount: 120,
      teacherCount: 10,
      staffCount: 2,
      totalGroupSize: 132,
      tripPurpose: 'Annual School Picnic & Team-Building Excursion (Grades 7 & 8)',
      ageGroups: '12-14 years (Grades 7-8)',
      specialRequirements: 'Two students with mild mobility needs requiring wheelchair ground-floor access.',
      dietaryNeeds: '100% pure vegetarian lunch; 8 students allergic to peanuts.',
      schoolNotes: 'Kindly reserve Pavilion B for assembly.',
      status: BookingStatus.SUBMITTED,
      requiresTransport: true,
      originalQuoteAmount: 64200,
      priceItems: {
        create: [
          {
            ticketTypeId: hardysStudentTicket?.id,
            description: 'Student All-Access Pass (120 students @ ₹350/student)',
            category: 'STUDENT',
            unitPrice: 350,
            quantity: 120,
            totalPrice: 42000,
          },
          {
            ticketTypeId: hardysTeacherTicket?.id,
            description: 'Teacher / Staff Pass (10 teachers, 8 complimentary @ 1:15 ratio, 2 billed @ ₹220)',
            category: 'TEACHER',
            unitPrice: 220,
            quantity: 2,
            totalPrice: 440,
          },
        ],
      },
      facilities: {
        create: [
          {
            facilityId: hardysLunchFacility!.id,
            quantity: 132,
            unitPrice: 160,
            totalPrice: 21120,
          },
          {
            facilityId: hardysLockerFacility!.id,
            quantity: 22,
            unitPrice: 30,
            totalPrice: 660,
          },
        ],
      },
      quoteVersions: {
        create: {
          versionNumber: 1,
          studentTotal: 42000,
          staffTotal: 440,
          addOnsTotal: 21780,
          taxAmount: 0,
          discountAmount: 0,
          grandTotal: 64220,
          quoteNotes: 'Complimentary ratio: 8 teachers free based on 120 students.',
          isAccepted: false,
        },
      },
      statusHistory: {
        create: {
          fromStatus: null,
          toStatus: BookingStatus.SUBMITTED,
          changedByUserId: dpsAdmin.id,
          reason: 'Initial booking request submitted by school excursion head.',
        },
      },
      travellerRequest: {
        create: {
          schoolId: dpsSchool.id,
          destinationId: hardysWorld.id,
          pickupAddress: 'Delhi Public School Campus, Vill Bhamian Kalan, Tajpur Road',
          pickupCity: 'Ludhiana',
          pickupTime: '08:15',
          returnJourney: true,
          passengerCount: 132,
          preferredVehicle: '3x AC Deluxe Coaches (45-seater each)',
          numberOfVehicles: 3,
          acPreference: AcPreference.AC,
          accessibilityNeeds: 'Luggage boot space for 2 folding wheelchairs; ground-clearance low entry.',
          specialInstructions: 'GPS-tracked buses mandatory. All drivers must have verified police backgrounds and speed governors.',
          status: TravellerStatus.SOURCING_TRANSPORT,
          assignedAdminId: adminUser.id,
          quoteAmount: 28500, // ₹9500 per coach
          adminNotes: 'Contacted Ludhiana Transport Fleet Partner. Three 49-seater BharatBenz AC coaches reserved on hold.',
        },
      },
    },
  });

  // BOOKING 2: St. Xavier's -> Science City Kapurthala with NO TRANSPORT (Direct)
  // Demonstrates:
  // - Direct destination workflow: School has its own buses
  // - Status = SUBMITTED, in Destination inbox
  const scienceStudentTicket = await prisma.ticketType.findFirst({
    where: { destinationId: scienceCity.id, category: TicketCategory.STUDENT },
  });
  const scienceTeacherTicket = await prisma.ticketType.findFirst({
    where: { destinationId: scienceCity.id, category: TicketCategory.TEACHER },
  });
  const scienceLaserFacility = await prisma.destinationFacility.findFirst({
    where: { destinationId: scienceCity.id, name: { contains: 'Space Theatre' } },
  });

  const booking2 = await prisma.booking.create({
    data: {
      bookingReference: 'BK-2026-SC-002',
      schoolId: stXavierSchool.id,
      destinationId: scienceCity.id,
      createdById: stXavierAdmin.id,
      visitDate: visitDate2,
      arrivalTime: '10:00',
      departureTime: '16:00',
      studentCount: 90,
      teacherCount: 8,
      staffCount: 1,
      totalGroupSize: 99,
      tripPurpose: 'Physics & Astronomy Curriculum Field Trip (Grade 9)',
      ageGroups: '14-15 years (Grade 9)',
      specialRequirements: 'Session with Planetarium Director if available.',
      schoolNotes: 'School is arranging its own 2 yellow school buses.',
      status: BookingStatus.SUBMITTED,
      requiresTransport: false,
      originalQuoteAmount: 24300,
      priceItems: {
        create: [
          {
            ticketTypeId: scienceStudentTicket?.id,
            description: 'School Student Science Pass (90 students @ ₹200/student)',
            category: 'STUDENT',
            unitPrice: 200,
            quantity: 90,
            totalPrice: 18000,
          },
        ],
      },
      facilities: {
        create: [
          {
            facilityId: scienceLaserFacility!.id,
            quantity: 90,
            unitPrice: 70,
            totalPrice: 6300,
          },
        ],
      },
      quoteVersions: {
        create: {
          versionNumber: 1,
          studentTotal: 18000,
          staffTotal: 0,
          addOnsTotal: 6300,
          taxAmount: 0,
          discountAmount: 0,
          grandTotal: 24300,
          quoteNotes: 'Complimentary ratio: all 8 teachers free based on 90 students (1:12).',
          isAccepted: false,
        },
      },
      statusHistory: {
        create: {
          fromStatus: null,
          toStatus: BookingStatus.SUBMITTED,
          changedByUserId: stXavierAdmin.id,
          reason: 'Direct school request submitted without platform transport.',
        },
      },
    },
  });

  // BOOKING 3: Army Public School -> Hardy's World (ACCEPTED state)
  const booking3 = await prisma.booking.create({
    data: {
      bookingReference: 'BK-2026-HW-003',
      schoolId: apsSchool.id,
      destinationId: hardysWorld.id,
      createdById: apsAdmin.id,
      visitDate: visitDate3,
      arrivalTime: '09:30',
      departureTime: '16:30',
      studentCount: 180,
      teacherCount: 14,
      staffCount: 3,
      totalGroupSize: 197,
      tripPurpose: 'Annual School Sports & Leadership Adventure Camp',
      ageGroups: '13-16 years',
      status: BookingStatus.ACCEPTED,
      requiresTransport: false,
      originalQuoteAmount: 93400,
      confirmedQuoteAmount: 93400,
      priceItems: {
        create: [
          {
            ticketTypeId: hardysStudentTicket?.id,
            description: 'Student All-Access Pass (180 students @ ₹350/student)',
            category: 'STUDENT',
            unitPrice: 350,
            quantity: 180,
            totalPrice: 63000,
          },
        ],
      },
      facilities: {
        create: [
          {
            facilityId: hardysLunchFacility!.id,
            quantity: 190,
            unitPrice: 160,
            totalPrice: 30400,
          },
        ],
      },
      quoteVersions: {
        create: {
          versionNumber: 1,
          studentTotal: 63000,
          staffTotal: 0,
          addOnsTotal: 30400,
          grandTotal: 93400,
          isAccepted: true,
        },
      },
      statusHistory: {
        create: [
          {
            fromStatus: null,
            toStatus: BookingStatus.SUBMITTED,
            changedByUserId: apsAdmin.id,
            reason: 'Booking submitted by Army Public School.',
          },
          {
            fromStatus: BookingStatus.SUBMITTED,
            toStatus: BookingStatus.ACCEPTED,
            changedByUserId: hardysManager.id,
            reason: 'Capacity verified and special lunch pavilion assigned.',
          },
        ],
      },
    },
  });

  // BOOKING 4: DPS -> Science City (CHANGES_REQUESTED state)
  const booking4 = await prisma.booking.create({
    data: {
      bookingReference: 'BK-2026-SC-004',
      schoolId: dpsSchool.id,
      destinationId: scienceCity.id,
      createdById: dpsAdmin.id,
      visitDate: visitDate1,
      arrivalTime: '10:30',
      departureTime: '15:30',
      studentCount: 240,
      teacherCount: 16,
      staffCount: 4,
      totalGroupSize: 260,
      tripPurpose: 'Grade 6 Science Fair & Dinosaur Fossil Exploration',
      status: BookingStatus.CHANGES_REQUESTED,
      requiresTransport: false,
      originalQuoteAmount: 48000,
      priceItems: {
        create: [
          {
            ticketTypeId: scienceStudentTicket?.id,
            description: 'School Student Science Pass (240 students @ ₹200)',
            category: 'STUDENT',
            unitPrice: 200,
            quantity: 240,
            totalPrice: 48000,
          },
        ],
      },
      quoteVersions: {
        create: {
          versionNumber: 1,
          studentTotal: 48000,
          staffTotal: 0,
          addOnsTotal: 0,
          grandTotal: 48000,
          isAccepted: false,
        },
      },
      changeRequests: {
        create: {
          requestedByRole: 'DESTINATION',
          proposedDate: new Date(today.getTime() + 9 * 86400000), // Next day proposed
          proposedStudentCount: 200,
          reason: 'Space Theatre capacity on the requested date is reserved until 2:00 PM by another registered school. We recommend shifting by 1 day or capping the batch at 200 students for morning show slot.',
          status: 'PENDING',
        },
      },
      statusHistory: {
        create: [
          {
            fromStatus: null,
            toStatus: BookingStatus.SUBMITTED,
            changedByUserId: dpsAdmin.id,
          },
          {
            fromStatus: BookingStatus.SUBMITTED,
            toStatus: BookingStatus.CHANGES_REQUESTED,
            changedByUserId: scienceCityManager.id,
            reason: 'Slot conflict on Space Theatre; proposed alternative date & batch split.',
          },
        ],
      },
    },
  });

  // 8. Platform Settings
  await prisma.platformSetting.createMany({
    data: [
      {
        key: 'PLATFORM_NAME',
        value: 'SCHOOLDEST',
        description: 'B2B School Destination Booking Platform',
      },
      {
        key: 'BOOKING_LEAD_TIME_DAYS',
        value: '2',
        description: 'Minimum advance booking window required across destinations.',
      },
      {
        key: 'TRAVELLER_SERVICE_HOTLINE',
        value: '+91 98111 22334',
        description: 'Central fleet coordination helpdesk managed by platform super admins.',
      },
      {
        key: 'GST_RATE_PERCENT',
        value: '0',
        description: 'Applicable GST percentage on educational group tickets.',
      },
    ],
  });

  // 9. Initial Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: adminUser.id,
        title: 'New Traveller Service Request #BK-2026-HW-001',
        message: 'Delhi Public School requested 3x AC Deluxe Coaches for 132 passengers on Ludhiana route.',
        type: 'TRANSPORT',
        link: '/admin/traveller-requests',
      },
      {
        userId: hardysManager.id,
        title: 'New School Booking Request #BK-2026-HW-001',
        message: 'Delhi Public School submitted a visit request for 132 visitors on Hardy’s World.',
        type: 'BOOKING',
        link: '/destination/bookings',
      },
      {
        userId: dpsAdmin.id,
        title: 'Alternative Date Proposed for #BK-2026-SC-004',
        message: 'Science City Kapurthala proposed shifting your visit date to accommodate Space Theatre show.',
        type: 'BOOKING',
        link: '/school/bookings',
      },
    ],
  });

  // 10. Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        action: 'DESTINATION_ONBOARDED',
        entityType: 'Destination',
        entityId: hardysWorld.id,
        details: 'Approved Hardy’s World profile, facilities, ticket tiers, and verified amusement park license.',
      },
      {
        userId: dpsAdmin.id,
        action: 'BOOKING_CREATED',
        entityType: 'Booking',
        entityId: booking1.id,
        details: 'Created visit booking BK-2026-HW-001 for 132 visitors with transport assistance required.',
      },
      {
        userId: adminUser.id,
        action: 'TRAVELLER_QUOTE_ISSUED',
        entityType: 'TravellerRequest',
        entityId: booking1.id,
        details: 'Super Admin sourced 3x AC Deluxe coaches and entered quote of ₹28,500.',
      },
    ],
  });

  console.log('✅ Seed completed successfully with realistic Indian school destinations, verified accounts, and workflows!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
