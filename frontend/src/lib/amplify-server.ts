/**
 * Amplify Server-Side Utilities
 * TEMS - Terrapin Events Management System
 * 
 * Provides utilities for using AWS Amplify in Next.js server contexts
 * (middleware, API routes, Server Components, etc.)
 */

import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import { type ResourcesConfig } from 'aws-amplify';

/**
 * Amplify configuration for server-side context
 */
export const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
      loginWith: {
        email: true,
      },
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: {
          required: true,
        },
        given_name: {
          required: true,
        },
        family_name: {
          required: true,
        },
      },
      passwordFormat: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: true,
      },
    },
  },
  API: {
    GraphQL: {
      endpoint: process.env.NEXT_PUBLIC_APPSYNC_URL || '',
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
      defaultAuthMode: 'userPool' as const,
    },
  },
  Storage: {
    S3: {
      bucket: process.env.NEXT_PUBLIC_S3_BUCKET || '',
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    },
  },
};

/**
 * Create server runner for server-side operations
 */
export const { runWithAmplifyServerContext } = createServerRunner({
  config: amplifyConfig,
});
