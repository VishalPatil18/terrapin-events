import { z } from 'zod';
import { EventCategory, EventStatus } from '../../../shared/types/common';

/**
 * Coordinates validation schema
 */
const CoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/**
 * Event location validation schema
 */
const LocationSchema = z.object({
  name: z.string().min(1, 'Location name is required').max(200),
  building: z.string().min(1, 'Building is required').max(100),
  room: z.string().max(50).optional(),
  address: z.string().min(1, 'Address is required').max(300),
  coordinates: CoordinatesSchema.optional(),
});

/**
 * Event category validation
 */
const EventCategorySchema = z.nativeEnum(EventCategory);

/**
 * Event status validation
 */
const EventStatusSchema = z.nativeEnum(EventStatus);

/**
 * ISO 8601 date-time string validation
 */
const DateTimeSchema = z.string().refine(
  (val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  },
  { message: 'Invalid ISO 8601 date-time format' }
);

/**
 * Create Event Input validation schema
 */
export const CreateEventSchema = z
  .object({
    title: z
      .string()
      .min(5, 'Title must be at least 5 characters')
      .max(200, 'Title cannot exceed 200 characters')
      .trim(),
    description: z
      .string()
      .min(20, 'Description must be at least 20 characters')
      .max(2000, 'Description cannot exceed 2000 characters')
      .trim(),
    startDateTime: DateTimeSchema,
    endDateTime: DateTimeSchema,
    location: LocationSchema,
    category: EventCategorySchema,
    capacity: z
      .number()
      .int('Capacity must be an integer')
      .min(1, 'Capacity must be at least 1')
      .max(10000, 'Capacity cannot exceed 10,000'),
    tags: z
      .array(z.string().max(50))
      .max(10, 'Cannot have more than 10 tags')
      .optional()
      .default([]),
    imageUrl: z.string().url('Invalid image URL').optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDateTime);
      const end = new Date(data.endDateTime);
      return end > start;
    },
    {
      message: 'End date must be after start date',
      path: ['endDateTime'],
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.startDateTime);
      const now = new Date();
      // Allow events to be created at least 30 minutes in advance
      const minAdvanceTime = 30 * 60 * 1000; // 30 minutes in milliseconds
      return start.getTime() > now.getTime() + minAdvanceTime;
    },
    {
      message: 'Event must start at least 30 minutes in the future',
      path: ['startDateTime'],
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.startDateTime);
      const end = new Date(data.endDateTime);
      const duration = end.getTime() - start.getTime();
      const maxDuration = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      return duration <= maxDuration;
    },
    {
      message: 'Event duration cannot exceed 7 days',
      path: ['endDateTime'],
    }
  );

/**
 * Update Event Input validation schema
 */
export const UpdateEventSchema = z
  .object({
    title: z
      .string()
      .min(5, 'Title must be at least 5 characters')
      .max(200, 'Title cannot exceed 200 characters')
      .trim()
      .optional(),
    description: z
      .string()
      .min(20, 'Description must be at least 20 characters')
      .max(2000, 'Description cannot exceed 2000 characters')
      .trim()
      .optional(),
    startDateTime: DateTimeSchema.optional(),
    endDateTime: DateTimeSchema.optional(),
    location: LocationSchema.optional(),
    category: EventCategorySchema.optional(),
    capacity: z
      .number()
      .int('Capacity must be an integer')
      .min(1, 'Capacity must be at least 1')
      .max(10000, 'Capacity cannot exceed 10,000')
      .optional(),
    tags: z
      .array(z.string().max(50))
      .max(10, 'Cannot have more than 10 tags')
      .optional(),
    imageUrl: z.string().url('Invalid image URL').optional(),
    status: EventStatusSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.startDateTime && data.endDateTime) {
        const start = new Date(data.startDateTime);
        const end = new Date(data.endDateTime);
        return end > start;
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['endDateTime'],
    }
  );

/**
 * Event Filter validation schema
 */
export const EventFilterSchema = z.object({
  category: EventCategorySchema.optional(),
  status: EventStatusSchema.optional(),
  startDateAfter: DateTimeSchema.optional(),
  startDateBefore: DateTimeSchema.optional(),
  hasAvailableSeats: z.boolean().optional(),
  organizerId: z.string().optional(),
});

/**
 * Pagination parameters validation
 */
export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  nextToken: z.string().optional(),
});

/**
 * Event ID validation
 */
export const EventIdSchema = z.string().regex(/^evt-[a-zA-Z0-9]{21}$/, {
  message: 'Invalid event ID format',
});

/**
 * Validation error response
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate and parse input with detailed error handling
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): { success: true; data: T } | { success: false; errors: ValidationError[] } {
  try {
    const data = schema.parse(input);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return { success: false, errors };
    }
    throw error;
  }
}

/**
 * Business rule: Check if capacity can be reduced
 */
export function canReduceCapacity(
  currentCapacity: number,
  newCapacity: number,
  registeredCount: number
): { valid: boolean; message?: string } {
  if (newCapacity < registeredCount) {
    return {
      valid: false,
      message: `Cannot reduce capacity to ${newCapacity}. ${registeredCount} users already registered.`,
    };
  }
  return { valid: true };
}

/**
 * Business rule: Check if event can be edited
 */
export function canEditEvent(
  eventStatus: EventStatus,
  startDateTime: string
): { valid: boolean; message?: string } {
  // Cannot edit cancelled or completed events
  if (
    eventStatus === EventStatus.CANCELLED ||
    eventStatus === EventStatus.COMPLETED
  ) {
    return {
      valid: false,
      message: `Cannot edit ${eventStatus.toLowerCase()} event`,
    };
  }

  // Cannot edit events that have already started
  const now = new Date();
  const start = new Date(startDateTime);
  if (start <= now) {
    return {
      valid: false,
      message: 'Cannot edit event that has already started',
    };
  }

  return { valid: true };
}

/**
 * Business rule: Check if event can be cancelled
 */
export function canCancelEvent(
  eventStatus: EventStatus,
  startDateTime: string
): { valid: boolean; message?: string } {
  // Cannot cancel already cancelled or completed events
  if (
    eventStatus === EventStatus.CANCELLED ||
    eventStatus === EventStatus.COMPLETED
  ) {
    return {
      valid: false,
      message: `Event is already ${eventStatus.toLowerCase()}`,
    };
  }

  // Can cancel events up to 1 hour before start
  const now = new Date();
  const start = new Date(startDateTime);
  const oneHour = 60 * 60 * 1000;

  if (start.getTime() - now.getTime() < oneHour) {
    return {
      valid: false,
      message: 'Cannot cancel event less than 1 hour before start time',
    };
  }

  return { valid: true };
}
