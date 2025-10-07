import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('authToken'));

  // Load user on mount if token exists
  useEffect(() => {
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadUser = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      setUser(response.data.data.user);
      setOrganization(response.data.data.current_organization);
      setOrganizations(response.data.data.organizations);
    } catch (error) {
      console.error('Failed to load user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password, organizationName = null) => {
    try {
      const payload = {
        username,
        password,
      };

      // Only include organization if provided
      if (organizationName) {
        payload.organization = organizationName;
      }

      const response = await apiClient.post('/auth/login', payload);

      const { user, token, organization, organizations, force_password_change } = response.data.data;

      localStorage.setItem('authToken', token);
      setToken(token);
      setUser(user);
      setOrganization(organization);
      setOrganizations(organizations);

      return {
        success: true,
        data: { organization, organizations, force_password_change },
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await apiClient.post('/auth/register', userData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed',
      };
    }
  };

  const logout = async (newPassword = null) => {
    try {
      // If newPassword is provided, it's a force password change
      if (newPassword) {
        const response = await apiClient.post('/auth/force-password-change', {
          new_password: newPassword,
        });

        if (!response.data.success) {
          return {
            success: false,
            error: response.data.error || 'Password change failed',
          };
        }
      } else if (token) {
        await apiClient.post('/auth/logout');
      }

      localStorage.removeItem('authToken');
      setToken(null);
      setUser(null);
      setOrganization(null);
      setOrganizations([]);

      return { success: true };
    } catch (error) {
      console.error('Logout/Password change error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Operation failed',
      };
    }
  };

  const checkUsernameAvailability = async (username) => {
    try {
      const response = await apiClient.get(`/auth/check-username/${username}`);
      return response.data.available;
    } catch (error) {
      return false;
    }
  };

  const checkEmailAvailability = async (email) => {
    try {
      const response = await apiClient.get(`/auth/check-email/${email}`);
      return response.data.available;
    } catch (error) {
      return false;
    }
  };

  const checkOrganizationAvailability = async (orgName) => {
    try {
      const response = await apiClient.get(`/auth/check-organization/${orgName}`);
      return {
        available: response.data.available,
        exists: response.data.exists,
      };
    } catch (error) {
      return { available: false, exists: false };
    }
  };

  const isAuthenticated = !!user;
  const isOrgAdmin = organization?.role === 'owner' || organization?.role === 'admin';
  const isOrgOwner = organization?.role === 'owner';

  const value = {
    user,
    organization,
    organizations,
    loading,
    isAuthenticated,
    isOrgAdmin,
    isOrgOwner,
    login,
    register,
    logout,
    loadUser,
    checkUsernameAvailability,
    checkEmailAvailability,
    checkOrganizationAvailability,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
