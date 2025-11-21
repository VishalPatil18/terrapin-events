/**
 * Registration Types for TEMS
 * Domain models and DTOs for event registration management
 */

// Registration Status Enum
export enum RegistrationStatus {
  REGISTERED = 'REGISTERED',
  WAITLISTED = 'WAITLISTED',
  PROMOTION_PENDING = 'PROMOTION_PENDING', // Promoted from waitlist, pending user confirmation
  ATTENDED = 'ATTENDED',
  NO_SHOW = 'NO_SHOW',
  CANCELLED = 'CANCELLED',
}

// Registration Domain Model (DynamoDB item)
export interface Registration {
  // DynamoDB Keys
  PK: string;  // USER#<userId> or EVENT#<eventId>
  SK: string;  // REGISTRATION#<registrationId> or WAITLIST#<position>
  GSI1PK?: string;  // EVENT#<eventId>
  GSI1SK?: string;  // STATUS#<status>#<timestamp>
  
  // Domain Fields
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  eventId: string;
  eventTitle: string;
  status: RegistrationStatus;
  qrCode?: string;  // Base64 encoded QR code image
  qrCodeData?: string;  // QR code verification data
  waitlistPosition?: number;
  promotionDeadline?: string;  // ISO timestamp - 24h from promotion
  registeredAt: string;  // ISO timestamp
  attendedAt?: string;  // ISO timestamp
  cancelledAt?: string;  // ISO timestamp
  createdAt: string;
  updatedAt: string;
}

/**
 * GraphQL Registration Type
 * Matches the AppSync GraphQL schema exactly
 * Used as the return type for Lambda resolvers
 * 
 * Note: The 'event' field is populated by AppSync field resolver,
 * so it's not included here. Lambdas return this type, and AppSync
 * automatically adds the event data when the query requests it.
 */
export interface GraphQLRegistration {
  id: string;
  userId: string;
  eventId: string;
  status: RegistrationStatus;
  qrCode: string;  // Required in GraphQL schema (empty string if not generated yet)
  waitlistPosition?: number | null;
  promotionDeadline?: string | null;
  registeredAt: string;
  attendedAt?: string | null;
}

// GraphQL Input Types
export interface RegisterForEventInput {
  eventId: string;
  idempotencyKey?: string;  // Optional - for preventing duplicate registrations
}

export interface CancelRegistrationInput {
  registrationId: string;  // Registration ID
}

export interface CheckInAttendeeInput {
  registrationId: string;
  qrCodeData: string;  // For verification
}

// DTOs for Lambda handlers
export interface RegistrationEvent {
  registrationId: string;
  eventId: string;
  userId: string;
  userEmail: string;
  userName: string;
  status: RegistrationStatus;
  qrCode?: string;
  waitlistPosition?: number;
  timestamp: string;
}

// Rate limiting types
export interface RateLimitRecord {
  PK: string;  // USER#<userId>
  SK: string;  // RATELIMIT#<action>
  count: number;
  windowStart: string;  // ISO timestamp
  expiresAt: number;  // TTL for DynamoDB
}

// Email notification types
export interface EmailNotificationPayload {
  type: 'REGISTRATION_CONFIRMED' | 'WAITLIST_ADDED' | 'WAITLIST_PROMOTED' | 'REGISTRATION_CANCELLED';
  recipientEmail: string;
  recipientName: string;
  eventTitle: string;
  eventStartDateTime: string;
  registrationId?: string;
  qrCode?: string;
  waitlistPosition?: number;
  promotionDeadline?: string;
}

// QR Code generation types
export interface QRCodeData {
  registrationId: string;
  eventId: string;
  userId: string;
  timestamp: string;
  signature: string;  // HMAC signature for verification
}

// Waitlist management types
export interface WaitlistEntry {
  PK: string;  // EVENT#<eventId>
  SK: string;  // WAITLIST#<position>
  GSI1PK: string;  // USER#<userId>
  GSI1SK: string;  // WAITLIST#<eventId>#<position>
  
  registrationId: string;
  userId: string;
  userEmail: string;
  userName: string;
  eventId: string;
  position: number;
  joinedAt: string;  // ISO timestamp
  expiresAt?: number;  // TTL for auto-cleanup
}

// Capacity check result
export interface CapacityCheckResult {
  hasCapacity: boolean;
  availableSlots: number;
  totalCapacity: number;
  registeredCount: number;
}

/**
 * Event Capacity Info
 * Matches the GraphQL EventCapacityInfo type
 * Returned by getEventCapacity query
 */
export interface EventCapacityInfo {
  eventId: string;
  capacity: number;
  registeredCount: number;
  waitlistCount: number;
  availableSeats: number;
  isFull: boolean;
}

// Registration validation result
export interface RegistrationValidation {
  isValid: boolean;
  errors: string[];
  eventExists: boolean;
  userAlreadyRegistered: boolean;
  eventIsFull: boolean;
  eventIsCancelled: boolean;
}
