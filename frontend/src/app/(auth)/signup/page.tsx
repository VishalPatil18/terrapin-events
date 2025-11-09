/**
 * Sign Up Page
 * TEMS - Terrapin Events Management System
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Check, X } from 'lucide-react';

import { useAuthContext } from '@/lib/auth/AuthContext';
import { signUpSchema, type SignUpFormData, validatePassword } from '@/lib/auth/validation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { getAuthErrorMessage } from '@/lib/auth/validation';

export default function SignUpPage() {
  const router = useRouter();
  const { signUp, error, clearError } = useAuthContext();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  const password = watch('password', '');
  const passwordValidation = validatePassword(password);

  const onSubmit = async (data: SignUpFormData) => {
    try {
      setIsSubmitting(true);
      clearError();

      const result = await signUp(data);

      if (result.nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        router.push(`/verify?email=${encodeURIComponent(data.email)}`);
      }
    } catch (err) {
      console.error('Sign up error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Create account</h2>
        <p className="mt-2 text-sm text-gray-600">
          Join the UMD community and start discovering events.
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
        {/* Email */}
        <Input
          {...register('email')}
          type="email"
          label="UMD Email"
          placeholder="you@umd.edu"
          error={errors.email?.message}
          helperText="Must be a valid @umd.edu email address"
          required
          autoComplete="email"
        />

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            {...register('givenName')}
            type="text"
            label="First Name"
            placeholder="John"
            error={errors.givenName?.message}
            required
            autoComplete="given-name"
          />

          <Input
            {...register('familyName')}
            type="text"
            label="Last Name"
            placeholder="Doe"
            error={errors.familyName?.message}
            required
            autoComplete="family-name"
          />
        </div>

        {/* Password */}
        <div className="relative">
          <Input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            label="Password"
            placeholder="Create a strong password"
            error={errors.password?.message}
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
        {(passwordFocus || password) && (
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
                met={password.length >= 12}
                text="At least 12 characters"
              />
              <PasswordRequirement
                met={/[a-z]/.test(password)}
                text="One lowercase letter"
              />
              <PasswordRequirement
                met={/[A-Z]/.test(password)}
                text="One uppercase letter"
              />
              <PasswordRequirement
                met={/[0-9]/.test(password)}
                text="One number"
              />
              <PasswordRequirement
                met={/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)}
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
            label="Confirm Password"
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

        {/* Terms Checkbox */}
        <div className="flex items-start">
          <input
            type="checkbox"
            required
            className="h-4 w-4 mt-1 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="ml-2 text-sm text-gray-700">
            I agree to the{' '}
            <Link href="/terms" className="text-blue-600 hover:text-blue-500">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-blue-600 hover:text-blue-500">
              Privacy Policy
            </Link>
          </label>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          fullWidth
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          Create account
        </Button>
      </form>

      {/* Sign In Link */}
      <div className="text-center text-sm">
        <span className="text-gray-600">Already have an account? </span>
        <Link
          href="/signin"
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          Sign in
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
