/**
 * Event Detail Component
 * Displays full event information with registration and actions
 */

'use client';

import Image from 'next/image';
import { Calendar, Users, Tag, ExternalLink } from 'lucide-react';
import { Event, formatEventDateTime, getAvailableSeats, isEventFull, getEventCategoryLabel } from '@/types/event.types';

export interface EventDetailProps {
  event: Event;
}

export function EventDetail({ event }: EventDetailProps) {
  const availableSeats = getAvailableSeats(event);
  const isFull = isEventFull(event);
  const imageUrl = event.imageUrl || `https://picsum.photos/seed/${event.id}/1200/400`;

  // Format hours if needed (placeholder - would come from backend)
  const eventHours = {
    weekday: '7PM - 10PM',
    weekend: '7PM - 10PM',
  };

  return (
    <div className="space-y-8">
      {/* Hero Image with Title Overlay */}
      <div className="relative h-96 rounded-xl overflow-hidden">
        <Image
          src={imageUrl}
          alt={event.title}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
        
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="max-w-4xl">
            <h1 className="text-4xl font-bold mb-4">{event.title}</h1>
            <p className="text-lg font-medium mb-2">{event.location.building}</p>
            <p className="text-sm opacity-90">{event.location.address}</p>
          </div>
        </div>

        {/* Category Badge */}
        <div className="absolute top-6 left-6">
          <span className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg font-semibold text-[#A20B23]">
            {getEventCategoryLabel(event.category)}
          </span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Event Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Description Section */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          </section>

          {/* Hours Section */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Hours</h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Weekdays:</span>
                <span className="text-[#A20B23] font-semibold">{eventHours.weekday}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Weekends:</span>
                <span className="text-[#A20B23] font-semibold">{eventHours.weekend}</span>
              </div>
            </div>
          </section>

          {/* Organizer Contact */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Organizer Contact
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                Please visit{' '}
                <a
                  href={`mailto:organizer-${event.organizerId}@umd.edu`}
                  className="text-blue-600 hover:text-blue-800 underline font-medium"
                >
                  organizer email
                </a>
                {' '}or check the event page for more details
              </p>
            </div>
          </section>

          {/* Tags Section */}
          {event.tags && event.tags.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium text-gray-700 transition-colors"
                  >
                    <Tag className="w-4 h-4" />
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Share Section */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Share with friends
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: event.title,
                      url: window.location.href,
                    });
                  }
                }}
                className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                aria-label="Share on Facebook"
              >
                <ExternalLink className="w-5 h-5" />
              </button>
              <button
                className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                aria-label="Share on WhatsApp"
              >
                <ExternalLink className="w-5 h-5" />
              </button>
              <button
                className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                aria-label="Share on LinkedIn"
              >
                <ExternalLink className="w-5 h-5" />
              </button>
              <button
                className="p-3 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors"
                aria-label="Share on Twitter"
              >
                <ExternalLink className="w-5 h-5" />
              </button>
            </div>
          </section>
        </div>

        {/* Right Column - Event Info Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 bg-white rounded-xl shadow-lg p-6 space-y-6">
            {/* Date & Time */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Date & time</h3>
              <div className="flex items-start gap-2 text-gray-700">
                <Calendar className="w-5 h-5 text-[#A20B23] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{formatEventDateTime(event.startDateTime)}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Add to calendar
                  </p>
                </div>
              </div>
            </div>

            {/* Capacity */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Capacity</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Registered</span>
                  <span className="font-semibold">
                    {event.registeredCount} / {event.capacity}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isFull ? 'bg-red-600' : 'bg-[#A20B23]'
                    }`}
                    style={{
                      width: `${Math.min(
                        (event.registeredCount / event.capacity) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">
                  {isFull ? (
                    <span className="text-red-600 font-medium">Event is full</span>
                  ) : (
                    <span>{availableSeats} seats remaining</span>
                  )}
                </p>
              </div>
            </div>

            {/* Action Buttons - Placeholder for registration */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <button
                disabled={isFull}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  isFull
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-[#A20B23] hover:bg-[#8A0A1E] text-white'
                }`}
              >
                {isFull ? 'Event Full' : 'Register Now'}
              </button>
              <button className="w-full py-3 px-4 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                Request Information
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
