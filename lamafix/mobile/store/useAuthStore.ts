import { create } from 'zustand';
import { apiService, API_BASE_URL } from '../lib/api';

// Import AsyncStorage dynamically to avoid issues
let AsyncStorage: any;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  // Fallback for web
  AsyncStorage = null;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  storeId?: string | null;
  store?: { id: string; name: string; code?: string | null };
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    try {
      const result = await apiService.login(email, password);
      
      if (result.success && result.data) {
        const { user, token } = result.data;
        const derivedName = user.email.split('@')[0];
        const formattedName = derivedName.charAt(0).toUpperCase() + derivedName.slice(1);

        set({
          user: {
            id: user.id,
            name: formattedName,
            email: user.email,
            role: user.role,
            storeId: user.storeId,
            store: user.store,
          },
          isAuthenticated: true,
          isLoading: false,
        });

        return { success: true };
      } else {
        return { success: false, error: result.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  logout: async () => {
    try {
      if (AsyncStorage) {
        await AsyncStorage.removeItem('authToken');
      } else if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('authToken');
      }
      apiService.setToken(null);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  checkAuth: async () => {
    try {
      let token: string | null = null;
      if (AsyncStorage) {
        token = await AsyncStorage.getItem('authToken');
      } else if (typeof window !== 'undefined' && window.localStorage) {
        token = window.localStorage.getItem('authToken');
      }
      
      if (token) {
        apiService.setToken(token);
        // Verify token by making a test API call
        // If successful, user is authenticated
        try {
          const response = await fetch(`${API_BASE_URL}/workorders`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            // Token is valid - user is authenticated
            // Note: In production, you'd want a /me endpoint to restore full user data
            set({ 
              isAuthenticated: true,
              isLoading: false 
            });
          } else {
            // Token invalid or expired - clear it
            if (AsyncStorage) {
              await AsyncStorage.removeItem('authToken');
            } else if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.removeItem('authToken');
            }
            apiService.setToken(null);
            set({ 
              user: null,
              isAuthenticated: false,
              isLoading: false 
            });
          }
        } catch (verifyError) {
          // Network error - keep token but mark as not authenticated
          // User can retry login
          set({ isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Check auth error:', error);
      set({ isLoading: false });
    }
  },
}));

