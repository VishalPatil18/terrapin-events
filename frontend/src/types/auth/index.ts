/**
 * Authentication Types
 * TEMS - Terrapin Events Management System
 * 
 * Defines TypeScript interfaces and types for authentication system
 * Aligned with AWS Cognito and system architecture requirements
 */

// ============================================================================
// User Roles (from architecture document)
// ============================================================================

export enum UserRole {
  PARTICIPANT = 'PARTICIPANT',
  ORGANIZER = 'ORGANIZER',
  ADMINISTRATOR = 'ADMINISTRATOR',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

// ============================================================================
// User Types
// ============================================================================

/**
 * Core User interface matching Cognito user attributes
 * and system architecture User model
 */
export interface User {
  userId: string;
  email: string;
  emailVerified: boolean;
  givenName: string;
  familyName: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Cognito-specific user attributes
 */
export interface CognitoUser {
  sub: string;
  email: string;
  email_verified: boolean;
  given_name: string;
  family_name: string;
  'custom:role'?: string;
}

/**
 * User preferences (for future implementation)
 */
export interface UserPreferences {
  emailNotifications: boolean;
  inAppNotifications: boolean;
  categories: string[];
  doNotDisturbStart?: string;
  doNotDisturbEnd?: string;
}

// ============================================================================
// Authentication State
// ============================================================================

/**
 * Authentication state for the application
 */
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
}

/**
 * Authentication error types
 */
export interface AuthError {
  code: string;
  message: string;
  name: string;
}

// ============================================================================
// Authentication Actions
// ============================================================================

/**
 * Sign up form inputs
 */
export interface SignUpInput {
  email: string;
  password: string;
  confirmPassword: string;
  givenName: string;
  familyName: string;
}

/**
 * Sign in form inputs
 */
export interface SignInInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Email verification inputs
 */
export interface VerifyEmailInput {
  email: string;
  code: string;
}

/**
 * Forgot password inputs
 */
export interface ForgotPasswordInput {
  email: string;
}

/**
 * Reset password inputs
 */
export interface ResetPasswordInput {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Change password inputs (for authenticated users)
 */
export interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ============================================================================
// Authentication Response Types
// ============================================================================

/**
 * Sign up response
 */
export interface SignUpResponse {
  isSignUpComplete: boolean;
  userId: string;
  nextStep: {
    signUpStep: string;
    codeDeliveryDetails?: {
      deliveryMedium: string;
      destination: string;
    };
  };
}

/**
 * Sign in response
 */
export interface SignInResponse {
  isSignedIn: boolean;
  nextStep: {
    signInStep: string;
  };
}

/**
 * Authentication session
 */
export interface AuthSession {
  tokens?: {
    idToken: string;
    accessToken: string;
    refreshToken?: string;
  };
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  identityId?: string;
  userSub?: string;
}

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * useAuth hook return type
 */
export interface UseAuthReturn {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  
  // Actions
  signUp: (input: SignUpInput) => Promise<SignUpResponse>;
  signIn: (input: SignInInput) => Promise<SignInResponse>;
  signOut: () => Promise<void>;
  verifyEmail: (input: VerifyEmailInput) => Promise<void>;
  forgotPassword: (input: ForgotPasswordInput) => Promise<void>;
  resetPassword: (input: ResetPasswordInput) => Promise<void>;
  changePassword: (input: ChangePasswordInput) => Promise<void>;
  resendVerificationCode: (email: string) => Promise<void>;
  getCurrentUser: () => Promise<User | null>;
  refreshSession: () => Promise<void>;
  
  // Utilities
  clearError: () => void;
  checkEmailVerified: () => Promise<boolean>;
}

// ============================================================================
// Protected Route Types
// ============================================================================

/**
 * Protected route props
 */
export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  requireEmailVerified?: boolean;
  fallbackPath?: string;
}

/**
 * Role guard props
 */
export interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}

// ============================================================================
// Form Validation Types
// ============================================================================

/**
 * Password validation result
 */
export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

/**
 * Email validation result
 */
export interface EmailValidation {
  isValid: boolean;
  isUmdEmail: boolean;
  error?: string;
}

// ============================================================================
// Auth Context Types
// ============================================================================

/**
 * Auth context value
 */
export interface AuthContextValue extends UseAuthReturn {
  // Additional context-specific properties can be added here
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Authentication error codes
 */
export const AUTH_ERROR_CODES = {
  USER_NOT_FOUND: 'UserNotFoundException',
  INCORRECT_PASSWORD: 'NotAuthorizedException',
  USER_NOT_CONFIRMED: 'UserNotConfirmedException',
  CODE_MISMATCH: 'CodeMismatchException',
  EXPIRED_CODE: 'ExpiredCodeException',
  LIMIT_EXCEEDED: 'LimitExceededException',
  INVALID_PASSWORD: 'InvalidPasswordException',
  INVALID_EMAIL: 'InvalidParameterException',
  USER_EXISTS: 'UsernameExistsException',
  NETWORK_ERROR: 'NetworkError',
  UNKNOWN_ERROR: 'UnknownError',
} as const;

/**
 * Password requirements (from architecture document)
 */
export const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  requireLowercase: true,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecialCharacters: true,
  specialCharacters: '!@#$%^&*()_+-=[]{}|;:,.<>?',
} as const;

/**
 * Session duration (from architecture document)
 */
export const SESSION_DURATION = {
  PARTICIPANT: 4 * 60 * 60 * 1000, // 4 hours in ms
  ORGANIZER: 4 * 60 * 60 * 1000,   // 4 hours in ms
  ADMINISTRATOR: 2 * 60 * 60 * 1000, // 2 hours in ms
  REMEMBER_ME: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
} as const;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if user has specific role
 */
export function hasRole(user: User | null, role: UserRole): boolean {
  return user?.role === role;
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(user: User | null, roles: UserRole[]): boolean {
  return user ? roles.includes(user.role) : false;
}

/**
 * Check if user is administrator
 */
export function isAdmin(user: User | null): boolean {
  return hasAnyRole(user, [UserRole.ADMINISTRATOR, UserRole.SUPER_ADMIN]);
}

/**
 * Check if user is organizer or higher
 */
export function isOrganizerOrHigher(user: User | null): boolean {
  return hasAnyRole(user, [
    UserRole.ORGANIZER,
    UserRole.ADMINISTRATOR,
    UserRole.SUPER_ADMIN,
  ]);
}

/**
 * Type guard for AuthError
 */
export function isAuthError(error: unknown): error is AuthError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'name' in error
  );
}
