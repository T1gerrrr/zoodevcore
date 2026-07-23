import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { auth as firebaseAuth } from '../lib/firebase';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('userData');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('userData');
      }
    }

    if (!firebaseAuth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        localStorage.setItem('authToken', token);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Staff login with email/password
  const staffLogin = useCallback(async (email, password) => {
    const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    const token = await credential.user.getIdToken();
    localStorage.setItem('authToken', token);

    const response = await authAPI.staffLogin();
    const userData = response.data.user;
    localStorage.setItem('userData', JSON.stringify(userData));
    setCurrentUser(userData);
    return userData;
  }, []);

  // Employee login with code + PIN
  const employeeLogin = useCallback(async (employeeCode, pin) => {
    const response = await authAPI.employeeLogin({ employeeCode, pin });
    const { customToken, user: userData } = response.data;

    // Sign in with custom token to get Firebase auth
    const credential = await signInWithCustomToken(firebaseAuth, customToken);
    const token = await credential.user.getIdToken();
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(userData));
    setCurrentUser(userData);
    return userData;
  }, []);

  // Phone OTP login verify
  const phoneLogin = useCallback(async (confirmationResult, otpCode) => {
    const credential = await confirmationResult.confirm(otpCode);
    const token = await credential.user.getIdToken();
    localStorage.setItem('authToken', token);

    const response = await authAPI.phoneLogin();
    const userData = response.data.user;
    localStorage.setItem('userData', JSON.stringify(userData));
    setCurrentUser(userData);
    return userData;
  }, []);

  // Refresh current user data from backend
  const refreshUser = useCallback(async () => {
    try {
      const response = await authAPI.getMe();
      const userData = response.data;
      localStorage.setItem('userData', JSON.stringify(userData));
      setCurrentUser(userData);
      return userData;
    } catch (e) {
      console.error('Refresh user error:', e);
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    if (firebaseAuth) await signOut(firebaseAuth);
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setCurrentUser(null);
  }, []);

  const value = {
    currentUser,
    loading,
    staffLogin,
    employeeLogin,
    phoneLogin,
    refreshUser,
    logout,
    isStaff: currentUser?.role === 'staff',
    isEmployee: currentUser?.role === 'employee',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
