/**
 * Registration Hooks
 * TEMS - Terrapin Events Management System
 * 
 * React hooks for managing registrations with proper state management,
 * loading states, error handling, and optimistic updates.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Registration,
  RegistrationStatus,
  RegistrationStats,
  EventCapacityInfo,
  RegisterForEventInput,
  CancelRegistrationInput,
} from '@/types/registration.types';
import {
  registrationsAPI,
  RegistrationError,
} from '@/lib/api/registrations.api';

/**
 * Hook for managing user's registrations list
 * Fetches and caches the user's registrations with filtering
 */
export function useRegistrations(status?: RegistrationStatus) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextToken, setNextToken] = useState<string | null>(null);

  const fetchRegistrations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await registrationsAPI.listMyRegistrations({ status });
      setRegistrations(result.items);
      setNextToken(result.nextToken);
    } catch (err) {
      const message = err instanceof RegistrationError 
        ? err.message 
        : 'Failed to load registrations';
      setError(message);
      console.error('Error fetching registrations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  /**
   * Load more registrations (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!nextToken || isLoading) return;

    try {
      setIsLoading(true);
      const result = await registrationsAPI.listMyRegistrations({
        status,
        nextToken,
      });
      
      setRegistrations(prev => [...prev, ...result.items]);
      setNextToken(result.nextToken);
    } catch (err) {
      const message = err instanceof RegistrationError 
        ? err.message 
        : 'Failed to load more registrations';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [nextToken, isLoading, status]);

  /**
   * Refresh registrations list
   */
  const refresh = useCallback(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  return {
    registrations,
    isLoading,
    error,
    hasMore: !!nextToken,
    loadMore,
    refresh,
  };
}

/**
 * Hook for a single registration
 * Fetches detailed information about a specific registration
 */
export function useRegistration(registrationId: string | null) {
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!registrationId) {
      setRegistration(null);
      return;
    }

    const fetchRegistration = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await registrationsAPI.getRegistration(registrationId);
        setRegistration(data);
      } catch (err) {
        const message = err instanceof RegistrationError 
          ? err.message 
          : 'Failed to load registration';
        setError(message);
        console.error('Error fetching registration:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRegistration();
  }, [registrationId]);

  return {
    registration,
    isLoading,
    error,
  };
}

/**
 * Hook for registration actions (register, cancel, accept, decline)
 * Provides functions with loading and error states
 */
export function useRegistrationActions() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * Register for an event
   */
  const register = useCallback(async (eventId: string): Promise<Registration | null> => {
    if (!user?.id) {
      setError('You must be logged in to register');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      const input: RegisterForEventInput = { eventId };
      const registration = await registrationsAPI.registerForEvent(input, user.id);
      
      // Set success message based on status
      if (registration.status === RegistrationStatus.WAITLISTED) {
        setSuccess('Added to waitlist! You will be notified if a spot opens up.');
      } else {
        setSuccess('Successfully registered for event!');
      }
      
      return registration;
    } catch (err) {
      const message = err instanceof RegistrationError 
        ? err.message 
        : 'Failed to register for event';
      setError(message);
      console.error('Error registering for event:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  /**
   * Cancel a registration
   */
  const cancel = useCallback(async (registrationId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      const input: CancelRegistrationInput = { registrationId };
      await registrationsAPI.cancelRegistration(input);
      
      setSuccess('Registration cancelled successfully');
      return true;
    } catch (err) {
      const message = err instanceof RegistrationError 
        ? err.message 
        : 'Failed to cancel registration';
      setError(message);
      console.error('Error cancelling registration:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Accept waitlist promotion
   */
  const acceptPromotion = useCallback(async (registrationId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      await registrationsAPI.acceptPromotion(registrationId);
      
      setSuccess('Promotion accepted! You are now registered for the event.');
      return true;
    } catch (err) {
      const message = err instanceof RegistrationError 
        ? err.message 
        : 'Failed to accept promotion';
      setError(message);
      console.error('Error accepting promotion:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Decline waitlist promotion
   */
  const declinePromotion = useCallback(async (registrationId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      await registrationsAPI.declinePromotion(registrationId);
      
      setSuccess('Promotion declined');
      return true;
    } catch (err) {
      const message = err instanceof RegistrationError 
        ? err.message 
        : 'Failed to decline promotion';
      setError(message);
      console.error('Error declining promotion:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear messages
   */
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  return {
    register,
    cancel,
    acceptPromotion,
    declinePromotion,
    isLoading,
    error,
    success,
    clearMessages,
  };
}

/**
 * Hook for checking if user is registered for an event
 * Useful for showing register/unregister button states
 */
export function useEventRegistration(eventId: string | null) {
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setRegistration(null);
      setIsRegistered(false);
      return;
    }

    const checkRegistration = async () => {
      try {
        setIsLoading(true);
        const data = await registrationsAPI.checkUserRegistration(eventId);
        setRegistration(data);
        setIsRegistered(!!data);
      } catch (err) {
        console.error('Error checking registration:', err);
        setRegistration(null);
        setIsRegistered(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkRegistration();
  }, [eventId]);

  /**
   * Refresh registration status
   */
  const refresh = useCallback(() => {
    if (!eventId) return;
    
    registrationsAPI.checkUserRegistration(eventId)
      .then(data => {
        setRegistration(data);
        setIsRegistered(!!data);
      })
      .catch(err => {
        console.error('Error refreshing registration:', err);
      });
  }, [eventId]);

  return {
    registration,
    isRegistered,
    isLoading,
    refresh,
  };
}

/**
 * Hook for event capacity information
 * Shows available seats and if event is full
 */
export function useEventCapacity(eventId: string | null) {
  const [capacity, setCapacity] = useState<EventCapacityInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      setCapacity(null);
      return;
    }

    const fetchCapacity = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await registrationsAPI.getEventCapacity(eventId);
        setCapacity(data);
      } catch (err) {
        const message = err instanceof RegistrationError 
          ? err.message 
          : 'Failed to load capacity info';
        setError(message);
        console.error('Error fetching capacity:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCapacity();
  }, [eventId]);

  /**
   * Refresh capacity info
   */
  const refresh = useCallback(() => {
    if (!eventId) return;
    
    registrationsAPI.getEventCapacity(eventId)
      .then(setCapacity)
      .catch(err => {
        console.error('Error refreshing capacity:', err);
      });
  }, [eventId]);

  return {
    capacity,
    isFull: capacity?.isFull || false,
    availableSeats: capacity?.availableSeats || 0,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for registration statistics (dashboard)
 * Fetches summary stats about user's registrations
 */
export function useRegistrationStats() {
  const [stats, setStats] = useState<RegistrationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await registrationsAPI.getRegistrationStats();
      setStats(data);
    } catch (err) {
      const message = err instanceof RegistrationError 
        ? err.message 
        : 'Failed to load statistics';
      setError(message);
      console.error('Error fetching stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refresh: fetchStats,
  };
}

/**
 * Hook for upcoming registrations
 * Fetches registrations for events that haven't happened yet
 */
export function useUpcomingRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUpcoming = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await registrationsAPI.getUpcomingRegistrations();
      setRegistrations(data);
    } catch (err) {
      const message = err instanceof RegistrationError 
        ? err.message 
        : 'Failed to load upcoming registrations';
      setError(message);
      console.error('Error fetching upcoming registrations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUpcoming();
  }, [fetchUpcoming]);

  return {
    registrations,
    isLoading,
    error,
    refresh: fetchUpcoming,
  };
}
