/**
 * TEMS Notification System - Type Definitions
 * 
 * Complete type definitions for the multi-channel notification system.
 * Supports email (SES) and in-app notifications with preferences and delivery tracking.
 * 
 * @module notifications/types
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Types of notifications sent to users
 */
export enum NotificationType {
  REGISTRATION_CONFIRMED = 'REGISTRATION_CONFIRMED',
  WAITLIST_ADDED = 'WAITLIST_ADDED',
  WAITLIST_PROMOTED = 'WAITLIST_PROMOTED',
  REGISTRATION_CANCELLED = 'REGISTRATION_CANCELLED',
  EVENT_REMINDER_24H = 'EVENT_REMINDER_24H',
  EVENT_REMINDER_1H = 'EVENT_REMINDER_1H',
  EVENT_UPDATED = 'EVENT_UPDATED',
  EVENT_CANCELLED = 'EVENT_CANCELLED',
}

/**
 * Delivery channels for notifications
 */
export enum NotificationChannel {
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
}

/**
 * Status of notification delivery
 */
export enum DeliveryStatus {
  PENDING = 'PENDING',       // Queued for sending
  SENT = 'SENT',            // Sent to provider (SES)
  DELIVERED = 'DELIVERED',   // Successfully delivered
  BOUNCED = 'BOUNCED',      // Email bounced
  COMPLAINED = 'COMPLAINED', // Spam complaint
  FAILED = 'FAILED',        // Failed after retries
}

/**
 * Notification frequency preferences
 */
export enum NotificationFrequency {
  IMMEDIATE = 'IMMEDIATE',
  DAILY_DIGEST = 'DAILY_DIGEST',
  WEEKLY_DIGEST = 'WEEKLY_DIGEST',
}

/**
 * Priority levels for notifications
 */
export enum NotificationPriority {
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
  LOW = 'LOW',
}

// ============================================================================
// IN-APP NOTIFICATION INTERFACES
// ============================================================================

/**
 * In-app notification entity stored in DynamoDB
 */
export interface InAppNotification {
  // Primary Key
  PK: string;              // USER#<userId>
  SK: string;              // NOTIFICATION#<timestamp>#<notificationId>
  
  // GSI for lookup by notification ID
  GSI1PK: string;          // NOTIFICATION#<notificationId>
  GSI1SK: string;          // METADATA
  
  // Core attributes
  notificationId: string;  // uuid-v4
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;      // Deep link to related resource
  metadata: Record<string, any>; // Event-specific data
  
  // Read status
  read: boolean;
  readAt?: string;         // ISO 8601 timestamp
  
  // Timestamps
  createdAt: string;       // ISO 8601 timestamp
  ttl: number;             // Unix timestamp (30 days from creation)
}

/**
 * Input for creating in-app notification
 */
export interface CreateInAppNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// NOTIFICATION PREFERENCES INTERFACES
// ============================================================================

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  // Primary Key
  PK: string;              // USER#<userId>
  SK: string;              // PREFERENCES#NOTIFICATION
  
  // Core attributes
  userId: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  frequency: NotificationFrequency;
  
  // Granular control per notification type
  enabledTypes: {
    [NotificationType.REGISTRATION_CONFIRMED]: boolean;
    [NotificationType.WAITLIST_ADDED]: boolean;
    [NotificationType.WAITLIST_PROMOTED]: boolean;
    [NotificationType.REGISTRATION_CANCELLED]: boolean;
    [NotificationType.EVENT_REMINDER_24H]: boolean;
    [NotificationType.EVENT_REMINDER_1H]: boolean;
    [NotificationType.EVENT_UPDATED]: boolean;
    [NotificationType.EVENT_CANCELLED]: boolean;
  };
  
  // Do Not Disturb settings
  doNotDisturb: {
    enabled: boolean;
    startHour: string;     // "22:00" (10 PM)
    endHour: string;       // "08:00" (8 AM)
    timezone: string;      // "America/New_York"
  };
  
  // Unsubscribe management
  unsubscribedAt: string | null;
  unsubscribeToken: string;  // uuid for unsubscribe links
  
  // Timestamps
  updatedAt: string;
  createdAt: string;
}

/**
 * Input for updating notification preferences
 */
export interface UpdateNotificationPreferencesInput {
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  frequency?: NotificationFrequency;
  enabledTypes?: Partial<NotificationPreferences['enabledTypes']>;
  doNotDisturb?: Partial<NotificationPreferences['doNotDisturb']>;
}

