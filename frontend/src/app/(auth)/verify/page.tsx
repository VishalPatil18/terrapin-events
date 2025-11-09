/**
 * Email Verification Page
 * TEMS - Terrapin Events Management System
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react';

import { useAuthContext } from '@/lib/auth/AuthContext';
import { verifyEmailSchema, type VerifyEmailFormData } from '@/lib/auth/validation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { getAuthErrorMessage } from '@/lib/auth/validation';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyEmail, resendVerificationCode, error, clearError } = useAuthContext();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const emailFromQuery = searchParams.get('email') || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<VerifyEmailFormData>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      email: emailFromQuery,
    },
  });

  useEffect(() => {
    if (emailFromQuery) {
      setValue('email', emailFromQuery);
    }
  }, [emailFromQuery, setValue]);

  const onSubmit = async (data: VerifyEmailFormData) => {
    try {
      setIsSubmitting(true);
      clearError();

      await verifyEmail(data);

      // Show success and redirect
      router.push('/signin?verified=true');
    } catch (err) {
      console.error('Verification error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!emailFromQuery) return;

    try {
      setIsResending(true);
      clearError();
      setResendSuccess(false);

      await resendVerificationCode(emailFromQuery);
      setResendSuccess(true);

      // Clear success message after 5 seconds
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err) {
      console.error('Resend error:', err);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Mail className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="mt-4 text-3xl font-bold text-gray-900">
          Verify your email
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          We sent a verification code to{' '}
          <span className="font-medium text-gray-900">{emailFromQuery}</span>
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="error" onClose={clearError}>
          {getAuthErrorMessage(error.code)}
        </Alert>
      )}

      {/* Success Alert */}
      {resendSuccess && (
        <Alert variant="success">
          Verification code sent! Please check your email.
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

        {/* Submit Button */}
        <Button
          type="submit"
          fullWidth
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          Verify email
        </Button>
      </form>

      {/* Resend Code */}
      <div className="text-center text-sm space-y-2">
        <p className="text-gray-600">Didn't receive the code?</p>
        <button
          type="button"
          onClick={handleResendCode}
          disabled={isResending}
          className="font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50"
        >
          {isResending ? 'Sending...' : 'Resend verification code'}
        </button>
      </div>

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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
