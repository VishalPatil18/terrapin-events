/**
 * Helper utilities for registration handlers
 * Transforms DynamoDB records to GraphQL-compatible objects
 */

import { GraphQLRegistration } from '../../../shared/types/registration.types';

/**
 * Transform DynamoDB Registration record to GraphQL schema format
 * Removes DynamoDB-specific keys (PK, SK, GSI1PK, GSI1SK) and internal fields
 * Returns only the fields that match the GraphQL Registration type
 * 
 * @param dbRecord - Full DynamoDB registration record
 * @returns Clean GraphQLRegistration object matching GraphQL schema
 */
export function toGraphQLRegistration(dbRecord: any): GraphQLRegistration {
  return {
    id: dbRecord.id,
    userId: dbRecord.userId,
    eventId: dbRecord.eventId,
    status: dbRecord.status,
    qrCode: dbRecord.qrCode || '',  // Ensure non-null (required in schema)
    waitlistPosition: dbRecord.waitlistPosition ?? null,
    promotionDeadline: dbRecord.promotionDeadline ?? null,
    registeredAt: dbRecord.registeredAt,
    attendedAt: dbRecord.attendedAt ?? null,
  };
}

/**
 * Transform array of DynamoDB Registration records to GraphQL format
 * @param dbRecords - Array of DynamoDB registration records
 * @returns Array of clean GraphQLRegistration objects
 */
export function toGraphQLRegistrations(dbRecords: any[]): GraphQLRegistration[] {
  return dbRecords.map(toGraphQLRegistration);
}
