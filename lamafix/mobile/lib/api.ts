// API base URL for the backend API.
// In production we want to hit the deployed Vercel app.
// In development you can still point to your local Next.js dev server.
import Constants from 'expo-constants';

const expoExtra = (Constants as any)?.expoConfig?.extra || {};

// Configure this in app.json / app.config.*:
// "extra": { "apiUrl": "https://cmms-theta.vercel.app/api" }
export const API_BASE_URL: string =
  (expoExtra.apiUrl as string | undefined) ??
  (__DEV__ ? 'http://localhost:3000/api' : 'https://cmms-theta.vercel.app/api');

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiService {
  private token: string | null = null;

  // Set auth token (from AsyncStorage after login)
  setToken(token: string | null) {
    this.token = token;
  }

  // Get auth headers
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  // Authentication
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: any }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/mobile/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (data.success && data.data.token) {
        this.token = data.data.token;
        // Store token securely
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.setItem('authToken', this.token);
        } catch (e) {
          // Fallback for web
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('authToken', this.token);
          }
        }
      }
      return data;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  }

  // Get assets for the store (for dropdown in create form)
  async getAssets(): Promise<ApiResponse<any[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/assets`, {
        headers: this.getHeaders(),
      });

      const data = await response.json();
      return Array.isArray(data) 
        ? { success: true, data } 
        : { success: data.success || false, data: data.data || [] };
    } catch (error) {
      console.error('Get assets error:', error);
      return { success: false, error: 'Failed to fetch assets' };
    }
  }

  // Create work order
  async createWorkOrder(workOrderData: {
    title: string;
    location: string;
    assetId: string;
    partsRequired: boolean;
    problemDescription: string;
    helpDescription: string;
    priority: 'Low' | 'Medium' | 'High';
    attachments?: string[];
    dueDate?: string;
    description?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE_URL}/workorders`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(workOrderData),
      });

      return await response.json();
    } catch (error) {
      console.error('Create work order error:', error);
      return { success: false, error: 'Failed to create work order' };
    }
  }

  // Get work orders (for USER role - their store's work orders)
  async getWorkOrders(): Promise<ApiResponse<any[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/workorders`, {
        headers: this.getHeaders(),
      });

      const data = await response.json();
      return { success: data.success || false, data: data.data || [] };
    } catch (error) {
      console.error('Get work orders error:', error);
      return { success: false, error: 'Failed to fetch work orders' };
    }
  }

  // Upload file/image
  async uploadFile(uri: string, fileType: string = 'workorder'): Promise<ApiResponse<{ url: string }>> {
    try {
      // Convert local URI to FormData
      const formData = new FormData();
      
      // For React Native
      const filename = uri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri,
        name: filename,
        type,
      } as any);
      formData.append('fileType', fileType);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          // Don't set Content-Type - let fetch set it with boundary
        },
        body: formData,
      });

      return await response.json();
    } catch (error) {
      console.error('Upload file error:', error);
      return { success: false, error: 'Failed to upload file' };
    }
  }
}

export const apiService = new ApiService();

