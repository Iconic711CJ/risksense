import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import { login } from "../services/api";
import useAppStore from "../store/useAppStore";

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAppStore((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  function portalPath(role) {
    if (role === "super_admin") return "/super-admin";
    if (role === "admin") return "/admin";
    return "/staff";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) { toast.error("Enter your email and password"); return; }
    setLoading(true);
    try {
      const data = await login(email, password);
      setAuth(data.user, data.access_token);
      toast.success(`Welcome, ${data.user.full_name}`);
      navigate(portalPath(data.user.role), { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#191D23" }}>

      {/* ── Left panel — branding ────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] p-12 shrink-0" style={{ background: "#191D23", borderRight: "1px solid #2a333d" }}>
        {/* Logo */}
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-9 h-9 flex items-center justify-center" style={{ background: "#57707A" }}>
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-lg tracking-widest uppercase" style={{ color: "#DEDCDC" }}>Risksense</span>
          </div>

          <h1 className="text-4xl font-black leading-tight tracking-tight mb-4" style={{ color: "#DEDCDC" }}>
            Risksense<br />Risk Management<br />Platform
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "#7E919F" }}>
            Centralised risk management for Zambia. Monitor, assess, and mitigate risks across all departments.
          </p>
        </div>

        {/* Features list */}
        <div className="space-y-3">
          {[
            "Real-time risk monitoring",
            "Department-level analytics",
            "Audit trail & compliance",
            "Multi-role access control",
          ].map((f) => (
            <div key={f} className="flex items-center gap-3">
              <div className="w-1 h-4" style={{ background: "#57707A" }} />
              <span className="text-xs font-medium" style={{ color: "#979DAB" }}>{f}</span>
            </div>
          ))}
        </div>

        <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "#2a333d" }}>
          Charles-Jeff Technologies
        </p>
      </div>

      {/* ── Right panel — form ───────────────────────────────────────────── */}
      {/* Drop your image at /public/login-bg.jpg to replace the gradient */}
      <div
        className="flex-1 flex items-center justify-center p-8 relative"
        style={{
          backgroundImage: "url('/login-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/70" />

        <div className="w-full max-w-sm relative z-10">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-8 h-8 flex items-center justify-center" style={{ background: "#57707A" }}>
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-black tracking-widest uppercase" style={{ color: "#DEDCDC" }}>Risksense</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-black tracking-tight" style={{ color: "#DEDCDC" }}>Login</h2>
            <p className="text-sm mt-1" style={{ color: "#7E919F" }}>Sign in with your credentials</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#979DAB" }}>
                Email Address
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@nipa.ac.zm"
                disabled={loading}
                className="w-full px-4 py-3 bg-black/40 border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors backdrop-blur-sm"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#979DAB" }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full px-4 py-3 pr-12 bg-[#0d0f14] border border-[#1e2330] text-white text-sm placeholder:text-slate-700 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-sm font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
              style={{ background: "#57707A", color: "#DEDCDC" }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Logging in...
                </>
              ) : "Login"}
            </button>
          </form>

          <p className="text-center text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold mt-10">
            Risksense · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
