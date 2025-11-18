import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role_id: number;
  token: string;
  token_type: string;
  expires_in: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (userData: User) => void;
  logout: () => void;
  verifyToken: () => Promise<boolean>;
  refreshToken: () => Promise<boolean>;
  getCurrentUser: () => Promise<boolean>;
  register: (userData: {
    email: string;
    username: string;
    password: string;
    full_name: string;
  }) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: (userData: User) => {
        set({
          user: userData,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
        });
      },

      verifyToken: async (): Promise<boolean> => {
        const { user } = get();
        if (!user?.token) return false;

        try {
          const response = await fetch(
            "https://payroll-trial.profaskes.id/panel/auth/verify-token",
            {
              method: "POST",
              headers: {
                Authorization: `${user.token_type} ${user.token}`,
                "Content-Type": "application/json",
              },
            }
          );

          const data = await response.json();
          return data.success === true;
        } catch (error) {
          console.error("Token verification failed:", error);
          return false;
        }
      },

      refreshToken: async (): Promise<boolean> => {
        const { user } = get();
        if (!user?.token) return false;

        try {
          const response = await fetch(
            "https://payroll-trial.profaskes.id/panel/auth/refresh-token",
            {
              method: "POST",
              headers: {
                Authorization: `${user.token_type} ${user.token}`,
                "Content-Type": "application/json",
              },
            }
          );

          const data = await response.json();

          if (data.success && data.data.token) {
            set({
              user: {
                ...user,
                token: data.data.token,
                token_type: data.data.token_type,
                expires_in: data.data.expires_in,
              },
            });
            return true;
          }
          return false;
        } catch (error) {
          console.error("Token refresh failed:", error);
          return false;
        }
      },

      getCurrentUser: async (): Promise<boolean> => {
        const { user } = get();
        if (!user?.token) return false;

        try {
          const response = await fetch(
            "https://payroll-trial.profaskes.id/panel/auth/me",
            {
              method: "GET",
              headers: {
                Authorization: `${user.token_type} ${user.token}`,
                "Content-Type": "application/json",
              },
            }
          );

          const data = await response.json();

          if (data.success && data.data) {
            set({
              user: {
                ...user,
                email: data.data.email,
                username: data.data.username,
                full_name: data.data.full_name,
                role_id: data.data.role_id,
              },
            });
            return true;
          }
          return false;
        } catch (error) {
          console.error("Get current user failed:", error);
          return false;
        }
      },

      register: async (userData: {
        email: string;
        username: string;
        password: string;
        full_name: string;
      }): Promise<boolean> => {
        try {
          const response = await fetch(
            "https://payroll-trial.profaskes.id/panel/auth/register",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(userData),
            }
          );

          const data = await response.json();
          return data.success === true;
        } catch (error) {
          console.error("Registration failed:", error);
          return false;
        }
      },
    }),
    {
      name: "auth-storage",
    }
  )
);
