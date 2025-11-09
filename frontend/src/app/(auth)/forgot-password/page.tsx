/**
 * Forgot Password Page
 * TEMS - Terrapin Events Management System
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';

import { useAuthContext } from '@/lib/auth/AuthContext';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/auth/validation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { getAuthErrorMessage } from '@/lib/auth/validation';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { forgotPassword, error, clearError } = useAuthContext();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsSubmitting(true);
      clearError();

      await forgotPassword(data);
      setEmailSent(true);

      // Redirect to reset password page after 2 seconds
      setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(data.email)}`);
      }, 2000);
    } catch (err) {
      console.error('Forgot password error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <KeyRound className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="mt-4 text-3xl font-bold text-gray-900">
            Check your email
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            We sent a password reset code to{' '}
            <span className="font-medium text-gray-900">
              {getValues('email')}
            </span>
          </p>
        </div>

        <Alert variant="success">
          If an account exists with this email, you will receive password reset
          instructions.
        </Alert>

        <Button
          fullWidth
          onClick={() => router.push(`/reset-password?email=${encodeURIComponent(getValues('email'))}`)}
        >
          Continue to reset password
        </Button>

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <KeyRound className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="mt-4 text-3xl font-bold text-gray-900">
          Forgot password?
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          No worries, we'll send you reset instructions.
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
        <Input
          {...register('email')}
          type="email"
          label="Your Email"
          placeholder="you@umd.edu"
          error={errors.email?.message}
          helperText="Enter the email address associated with your account"
          required
          autoComplete="email"
        />

        <Button
          type="submit"
          fullWidth
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          Send reset instructions
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
