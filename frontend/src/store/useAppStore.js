import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAppStore = create(
  persist(
    (set, get) => ({
      // ── Auth ──────────────────────────────────────────────────────────────
      user: null,   // { id, full_name, role, department_id, department_name, department_code, email }
      token: null,
      isAuthenticated: false,
      loading: true,

      setAuth: (user, token) =>
        set({ user, token, isAuthenticated: true, loading: false }),

      clearAuth: () =>
        set({ user: null, token: null, isAuthenticated: false, loading: false }),

      setLoading: (loading) => set({ loading }),

      updateUser: (partial) =>
        set((state) => ({ user: { ...state.user, ...partial } })),

      // ── UI ────────────────────────────────────────────────────────────────
      activeDeptId: null,   // admin drilling into a specific department
      sidebarOpen: true,    // mobile sidebar toggle

      setActiveDept: (id) => set({ activeDeptId: id }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      // ── Cached data ───────────────────────────────────────────────────────
      departments: [],
      setDepartments: (departments) => set({ departments }),

      dashboardSummary: null,
      setDashboardSummary: (data) => set({ dashboardSummary: data }),

      // ── Helpers ───────────────────────────────────────────────────────────
      isAdmin: () => get().user?.role === "admin",
      getDeptId: () => {
        const { user, activeDeptId, isAdmin } = get();
        if (isAdmin() && activeDeptId) return activeDeptId;
        return user?.department_id ?? null;
      },
    }),
    {
      name: "erimp-auth",
      // Only persist auth fields — never cache sensitive business data
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAppStore;
