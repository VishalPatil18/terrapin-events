/**
 * Rate Limiter Business Logic
 * Prevents abuse by limiting registration actions per user
 */

import { DynamoDBClient, UpdateItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { RateLimitRecord } from '../../../shared/types/registration.types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  REGISTER: {
    maxRequests: 5,  // Maximum 5 registration attempts
    windowMinutes: 1,  // Per minute
  },
  CANCEL: {
    maxRequests: 10,  // Maximum 10 cancellations
    windowMinutes: 5,  // Per 5 minutes
  },
};

/**
 * Check if user has exceeded rate limit for an action
 * @param userId - User ID
 * @param action - Action type (REGISTER | CANCEL)
 * @returns Object with allowed status and remaining attempts
 */
export async function checkRateLimit(
  userId: string,
  action: 'REGISTER' | 'CANCEL'
): Promise<{
  allowed: boolean;
  remainingAttempts: number;
  resetAt: string;
}> {
  try {
    const config = RATE_LIMIT_CONFIG[action];
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMinutes * 60 * 1000);

    // Get rate limit record
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `RATELIMIT#${action}`,
        },
      })
    );

    if (!result.Item) {
      // No record exists, create one
      await createRateLimitRecord(userId, action, 1, now);
      return {
        allowed: true,
        remainingAttempts: config.maxRequests - 1,
        resetAt: new Date(now.getTime() + config.windowMinutes * 60 * 1000).toISOString(),
      };
    }

    const record = result.Item as RateLimitRecord;
    const recordWindowStart = new Date(record.windowStart);

    // Check if window has expired
    if (recordWindowStart < windowStart) {
      // Window expired, reset counter
      await createRateLimitRecord(userId, action, 1, now);
      return {
        allowed: true,
        remainingAttempts: config.maxRequests - 1,
        resetAt: new Date(now.getTime() + config.windowMinutes * 60 * 1000).toISOString(),
      };
    }

    // Window still active, check count
    if (record.count >= config.maxRequests) {
      // Rate limit exceeded
      const resetAt = new Date(recordWindowStart.getTime() + config.windowMinutes * 60 * 1000);
      return {
        allowed: false,
        remainingAttempts: 0,
        resetAt: resetAt.toISOString(),
      };
    }

    // Increment counter
    const newCount = record.count + 1;
    await updateRateLimitRecord(userId, action, newCount);

    return {
      allowed: true,
      remainingAttempts: config.maxRequests - newCount,
      resetAt: new Date(recordWindowStart.getTime() + config.windowMinutes * 60 * 1000).toISOString(),
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // On error, allow the request (fail open)
    return {
      allowed: true,
      remainingAttempts: RATE_LIMIT_CONFIG[action].maxRequests - 1,
      resetAt: new Date(Date.now() + RATE_LIMIT_CONFIG[action].windowMinutes * 60 * 1000).toISOString(),
    };
  }
}

/**
 * Create a new rate limit record
 * @param userId - User ID
 * @param action - Action type
 * @param count - Initial count
 * @param windowStart - Window start time
 */
async function createRateLimitRecord(
  userId: string,
  action: string,
  count: number,
  windowStart: Date
): Promise<void> {
  const config = RATE_LIMIT_CONFIG[action as keyof typeof RATE_LIMIT_CONFIG];
  const expiresAt = Math.floor((windowStart.getTime() + config.windowMinutes * 60 * 1000) / 1000);

  const record: RateLimitRecord = {
    PK: `USER#${userId}`,
    SK: `RATELIMIT#${action}`,
    count,
    windowStart: windowStart.toISOString(),
    expiresAt,  // TTL for automatic cleanup
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: record,
    })
  );
}

/**
 * Update rate limit record count
 * @param userId - User ID
 * @param action - Action type
 * @param newCount - New count value
 */
async function updateRateLimitRecord(
  userId: string,
  action: string,
  newCount: number
): Promise<void> {
  await client.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        PK: `USER#${userId}`,
        SK: `RATELIMIT#${action}`,
      }),
      UpdateExpression: 'SET #count = :count',
      ExpressionAttributeNames: {
        '#count': 'count',
      },
      ExpressionAttributeValues: marshall({
        ':count': newCount,
      }),
    })
  );
}

/**
 * Reset rate limit for a user and action
 * Useful for testing or admin override
 * @param userId - User ID
 * @param action - Action type
 */
export async function resetRateLimit(userId: string, action: 'REGISTER' | 'CANCEL'): Promise<void> {
  try {
    await client.send(
      new DeleteItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({
          PK: `USER#${userId}`,
          SK: `RATELIMIT#${action}`,
        }),
      })
    );

    console.log(`Reset rate limit for user ${userId}, action ${action}`);
  } catch (error) {
    console.error('Error resetting rate limit:', error);
    throw error;
  }
}
