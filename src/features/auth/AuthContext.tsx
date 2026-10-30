import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  api,
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  setOnUnauthorizedHandler,
} from '../../shared/api/client';
import type { User, AuthResponse, Cart } from '../../shared/api/types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  sessionExpiredMessage: boolean;
  clearSessionExpiredMessage: () => void;
  setAuthSuccess: (data: AuthResponse) => void;
  updateUser: (user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>(() =>
    getAccessToken() ? 'loading' : 'unauthenticated'
  );
  const [user, setUser] = useState<User | null>(null);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState(false);

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const clearSessionExpiredMessage = useCallback(() => {
    setSessionExpiredMessage(false);
  }, []);

  // Central handler for 401 TOKEN_EXPIRED / UNAUTHORIZED from any request (FE-002)
  useEffect(() => {
    setOnUnauthorizedHandler(() => {
      clearAccessToken();
      setUser(null);
      setStatus('unauthenticated');
      queryClient.removeQueries({ queryKey: ['cart'] });
      queryClient.removeQueries({ queryKey: ['addresses'] });
      queryClient.removeQueries({ queryKey: ['orders'] });
      setSessionExpiredMessage(true);
      navigate('/login', {
        replace: true,
        state: { from: location.pathname + location.search },
      });
    });
  }, [navigate, queryClient, location.pathname, location.search]);

  // App startup check: GET /auth/me (FE-002) + preload cart if authenticated (FE-005)
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setStatus('unauthenticated');
      return;
    }

    let isMounted = true;

    api
      .get<{ user: User }>('/auth/me', { skipAuthRedirect: true })
      .then((res) => {
        if (!isMounted) return;
        setUser(res.user);
        setStatus('authenticated');
        queryClient.setQueryData(['me'], res.user);
        // Fetch initial cart for header badge (FE-005)
        api
          .get<Cart>('/cart', { skipAuthRedirect: true })
          .then((cart) => {
            if (isMounted) queryClient.setQueryData(['cart'], cart);
          })
          .catch(() => {});
      })
      .catch(() => {
        if (!isMounted) return;
        clearAccessToken();
        setUser(null);
        setStatus('unauthenticated');
      });

    return () => {
      isMounted = false;
    };
  }, [queryClient]);

  const setAuthSuccess = useCallback(
    (data: AuthResponse) => {
      setAccessToken(data.accessToken);
      setUser(data.user);
      setStatus('authenticated');
      setSessionExpiredMessage(false);
      queryClient.setQueryData(['me'], data.user);
      // Load user's server cart right after login/register (FE-005)
      api
        .get<Cart>('/cart', { skipAuthRedirect: true })
        .then((cart) => {
          queryClient.setQueryData(['cart'], cart);
        })
        .catch(() => {});
    },
    [queryClient]
  );

  const updateUser = useCallback(
    (updatedUser: User) => {
      setUser(updatedUser);
      queryClient.setQueryData(['me'], updatedUser);
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', undefined, { skipAuthRedirect: true });
    } catch {
      // Stateless logout: ignore server error
    }
    clearAccessToken();
    setUser(null);
    setStatus('unauthenticated');
    // FE-005: Clear cart state on frontend so another user in same browser never sees previous cart
    queryClient.setQueryData(['cart'], null);
    queryClient.removeQueries({ queryKey: ['cart'] });
    queryClient.removeQueries({ queryKey: ['addresses'] });
    queryClient.removeQueries({ queryKey: ['orders'] });
    queryClient.removeQueries({ queryKey: ['me'] });
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        sessionExpiredMessage,
        clearSessionExpiredMessage,
        setAuthSuccess,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
