-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'DESTINATION_MANAGER', 'DESTINATION_STAFF', 'SCHOOL_ADMIN', 'SCHOOL_STAFF');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DestinationStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('STUDENT', 'TEACHER', 'ADULT', 'CHILD', 'SPECIAL_PACKAGE');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'LIMITED', 'PENDING_CONFIRMATION', 'FULLY_BOOKED', 'CLOSED', 'BLACKOUT');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'AWAITING_SCHOOL_RESPONSE', 'ACCEPTED', 'AWAITING_CONFIRMATION', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TravellerStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'MORE_INFO_REQUIRED', 'SOURCING_TRANSPORT', 'QUOTE_PREPARED', 'AWAITING_SCHOOL_APPROVAL', 'CONFIRMED', 'UNAVAILABLE', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AcPreference" AS ENUM ('AC', 'NON_AC', 'NO_PREFERENCE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'SCHOOL_STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "board" TEXT,
    "schoolType" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "officialEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "designation" TEXT,
    "approximateStrength" INTEGER,
    "website" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'VERIFIED',
    "verificationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolStaff" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'COORDINATOR',
    "designation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Destination" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "coverImage" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "officialEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "managerName" TEXT NOT NULL,
    "website" TEXT,
    "status" "DestinationStatus" NOT NULL DEFAULT 'PUBLISHED',
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "bookingLeadDays" INTEGER NOT NULL DEFAULT 2,
    "minGroupSize" INTEGER NOT NULL DEFAULT 20,
    "maxGroupSize" INTEGER NOT NULL DEFAULT 1500,
    "openingTime" TEXT NOT NULL DEFAULT '09:30',
    "closingTime" TEXT NOT NULL DEFAULT '18:00',
    "weeklyOperatingDays" TEXT NOT NULL DEFAULT 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
    "safetyInfo" TEXT,
    "accessibilityInfo" TEXT,
    "schoolPolicies" TEXT,
    "cancellationPolicy" TEXT,
    "refundPolicy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DestinationStaff" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MANAGER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DestinationStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DestinationImage" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DestinationImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DestinationFacility" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "description" TEXT,
    "isIncluded" BOOLEAN NOT NULL DEFAULT false,
    "extraPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "availableCapacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DestinationFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketType" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL DEFAULT 'STUDENT',
    "description" TEXT,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "weekdayPrice" DOUBLE PRECISION,
    "weekendPrice" DOUBLE PRECISION,
    "complimentaryStaffRatio" INTEGER NOT NULL DEFAULT 15,
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    "maxQuantity" INTEGER NOT NULL DEFAULT 2000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DestinationOperatingHours" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "openTime" TEXT NOT NULL DEFAULT '09:30',
    "closeTime" TEXT NOT NULL DEFAULT '18:00',

    CONSTRAINT "DestinationOperatingHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DestinationAvailability" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "dailyCapacity" INTEGER NOT NULL DEFAULT 800,
    "bookedCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DestinationAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "bookingReference" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "visitDate" DATE NOT NULL,
    "arrivalTime" TEXT NOT NULL DEFAULT '10:00',
    "departureTime" TEXT NOT NULL DEFAULT '16:30',
    "studentCount" INTEGER NOT NULL,
    "teacherCount" INTEGER NOT NULL,
    "staffCount" INTEGER NOT NULL DEFAULT 0,
    "totalGroupSize" INTEGER NOT NULL,
    "tripPurpose" TEXT,
    "ageGroups" TEXT,
    "specialRequirements" TEXT,
    "dietaryNeeds" TEXT,
    "accessibilityRequirements" TEXT,
    "schoolNotes" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'SUBMITTED',
    "requiresTransport" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "destinationNotes" TEXT,
    "originalQuoteAmount" DOUBLE PRECISION NOT NULL,
    "confirmedQuoteAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingFacility" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BookingFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingPriceItem" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "ticketTypeId" TEXT,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BookingPriceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingQuoteVersion" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "studentTotal" DOUBLE PRECISION NOT NULL,
    "staffTotal" DOUBLE PRECISION NOT NULL,
    "addOnsTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL,
    "quoteNotes" TEXT,
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingQuoteVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingChangeRequest" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "requestedByRole" TEXT NOT NULL,
    "proposedDate" DATE,
    "proposedStudentCount" INTEGER,
    "proposedTeacherCount" INTEGER,
    "proposedFacilities" TEXT,
    "proposedQuote" DOUBLE PRECISION,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "BookingChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingStatusHistory" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fromStatus" "BookingStatus",
    "toStatus" "BookingStatus" NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravellerServiceRequest" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "pickupCity" TEXT NOT NULL,
    "pickupTime" TEXT NOT NULL DEFAULT '08:00',
    "returnJourney" BOOLEAN NOT NULL DEFAULT true,
    "passengerCount" INTEGER NOT NULL,
    "preferredVehicle" TEXT NOT NULL,
    "numberOfVehicles" INTEGER NOT NULL DEFAULT 1,
    "acPreference" "AcPreference" NOT NULL DEFAULT 'AC',
    "accessibilityNeeds" TEXT,
    "specialInstructions" TEXT,
    "status" "TravellerStatus" NOT NULL DEFAULT 'NEW',
    "assignedAdminId" TEXT,
    "vehicleDetails" TEXT,
    "quoteAmount" DOUBLE PRECISION,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravellerServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "School_officialEmail_key" ON "School"("officialEmail");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolStaff_schoolId_userId_key" ON "SchoolStaff"("schoolId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Destination_slug_key" ON "Destination"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Destination_officialEmail_key" ON "Destination"("officialEmail");

