import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, LoginInitResponse } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginInit: (email: string, pass: string) => Promise<LoginInitResponse>;
  send2FACode: (pendingToken: string, method: string) => Promise<void>;
  verify2FA: (pendingToken: string, code: string) => Promise<void>;
  googleVerify: (email: string) => Promise<LoginInitResponse>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Attempt session restore via httpOnly refresh token cookie or stored token
        const res = await api.refreshToken();
        setUser(res.user);
      } catch (err) {
        // No valid refresh cookie/token or session expired
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    const handleUnauthorized = () => {
      setUser(null);
    };

    initAuth();
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const loginInit = async (email: string, pass: string): Promise<LoginInitResponse> => {
    return await api.loginInit(email, pass);
  };

  const send2FACode = async (pendingToken: string, method: string): Promise<void> => {
    await api.send2FACode(pendingToken, method);
  };

  const verify2FA = async (pendingToken: string, code: string): Promise<void> => {
    const res = await api.verify2FA(pendingToken, code);
    setUser(res.user);
  };

  const googleVerify = async (email: string): Promise<LoginInitResponse> => {
    return await api.googleVerify(email);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        loginInit,
        send2FACode,
        verify2FA,
        googleVerify,
        logout,
        updateUser,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
