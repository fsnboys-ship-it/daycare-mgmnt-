import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { dbService, requestPushNotificationPermission } from '../services/firebase';

interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isStaff: boolean;
  isParent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Read cached or initial session
    const user = dbService.getCurrentUser();
    setCurrentUser(user);
    setLoading(false);

    // Defer push notification permission request to avoid immediate browser prompt
    const permTimeout = setTimeout(() => requestPushNotificationPermission(), 3000);
    return () => clearTimeout(permTimeout);
  }, []);

  const login = async (email: string, pass: string): Promise<UserProfile> => {
    setLoading(true);
    setError(null);
    try {
      const u = await dbService.login(email, pass);
      setCurrentUser(u);
      setLoading(false);
      return u;
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await dbService.logout();
      setCurrentUser(null);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Logout failed');
      throw err;
    }
  };

  const isAdmin = currentUser?.role === 'admin';
  const isStaff = currentUser?.role === 'staff';
  const isParent = currentUser?.role === 'parent';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        error,
        login,
        logout,
        isAdmin,
        isStaff,
        isParent
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