-- CreateIndex
CREATE UNIQUE INDEX "DestinationStaff_destinationId_userId_key" ON "DestinationStaff"("destinationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "DestinationOperatingHours_destinationId_dayOfWeek_key" ON "DestinationOperatingHours"("destinationId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "DestinationAvailability_destinationId_date_key" ON "DestinationAvailability"("destinationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingReference_key" ON "Booking"("bookingReference");

-- CreateIndex
CREATE UNIQUE INDEX "TravellerServiceRequest_bookingId_key" ON "TravellerServiceRequest"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSetting_key_key" ON "PlatformSetting"("key");

-- AddForeignKey
ALTER TABLE "SchoolStaff" ADD CONSTRAINT "SchoolStaff_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolStaff" ADD CONSTRAINT "SchoolStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationStaff" ADD CONSTRAINT "DestinationStaff_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationStaff" ADD CONSTRAINT "DestinationStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationImage" ADD CONSTRAINT "DestinationImage_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationFacility" ADD CONSTRAINT "DestinationFacility_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketType" ADD CONSTRAINT "TicketType_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationOperatingHours" ADD CONSTRAINT "DestinationOperatingHours_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationAvailability" ADD CONSTRAINT "DestinationAvailability_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingFacility" ADD CONSTRAINT "BookingFacility_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingFacility" ADD CONSTRAINT "BookingFacility_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "DestinationFacility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPriceItem" ADD CONSTRAINT "BookingPriceItem_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPriceItem" ADD CONSTRAINT "BookingPriceItem_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingQuoteVersion" ADD CONSTRAINT "BookingQuoteVersion_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingChangeRequest" ADD CONSTRAINT "BookingChangeRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingStatusHistory" ADD CONSTRAINT "BookingStatusHistory_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingStatusHistory" ADD CONSTRAINT "BookingStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravellerServiceRequest" ADD CONSTRAINT "TravellerServiceRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravellerServiceRequest" ADD CONSTRAINT "TravellerServiceRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravellerServiceRequest" ADD CONSTRAINT "TravellerServiceRequest_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravellerServiceRequest" ADD CONSTRAINT "TravellerServiceRequest_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

