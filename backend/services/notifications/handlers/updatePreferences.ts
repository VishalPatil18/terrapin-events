import { Context } from 'aws-lambda';
import preferencesManager from '../lib/preferences/preferencesManager';
import { NotificationPreferences } from '../types/notification.types';

interface UpdatePreferencesRequest {
  userId: string;
  preferences: Partial<NotificationPreferences>;
}

interface UpdatePreferencesResponse {
  success: boolean;
  preferences?: NotificationPreferences;
  error?: string;
}

/**
 * Update user notification preferences
 * Called from GraphQL mutation when user changes settings
 * 
 * Supports updating:
 * - channels: { email, inApp, sms }
 * - types: { registrations, waitlist, reminders, eventUpdates, marketing }
 * - doNotDisturb: { enabled, startTime, endTime }
 * - frequency: digest settings
 */
export const handler = async (
  event: { arguments: UpdatePreferencesRequest },
  context: Context
): Promise<UpdatePreferencesResponse> => {
  const { userId, preferences } = event.arguments;

  console.log('Updating notification preferences:', { userId, preferences });

  try {
    // Validate preferences
    validatePreferences(preferences);

    // Update preferences in DynamoDB
    const updated = await preferencesManager.updatePreferences(userId, preferences);

    console.log('Preferences updated successfully:', { userId });

    return {
      success: true,
      preferences: updated,
    };
  } catch (error: any) {
    console.error('Error updating preferences:', error);

    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Validate preference updates
 */
function validatePreferences(preferences: Partial<NotificationPreferences>): void {
  // Validate DND times if provided
  if (preferences.doNotDisturb) {
    const { startTime, endTime } = preferences.doNotDisturb;
    
    if (startTime && !isValidTime(startTime)) {
      throw new Error('Invalid DND start time format. Use HH:MM');
    }
    
    if (endTime && !isValidTime(endTime)) {
      throw new Error('Invalid DND end time format. Use HH:MM');
    }
  }

  // Validate frequency settings if provided
  if (preferences.frequency) {
    const { digestEnabled, digestFrequency, batchNotifications } = preferences.frequency;
    
    if (digestFrequency && !['daily', 'weekly'].includes(digestFrequency)) {
      throw new Error('Invalid digest frequency. Must be "daily" or "weekly"');
    }
    
    if (batchNotifications && typeof batchNotifications.enabled !== 'boolean') {
      throw new Error('Invalid batch notifications enabled value');
    }
    
    if (batchNotifications?.intervalMinutes) {
      const interval = batchNotifications.intervalMinutes;
      if (interval < 5 || interval > 1440) {
        throw new Error('Batch interval must be between 5 and 1440 minutes');
      }
    }
  }
}

/**
 * Validate time format (HH:MM)
 */
function isValidTime(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
}
