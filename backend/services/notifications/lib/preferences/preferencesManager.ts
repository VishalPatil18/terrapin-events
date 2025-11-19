/**
 * TEMS Notification System - Preferences Manager
 * 
 * CRUD operations for user notification preferences.
 * Manages email/in-app settings, frequency, enabled types, and DND configuration.
 * 
 * @module notifications/lib/preferences/preferencesManager
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { nanoid } from 'nanoid';
import {
  NotificationPreferences,
  UpdateNotificationPreferencesInput,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationType,
} from '../../types/notification.types';

const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'terrapin-events-dev';

/**
 * Get user notification preferences
 * Creates default preferences if none exist
 * 
 * @param userId - User ID
 * @returns User notification preferences
 */
export async function getPreferences(userId: string): Promise<NotificationPreferences> {
  const response = await dynamoDB.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PREFERENCES#NOTIFICATION',
      },
    })
  );

  if (response.Item) {
    return response.Item as NotificationPreferences;
  }

  // Create default preferences if none exist
  return await createDefaultPreferences(userId);
}

/**
 * Create default notification preferences for new user
 * 
 * @param userId - User ID
 * @returns Created notification preferences
 */
export async function createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
  const now = new Date().toISOString();
  
  const preferences: NotificationPreferences = {
    PK: `USER#${userId}`,
    SK: 'PREFERENCES#NOTIFICATION',
    userId,
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    unsubscribeToken: nanoid(32),
    createdAt: now,
    updatedAt: now,
  };

  await dynamoDB.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: preferences,
      ConditionExpression: 'attribute_not_exists(PK)',
    })
  );

  return preferences;
}

/**
 * Update user notification preferences
 * 
 * @param userId - User ID
 * @param input - Preferences to update
 * @returns Updated preferences
 */
export async function updatePreferences(
  userId: string,
  input: UpdateNotificationPreferencesInput
): Promise<NotificationPreferences> {
  const updates: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {
    ':updatedAt': new Date().toISOString(),
  };

  // Build update expression dynamically
  if (input.emailEnabled !== undefined) {
    updates.push('emailEnabled = :emailEnabled');
    expressionAttributeValues[':emailEnabled'] = input.emailEnabled;
  }

  if (input.inAppEnabled !== undefined) {
    updates.push('inAppEnabled = :inAppEnabled');
    expressionAttributeValues[':inAppEnabled'] = input.inAppEnabled;
  }

  if (input.frequency) {
    updates.push('frequency = :frequency');
    expressionAttributeValues[':frequency'] = input.frequency;
  }

  if (input.enabledTypes) {
    // Update individual notification types
    Object.entries(input.enabledTypes).forEach(([key, value]) => {
      const attributeName = `#type_${key}`;
      const attributeValue = `:type_${key}`;
      
      updates.push(`enabledTypes.${attributeName} = ${attributeValue}`);
      expressionAttributeNames[attributeName] = key;
      expressionAttributeValues[attributeValue] = value;
    });
  }

  if (input.doNotDisturb) {
    // Update DND settings
    if (input.doNotDisturb.enabled !== undefined) {
      updates.push('doNotDisturb.#enabled = :dndEnabled');
      expressionAttributeNames['#enabled'] = 'enabled';
      expressionAttributeValues[':dndEnabled'] = input.doNotDisturb.enabled;
    }

    if (input.doNotDisturb.startHour) {
      updates.push('doNotDisturb.startHour = :dndStartHour');
      expressionAttributeValues[':dndStartHour'] = input.doNotDisturb.startHour;
    }

    if (input.doNotDisturb.endHour) {
      updates.push('doNotDisturb.endHour = :dndEndHour');
      expressionAttributeValues[':dndEndHour'] = input.doNotDisturb.endHour;
    }

    if (input.doNotDisturb.timezone) {
      updates.push('doNotDisturb.timezone = :dndTimezone');
      expressionAttributeValues[':dndTimezone'] = input.doNotDisturb.timezone;
    }
  }

  // Always update timestamp
  updates.push('updatedAt = :updatedAt');

  if (updates.length === 0) {
    // No updates provided, just return current preferences
    return await getPreferences(userId);
  }

  await dynamoDB.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PREFERENCES#NOTIFICATION',
      },
      UpdateExpression: `SET ${updates.join(', ')}`,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 
        ? expressionAttributeNames 
        : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
    })
  );

  // Return updated preferences
  return await getPreferences(userId);
}

