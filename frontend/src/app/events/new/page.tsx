/**
 * Create New Event Page
 * Page for creating new events
 * Path: /events/new
 */

'use client';

import { useRouter } from 'next/navigation';
import { CreateEventForm } from '@/components/events/CreateEventForm';
import { CreateEventFormData } from '@/lib/validations/event.validation';
// import { useCreateEvent } from '@/hooks/events/useEvents'; // Uncomment when ready

export default function NewEventPage() {
  const router = useRouter();

  const handleSubmit = async (data: CreateEventFormData, isDraft: boolean) => {
    try {
      console.log('Creating event:', data, 'isDraft:', isDraft);
      
      // TODO: Call create event API
      // const event = await createEvent(data);
      
      // For now, just log and redirect
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
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
