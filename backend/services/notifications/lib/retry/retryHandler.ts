/**
 * TEMS Notification System - Retry Handler
 * 
 * Implements exponential backoff retry logic for failed notifications.
 * Handles retry scheduling, attempt counting, and Dead Letter Queue routing.
 * 
 * @module notifications/lib/retry/retryHandler
 */

import { RetryConfig, DEFAULT_RETRY_CONFIG } from '../../types/notification.types';

/**
 * Calculate next retry time using exponential backoff
 * 
 * Formula: initialDelay * (backoffMultiplier ^ (attempt - 1))
 * Capped at maxDelayMs
 * 
 * @param attempt - Current attempt number (1, 2, or 3)
 * @param config - Retry configuration
 * @returns Date object for next retry
 */
export function calculateNextRetryTime(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Date {
  // Calculate delay with exponential backoff
  const delayMs = Math.min(
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
    config.maxDelayMs
  );

  const nextRetry = new Date();
  nextRetry.setMilliseconds(nextRetry.getMilliseconds() + delayMs);

  return nextRetry;
}

/**
 * Check if error is retryable
 * 
 * @param error - Error object
 * @returns Boolean indicating if retry should be attempted
 */
export function isRetryableError(error: any): boolean {
  // AWS SDK errors that are retryable
  const retryableErrorCodes = [
    'Throttling',
    'ThrottlingException',
    'ServiceUnavailable',
    'InternalFailure',
    'InternalServerError',
    'RequestTimeout',
    'TooManyRequestsException',
    'ProvisionedThroughputExceededException',
  ];

  // Check error code/name
  if (error.code && retryableErrorCodes.includes(error.code)) {
    return true;
  }

  if (error.name && retryableErrorCodes.includes(error.name)) {
    return true;
  }

  // Check HTTP status codes
  if (error.$metadata?.httpStatusCode) {
    const statusCode = error.$metadata.httpStatusCode;
    // Retry on 5xx errors and 429 (Too Many Requests)
    return statusCode >= 500 || statusCode === 429;
  }

  // Network errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return true;
  }

  return false;
}

/**
 * Determine if another retry attempt should be made
 * 
 * @param attempt - Current attempt number
 * @param error - Error that occurred
 * @param config - Retry configuration
 * @returns Boolean indicating if retry should happen
 */
export function shouldRetry(
  attempt: number,
  error: any,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): boolean {
  // Check if we've exceeded max attempts
  if (attempt >= config.maxAttempts) {
    return false;
  }

  // Check if error is retryable
  return isRetryableError(error);
}

/**
 * Execute a function with automatic retry logic
 * 
 * @param fn - Async function to execute
 * @param config - Retry configuration
 * @returns Promise resolving to function result
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt < config.maxAttempts && isRetryableError(error)) {
        // Calculate delay for next retry
        const delayMs = Math.min(
          config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelayMs
        );

        console.log(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`, {
          error: error.message,
          nextAttempt: attempt + 1,
        });

        // Wait before retrying
        await sleep(delayMs);
      } else {
        // No more retries or error is not retryable
        break;
      }
    }
  }

  // All attempts failed
  throw lastError;
}

/**
 * Execute with retry and track attempts
 * Returns both result and attempt count
 * 
 * @param fn - Async function to execute
 * @param config - Retry configuration
 * @returns Object with result and attempt count
 */
export async function executeWithRetryTracking<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<{ result: T; attempts: number; errors: any[] }> {
  const errors: any[] = [];
  let attempts = 0;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    attempts = attempt;

    try {
      const result = await fn();
      return { result, attempts, errors };
    } catch (error) {
      errors.push({
        attempt,
        error: error.message || String(error),
        timestamp: new Date().toISOString(),
      });

      if (attempt < config.maxAttempts && isRetryableError(error)) {
        const delayMs = Math.min(
          config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelayMs
        );

        await sleep(delayMs);
      } else {
        throw error;
      }
    }
  }

  throw new Error('Max retry attempts reached');
}

/**
 * Create a retry schedule for a notification
 * Returns array of timestamps for each retry attempt
 * 
 * @param config - Retry configuration
 * @param startTime - Optional start time (defaults to now)
 * @returns Array of ISO timestamp strings
 */
export function createRetrySchedule(
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  startTime?: Date
): string[] {
  const start = startTime || new Date();
  const schedule: string[] = [];

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    const delayMs = Math.min(
      config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
      config.maxDelayMs
    );

    const retryTime = new Date(start);
    retryTime.setMilliseconds(retryTime.getMilliseconds() + delayMs);

    schedule.push(retryTime.toISOString());
  }

  return schedule;
}

/**
 * Calculate total retry window duration
 * 
 * @param config - Retry configuration
 * @returns Total duration in milliseconds
 */
export function calculateRetryWindow(config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  let totalMs = 0;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    const delayMs = Math.min(
      config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
      config.maxDelayMs
    );
    totalMs += delayMs;
  }

  return totalMs;
}

/**
 * Format retry schedule for human reading
 * 
 * @param config - Retry configuration
 * @returns Human-readable schedule description
 */
export function formatRetrySchedule(config: RetryConfig = DEFAULT_RETRY_CONFIG): string {
  const delays: string[] = [];

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    const delayMs = Math.min(
      config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
      config.maxDelayMs
    );

    if (delayMs < 1000) {
      delays.push(`${delayMs}ms`);
    } else if (delayMs < 60000) {
      delays.push(`${Math.round(delayMs / 1000)}s`);
    } else {
      delays.push(`${Math.round(delayMs / 60000)}m`);
    }
  }

  return `${config.maxAttempts} attempts with delays: ${delays.join(', ')}`;
}

/**
 * Jitter function to add randomness to retry delays
 * Helps prevent thundering herd problem
 * 
 * @param delayMs - Base delay in milliseconds
 * @param jitterFactor - Jitter factor (0-1, default 0.1 = 10%)
 * @returns Delay with jitter applied
 */
export function addJitter(delayMs: number, jitterFactor: number = 0.1): number {
  const jitter = delayMs * jitterFactor * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(delayMs + jitter));
}

/**
 * Calculate backoff with jitter
 * 
 * @param attempt - Current attempt number
 * @param config - Retry configuration
 * @param jitterFactor - Jitter factor (0-1)
 * @returns Delay in milliseconds with jitter
 */
export function calculateBackoffWithJitter(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  jitterFactor: number = 0.1
): number {
  const baseDelay = Math.min(
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
    config.maxDelayMs
  );

  return addJitter(baseDelay, jitterFactor);
}

/**
 * Sleep utility function
 * 
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create SQS message for retry queue
 * 
 * @param notificationId - Notification ID
 * @param attempt - Current attempt number
 * @param error - Error that occurred
 * @param metadata - Additional metadata
 * @returns SQS message body
 */
export function createRetryMessage(
  notificationId: string,
  attempt: number,
  error: any,
  metadata: Record<string, any> = {}
): string {
  return JSON.stringify({
    notificationId,
    attempt,
    error: {
      code: error.code || error.name || 'UnknownError',
      message: error.message || String(error),
      stack: error.stack,
    },
    metadata,
    timestamp: new Date().toISOString(),
  });
}

export default {
  calculateNextRetryTime,
  isRetryableError,
  shouldRetry,
  executeWithRetry,
  executeWithRetryTracking,
  createRetrySchedule,
  calculateRetryWindow,
  formatRetrySchedule,
  addJitter,
  calculateBackoffWithJitter,
  createRetryMessage,
};
