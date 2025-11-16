/**
 * Event Form Validation Schema
 * Zod schemas for create and edit event forms
 */

import { z } from 'zod';
import { EventCategory } from '@/types/event.types';

// Location schema
export const locationSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  building: z.string().min(1, 'Building name is required'),
  room: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
});

// Create Event schema
export const createEventSchema = z.object({
  // Step 1: Basic Info
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters'),
  description: z.string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  category: z.nativeEnum(EventCategory, {
    errorMap: () => ({ message: 'Please select a category' }),
  }),

  // Step 2: Date & Time
  startDateTime: z.string().min(1, 'Start date and time is required'),
  endDateTime: z.string().min(1, 'End date and time is required'),

  // Step 3: Location
  location: locationSchema,

  // Step 4: Capacity & Tags
  capacity: z.number()
    .min(1, 'Capacity must be at least 1')
    .max(10000, 'Capacity cannot exceed 10,000'),
  tags: z.array(z.string()).default([]),

  // Step 5: Image (optional)
  imageUrl: z.string().url('Please enter a valid image URL').optional().or(z.literal('')),
}).refine((data) => {
  // Validate that end date is after start date
  const start = new Date(data.startDateTime);
  const end = new Date(data.endDateTime);
  return end > start;
}, {
  message: 'End date and time must be after start date and time',
  path: ['endDateTime'],
}).refine((data) => {
  // Validate that start date is in the future
  const start = new Date(data.startDateTime);
  const now = new Date();
  return start > now;
}, {
  message: 'Start date and time must be in the future',
  path: ['startDateTime'],
});

// Update Event schema (all fields optional except validation)
export const updateEventSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  description: z.string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  category: z.nativeEnum(EventCategory).optional(),
  startDateTime: z.string().optional(),
  endDateTime: z.string().optional(),
  location: locationSchema.optional(),
  capacity: z.number()
    .min(1, 'Capacity must be at least 1')
    .max(10000, 'Capacity cannot exceed 10,000')
    .optional(),
  tags: z.array(z.string()).optional(),
  imageUrl: z.string().url('Please enter a valid image URL').optional().or(z.literal('')),
}).refine((data) => {
  // Only validate dates if both are provided
  if (data.startDateTime && data.endDateTime) {
    const start = new Date(data.startDateTime);
    const end = new Date(data.endDateTime);
    return end > start;
  }
  return true;
}, {
  message: 'End date and time must be after start date and time',
  path: ['endDateTime'],
});

// Type exports
export type CreateEventFormData = z.infer<typeof createEventSchema>;
export type UpdateEventFormData = z.infer<typeof updateEventSchema>;

// Helper to convert form data to API format
export function formatDateTimeForInput(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
}

// Helper to parse datetime-local input
export function parseDateTimeInput(dateTimeLocal: string): string {
  return new Date(dateTimeLocal).toISOString();
}