/**
 * Check if a specific notification type is enabled for user
 * 
 * @param userId - User ID
 * @param type - Notification type
 * @returns Boolean indicating if notification type is enabled
 */
export async function isNotificationEnabled(
  userId: string,
  type: NotificationType
): Promise<boolean> {
  const preferences = await getPreferences(userId);

  // Check if user has unsubscribed
  if (preferences.unsubscribedAt) {
    return false;
  }

  // Check global enable flags
  if (!preferences.emailEnabled && !preferences.inAppEnabled) {
    return false;
  }

  // Check specific notification type
  return preferences.enabledTypes[type] !== false;
}

/**
 * Check if email notifications are enabled for user
 * 
 * @param userId - User ID
 * @param type - Notification type
 * @returns Boolean indicating if email is enabled
 */
export async function isEmailEnabled(
  userId: string,
  type: NotificationType
): Promise<boolean> {
  const preferences = await getPreferences(userId);

  if (preferences.unsubscribedAt) {
    return false;
  }

  return preferences.emailEnabled && preferences.enabledTypes[type] !== false;
}

/**
 * Check if in-app notifications are enabled for user
 * 
 * @param userId - User ID
 * @param type - Notification type
 * @returns Boolean indicating if in-app is enabled
 */
export async function isInAppEnabled(
  userId: string,
  type: NotificationType
): Promise<boolean> {
  const preferences = await getPreferences(userId);

  if (preferences.unsubscribedAt) {
    return false;
  }

  return preferences.inAppEnabled && preferences.enabledTypes[type] !== false;
}

/**
 * Unsubscribe user from all notifications using token
 * 
 * @param token - Unsubscribe token
 * @returns Boolean indicating success
 */
export async function unsubscribeUser(token: string): Promise<boolean> {
  // Note: This requires a GSI on unsubscribeToken
  // For now, we'll need to implement this differently
  // In production, add GSI: unsubscribeToken (GSI4PK) -> userId (GSI4SK)
  
  console.warn('unsubscribeUser: Requires GSI implementation');
  
  // Temporary implementation - would need to be called with userId
  // await updatePreferences(userId, {
  //   emailEnabled: false,
  //   inAppEnabled: false,
  // });
  // 
  // await dynamoDB.send(
  //   new UpdateCommand({
  //     TableName: TABLE_NAME,
  //     Key: { PK: `USER#${userId}`, SK: 'PREFERENCES#NOTIFICATION' },
  //     UpdateExpression: 'SET unsubscribedAt = :now',
  //     ExpressionAttributeValues: {
  //       ':now': new Date().toISOString(),
  //     },
  //   })
  // );
  
  return false;
}

/**
 * Re-subscribe user to notifications
 * 
 * @param userId - User ID
 * @returns Updated preferences
 */
export async function resubscribeUser(userId: string): Promise<NotificationPreferences> {
  await dynamoDB.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PREFERENCES#NOTIFICATION',
      },
      UpdateExpression: 'REMOVE unsubscribedAt SET emailEnabled = :true, inAppEnabled = :true, updatedAt = :now',
      ExpressionAttributeValues: {
        ':true': true,
        ':now': new Date().toISOString(),
      },
    })
  );

  return await getPreferences(userId);
}

/**
 * Disable a specific notification type for user
 * 
 * @param userId - User ID
 * @param type - Notification type to disable
 */
export async function disableNotificationType(
  userId: string,
  type: NotificationType
): Promise<void> {
  await updatePreferences(userId, {
    enabledTypes: {
      [type]: false,
    },
  });
}

/**
 * Enable a specific notification type for user
 * 
 * @param userId - User ID
 * @param type - Notification type to enable
 */
export async function enableNotificationType(
  userId: string,
  type: NotificationType
): Promise<void> {
  await updatePreferences(userId, {
    enabledTypes: {
      [type]: true,
    },
  });
}

/**
 * Bulk update notification type preferences
 * 
 * @param userId - User ID
 * @param types - Map of notification types to enabled status
 */
export async function bulkUpdateNotificationTypes(
  userId: string,
  types: Partial<NotificationPreferences['enabledTypes']>
): Promise<NotificationPreferences> {
  return await updatePreferences(userId, {
    enabledTypes: types,
  });
}

export default {
  getPreferences,
  createDefaultPreferences,
  updatePreferences,
  isNotificationEnabled,
  isEmailEnabled,
  isInAppEnabled,
  unsubscribeUser,
  resubscribeUser,
  disableNotificationType,
  enableNotificationType,
  bulkUpdateNotificationTypes,
};
