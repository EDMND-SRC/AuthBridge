/**
 * Authentication Provider
 * Manages user authentication state and tokens
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, type User, type AuthTokens } from '../api/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string) => Promise<{ session: string }>;
  verifyOtp: (email: string, otp: string, session: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const TOKEN_KEY = 'authbridge_tokens';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const stored = localStorage.getItem(TOKEN_KEY);
      if (stored) {
        try {
          const tokens: AuthTokens = JSON.parse(stored);
          const userData = await authApi.getMe(tokens.accessToken);
          setUser(userData);
        } catch { localStorage.removeItem(TOKEN_KEY); }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string) => {
    const result = await authApi.login(email);
    return { session: result.session };
  };

  const verifyOtp = async (email: string, otp: string, session: string) => {
    const result = await authApi.verifyOtp(email, otp, session);
    localStorage.setItem(TOKEN_KEY, JSON.stringify(result.tokens));
    setUser(result.user);
  };

  const logout = async () => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      try {
        const tokens: AuthTokens = JSON.parse(stored);
        await authApi.logout(tokens.accessToken);
      } catch { /* ignore */ }
    }
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  const refreshToken = async () => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) throw new Error('No tokens');
    const tokens: AuthTokens = JSON.parse(stored);
    const newTokens = await authApi.refreshToken(tokens.refreshToken);
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ ...tokens, ...newTokens }));
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, verifyOtp, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
