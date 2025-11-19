/**
 * Registration Type Definitions
 * TEMS - Terrapin Events Management System
 * 
 * Defines TypeScript types for the registration system including
 * registration records, status enums, and input/output types.
 */

import { Event } from './event.types';

/**
 * Registration Status Enum
 * Represents all possible states of an event registration
 */
export enum RegistrationStatus {
  /** User is successfully registered for the event */
  REGISTERED = 'REGISTERED',
  
  /** User is on the waitlist (event at capacity) */
  WAITLISTED = 'WAITLISTED',
  
  /** User has checked in and attended the event */
  ATTENDED = 'ATTENDED',
  
  /** User registered but did not attend */
  NO_SHOW = 'NO_SHOW',
  
  /** User cancelled their registration */
  CANCELLED = 'CANCELLED',
  
  /** User was promoted from waitlist but hasn't accepted yet (24hr window) */
  PROMOTION_PENDING = 'PROMOTION_PENDING',
}

/**
 * Core Registration Interface
 * Represents a user's registration for an event
 */
export interface Registration {
  /** Unique registration ID */
  id: string;
  
  /** User ID who registered */
  userId: string;
  
  /** Event ID for this registration */
  eventId: string;
  
  /** Current registration status */
  status: RegistrationStatus;
  
  /** QR code data for check-in */
  qrCode: string;
  
  /** Position in waitlist (null if registered) */
  waitlistPosition?: number;
  
  /** When the registration was created */
  registeredAt: string;
  
  /** When the user checked in (null if not attended) */
  attendedAt?: string;
  
  /** When waitlist promotion expires (for PROMOTION_PENDING status) */
  promotionDeadline?: string;
  
  /** Full event details (populated from query) */
  event?: Event;
}

/**
 * Input type for creating a new registration
 */
export interface RegisterForEventInput {
  /** Event ID to register for */
  eventId: string;
  
  /** Idempotency key to prevent duplicate registrations */
  idempotencyKey?: string;
}

/**
 * Input type for cancelling a registration
 */
export interface CancelRegistrationInput {
  /** Registration ID to cancel */
  registrationId: string;
}

/**
 * Input type for checking in an attendee
 */
export interface CheckInAttendeeInput {
  /** Registration ID */
  registrationId: string;
  
  /** QR code value to verify */
  qrCode: string;
}

/**
 * Input type for listing user's registrations
 */
export interface ListRegistrationsInput {
  /** Filter by status (optional) */
  status?: RegistrationStatus;
  
  /** Pagination limit */
  limit?: number;
  
  /** Pagination token */
  nextToken?: string;
}

/**
 * Registration connection for paginated results
 */
export interface RegistrationConnection {
  items: Registration[];
  nextToken: string | null;
}

/**
 * Event capacity information
 * Used to determine if user can register or will be waitlisted
 */
export interface EventCapacityInfo {
  eventId: string;
  capacity: number;
  registeredCount: number;
  waitlistCount: number;
  availableSeats: number;
  isFull: boolean;
}

/**
 * Registration statistics for dashboard
 */
export interface RegistrationStats {
  totalRegistrations: number;
  upcomingEvents: number;
  attendedEvents: number;
  waitlistedEvents: number;
  cancelledEvents: number;
}

/**
 * Helper Functions
 */

/**
 * Get display-friendly status text
 */
export function getRegistrationStatusText(status: RegistrationStatus): string {
  switch (status) {
    case RegistrationStatus.REGISTERED:
      return 'Registered';
    case RegistrationStatus.WAITLISTED:
      return 'Waitlisted';
    case RegistrationStatus.ATTENDED:
      return 'Attended';
    case RegistrationStatus.NO_SHOW:
      return 'No Show';
    case RegistrationStatus.CANCELLED:
      return 'Cancelled';
    case RegistrationStatus.PROMOTION_PENDING:
      return 'Promotion Pending';
    default:
      return 'Unknown';
  }
}

/**
 * Get Tailwind color classes for status badge
 */
export function getRegistrationStatusColor(status: RegistrationStatus): string {
  switch (status) {
    case RegistrationStatus.REGISTERED:
      return 'bg-green-100 text-green-800 border-green-200';
    case RegistrationStatus.WAITLISTED:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case RegistrationStatus.ATTENDED:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case RegistrationStatus.NO_SHOW:
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case RegistrationStatus.CANCELLED:
      return 'bg-red-100 text-red-800 border-red-200';
    case RegistrationStatus.PROMOTION_PENDING:
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Check if registration can be cancelled
 */
export function canCancelRegistration(registration: Registration, event?: Event): boolean {
  // Cannot cancel if already attended, no-show, or cancelled
  if ([
    RegistrationStatus.ATTENDED,
    RegistrationStatus.NO_SHOW,
    RegistrationStatus.CANCELLED,
  ].includes(registration.status)) {
    return false;
  }
  
  // Cannot cancel if event has already started or ended
  if (event) {
    const eventStart = new Date(event.startDateTime);
    const now = new Date();
    if (now >= eventStart) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if user can accept waitlist promotion
 */
export function canAcceptPromotion(registration: Registration): boolean {
  if (registration.status !== RegistrationStatus.PROMOTION_PENDING) {
    return false;
  }
  
  if (!registration.promotionDeadline) {
    return false;
  }
  
  const deadline = new Date(registration.promotionDeadline);
  const now = new Date();
  
  return now < deadline;
}

/**
 * Get time remaining for promotion acceptance
 */
export function getPromotionTimeRemaining(registration: Registration): string | null {
  if (!registration.promotionDeadline) {
    return null;
  }
  
  const deadline = new Date(registration.promotionDeadline);
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  
  if (diff <= 0) {
    return 'Expired';
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  
  return `${minutes}m`;
}

/**
 * Generate idempotency key for registration
 * Format: userId-eventId-timestamp
 */
export function generateIdempotencyKey(userId: string, eventId: string): string {
  const timestamp = Date.now();
  return `${userId}-${eventId}-${timestamp}`;
}

/**
 * Format registration date for display
 */
export function formatRegistrationDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
