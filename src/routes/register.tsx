import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Gamepad2, Check } from "lucide-react";
import { motion } from "framer-motion";
import { CATEGORIES, type CategoryValue } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [category, setCategory] = useState<CategoryValue | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [session, loading, navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      toast.error("Pick one category to continue");
      return;
    }
    if (username.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { username: username.trim(), category },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome to Valora");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
              <Gamepad2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-3xl font-bold tracking-tight"><span className="text-gradient">VALORA</span></span>
          </div>
          <p className="text-muted-foreground text-sm">Join the esports marketplace</p>
        </div>

        <div className="glass rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" required minLength={3} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ProGamer123" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <div className="space-y-2 pt-1">
              <Label>Choose your role <span className="text-xs text-muted-foreground">(pick one)</span></Label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => {
                  const active = category === c.value;
                  return (
                    <button
                      type="button"
                      key={c.value}
                      onClick={() => setCategory(c.value)}
                      className={cn(
                        "relative rounded-lg border px-3 py-3 text-sm font-medium transition-all text-left",
                        active
                          ? "border-primary bg-primary/10 text-foreground glow-primary"
                          : "border-border bg-surface hover:bg-surface-elevated text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {c.label}
                      {active && <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button type="submit" disabled={submitting} className="w-full gradient-primary text-primary-foreground hover:opacity-90 font-semibold mt-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
