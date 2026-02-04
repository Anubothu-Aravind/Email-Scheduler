import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

interface User {
  id?: string;
  name: string;
  email: string;
  picture?: string;
  sub?: string;
  iat?: number;
  exp?: number;
}

interface AuthContextType {
  user: User | null;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore login on refresh
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const authToken = localStorage.getItem("authToken");
    if (storedUser && authToken) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const loginWithGoogle = async (credential: string) => {
    try {
      // Decode Google JWT to get user info
      const decoded = jwtDecode<User>(credential);
      
      // Send to backend for authentication
      const response = await axios.post(`${API_BASE_URL}/auth/google-login`, {
        googleToken: credential,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
      });

      if (response.data.token) {
        const userData: User = {
          id: response.data.user?.id,
          name: decoded.name,
          email: decoded.email,
          picture: decoded.picture,
        };
        localStorage.setItem("authToken", response.data.token);
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
      }
    } catch (error) {
      console.error("Google login failed:", error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });

      if (response.data.token) {
        const userData: User = {
          id: response.data.user?.id,
          name: response.data.user?.name || email.split('@')[0],
          email: response.data.user?.email || email,
          picture: undefined,
        };
        localStorage.setItem("authToken", response.data.token);
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      console.error("Email login failed:", error);
      return { success: false, error: error.response?.data?.error || 'Login failed' };
    }
  };

  const register = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        email,
        password,
        name,
      });

      if (response.data.token) {
        const userData: User = {
          id: response.data.user?.id,
          name: response.data.user?.name || name,
          email: response.data.user?.email || email,
          picture: undefined,
        };
        localStorage.setItem("authToken", response.data.token);
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
        return { success: true };
      }
      return { success: false, error: 'Registration failed' };
    } catch (error: any) {
      console.error("Registration failed:", error);
      return { success: false, error: error.response?.data?.error || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, loginWithEmail, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
