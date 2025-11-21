import { Context } from 'aws-lambda';
import preferencesManager from '../lib/preferences/preferencesManager';
import { NotificationPreferences } from '../types/notification.types';

interface GetPreferencesRequest {
  userId: string;
}

interface GetPreferencesResponse {
  success: boolean;
  preferences?: NotificationPreferences;
  error?: string;
}

/**
 * Get user notification preferences
 * Called from GraphQL query to load user settings
 * 
 * Returns default preferences if none exist
 */
export async function handler(
  event: { arguments: GetPreferencesRequest },
  context: Context
): Promise<GetPreferencesResponse> {
  const { userId } = event.arguments;

  console.log('Getting notification preferences:', { userId });

  try {
    const preferences = await preferencesManager.getPreferences(userId);

    return {
      success: true,
      preferences,
    };
  } catch (error: any) {
    console.error('Error getting preferences:', error);

    return {
      success: false,
      error: error.message,
    };
  }
};
