/**
 * AuthContext.jsx — React context that tracks authentication state.
 *
 * On mount, calls GET /auth/me to check if a server session already
 * exists (e.g. after a page reload).  Exposes:
 *   • user           — current user profile or null
 *   • loading        — true while the initial /auth/me call is in flight
 *   • isAuthenticated— boolean convenience flag
 *   • logout()       — clears server session and local state
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, logout as apiLogout } from '../services/api';
import { trackLogin, trackLogout } from '../utils/analytics';

// ── Create context ───────────────────────────────────────────────────
const AuthContext = createContext(null);

/**
 * AuthProvider wraps the app tree and provides auth state to all children.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Check existing session on mount ────────────────────────────────
  useEffect(() => {
    async function checkSession() {
      try {
        const { authenticated, user: sessionUser } = await getMe();
        if (authenticated) {
          setUser(sessionUser);
          // Only fire the login analytics event once per browser session,
          // not on every page load that finds an existing session cookie.
          if (!sessionStorage.getItem('mw_login_tracked')) {
            trackLogin();
            sessionStorage.setItem('mw_login_tracked', '1');
          }
        }
      } catch {
        // No session or network error — user is not authenticated
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  /**
   * Logs the user out by calling the backend /auth/logout endpoint
   * and resetting local state.
   */
  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Ignore logout errors — clear local state regardless
    }
    trackLogout();
    sessionStorage.removeItem('mw_login_tracked');
    setUser(null);
  }, []);

  /**
   * Called after a successful OAuth redirect to update state without
   * a full page reload (used by the callback page).
   */
  const refreshUser = useCallback(async () => {
    try {
      const { authenticated, user: sessionUser } = await getMe();
      setUser(authenticated ? sessionUser : null);
    } catch {
      setUser(null);
    }
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    logout,
    refreshUser,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth — custom hook for consuming AuthContext.
 * Throws if used outside AuthProvider (catches configuration errors early).
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
