/**
 * EventCard Component
 * Displays event preview card with image, title, date, and location
 * Used in event listings and grids
 */

import Link from 'next/link';
import { Calendar, MapPin, Users } from 'lucide-react';
import { Event, formatEventDateTime, getAvailableSeats, isEventFull, getEventCategoryLabel } from '@/types/event.types';

export interface EventCardProps {
  event: Event;
  className?: string;
}

export function EventCard({ event, className = '' }: EventCardProps) {
  const availableSeats = getAvailableSeats(event);
  const isFull = isEventFull(event);

  // Default placeholder image if no image URL
  const imageUrl = event.imageUrl || `https://picsum.photos/seed/${event.id}/400/240`;

  return (
    <Link
      href={`/events/${event.id}`}
      className={`group block bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden ${className}`}
    >
      {/* Image Section */}
      <div className="relative h-60 overflow-hidden bg-gray-200">
        <img
          src={imageUrl}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            // Hide broken image but keep container
            e.currentTarget.style.display = 'none';
          }}
        />
        
        {/* Free Badge - shown if no ticket required or $0 */}
        <div className="absolute top-3 left-3 bg-white px-3 py-1 rounded-md">
          <span className="text-xs font-semibold text-[#A20B23]">FREE</span>
        </div>

        {/* Category Badge */}
        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-md">
          <span className="text-xs font-medium text-white">
            {getEventCategoryLabel(event.category)}
          </span>
        </div>

        {/* Full/Limited Badge */}
        {isFull && (
          <div className="absolute bottom-3 right-3 bg-red-600 px-3 py-1 rounded-md">
            <span className="text-xs font-semibold text-white">FULL</span>
          </div>
        )}
        {!isFull && availableSeats <= 10 && (
          <div className="absolute bottom-3 right-3 bg-orange-600 px-3 py-1 rounded-md">
            <span className="text-xs font-semibold text-white">
              {availableSeats} SEATS LEFT
            </span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-5">
        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2 group-hover:text-[#A20B23] transition-colors">
          {event.title}
        </h3>

        {/* Date & Time */}
        <div className="flex items-start gap-2 mb-2">
          <Calendar className="w-4 h-4 text-[#A20B23] mt-0.5 flex-shrink-0" />
          <p className="text-sm text-[#A20B23] font-medium">
            {formatEventDateTime(event.startDateTime)}
          </p>
        </div>

        {/* Location */}
        <div className="flex items-start gap-2 mb-3">
          <MapPin className="w-4 h-4 text-[#7E7E7E] mt-0.5 flex-shrink-0" />
          <p className="text-sm text-[#7E7E7E] line-clamp-1">
            {event.location.building}
            {event.location.room && `, ${event.location.room}`}
          </p>
        </div>

        {/* Capacity Info */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          <Users className="w-4 h-4 text-gray-400" />
          <p className="text-xs text-gray-500">
            {event.registeredCount} / {event.capacity} registered
          </p>
        </div>
      </div>
    </Link>
  );
}
