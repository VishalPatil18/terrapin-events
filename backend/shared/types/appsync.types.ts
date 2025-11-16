import {
  AppSyncIdentityCognito,
  AppSyncIdentityIAM,
  AppSyncIdentityLambda,
  AppSyncIdentityOIDC,
} from 'aws-lambda';

/**
 * AppSync identity union type that includes null
 */
export type AppSyncIdentity =
  | AppSyncIdentityIAM
  | AppSyncIdentityCognito
  | AppSyncIdentityOIDC
  | AppSyncIdentityLambda
  | null
  | undefined;

/**
 * Type guard to check if identity is Cognito
 */
export function isCognitoIdentity(
  identity: AppSyncIdentity
): identity is AppSyncIdentityCognito {
  return identity !== null && identity !== undefined && 'sub' in identity;
}

/**
 * Extract user ID from AppSync identity with proper type guards
 */
export function getUserIdFromIdentity(
  identity: AppSyncIdentity
): string | undefined {
  if (!identity) {
    return undefined;
  }

  // Check if it's a Cognito identity
  if (isCognitoIdentity(identity)) {
    return identity.sub;
  }

  return undefined;
}

/**
 * Extract user groups from AppSync Cognito identity
 */
export function getUserGroupsFromIdentity(
  identity: AppSyncIdentity
): string[] {
  if (!identity) {
    return [];
  }

  // Check if it's a Cognito identity with claims
  if (isCognitoIdentity(identity) && identity.claims) {
    const groups = identity.claims['cognito:groups'];
    if (Array.isArray(groups)) {
      return groups;
    }
  }

  return [];
}

/**
 * Check if user has specific role/group
 */
export function userHasGroup(
  identity: AppSyncIdentity,
  groupName: string
): boolean {
  const groups = getUserGroupsFromIdentity(identity);
  return groups.includes(groupName);
}

/**
 * Check if user has any of the specified roles/groups
 */
export function userHasAnyGroup(
  identity: AppSyncIdentity,
  groupNames: string[]
): boolean {
  const groups = getUserGroupsFromIdentity(identity);
  return groupNames.some((groupName) => groups.includes(groupName));
}
