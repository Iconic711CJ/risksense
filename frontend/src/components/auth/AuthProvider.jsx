import { useEffect } from "react";
import { getMe } from "../../services/api";
import useAppStore from "../../store/useAppStore";

/**
 * Runs once on app load.
 * Our auth is entirely backend-JWT based (login calls POST /auth/login on the
 * FastAPI server, NOT the Supabase JS client). So we never use supabase.auth
 * here — we read the stored token from Zustand and validate it with GET /me.
 *
 * Flow:
 *  1. No stored token  → clearAuth() (loading: false)
 *  2. Token exists     → GET /me with token as Bearer header
 *       success        → setAuth(user, token) (loading: false)
 *       401 / error    → clearAuth() (loading: false)
 */
export default function AuthProvider({ children }) {
  const setAuth = useAppStore((s) => s.setAuth);
  const clearAuth = useAppStore((s) => s.clearAuth);

  useEffect(() => {
    const { token } = useAppStore.getState();

    if (!token) {
      clearAuth();   // ensures loading: false
      return;
    }

    // Validate stored token and refresh the user profile
    getMe()
      .then((user) => setAuth(user, token))
      .catch(() => clearAuth());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return children;
}
