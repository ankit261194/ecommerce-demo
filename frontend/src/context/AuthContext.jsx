import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export const DEMO_CREDENTIALS = {
  superadmin: { email: 'admin@auramarket.com', password: 'admin123456' },
  vendor: { email: 'apex@auramarket.com', password: 'vendor123456' },
  delivery: { email: 'rider@auramarket.com', password: 'rider123456' },
  customer: { email: 'customer@auramarket.com', password: 'customer123456' },
};

// Pre-configured mock personas for instant 1-click preview without needing to type passwords
export const DEMO_PERSONAS = {
  superadmin: {
    id: 'usr_admin_001',
    name: 'Super Admin',
    email: 'admin@auramarket.com',
    role: 'superadmin',
    token: 'mock_jwt_superadmin_token_2026',
  },
  vendor: {
    id: 'usr_vendor_001',
    name: 'Rajesh Verma (Apex Electronics)',
    email: 'apex@auramarket.com',
    role: 'vendor',
    storeName: 'Apex Tech Hub',
    token: 'mock_jwt_vendor_token_2026',
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
    token: 'mock_jwt_delivery_token_2026',
  },
  customer: {
    id: 'usr_cust_001',
    name: 'Aman Sharma',
    email: 'customer@auramarket.com',
    role: 'customer',
    phone: '9876543214',
    token: 'mock_jwt_customer_token_2026',
  },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('auramarket_user');
    return saved ? JSON.parse(saved) : DEMO_PERSONAS.customer;
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

  // Synchronize on mount if stored token is missing or a mock placeholder
  useEffect(() => {
    const savedToken = localStorage.getItem('auramarket_token');
    if (!savedToken || savedToken.startsWith('mock_jwt_')) {
      const targetRole = activeRole || user?.role || 'superadmin';
      const creds = DEMO_CREDENTIALS[targetRole] || DEMO_CREDENTIALS.superadmin;
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
          console.warn('Initial live token synchronization failed:', err?.message);
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
        console.warn('Backend live persona switch failed:', err?.message);
      }
    }

    const persona = DEMO_PERSONAS[roleKey] || DEMO_PERSONAS.customer;
    setUser(persona);
    setToken(persona.token);
    setActiveRole(persona.role);
    localStorage.setItem('auramarket_user', JSON.stringify(persona));
    localStorage.setItem('auramarket_token', persona.token);
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
      // If server responded with an error (e.g., 401 Unauthorized, 400 Bad Request), reject authentication!
      if (err.response) {
        return { success: false, message: err.response.data?.message || 'Invalid email or password' };
      }

      // ONLY if backend is completely offline/unreachable, fallback to matching demo credentials
      const matchedCreds = Object.values(DEMO_CREDENTIALS).find(c => c.email === email && c.password === password);
      if (matchedCreds) {
        const matchedRole = Object.keys(DEMO_CREDENTIALS).find(key => DEMO_CREDENTIALS[key].email === email);
        const persona = DEMO_PERSONAS[matchedRole];
        if (persona) {
          setUser(persona);
          setToken(persona.token);
          return { success: true };
        }
      }
      return { success: false, message: 'Invalid credentials or server unreachable' };
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
