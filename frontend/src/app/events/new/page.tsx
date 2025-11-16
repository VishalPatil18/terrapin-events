/**
 * Create New Event Page
 * Page for creating new events
 * Path: /events/new
 */

'use client';

import { useRouter } from 'next/navigation';
import { CreateEventForm } from '@/components/events/CreateEventForm';
import { CreateEventFormData } from '@/lib/validations/event.validation';
import { createEvent, publishEvent } from '@/lib/api/events.api';
import { CreateEventInput, EventStatus } from '@/types/event.types';

export default function NewEventPage() {
  const router = useRouter();

  const handleSubmit = async (data: CreateEventFormData, isDraft: boolean) => {
    try {
      // Transform form data to API input format
      const eventInput: CreateEventInput = {
        title: data.title,
        description: data.description,
        startDateTime: data.startDateTime,
        endDateTime: data.endDateTime,
        location: {
          name: data.location.name,
          building: data.location.building,
          room: data.location.room || undefined,
          address: data.location.address,
          coordinates: data.location.coordinates,
        },
        category: data.category,
        capacity: data.capacity,
        tags: data.tags || [],
        imageUrl: data.imageUrl || undefined,
      };

      console.log('Event input being sent:', JSON.stringify(eventInput, null, 2));

      // Create the event (always starts as DRAFT)
      const createdEvent = await createEvent(eventInput);

      // If not saving as draft, publish the event
      if (!isDraft && createdEvent) {
        await publishEvent(createdEvent.id);
      }
      
      router.push('/events');
    } catch (error) {
      console.error('Failed to create event:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <CreateEventForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
