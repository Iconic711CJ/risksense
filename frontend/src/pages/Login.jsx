import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, ShieldCheck, Loader2, Building2 } from "lucide-react";
import { login } from "../services/api";
import useAppStore from "../store/useAppStore";
import { cn } from "../lib/utils";

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAppStore((s) => s.setAuth);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  function portalPath(role) {
    if (role === "super_admin") return "/super-admin";
    if (role === "admin") return "/admin";
    return "/staff";
  }

  // Already authenticated — redirect
  if (isAuthenticated) {
    const user = useAppStore.getState().user;
    navigate(portalPath(user?.role), { replace: true });
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your email and password");
      return;
    }
    setLoading(true);
    try {
      const data = await login(email, password);
      setAuth(data.user, data.access_token);
      toast.success(`Welcome back, ${data.user.full_name}!`);
      navigate(portalPath(data.user.role), { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || "Invalid email or password";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle geometric pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#064E3B_1px,transparent_1.5px)] [background-size:32px_32px]" />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-fade-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary mb-6 shadow-lg rotate-3">
            <ShieldCheck className="w-10 h-10 text-white -rotate-3" />
          </div>
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tight">ERIMP</h1>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mt-2 px-4">
            Enterprise Risk Intelligence & Mitigation
          </p>
        </div>

        <div className="minimal-card p-10 bg-white">
          <div className="mb-8">
            <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight">Portal Access</h2>
            <p className="text-xs font-medium text-slate-400 mt-2 uppercase tracking-wide">Enter your credentials below</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@nipa.ac.zm"
                disabled={loading}
                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full px-4 py-3.5 pr-12 rounded-xl bg-slate-50 border border-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-xl font-black text-sm text-white bg-primary shadow-sm hover:opacity-95 transition-all flex items-center justify-center gap-3 active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white/50" />
                  AUTHENTICATING...
                </>
              ) : (
                "SECURED SIGN IN"
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-50">
            <div className="flex items-center gap-3 text-slate-400 group cursor-default">
              <Building2 className="w-5 h-5 group-hover:text-primary transition-colors" />
              <p className="text-[10px] font-bold leading-tight uppercase tracking-tight">
                National Institute of <br/> Public Administration
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] font-black text-primary/40 mt-10 uppercase tracking-[0.2em] select-none">
          ERIMP Platform · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
