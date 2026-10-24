export type Role = 'SUPER_ADMIN' | 'DESTINATION_MANAGER' | 'DESTINATION_STAFF' | 'SCHOOL_ADMIN' | 'SCHOOL_STAFF';
export type PortalType = 'SCHOOL' | 'DESTINATION';

export type BookingStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'AWAITING_SCHOOL_RESPONSE'
  | 'ACCEPTED'
  | 'AWAITING_CONFIRMATION'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED';

export type AvailabilityStatus =
  | 'AVAILABLE'
  | 'LIMITED'
  | 'PENDING_CONFIRMATION'
  | 'FULLY_BOOKED'
  | 'CLOSED'
  | 'BLACKOUT';

export type TravellerStatus =
  | 'NEW'
  | 'UNDER_REVIEW'
  | 'MORE_INFO_REQUIRED'
  | 'SOURCING_TRANSPORT'
  | 'QUOTE_PREPARED'
  | 'AWAITING_SCHOOL_APPROVAL'
  | 'CONFIRMED'
  | 'UNAVAILABLE'
  | 'CANCELLED'
  | 'COMPLETED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  portalType?: PortalType | null;
  phone?: string;
  neonAuthId?: string;
  firebaseUid?: string;
  school?: School | null;
  destination?: Destination | null;
}

export interface School {
  id: string;
  name: string;
  logo?: string;
  board?: string;
  schoolType?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  officialEmail: string;
  contactPhone: string;
  contactPerson: string;
  designation?: string;
  approximateStrength?: number;
  website: string;
  gstNumber: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verificationNotes?: string;
}

export interface DestinationImage {
  id: string;
  url: string;
  publicId?: string;
  caption?: string;
  isCover: boolean;
  sortOrder: number;
}

export interface DestinationFacility {
  id: string;
  name: string;
  category: string;
  description?: string;
  isIncluded: boolean;
  extraPrice: number;
  availableCapacity?: number;
}

export interface TicketType {
  id: string;
  destinationId: string;
  name: string;
  category: 'STUDENT' | 'TEACHER' | 'ADULT' | 'CHILD' | 'SPECIAL_PACKAGE';
  description?: string;
  basePrice: number;
  weekdayPrice?: number;
  weekendPrice?: number;
  complimentaryStaffRatio: number;
  minQuantity: number;
  maxQuantity: number;
  isActive: boolean;
}

export interface OperatingHours {
  id: string;
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface Destination {
  id: string;
  name: string;
  businessName: string;
  slug: string;
  logo?: string;
  coverImage?: string;
  category: string;
  description: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  officialEmail: string;
  contactPhone: string;
  managerName: string;
  googleProfile: string;
  website?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED';
  isVerified: boolean;
  guideAvailable?: boolean;
  bookingLeadDays: number;
  minGroupSize: number;
  maxGroupSize: number;
  openingTime: string;
  closingTime: string;
  weeklyOperatingDays?: string;
  safetyInfo?: string;
  accessibilityInfo?: string;
  schoolPolicies?: string;
  cancellationPolicy?: string;
  refundPolicy?: string;
  startingPrice?: number;
  images?: DestinationImage[];
  facilities?: DestinationFacility[];
  ticketTypes?: TicketType[];
  operatingHours?: OperatingHours[];
}

export interface AvailabilityDay {
  date: string;
  day: number;
  dayOfWeek: number;
  status: AvailabilityStatus;
  capacity: number;
  bookedCount: number;
  remainingCapacity: number;
  notes?: string;
  isPast: boolean;
}

export interface BookingPriceItem {
  id: string;
  description: string;
  category: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface BookingFacilityItem {
  id: string;
  facility: DestinationFacility;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface BookingQuoteVersion {
  id: string;
  versionNumber: number;
  studentTotal: number;
  staffTotal: number;
  addOnsTotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  quoteNotes?: string;
  isAccepted: boolean;
}

export interface BookingChangeRequest {
  id: string;
  requestedByRole: 'DESTINATION' | 'SCHOOL';
  proposedDate?: string;
  proposedStudentCount?: number;
  proposedTeacherCount?: number;
  reason: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export interface TravellerServiceRequest {
  id: string;
  bookingId: string;
  schoolId: string;
  destinationId: string;
  pickupAddress: string;
  pickupCity: string;
  pickupTime: string;
  returnJourney: boolean;
  passengerCount: number;
  preferredVehicle: string;
  numberOfVehicles: number;
  acPreference: 'AC' | 'NON_AC' | 'NO_PREFERENCE';
  accessibilityNeeds?: string;
  specialInstructions?: string;
  status: TravellerStatus;
  assignedAdminId?: string;
  vehicleDetails?: string;
  quoteAmount?: number;
  adminNotes?: string;
  createdAt: string;
  school?: School;
  destination?: Destination;
  booking?: {
    id: string;
    bookingReference: string;
    visitDate: string;
    totalGroupSize: number;
    status: BookingStatus;
  };
  assignedAdmin?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

export interface Booking {
  id: string;
  bookingReference: string;
  schoolId: string;
  destinationId: string;
  createdById: string;
  visitDate: string;
  arrivalTime: string;
  departureTime: string;
  studentCount: number;
  teacherCount: number;
  staffCount: number;
  totalGroupSize: number;
  tripPurpose?: string;
  ageGroups?: string;
  specialRequirements?: string;
  dietaryNeeds?: string;
  accessibilityRequirements?: string;
  schoolNotes?: string;
  status: BookingStatus;
  requiresTransport: boolean;
  rejectionReason?: string;
  destinationNotes?: string;
  originalQuoteAmount: number;
  confirmedQuoteAmount?: number;
  createdAt: string;
  school?: School;
  destination?: Destination;
  facilities?: BookingFacilityItem[];
  priceItems?: BookingPriceItem[];
  quoteVersions?: BookingQuoteVersion[];
  changeRequests?: BookingChangeRequest[];
  statusHistory?: {
    id: string;
    fromStatus: BookingStatus | null;
    toStatus: BookingStatus;
    reason?: string;
    createdAt: string;
    changedBy?: { name: string; role: Role };
  }[];
  travellerRequest?: TravellerServiceRequest | null;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
  user?: {
    name: string;
    email: string;
    role: Role;
  };
}

export type SuperAdminInvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';

export interface SuperAdminInvitationItem {
  id: string;
  email: string;
  token: string;
  status: SuperAdminInvitationStatus;
  notes?: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  invitedById: string;
  acceptedById?: string | null;
  invitedBy?: {
    id: string;
    name: string;
    email: string;
  };
  acceptedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface SuperAdminUserItem {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: Role;
  isActive: boolean;
  emailVerified: boolean;
  neonAuthId?: string | null;
  firebaseUid?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
