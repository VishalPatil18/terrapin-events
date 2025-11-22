/**
 * Registration Button Component
 * TEMS - Terrapin Events Management System
 * 
 * Smart button that handles registration, waitlist, and cancellation
 * with proper loading states and user feedback.
 */

'use client';

import { useState } from 'react';
import { Event } from '@/types/event.types';
import { RegistrationStatus } from '@/types/registration.types';
import { useEventRegistration, useRegistrationActions } from '@/hooks/registrations/useRegistrations';
import { useAuth } from '@/hooks/useAuth';

interface RegistrationButtonProps {
  event: Event;
  onRegistrationChange?: () => void;
  className?: string;
}

export function RegistrationButton({
  event,
  onRegistrationChange,
  className = '',
}: RegistrationButtonProps) {
  const { isAuthenticated } = useAuth();
  const { registration, isRegistered, refresh } = useEventRegistration(event.id);
  const { register, cancel, isLoading, error, success } = useRegistrationActions();
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  // Check if event has started
  const eventStarted = new Date(event.startDateTime) <= new Date();
  
  // Check if user can register/cancel
  const canRegister = !eventStarted && event.status === 'PUBLISHED';
  const canCancel = registration && 
    [RegistrationStatus.REGISTERED, RegistrationStatus.WAITLISTED].includes(registration.status) &&
    !eventStarted;

  /**
   * Handle registration
   */
  const handleRegister = async () => {
    if (!isAuthenticated) {
      // Redirect to login
      window.location.href = '/signin?redirect=/events/' + event.id;
      return;
    }

    const result = await register(event.id);
    if (result) {
      refresh();
      onRegistrationChange?.();
    }
  };

  /**
   * Handle cancellation
   */
  const handleCancel = async () => {
    if (!registration) return;

    const result = await cancel(registration.id);
    if (result) {
      refresh();
      onRegistrationChange?.();
      setShowConfirmCancel(false);
    }
  };

  /**
   * Get button text based on state
   */
  const getButtonText = (): string => {
    if (isLoading) return 'Processing...';
    
    if (!isRegistered) {
      if (event.registeredCount >= event.capacity) {
        return 'Join Waitlist';
      }
      return 'Register';
    }

    if (registration?.status === RegistrationStatus.WAITLISTED) {
      return 'On Waitlist';
    }

    return 'Registered';
  };

  /**
   * Get button style based on state
   */
  const getButtonStyle = (): string => {
    const baseStyle = 'px-6 py-3 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    if (isRegistered) {
      if (registration?.status === RegistrationStatus.WAITLISTED) {
        return `${baseStyle} bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500`;
      }
      return `${baseStyle} bg-green-600 text-white hover:bg-green-700 focus:ring-green-500`;
    }

    if (event.registeredCount >= event.capacity) {
      return `${baseStyle} bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500`;
    }

    return `${baseStyle} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`;
  };

  /**
   * Get capacity display
   */
  const getCapacityDisplay = (): string | null => {
    const available = event.capacity - event.registeredCount;
    
    if (available <= 0) {
      return `Waitlist: ${event.waitlistCount}`;
    }
    
    if (available <= 10) {
      return `Only ${available} spots left!`;
    }
    
    return `${available} / ${event.capacity} spots available`;
  };

  // Don't show button if event has started or is not published
  if (eventStarted) {
    return (
      <div className="text-gray-600 text-sm">
        Event has started
      </div>
    );
  }

  if (event.status !== 'PUBLISHED') {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Action Button */}
      <div className="flex items-center gap-3">
        {!isRegistered ? (
          <button
            onClick={handleRegister}
            disabled={isLoading || !canRegister}
            className={getButtonStyle()}
          >
            {getButtonText()}
          </button>
        ) : (
          <>
            <button
              onClick={() => setShowConfirmCancel(true)}
              disabled={isLoading || !canCancel}
              className="px-6 py-3 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel Registration
            </button>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium text-gray-700">
                {getButtonText()}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Capacity Info */}
      {getCapacityDisplay() && (
        <div className="text-sm text-gray-600">
          {getCapacityDisplay()}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          {success}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showConfirmCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900">
              Cancel Registration?
            </h3>
            
            <p className="text-gray-600">
              Are you sure you want to cancel your registration for <strong>{event.title}</strong>?
              {registration?.status === RegistrationStatus.REGISTERED && (
                <span className="block mt-2 text-sm">
                  Your spot will be offered to the next person on the waitlist.
                </span>
              )}
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmCancel(false)}
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
    </div>
  );
}
