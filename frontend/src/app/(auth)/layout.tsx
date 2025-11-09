/**
 * Authentication Layout
 * TEMS - Terrapin Events Management System
 * 
 * Split-screen layout for authentication pages
 * Left: Form content
 * Right: Branding and imagery
 */

import { ReactNode } from 'react';
import Link from 'next/link';
import { Calendar } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left Side: Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center">
            <Link href="/" className="inline-flex items-center space-x-2 text-2xl font-bold text-gray-900">
              <Calendar className="h-8 w-8 text-blue-600" />
              <span>TEMS</span>
            </Link>
            <p className="mt-2 text-sm text-gray-600">
              Terrapin Events Management System
            </p>
          </div>

          {/* Content */}
          {children}
        </div>
      </div>

      {/* Right Side: Branding */}
      <div className="hidden lg:block lg:flex-1 relative bg-gradient-to-br from-blue-500 via-blue-600 to-purple-700">
        <div className="absolute inset-0 bg-black/10" />
        
        <div className="relative h-full flex flex-col items-center justify-center text-white p-12">
          {/* Hero Content */}
          <div className="max-w-md text-center space-y-6">
            <h1 className="text-4xl font-bold leading-tight">
              Welcome to Terrapin Events
            </h1>
            
            <p className="text-lg text-blue-100">
              Discover, create, and manage campus events all in one place.
              Connect with the UMD community.
            </p>

            <div className="grid grid-cols-3 gap-4 mt-12">
              <div className="text-center">
                <div className="text-3xl font-bold">500+</div>
                <div className="text-sm text-blue-200 mt-1">Events</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">10K+</div>
                <div className="text-sm text-blue-200 mt-1">Students</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">50+</div>
                <div className="text-sm text-blue-200 mt-1">Organizations</div>
              </div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute bottom-0 left-0 right-0 p-8 text-center text-sm text-blue-200">
            <p>© 2025 University of Maryland. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
