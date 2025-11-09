/**
 * Next.js Middleware for Route Protection
 * TEMS - Terrapin Events Management System
 * 
 * Handles authentication checks and redirects for protected and public routes
 * Using AWS Amplify Auth with Next.js App Router
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import { runWithAmplifyServerContext } from '@/lib/amplify-server';

// Define route patterns
const protectedRoutes = ['/dashboard'];
const authRoutes = ['/signin', '/signup', '/verify', '/forgot-password', '/reset-password'];
const publicRoutes = ['/', '/events', '/about', '/contact'];

/**
 * Check if path matches protected route pattern
 */
function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(route => pathname.startsWith(route));
}

/**
 * Check if path is an auth route
 */
function isAuthRoute(pathname: string): boolean {
  return authRoutes.some(route => pathname.startsWith(route));
}

/**
 * Check if path is a public route
 */
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => pathname === route || pathname.startsWith(route));
}

/**
 * Middleware function
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  try {
    // Check authentication status using Amplify server-side utilities
    const session = await runWithAmplifyServerContext({
      nextServerContext: { request },
      operation: async (contextSpec) => {
        try {
          const session = await fetchAuthSession(contextSpec);
          return session;
        } catch (error) {
          return null;
        }
      },
    });

    const isAuthenticated = session?.tokens?.idToken !== undefined;

    // Handle protected routes
    if (isProtectedRoute(pathname)) {
      if (!isAuthenticated) {
        const url = request.nextUrl.clone();
        url.pathname = '/signin';
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
      }
    }

    // Handle auth routes - redirect authenticated users to dashboard
    if (isAuthRoute(pathname)) {
      if (isAuthenticated) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
    }

    // Allow access to public routes regardless of authentication
    if (isPublicRoute(pathname)) {
      return NextResponse.next();
    }

    // Default: allow the request to continue
    return NextResponse.next();

  } catch (error) {
    console.error('Middleware error:', error);
    
    // On error, allow the request to continue
    // The client-side will handle authentication state
    return NextResponse.next();
  }
}

/**
 * Configure which routes middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
