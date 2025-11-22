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
export async function handler(
  event: { arguments: UpdatePreferencesRequest },
  context: Context
): Promise<UpdatePreferencesResponse> {
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
    const { startHour, endHour } = preferences.doNotDisturb;
    
    if (startHour && !isValidTime(startHour)) {
      throw new Error('Invalid DND start time format. Use HH:MM');
    }
    
    if (endHour && !isValidTime(endHour)) {
      throw new Error('Invalid DND end time format. Use HH:MM');
    }
  }

  // Note: frequency field validation removed as NotificationFrequency is an enum, not an object
}

/**
 * Validate time format (HH:MM)
 */
function isValidTime(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
}
