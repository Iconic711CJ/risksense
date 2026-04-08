import { useState } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ShieldAlert, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login"); // "login" or "register"

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Registration successful! You can now log in.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Logged in successfully");
      }
    } catch (err) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex flex-col items-center justify-center border border-primary/30 shadow-lg shadow-primary/20">
          <ShieldAlert className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-display font-bold text-3xl text-foreground">RiskSense</h1>
        <p className="text-muted-foreground text-sm">Enterprise Risk Management Platform</p>
      </div>

      <Card className="w-full max-w-sm glass border-border/50">
        <CardHeader className="text-center">
          <CardTitle>{mode === "login" ? "Welcome Back" : "Create Account"}</CardTitle>
          <CardDescription>
            {mode === "login" 
              ? "Enter your credentials to access your dashboard"
              : "Sign up to start managing your risks securely"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Email</label>
              <Input 
                type="email" 
                placeholder="you@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Password</label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "login" ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button 
              type="button"
              className="text-primary hover:underline font-medium"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
      
      <p className="text-xs text-muted-foreground mt-8">
        If you haven't set up your Supabase project URL and key in frontend/.env, authentication will fail.
      </p>
    </div>
  );
}
