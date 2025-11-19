/**
 * TEMS Notification System - Do Not Disturb Checker
 * 
 * Validates notification timing against user's Do Not Disturb preferences.
 * Respects quiet hours (default: 10 PM - 8 AM) and timezone settings.
 * 
 * @module notifications/lib/preferences/doNotDisturbChecker
 */

import { NotificationPreferences, NotificationType } from '../../types/notification.types';
import { getPreferences } from './preferencesManager';

/**
 * Check if current time is within user's Do Not Disturb period
 * 
 * @param preferences - User notification preferences
 * @param currentTime - Optional current time (for testing)
 * @returns Boolean indicating if in DND period
 */

 interface DNDCheckResult {
   isInDND: boolean;
   nextAvailableTime?: Date;
 }

export function isInDoNotDisturbPeriod(
  preferences: NotificationPreferences
): DNDCheckResult {
  // If DND is not enabled, return false
  if (!preferences.doNotDisturb.enabled) {
    return { isInDND: false };
  }

  const now = new Date();
  const { startHour, endHour, timezone } = preferences.doNotDisturb;

  try {
    // Convert current time to user's timezone
    const userTime = new Date(
      now.toLocaleString('en-US', { timeZone: timezone })
    );

    const currentHour = userTime.getHours();
    const currentMinute = userTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    // Parse start and end hours (format: "HH:MM")
    const [startH, startM] = startHour.split(':').map(Number);
    const [endH, endM] = endHour.split(':').map(Number);

    const startTimeInMinutes = startH * 60 + startM;
    const endTimeInMinutes = endH * 60 + endM;

    let isInDND = false;

    // Check if DND crosses midnight (e.g., 22:00–08:00)
    if (startTimeInMinutes > endTimeInMinutes) {
      isInDND =
        currentTimeInMinutes >= startTimeInMinutes ||
        currentTimeInMinutes < endTimeInMinutes;
    } else {
      isInDND =
        currentTimeInMinutes >= startTimeInMinutes &&
        currentTimeInMinutes < endTimeInMinutes;
    }

    if (!isInDND) {
      return { isInDND: false };
    }

    // Calculate next available time
    const nextAvailableTime = new Date(userTime);
    nextAvailableTime.setHours(endH, endM, 0, 0);

    // If DND crosses midnight and we're after start, push end to tomorrow
    if (startTimeInMinutes > endTimeInMinutes &&
        currentTimeInMinutes >= startTimeInMinutes) {
      nextAvailableTime.setDate(nextAvailableTime.getDate() + 1);
    }

    return {
      isInDND: true,
      nextAvailableTime,
    };
  } catch (error) {
    console.error('Error checking DND period:', error);
    return { isInDND: false };
  }
}

/**
 * Get the next available time after DND period ends
 * 
 * @param preferences - User notification preferences
 * @param currentTime - Optional current time (for testing)
 * @returns Next available Date after DND ends
 */
export function getNextAvailableTime(
  preferences: NotificationPreferences,
  currentTime?: Date
): Date {
  const now = currentTime || new Date();

  // If DND is not enabled or not currently in DND, return current time
  if (!preferences.doNotDisturb.enabled || !isInDoNotDisturbPeriod(preferences)) {
    return now;
  }

  const { endHour, timezone } = preferences.doNotDisturb;

  try {
    // Convert current time to user's timezone
    const userTime = new Date(
      now.toLocaleString('en-US', { timeZone: timezone })
    );

    // Parse end hour (format: "HH:MM")
    const [endH, endM] = endHour.split(':').map(Number);

    // Create a new date for the end of DND period
    const nextAvailable = new Date(userTime);
    nextAvailable.setHours(endH, endM, 0, 0);

    // If end time is earlier than current time (DND crosses midnight),
    // set to next day
    if (nextAvailable <= userTime) {
      nextAvailable.setDate(nextAvailable.getDate() + 1);
    }

    // Convert back from user's timezone to UTC
    const utcTime = new Date(
      nextAvailable.toLocaleString('en-US', { timeZone: 'UTC' })
    );

    return utcTime;
  } catch (error) {
    console.error('Error calculating next available time:', error);
    // If there's an error, return current time + 1 hour as fallback
    const fallback = new Date(now);
    fallback.setHours(fallback.getHours() + 1);
    return fallback;
  }
}

/**
 * Check if a notification should be sent now considering DND
 * 
 * @param userId - User ID
 * @param type - Notification type
 * @param currentTime - Optional current time (for testing)
 * @returns Boolean indicating if notification should be sent now
 */
export async function shouldSendNotification(
  userId: string,
  type: NotificationType,
  currentTime?: Date
): Promise<boolean> {
  const preferences = await getPreferences(userId);

  // Check if user is subscribed
  if (preferences.unsubscribedAt) {
    return false;
  }

  // Check if notification type is enabled
  if (!preferences.enabledTypes[type]) {
    return false;
  }

  // High-priority notifications bypass DND
  const highPriorityTypes = [
    NotificationType.WAITLIST_PROMOTED,
    NotificationType.EVENT_CANCELLED,
    NotificationType.EVENT_REMINDER_1H,
  ];

  if (highPriorityTypes.includes(type)) {
    return true;
  }

  // Check DND for regular priority notifications
  return !isInDoNotDisturbPeriod(preferences);
}

/**
 * Calculate delay (in milliseconds) until notification can be sent
 * Returns 0 if notification can be sent immediately
 * 
 * @param userId - User ID
 * @param type - Notification type
 * @param currentTime - Optional current time (for testing)
 * @returns Delay in milliseconds
 */
export async function getNotificationDelay(
  userId: string,
  type: NotificationType,
  currentTime?: Date
): Promise<number> {
  const now = currentTime || new Date();
  const canSend = await shouldSendNotification(userId, type, now);

  if (canSend) {
    return 0;
  }

  const preferences = await getPreferences(userId);
  const nextAvailable = getNextAvailableTime(preferences, now);

  return Math.max(0, nextAvailable.getTime() - now.getTime());
}

/**
 * Format DND period for display
 * 
 * @param preferences - User notification preferences
 * @returns Human-readable DND period
 */
export function formatDNDPeriod(preferences: NotificationPreferences): string {
  if (!preferences.doNotDisturb.enabled) {
    return 'Do Not Disturb is disabled';
  }

  const { startHour, endHour, timezone } = preferences.doNotDisturb;

  return `${startHour} - ${endHour} (${timezone})`;
}

/**
 * Validate DND time format
 * 
 * @param time - Time string in HH:MM format
 * @returns Boolean indicating if format is valid
 */
export function isValidDNDTime(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
}

/**
 * Validate timezone string
 * 
 * @param timezone - IANA timezone identifier
 * @returns Boolean indicating if timezone is valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get current hour in user's timezone
 * 
 * @param timezone - IANA timezone identifier
 * @returns Current hour (0-23) in user's timezone
 */
export function getCurrentHourInTimezone(timezone: string): number {
  try {
    const now = new Date();
    const userTime = new Date(
      now.toLocaleString('en-US', { timeZone: timezone })
    );
    return userTime.getHours();
  } catch (error) {
    console.error('Error getting current hour:', error);
    return new Date().getHours();
  }
}

export default {
  isInDoNotDisturbPeriod,
  getNextAvailableTime,
  shouldSendNotification,
  getNotificationDelay,
  formatDNDPeriod,
  isValidDNDTime,
  isValidTimezone,
  getCurrentHourInTimezone,
};
