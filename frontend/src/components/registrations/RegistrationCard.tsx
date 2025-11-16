/**
 * Registration Card Component
 * TEMS - Terrapin Events Management System
 * 
 * Displays a registration with event details, status, and actions.
 * Used in the My Registrations dashboard.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Registration, RegistrationStatus, getRegistrationStatusColor, getRegistrationStatusText, canCancelRegistration, canAcceptPromotion, getPromotionTimeRemaining } from '@/types/registration.types';
import { useRegistrationActions } from '@/hooks/registrations/useRegistrations';
import { QRCodeModal } from './QRCodeModal';

interface RegistrationCardProps {
  registration: Registration;
  onUpdate?: () => void;
  className?: string;
}

export function RegistrationCard({
  registration,
  onUpdate,
  className = '',
}: RegistrationCardProps) {
  const { cancel, acceptPromotion, declinePromotion, isLoading, error } = useRegistrationActions();
  const [showQRCode, setShowQRCode] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const { event } = registration;
  
  if (!event) {
    return null; // Event data not loaded
  }

  const eventDate = new Date(event.startDateTime);
  const eventEndDate = new Date(event.endDateTime);
  const now = new Date();
  const isUpcoming = eventDate > now;
  const isToday = eventDate.toDateString() === now.toDateString();
  
  const canCancel = canCancelRegistration(registration, event);
  const canAccept = canAcceptPromotion(registration);
  const promotionTimeLeft = getPromotionTimeRemaining(registration);

  /**
   * Handle cancellation
   */
  const handleCancel = async () => {
    const result = await cancel(registration.id);
    if (result) {
      setShowCancelConfirm(false);
      onUpdate?.();
    }
  };

  /**
   * Handle promotion acceptance
   */
  const handleAccept = async () => {
    const result = await acceptPromotion(registration.id);
    if (result) {
      onUpdate?.();
    }
  };

  /**
   * Handle promotion decline
   */
  const handleDecline = async () => {
    const result = await declinePromotion(registration.id);
    if (result) {
      onUpdate?.();
    }
  };

  /**
   * Format date for display
   */
  const formatEventDate = (): string => {
    if (isToday) {
      return `Today, ${eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    
    return eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  /**
   * Format time for display
   */
  const formatTime = (): string => {
    const start = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const end = eventEndDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${start} - ${end}`;
  };

  return (
    <>
      <div className={`bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow ${className}`}>
        {/* Promotion Banner */}
        {registration.status === RegistrationStatus.PROMOTION_PENDING && (
          <div className="bg-purple-600 text-white px-4 py-3 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-semibold">You've been promoted from the waitlist!</span>
              </div>
              {promotionTimeLeft && (
                <span className="text-sm font-medium">
                  {promotionTimeLeft} remaining
                </span>
              )}
            </div>
          </div>
        )}

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <Link 
                href={`/events/${event.id}`}
                className="text-xl font-bold text-gray-900 hover:text-red-600 transition-colors"
              >
                {event.title}
              </Link>
              
              {/* Status Badge */}
              <div className="mt-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getRegistrationStatusColor(registration.status)}`}>
                  {getRegistrationStatusText(registration.status)}
                  {registration.waitlistPosition && (
                    <span className="ml-1">(#{registration.waitlistPosition})</span>
                  )}
                </span>
              </div>
            </div>

            {/* Event Image */}
            {event.imageUrl && (
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-20 h-20 rounded-lg object-cover ml-4"
              />
            )}
          </div>

          {/* Event Details */}
          <div className="space-y-2 mb-4">
            {/* Date & Time */}
            <div className="flex items-center gap-2 text-gray-700">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm">
                {formatEventDate()}
              </span>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 text-gray-700">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm">
                {event.location.name}
                {event.location.room && ` - Room ${event.location.room}`}
              </span>
            </div>

            {/* Time Range */}
            <div className="flex items-center gap-2 text-gray-700">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">
                {formatTime()}
              </span>
            </div>

            {/* Registration Date */}
            <div className="flex items-center gap-2 text-gray-600 text-xs mt-3 pt-3 border-t border-gray-100">
              <span>Registered on {new Date(registration.registeredAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {/* Promotion Actions */}
            {canAccept && (
              <>
                <button
                  onClick={handleAccept}
                  disabled={isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Accept Spot
                </button>
                <button
                  onClick={handleDecline}
                  disabled={isLoading}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Decline
                </button>
              </>
            )}

            {/* QR Code (for registered attendees) */}
            {registration.status === RegistrationStatus.REGISTERED && isUpcoming && (
              <button
                onClick={() => setShowQRCode(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                View QR Code
              </button>
            )}

            {/* Cancel Registration */}
            {canCancel && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                disabled={isLoading}
              >
                Cancel Registration
              </button>
            )}

            {/* View Event */}
            <Link
              href={`/events/${event.id}`}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              View Event
            </Link>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRCode && (
        <QRCodeModal
          registration={registration}
          event={event}
          onClose={() => setShowQRCode(false)}
        />
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900">
              Cancel Registration?
            </h3>
            
            <p className="text-gray-600">
              Are you sure you want to cancel your registration for <strong>{event.title}</strong>?
              {registration.status === RegistrationStatus.REGISTERED && (
                <span className="block mt-2 text-sm">
                  Your spot will be offered to the next person on the waitlist.
                </span>
              )}
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors"
                disabled={isLoading}
              >
                Keep Registration
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Cancelling...' : 'Cancel Registration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
