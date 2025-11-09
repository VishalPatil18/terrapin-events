/**
 * Auth Context Provider
 * TEMS - Terrapin Events Management System
 * 
 * Provides authentication state and methods throughout the application
 * using React Context API
 */

'use client';

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';

import { useAuth } from '@/hooks/useAuth';
import type { AuthContextValue } from '@/types/auth';

// ============================================================================
// Context Creation
// ============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Consumer Hook
// ============================================================================

/**
 * Hook to access authentication context
 * Must be used within AuthProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, signIn, signOut } = useAuthContext();
 *   
 *   if (!user) return <LoginForm onSubmit={signIn} />;
 *   
 *   return (
 *     <div>
 *       <p>Welcome, {user.givenName}!</p>
 *       <button onClick={signOut}>Sign Out</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
}

// ============================================================================
// Export Context (for testing)
// ============================================================================

export { AuthContext };
