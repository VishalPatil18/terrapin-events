/**
 * Reset Password Page
 * TEMS - Terrapin Events Management System
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Check, X, KeyRound } from 'lucide-react';

import { useAuthContext } from '@/lib/auth/AuthContext';
import { resetPasswordSchema, type ResetPasswordFormData, validatePassword } from '@/lib/auth/validation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { getAuthErrorMessage } from '@/lib/auth/validation';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword, error, clearError } = useAuthContext();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);
  const emailFromQuery = searchParams.get('email') || '';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: emailFromQuery,
    },
  });

  useEffect(() => {
    if (emailFromQuery) {
      setValue('email', emailFromQuery);
    }
  }, [emailFromQuery, setValue]);

  const newPassword = watch('newPassword', '');
  const passwordValidation = validatePassword(newPassword);

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setIsSubmitting(true);
      clearError();

      await resetPassword(data);

      // Success! Redirect to signin
      router.push('/signin?reset=success');
    } catch (err) {
      console.error('Reset password error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <KeyRound className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="mt-4 text-3xl font-bold text-gray-900">
          Reset password
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Enter the code from your email and create a new password
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="error" onClose={clearError}>
          {getAuthErrorMessage(error.code)}
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email (read-only) */}
        <Input
          {...register('email')}
          type="email"
          label="Email"
          readOnly
          className="bg-gray-50"
        />

        {/* Verification Code */}
        <Input
          {...register('code')}
          type="text"
          label="Verification Code"
          placeholder="Enter 6-digit code"
          error={errors.code?.message}
          required
          maxLength={6}
          autoComplete="one-time-code"
        />

        {/* New Password */}
        <div className="relative">
          <Input
            {...register('newPassword')}
            type={showPassword ? 'text' : 'password'}
            label="New Password"
            placeholder="Create a strong password"
            error={errors.newPassword?.message}
            required
            autoComplete="new-password"
            onFocus={() => setPasswordFocus(true)}
            onBlur={() => setPasswordFocus(false)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Password Strength Indicator */}
        {(passwordFocus || newPassword) && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="text-sm font-medium text-gray-700">
              Password strength:{' '}
              <span
                className={
                  passwordValidation.strength === 'strong'
                    ? 'text-green-600'
                    : passwordValidation.strength === 'medium'
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }
              >
                {passwordValidation.strength}
              </span>
            </div>
            <div className="space-y-1">
              <PasswordRequirement
                met={newPassword.length >= 12}
                text="At least 12 characters"
              />
              <PasswordRequirement
                met={/[a-z]/.test(newPassword)}
                text="One lowercase letter"
              />
              <PasswordRequirement
                met={/[A-Z]/.test(newPassword)}
                text="One uppercase letter"
              />
              <PasswordRequirement
                met={/[0-9]/.test(newPassword)}
                text="One number"
              />
              <PasswordRequirement
                met={/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(newPassword)}
                text="One special character"
              />
            </div>
          </div>
        )}

        {/* Confirm Password */}
        <div className="relative">
          <Input
            {...register('confirmPassword')}
            type={showConfirmPassword ? 'text' : 'password'}
            label="Confirm New Password"
            placeholder="Re-enter your password"
            error={errors.confirmPassword?.message}
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
          >
            {showConfirmPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          fullWidth
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          Reset password
        </Button>
      </form>

      {/* Back to Sign In */}
      <div className="text-center text-sm">
        <Link
          href="/signin"
          className="font-medium text-gray-600 hover:text-gray-900"
        >
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}

// Helper Component for Password Requirements
function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center text-xs">
      {met ? (
        <Check className="h-3 w-3 text-green-600 mr-2" />
      ) : (
        <X className="h-3 w-3 text-gray-400 mr-2" />
      )}
      <span className={met ? 'text-green-600' : 'text-gray-600'}>{text}</span>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
