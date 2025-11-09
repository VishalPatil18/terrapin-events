/**
 * Authentication Form Validation Schemas
 * TEMS - Terrapin Events Management System
 * 
 * Zod schemas for validating authentication forms
 * Ensures data integrity and provides clear error messages
 */

import { z } from 'zod';
import { PASSWORD_REQUIREMENTS } from '@/types/auth';

// ============================================================================
// Custom Validators
// ============================================================================

/**
 * Validates that email is from @umd.edu domain
 */
const umdEmailValidator = z
  .string()
  .email('Invalid email format')
  .refine((email) => email.endsWith('@umd.edu'), {
    message: 'Must use a @umd.edu email address',
  })
  .transform((email) => email.toLowerCase());

/**
 * Validates password meets security requirements
 */
const passwordValidator = z
  .string()
  .min(PASSWORD_REQUIREMENTS.minLength, {
    message: `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`,
  })
  .refine((password) => /[a-z]/.test(password), {
    message: 'Password must contain at least one lowercase letter',
  })
  .refine((password) => /[A-Z]/.test(password), {
    message: 'Password must contain at least one uppercase letter',
  })
  .refine((password) => /[0-9]/.test(password), {
    message: 'Password must contain at least one number',
  })
  .refine(
    (password) => {
      const specialChars = PASSWORD_REQUIREMENTS.specialCharacters;
      return new RegExp(`[${specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password);
    },
    {
      message: 'Password must contain at least one special character (!@#$%^&*...)',
    }
  );

/**
 * Validates verification code format
 */
const verificationCodeValidator = z
  .string()
  .min(6, 'Verification code must be 6 digits')
  .max(6, 'Verification code must be 6 digits')
  .regex(/^\d{6}$/, 'Verification code must contain only numbers');

// ============================================================================
// Sign Up Schema
// ============================================================================

export const signUpSchema = z
  .object({
    email: umdEmailValidator,
    givenName: z
      .string()
      .min(1, 'First name is required')
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name must not exceed 50 characters')
      .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
    familyName: z
      .string()
      .min(1, 'Last name is required')
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name must not exceed 50 characters')
      .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
    password: passwordValidator,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignUpFormData = z.infer<typeof signUpSchema>;

// ============================================================================
// Sign In Schema
// ============================================================================

export const signInSchema = z.object({
  email: umdEmailValidator,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean(),
});

export type SignInFormData = z.infer<typeof signInSchema>;

// ============================================================================
// Email Verification Schema
// ============================================================================

export const verifyEmailSchema = z.object({
  email: umdEmailValidator,
  code: verificationCodeValidator,
});

export type VerifyEmailFormData = z.infer<typeof verifyEmailSchema>;

// ============================================================================
// Forgot Password Schema
// ============================================================================

export const forgotPasswordSchema = z.object({
  email: umdEmailValidator,
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// ============================================================================
// Reset Password Schema
// ============================================================================

export const resetPasswordSchema = z
  .object({
    email: umdEmailValidator,
    code: verificationCodeValidator,
    newPassword: passwordValidator,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// ============================================================================
// Change Password Schema (for authenticated users)
// ============================================================================

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordValidator,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

// ============================================================================
// Resend Verification Code Schema
// ============================================================================

export const resendCodeSchema = z.object({
  email: umdEmailValidator,
});

export type ResendCodeFormData = z.infer<typeof resendCodeSchema>;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validates email format and domain
 */
export function validateEmail(email: string): {
  isValid: boolean;
  isUmdEmail: boolean;
  error?: string;
} {
  try {
    umdEmailValidator.parse(email);
    return { isValid: true, isUmdEmail: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        isUmdEmail: email.toLowerCase().endsWith('@umd.edu'),
        error: error.issues[0]?.message || 'Invalid email',
      };
    }
    return { isValid: false, isUmdEmail: false, error: 'Invalid email' };
  }
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
} {
  const errors: string[] = [];
  
  try {
    passwordValidator.parse(password);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push(...error.issues.map(e => e.message));
    }
  }

  // Calculate password strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  const hasMinLength = password.length >= PASSWORD_REQUIREMENTS.minLength;
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = new RegExp(
    `[${PASSWORD_REQUIREMENTS.specialCharacters.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`
  ).test(password);
  
  const criteriaCount = [
    hasMinLength,
    hasLowercase,
    hasUppercase,
    hasNumber,
    hasSpecialChar,
  ].filter(Boolean).length;

  if (criteriaCount >= 5) {
    strength = password.length >= 16 ? 'strong' : 'medium';
  } else if (criteriaCount >= 3) {
    strength = 'medium';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * Validates verification code format
 */
export function validateVerificationCode(code: string): {
  isValid: boolean;
  error?: string;
} {
  try {
    verificationCodeValidator.parse(code);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.issues[0]?.message || 'Invalid verification code',
      };
    }
    return { isValid: false, error: 'Invalid verification code' };
  }
}

// ============================================================================
// Error Message Helpers
// ============================================================================

/**
 * Extracts and formats Zod validation errors
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};
  
  error.issues.forEach((err) => {
    const path = err.path.join('.');
    if (path) {
      formatted[path] = err.message;
    }
  });
  
  return formatted;
}

/**
 * Gets user-friendly error message for authentication errors
 */
export function getAuthErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    UserNotFoundException: 'No account found with this email address',
    NotAuthorizedException: 'Incorrect email or password',
    UserNotConfirmedException: 'Please verify your email before signing in',
    CodeMismatchException: 'Invalid verification code. Please try again',
    ExpiredCodeException: 'Verification code has expired. Please request a new one',
    LimitExceededException: 'Too many attempts. Please try again later',
    InvalidPasswordException: 'Password does not meet security requirements',
    InvalidParameterException: 'Invalid input provided',
    UsernameExistsException: 'An account with this email already exists',
    NetworkError: 'Network error. Please check your connection',
  };
  
  return errorMessages[errorCode] || 'An unexpected error occurred. Please try again';
}
