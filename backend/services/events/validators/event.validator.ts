import Ajv, { JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';
import { Event, EventCategory } from '../models/event.model';
import { BaseEntity } from '../../../shared/types/common';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Define the validation schema - using 'any' to avoid JSONSchemaType strict type checking
// The runtime validation will still work correctly
const eventSchema: any = {
  type: 'object',
  properties: {
    eventId: { type: 'string', pattern: '^evt-[a-zA-Z0-9]{12}$' },
    title: { type: 'string', minLength: 5, maxLength: 100 },
    description: { type: 'string', minLength: 20, maxLength: 2000 },
    startDateTime: { type: 'string', format: 'date-time' },
    endDateTime: { type: 'string', format: 'date-time' },
    location: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        building: { type: 'string' },
        room: { type: 'string', nullable: true },
        address: { type: 'string' },
        coordinates: {
          type: 'object',
          properties: {
            latitude: { type: 'number' },
            longitude: { type: 'number' },
          },
          required: ['latitude', 'longitude'],
          nullable: true,
        },
      },
      required: ['name', 'building', 'address'],
    },
    category: { type: 'string', enum: Object.values(EventCategory) },
    capacity: { type: 'integer', minimum: 1, maximum: 10000 },
    registeredCount: { type: 'integer', minimum: 0 },
    waitlistCount: { type: 'integer', minimum: 0 },
    organizerId: { type: 'string' },
    status: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    imageUrl: { type: 'string', format: 'uri', nullable: true },
  },
  required: [
    'eventId',
    'title',
    'description',
    'startDateTime',
    'endDateTime',
    'location',
    'category',
    'capacity',
    'registeredCount',
    'waitlistCount',
    'organizerId',
    'status',
    'tags',
  ],
  additionalProperties: true,
};

const validate = ajv.compile(eventSchema);

export function validateEvent(event: Partial<Event>): { valid: boolean; errors?: string[] } {
  const valid = validate(event);
  
  if (!valid) {
    const errors = validate.errors?.map((err) => {
      return `${err.instancePath} ${err.message}`;
    });
    return { valid: false, errors };
  }

  // Custom validations
  if (!event.startDateTime || !event.endDateTime) {
    return { valid: false, errors: ['Start and end date times are required'] };
  }
  
  const startDate = new Date(event.startDateTime);
  const endDate = new Date(event.endDateTime);

  if (endDate <= startDate) {
    return { valid: false, errors: ['End date must be after start date'] };
  }

  if (startDate < new Date()) {
    return { valid: false, errors: ['Start date must be in the future'] };
  }

  return { valid: true };
}
