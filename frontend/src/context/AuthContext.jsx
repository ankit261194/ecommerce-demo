import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export const DEMO_CREDENTIALS = {
  superadmin: { email: 'admin@auramarket.com', password: 'admin123456' },
  vendor: { email: 'apex@auramarket.com', password: 'vendor123456' },
  delivery: { email: 'rider@auramarket.com', password: 'rider123456' },
  customer: { email: 'customer@auramarket.com', password: 'customer123456' },
};

// Pre-configured persona identities for role selection
export const DEMO_PERSONAS = {
  superadmin: {
    id: 'usr_admin_001',
    name: 'Super Admin',
    email: 'admin@auramarket.com',
    role: 'superadmin',
    token: '',
  },
  vendor: {
    id: 'usr_vendor_001',
    name: 'Rajesh Verma (Apex Electronics)',
    email: 'apex@auramarket.com',
    role: 'vendor',
    storeName: 'Apex Tech Hub',
    token: '',
    vendorProfile: {
      id: 'vnd_001',
      storeName: 'Apex Tech Hub',
      commissionRate: 8,
      walletBalance: 24500,
      totalSales: 185000,
      rating: 4.9,
    },
  },
  delivery: {
    id: 'usr_rider_001',
    name: 'Vikram Singh',
    email: 'rider@auramarket.com',
    role: 'delivery',
    phone: '9876543213',
    token: '',
  },
  customer: {
    id: 'usr_cust_001',
    name: 'Aman Sharma',
    email: 'customer@auramarket.com',
    role: 'customer',
    phone: '9876543214',
    token: '',
  },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('auramarket_user');
      return saved ? JSON.parse(saved) : DEMO_PERSONAS.customer;
    } catch {
      return DEMO_PERSONAS.customer;
    }
  });

  const [activeRole, setActiveRole] = useState(() => {
    return user ? user.role : 'customer';
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('auramarket_token') || DEMO_PERSONAS.customer.token;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('auramarket_user', JSON.stringify(user));
      localStorage.setItem('auramarket_token', token || '');
      setActiveRole(user.role);
    }
  }, [user, token]);

  // Synchronize on mount if stored token is missing
  useEffect(() => {
    const savedToken = localStorage.getItem('auramarket_token');
    if (!savedToken) {
      const targetRole = activeRole || user?.role || 'customer';
      const creds = DEMO_CREDENTIALS[targetRole] || DEMO_CREDENTIALS.customer;
      api.post('/auth/login', creds)
        .then(res => {
          if (res.data?.success && res.data?.token) {
            const liveUser = {
              ...res.data.user,
              vendorProfile: res.data.vendorProfile,
            };
            setUser(liveUser);
            setToken(res.data.token);
            setActiveRole(liveUser.role);
            localStorage.setItem('auramarket_user', JSON.stringify(liveUser));
            localStorage.setItem('auramarket_token', res.data.token);
          }
        })
        .catch(err => {
          console.warn('Initial session synchronization notice:', err?.message);
        });
    }
  }, []);

  const switchPersona = async roleKey => {
    // Attempt authentic login with real backend credentials
    const credentials = DEMO_CREDENTIALS[roleKey];
    if (credentials) {
      try {
        const res = await api.post('/auth/login', credentials);
        if (res.data?.success && res.data?.token) {
          const liveUser = {
            ...res.data.user,
            vendorProfile: res.data.vendorProfile,
          };
          setUser(liveUser);
          setToken(res.data.token);
          setActiveRole(liveUser.role);
          localStorage.setItem('auramarket_user', JSON.stringify(liveUser));
          localStorage.setItem('auramarket_token', res.data.token);
          return;
        }
      } catch (err) {
        console.warn('Backend live persona switch notice:', err?.message);
      }
    }

    const persona = DEMO_PERSONAS[roleKey] || DEMO_PERSONAS.customer;
    setUser(persona);
    setToken(persona.token || '');
    setActiveRole(persona.role);
    localStorage.setItem('auramarket_user', JSON.stringify(persona));
    localStorage.setItem('auramarket_token', persona.token || '');
  };

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        setUser({
          ...res.data.user,
          vendorProfile: res.data.vendorProfile,
        });
        setToken(res.data.token);
        return { success: true };
      }
    } catch (err) {
      if (err.response) {
        return { success: false, message: err.response.data?.message || 'Invalid email or password' };
      }
      return { success: false, message: 'Server unreachable. Please check connection.' };
    }
  };

  const logout = () => {
    switchPersona('customer');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeRole,
        token,
        switchPersona,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