/**
 * Default notification preferences for new users
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'PK' | 'SK' | 'userId' | 'unsubscribeToken' | 'createdAt' | 'updatedAt'> = {
  emailEnabled: true,
  inAppEnabled: true,
  frequency: NotificationFrequency.IMMEDIATE,
  enabledTypes: {
    [NotificationType.REGISTRATION_CONFIRMED]: true,
    [NotificationType.WAITLIST_ADDED]: true,
    [NotificationType.WAITLIST_PROMOTED]: true,
    [NotificationType.REGISTRATION_CANCELLED]: true,
    [NotificationType.EVENT_REMINDER_24H]: true,
    [NotificationType.EVENT_REMINDER_1H]: true,
    [NotificationType.EVENT_UPDATED]: true,
    [NotificationType.EVENT_CANCELLED]: true,
  },
  doNotDisturb: {
    enabled: true,
    startHour: '22:00',
    endHour: '08:00',
    timezone: 'America/New_York',
  },
  unsubscribedAt: null,
};

// ============================================================================
// EMAIL NOTIFICATION INTERFACES
// ============================================================================

/**
 * Delivery tracking for email notifications
 */
export interface DeliveryTracking {
  // Primary Key
  PK: string;              // NOTIFICATION#<notificationId>
  SK: string;              // DELIVERY#<channel>#<attempt>
  
  // Core attributes
  notificationId: string;
  channel: NotificationChannel;
  status: DeliveryStatus;
  
  // Email-specific fields
  messageId?: string;      // SES Message ID
  recipient?: string;      // Email address
  subject?: string;
  
  // Timing
  sentAt: string;
  deliveredAt?: string;
  bouncedAt?: string;
  complainedAt?: string;
  
  // Retry tracking
  attempt: number;         // 1, 2, or 3
  nextRetryAt?: string;    // ISO 8601 timestamp
  
  // Error tracking
  error?: {
    code: string;
    message: string;
    details: any;
  };
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Email template data for rendering
 */
export interface EmailTemplateData {
  // User information
  userName: string;
  userEmail: string;
  
  // Event information
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventUrl: string;
  
  // Registration information (if applicable)
  registrationId?: string;
  qrCodeUrl?: string;
  ticketNumber?: string;
  
  // Waitlist information (if applicable)
  waitlistPosition?: number;
  estimatedPromotionDate?: string;
  
  // System URLs
  unsubscribeUrl: string;
  preferencesUrl: string;
  supportUrl: string;
  
  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Email send request
 */
export interface SendEmailInput {
  to: string[];
  subject: string;
  templateName: string;
  templateData: EmailTemplateData;
  notificationId: string;
  userId: string;
}

// ============================================================================
// NOTIFICATION PAYLOAD INTERFACES
// ============================================================================

/**
 * Notification payload from EventBridge
 */
export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  data: Record<string, any>;
  priority: NotificationPriority;
  scheduledFor?: string;   // ISO 8601 timestamp for scheduled delivery
}

/**
 * Event-specific notification data
 */
export interface RegistrationConfirmedData {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  registrationId: string;
  qrCodeUrl: string;
  ticketNumber: string;
}

export interface WaitlistAddedData {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  waitlistPosition: number;
}

export interface WaitlistPromotedData {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  registrationId: string;
  qrCodeUrl: string;
  expiresAt: string;       // 24-hour acceptance window
}

export interface EventReminderData {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  hoursUntil: number;      // 24 or 1
}

export interface EventUpdatedData {
  eventId: string;
  eventTitle: string;
  changes: string[];       // List of what changed
  oldDate?: string;
  newDate?: string;
}

export interface EventCancelledData {
  eventId: string;
  eventTitle: string;
  originalDate: string;
  reason?: string;
}

// ============================================================================
// SES BOUNCE/COMPLAINT INTERFACES
// ============================================================================

/**
 * SES bounce notification
 */
export interface SESBounceNotification {
  notificationType: 'Bounce';
  bounce: {
    bounceType: 'Undetermined' | 'Permanent' | 'Transient';
    bounceSubType: string;
    bouncedRecipients: Array<{
      emailAddress: string;
      action?: string;
      status?: string;
      diagnosticCode?: string;
    }>;
    timestamp: string;
    feedbackId: string;
  };
  mail: {
    timestamp: string;
    source: string;
    messageId: string;
    destination: string[];
  };
}

/**
 * SES complaint notification
 */
export interface SESComplaintNotification {
  notificationType: 'Complaint';
  complaint: {
    complainedRecipients: Array<{
      emailAddress: string;
    }>;
    timestamp: string;
    feedbackId: string;
    complaintFeedbackType?: string;
  };
  mail: {
    timestamp: string;
    source: string;
    messageId: string;
    destination: string[];
  };
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * GraphQL connection pattern for notifications
 */
export interface NotificationConnection {
  items: InAppNotification[];
  nextToken?: string;
  unreadCount: number;
}

/**
 * Notification statistics for admin dashboard
 */
export interface NotificationStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalBounced: number;
  deliveryRate: number;
  averageLatency: number; // in seconds
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;     // Default: 3
  backoffMultiplier: number; // Default: 2 (exponential)
  initialDelayMs: number;  // Default: 1000ms
  maxDelayMs: number;      // Default: 60000ms (1 minute)
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  backoffMultiplier: 2,
  initialDelayMs: 1000,
  maxDelayMs: 60000,
};
