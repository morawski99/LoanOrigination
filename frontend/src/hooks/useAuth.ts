import { create } from "zustand";
import { persist } from "zustand/middleware";
import { login as apiLogin, getCurrentUser } from "@/services/api";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const tokenData = await apiLogin(email, password);
          const { access_token } = tokenData;

          // Persist token in localStorage for the axios interceptor
          localStorage.setItem("access_token", access_token);

          const user = await getCurrentUser();

          set({
            token: access_token,
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        set({ user: null, token: null, isAuthenticated: false });
      },

      fetchCurrentUser: async () => {
        const { token } = get();
        if (!token) return;
        try {
          const user = await getCurrentUser();
          set({ user, isAuthenticated: true });
        } catch {
          get().logout();
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export function useAuth() {
  return useAuthStore();
}
