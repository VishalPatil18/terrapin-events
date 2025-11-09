import { BaseEntity, EventStatus } from '../../../shared/types/common';

export interface Event extends BaseEntity {
  eventId: string;
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  location: Location;
  category: EventCategory;
  capacity: number;
  registeredCount: number;
  waitlistCount: number;
  organizerId: string;
  status: EventStatus;
  tags: string[];
  imageUrl?: string;
}

export interface Location {
  name: string;
  building: string;
  room?: string;
  address: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export enum EventCategory {
  ACADEMIC = 'ACADEMIC',
  SOCIAL = 'SOCIAL',
  SPORTS = 'SPORTS',
  ARTS = 'ARTS',
  TECH = 'TECH',
  CAREER = 'CAREER',
  OTHER = 'OTHER',
}

export class EventModel {
  static toDynamoDBItem(event: Partial<Event>): Record<string, any> {
    const timestamp = new Date().toISOString();
    
    return {
      PK: `EVENT#${event.eventId}`,
      SK: 'METADATA',
      GSI1PK: `CATEGORY#${event.category}`,
      GSI1SK: `DATE#${event.startDateTime}`,
      GSI2PK: `ORGANIZER#${event.organizerId}`,
      GSI2SK: `EVENT#${event.eventId}`,
      eventId: event.eventId,
      title: event.title,
      description: event.description,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      location: event.location,
      category: event.category,
      capacity: event.capacity,
      registeredCount: event.registeredCount || 0,
      waitlistCount: event.waitlistCount || 0,
      organizerId: event.organizerId,
      status: event.status || EventStatus.DRAFT,
      tags: event.tags || [],
      imageUrl: event.imageUrl,
      createdAt: event.createdAt || timestamp,
      updatedAt: timestamp,
    };
  }

  static fromDynamoDBItem(item: Record<string, any>): Event {
    return {
      // DynamoDB keys
      PK: item.PK,
      SK: item.SK,
      GSI1PK: item.GSI1PK,
      GSI1SK: item.GSI1SK,
      GSI2PK: item.GSI2PK,
      GSI2SK: item.GSI2SK,
      // Domain fields
      eventId: item.eventId,
      title: item.title,
      description: item.description,
      startDateTime: item.startDateTime,
      endDateTime: item.endDateTime,
      location: item.location,
      category: item.category,
      capacity: item.capacity,
      registeredCount: item.registeredCount,
      waitlistCount: item.waitlistCount,
      organizerId: item.organizerId,
      status: item.status,
      tags: item.tags,
      imageUrl: item.imageUrl,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
