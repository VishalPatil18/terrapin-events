/**
 * Create Event Form Component
 * Multi-step form for creating new events
 */

'use client';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { 
  createEventSchema, 
  CreateEventFormData,
  parseDateTimeInput 
} from '@/lib/validations/event.validation';
import { EventCategory } from '@/types/event.types';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

interface CreateEventFormProps {
  onSubmit: (data: CreateEventFormData, isDraft: boolean) => Promise<void>;
  defaultValues?: Partial<CreateEventFormData>;
  isEdit?: boolean;
}

export function CreateEventForm({ 
  onSubmit, 
  defaultValues,
  isEdit = false 
}: CreateEventFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 5;

  const methods = useForm<CreateEventFormData>({
    resolver: zodResolver(createEventSchema),
    defaultValues: defaultValues || {
      title: '',
      description: '',
      category: EventCategory.OTHER,
      startDateTime: '',
      endDateTime: '',
      location: {
        name: '',
        building: '',
        room: '',
        address: '',
      },
      capacity: 50,
      tags: [],
      imageUrl: '',
    },
    mode: 'onChange',
  });

  const { register, handleSubmit, formState: { errors }, trigger, watch } = methods;

  const handleNext = async () => {
    let fieldsToValidate: (keyof CreateEventFormData)[] = [];
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['title', 'description', 'category'];
        break;
      case 2:
        fieldsToValidate = ['startDateTime', 'endDateTime'];
        break;
      case 3:
        fieldsToValidate = ['location'];
        break;
      case 4:
        fieldsToValidate = ['capacity'];
        break;
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFormSubmit = async (data: CreateEventFormData, isDraft: boolean) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Parse datetime inputs to ISO format
      const formattedData = {
        ...data,
        startDateTime: parseDateTimeInput(data.startDateTime),
        endDateTime: parseDateTimeInput(data.endDateTime),
      };
      
      await onSubmit(formattedData, isDraft);
      router.push('/events');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="max-w-4xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-2 rounded-full mx-1 transition-colors ${
                  index + 1 <= currentStep ? 'bg-[#A20B23]' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-600 text-center">
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        <form>
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-center mb-8">Create Event</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Title *
                </label>
                <input
                  {...register('title')}
                  type="text"
                  placeholder="Enter event title"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A20B23] focus:border-transparent outline-none"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  {...register('category')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A20B23] focus:border-transparent outline-none"
                >
                  <option value={EventCategory.ACADEMIC}>Academic</option>
                  <option value={EventCategory.SOCIAL}>Social</option>
                  <option value={EventCategory.SPORTS}>Sports</option>
                  <option value={EventCategory.ARTS}>Arts & Culture</option>
                  <option value={EventCategory.TECH}>Technology</option>
                  <option value={EventCategory.CAREER}>Career</option>
                  <option value={EventCategory.OTHER}>Other</option>
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Description *
                </label>
                <textarea
                  {...register('description')}
                  rows={6}
                  placeholder="Describe your event..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A20B23] focus:border-transparent outline-none resize-none"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Date & Time */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-center mb-8">Date & Time</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date & Time *
                  </label>
                  <input
                    {...register('startDateTime')}
                    type="datetime-local"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A20B23] focus:border-transparent outline-none"
                  />
                  {errors.startDateTime && (
                    <p className="mt-1 text-sm text-red-600">{errors.startDateTime.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date & Time *
                  </label>
                  <input
                    {...register('endDateTime')}
                    type="datetime-local"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A20B23] focus:border-transparent outline-none"
                  />
                  {errors.endDateTime && (
                    <p className="mt-1 text-sm text-red-600">{errors.endDateTime.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Location */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-center mb-8">Event Location</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location Name *
                </label>
                <input
                  {...register('location.name')}
                  type="text"
                  placeholder="e.g., Stamp Student Union"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A20B23] focus:border-transparent outline-none"
                />
                {errors.location?.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.location.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Building *
                  </label>
                  <input
                    {...register('location.building')}
                    type="text"
                    placeholder="Building name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A20B23] focus:border-transparent outline-none"
                  />
                  {errors.location?.building && (
                    <p className="mt-1 text-sm text-red-600">{errors.location.building.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room (Optional)
                  </label>
                  <input
                    {...register('location.room')}
                    type="text"
                    placeholder="Room number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A20B23] focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address *
                </label>
                <input
                  {...register('location.address')}
                  type="text"
                  placeholder="Full address"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A20B23] focus:border-transparent outline-none"
                />
                {errors.location?.address && (
                  <p className="mt-1 text-sm text-red-600">{errors.location.address.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Capacity & Tags */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-center mb-8">Capacity & Tags</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Capacity *
                </label>
                <input
                  {...register('capacity', { valueAsNumber: true })}
                  type="number"
                  min="1"
                  placeholder="Maximum number of attendees"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A20B23] focus:border-transparent outline-none"
                />
                {errors.capacity && (
                  <p className="mt-1 text-sm text-red-600">{errors.capacity.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Add tags separated by commas (e.g., workshop, networking, free)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A20B23] focus:border-transparent outline-none"
                  onChange={(e) => {
                    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                    methods.setValue('tags', tags);
                  }}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Separate tags with commas
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Image */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-center mb-8">Event Image</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image URL (Optional)
                </label>
                <input
                  {...register('imageUrl')}
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A20B23] focus:border-transparent outline-none"
                />
                {errors.imageUrl && (
                  <p className="mt-1 text-sm text-red-600">{errors.imageUrl.message}</p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  Enter a URL to an event image or leave blank for default
                </p>
              </div>

              {watch('imageUrl') && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                  <div className="relative w-full h-64 rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={watch('imageUrl')}
                      alt="Event preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <Button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              variant="outline"
            >
              Previous
            </Button>

            <div className="flex gap-3">
              {currentStep === totalSteps ? (
                <>
                  <Button
                    type="button"
                    onClick={handleSubmit((data) => handleFormSubmit(data, true))}
                    disabled={isSubmitting}
                    variant="outline"
                  >
                    Save as Draft
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit((data) => handleFormSubmit(data, false))}
                    disabled={isSubmitting}
                    variant="primary"
                    isLoading={isSubmitting}
                  >
                    {isEdit ? 'Update Event' : 'Create Event'}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={handleNext}
                  variant="primary"
                >
                  Next
                </Button>
              )}
            </div>
          </div>

          {/* Cancel Button */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </FormProvider>
  );
}
