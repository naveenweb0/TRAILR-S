import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User } from '../types/index.js';
import { api } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: () => Promise<void>;
  completeNeonAuth: (sessionToken: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('schooldest_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const inFlightNeonAuth = useRef<Promise<User> | null>(null);


  const refreshUser = async () => {
    // AuthCallbackPage owns the OAuth exchange — never auto-trigger it here
    if (window.location.pathname.startsWith('/auth/callback')) {
      setLoading(false);
      return;
    }

    const activeToken = localStorage.getItem('schooldest_token');
    if (!activeToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      if (res.success) {
        setUser(res.data.user);
      } else {
        logout();
      }
    } catch (err: any) {
      console.error('Session validation error:', err);
      if (err?.status === 401 || err?.status === 403) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [token]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.login({ email, password });
    if (res.success) {
      localStorage.setItem('schooldest_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error('Login failed');
  };

  const loginWithGoogle = async (): Promise<void> => {
    const { signInWithNeonGoogle } = await import('../services/neonAuth.js');
    await signInWithNeonGoogle({
      callbackURL: `${window.location.origin}/auth/callback`,
    });
  };

  const completeNeonAuth = async (sessionToken: string): Promise<User> => {
    if (inFlightNeonAuth.current) {
      return inFlightNeonAuth.current;
    }

    const promise = (async () => {
      try {
        const res = await api.neonLogin(sessionToken);
        if (res.success && res.data) {
          localStorage.setItem('schooldest_token', res.data.token);
          setToken(res.data.token);
          setUser(res.data.user);
          return res.data.user;
        }
        throw new Error(res.message || 'Neon Auth authentication exchange failed');
      } finally {
        inFlightNeonAuth.current = null;
      }
    })();

    inFlightNeonAuth.current = promise;
    return promise;
  };

  const logout = () => {
    import('../services/neonAuth.js').then((m) => m.signOutNeonAuth()).catch(() => {});
    localStorage.removeItem('schooldest_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        loginWithGoogle,
        completeNeonAuth,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
