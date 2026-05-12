import { useGlobalContext } from '@/context/GlobalProvider';
import { User } from '@/types/auth.types';

/**
 * Authentication state interface
 */
export interface AuthState {
  /**
   * Boolean indicating if user is currently authenticated
   */
  isLogged: boolean;

  /**
   * Current authenticated user object, or null if not logged in
   */
  user: User | null;

  /**
   * Loading state for initial authentication check
   * True while validating session on app start
   */
  loading: boolean;
}

/**
 * Custom hook for accessing authentication state
 *
 * This hook provides a clean, type-safe interface to the authentication
 * state managed by GlobalProvider. It wraps useGlobalContext() and extracts
 * only auth-related properties.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isLogged, user, loading } = useAuth();
 *
 *   if (loading) {
 *     return <ActivityIndicator />;
 *   }
 *
 *   if (!isLogged) {
 *     return <LoginPrompt />;
 *   }
 *
 *   return <div>Welcome, {user?.name}!</div>;
 * }
 * ```
 *
 * @throws {Error} If used outside of GlobalProvider
 * @returns {AuthState} Authentication state object
 */
export function useAuth(): AuthState {
  const { isLogged, user, loading } = useGlobalContext();

  return {
    isLogged,
    user,
    loading,
  };
}
