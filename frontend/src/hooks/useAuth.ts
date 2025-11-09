/**
 * useAuth Hook
 * TEMS - Terrapin Events Management System
 * 
 * Core authentication hook that integrates with AWS Cognito
 * Provides authentication state and operations throughout the application
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  signUp as amplifySignUp,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  confirmSignUp,
  resetPassword,
  confirmResetPassword,
  updatePassword,
  resendSignUpCode,
  getCurrentUser,
  fetchAuthSession,
  fetchUserAttributes,
} from 'aws-amplify/auth';

import type {
  User,
  AuthError,
  SignUpInput,
  SignInInput,
  VerifyEmailInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  SignUpResponse,
  SignInResponse,
  UseAuthReturn,
  UserRole,
  CognitoUser,
} from '@/types/auth';

import { AUTH_ERROR_CODES } from '@/types/auth';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Converts Cognito user attributes to our User type
 */
function mapCognitoUserToUser(cognitoUser: any, attributes: Record<string, string>): User {
  const role = (attributes['custom:role'] as UserRole) || UserRole.PARTICIPANT;
  
  return {
    userId: cognitoUser.userId || cognitoUser.username,
    email: attributes.email?.toLowerCase() || '',
    emailVerified: attributes.email_verified === 'true',
    givenName: attributes.given_name || '',
    familyName: attributes.family_name || '',
    role,
    avatar: attributes.picture,
    createdAt: attributes['custom:createdAt'] || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Converts error to AuthError type
 */
function handleAuthError(error: any): AuthError {
  console.error('Auth error:', error);
  
  return {
    code: error.name || error.code || AUTH_ERROR_CODES.UNKNOWN_ERROR,
    message: error.message || 'An unexpected error occurred',
    name: error.name || 'Error',
  };
}

// ============================================================================
// useAuth Hook
// ============================================================================

export function useAuth(): UseAuthReturn {
  // State
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  // ============================================================================
  // Computed State
  // ============================================================================

  const isAuthenticated = useMemo(() => user !== null, [user]);

  // ============================================================================
  // Initialize Auth State
  // ============================================================================

  useEffect(() => {
    checkAuthState();
  }, []);

  async function checkAuthState() {
    try {
      setIsLoading(true);
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  // ============================================================================
  // Helper: Fetch Current User
  // ============================================================================

  const fetchCurrentUser = useCallback(async (): Promise<User | null> => {
    try {
      const cognitoUser = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      
      return mapCognitoUserToUser(cognitoUser, attributes);
    } catch (err) {
      return null;
    }
  }, []);

  // ============================================================================
  // Sign Up
  // ============================================================================

  const signUp = useCallback(
    async (input: SignUpInput): Promise<SignUpResponse> => {
      try {
        setError(null);
        setIsLoading(true);

        const { email, password, givenName, familyName } = input;

        const result = await amplifySignUp({
          username: email.toLowerCase(),
          password,
          options: {
            userAttributes: {
              email: email.toLowerCase(),
              given_name: givenName,
              family_name: familyName,
            },
            autoSignIn: false, // We'll sign in manually after verification
          },
        });

        return {
          isSignUpComplete: result.isSignUpComplete,
          userId: result.userId || '',
          nextStep: {
            signUpStep: result.nextStep.signUpStep,
            codeDeliveryDetails: result.nextStep.codeDeliveryDetails
              ? {
                  deliveryMedium: result.nextStep.codeDeliveryDetails.deliveryMedium || 'EMAIL',
                  destination: result.nextStep.codeDeliveryDetails.destination || email,
                }
              : undefined,
          },
        };
      } catch (err) {
        const authError = handleAuthError(err);
        setError(authError);
        throw authError;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ============================================================================
  // Sign In
  // ============================================================================

  const signIn = useCallback(
    async (input: SignInInput): Promise<SignInResponse> => {
      try {
        setError(null);
        setIsLoading(true);

        const { email, password } = input;

        const result = await amplifySignIn({
          username: email.toLowerCase(),
          password,
        });

        if (result.isSignedIn) {
          // Fetch user data after successful sign-in
          const currentUser = await fetchCurrentUser();
          setUser(currentUser);
        }

        return {
          isSignedIn: result.isSignedIn,
          nextStep: {
            signInStep: result.nextStep.signInStep,
          },
        };
      } catch (err) {
        const authError = handleAuthError(err);
        setError(authError);
        throw authError;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchCurrentUser]
  );

  // ============================================================================
  // Sign Out
  // ============================================================================

  const signOut = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      setIsLoading(true);
      
      await amplifySignOut();
      setUser(null);
    } catch (err) {
      const authError = handleAuthError(err);
      setError(authError);
      throw authError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================================================
  // Verify Email
  // ============================================================================

  const verifyEmail = useCallback(
    async (input: VerifyEmailInput): Promise<void> => {
      try {
        setError(null);
        setIsLoading(true);

        const { email, code } = input;

        await confirmSignUp({
          username: email.toLowerCase(),
          confirmationCode: code,
        });
      } catch (err) {
        const authError = handleAuthError(err);
        setError(authError);
        throw authError;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ============================================================================
  // Forgot Password
  // ============================================================================

  const forgotPassword = useCallback(
    async (input: ForgotPasswordInput): Promise<void> => {
      try {
        setError(null);
        setIsLoading(true);

        const { email } = input;

        await resetPassword({
          username: email.toLowerCase(),
        });
      } catch (err) {
        const authError = handleAuthError(err);
        setError(authError);
        throw authError;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ============================================================================
  // Reset Password
  // ============================================================================

  const resetPasswordFn = useCallback(
    async (input: ResetPasswordInput): Promise<void> => {
      try {
        setError(null);
        setIsLoading(true);

        const { email, code, newPassword } = input;

        await confirmResetPassword({
          username: email.toLowerCase(),
          confirmationCode: code,
          newPassword,
        });
      } catch (err) {
        const authError = handleAuthError(err);
        setError(authError);
        throw authError;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ============================================================================
  // Change Password (for authenticated users)
  // ============================================================================

  const changePassword = useCallback(
    async (input: ChangePasswordInput): Promise<void> => {
      try {
        setError(null);
        setIsLoading(true);

        const { oldPassword, newPassword } = input;

        await updatePassword({
          oldPassword,
          newPassword,
        });
      } catch (err) {
        const authError = handleAuthError(err);
        setError(authError);
        throw authError;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ============================================================================
  // Resend Verification Code
  // ============================================================================

  const resendVerificationCode = useCallback(
    async (email: string): Promise<void> => {
      try {
        setError(null);
        setIsLoading(true);

        await resendSignUpCode({
          username: email.toLowerCase(),
        });
      } catch (err) {
        const authError = handleAuthError(err);
        setError(authError);
        throw authError;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ============================================================================
  // Get Current User
  // ============================================================================

  const getCurrentUserFn = useCallback(async (): Promise<User | null> => {
    try {
      setError(null);
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch (err) {
      const authError = handleAuthError(err);
      setError(authError);
      return null;
    }
  }, [fetchCurrentUser]);

  // ============================================================================
  // Refresh Session
  // ============================================================================

  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await fetchAuthSession({ forceRefresh: true });
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    } catch (err) {
      const authError = handleAuthError(err);
      setError(authError);
      // If refresh fails, user might need to re-authenticate
      setUser(null);
      throw authError;
    }
  }, [fetchCurrentUser]);

  // ============================================================================
  // Check Email Verified
  // ============================================================================

  const checkEmailVerified = useCallback(async (): Promise<boolean> => {
    try {
      const attributes = await fetchUserAttributes();
      return attributes.email_verified === 'true';
    } catch (err) {
      return false;
    }
  }, []);

  // ============================================================================
  // Clear Error
  // ============================================================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,

    // Actions
    signUp,
    signIn,
    signOut,
    verifyEmail,
    forgotPassword,
    resetPassword: resetPasswordFn,
    changePassword,
    resendVerificationCode,
    getCurrentUser: getCurrentUserFn,
    refreshSession,

    // Utilities
    clearError,
    checkEmailVerified,
  };
}
