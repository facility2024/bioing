import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { toast } from "sonner";
import { Loader2, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Painel" },
      { name: "description", content: "Acesso ao painel administrativo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email({ message: "E-mail inválido" }).max(255);
const passwordSchema = z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }).max(100);

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin/dashboard" });
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailParse = emailSchema.safeParse(email);
    const passParse = passwordSchema.safeParse(password);
    if (!emailParse.success) return toast.error(emailParse.error.errors[0].message);
    if (!passParse.success) return toast.error(passParse.error.errors[0].message);

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: emailParse.data,
      password: passParse.data,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos" : error.message);
      return;
    }
    toast.success("Bem-vindo!");
    navigate({ to: "/admin/dashboard" });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailParse = emailSchema.safeParse(email);
    const passParse = passwordSchema.safeParse(password);
    if (!emailParse.success) return toast.error(emailParse.error.errors[0].message);
    if (!passParse.success) return toast.error(passParse.error.errors[0].message);

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: emailParse.data,
      password: passParse.data,
      options: { emailRedirectTo: `${window.location.origin}/admin/dashboard` },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Cadastro criado! Você já pode entrar.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShoppingBag className="h-7 w-7" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Boas vindas</h1>
          <p className="text-sm text-muted-foreground">Somente administradores</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Entrar</CardTitle>
            <CardDescription>Acesse com seu e-mail e senha</CardDescription>
          </CardHeader>
          <form onSubmit={handleSignIn}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">E-mail</Label>
                <Input id="signin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" autoComplete="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Senha</Label>
                <Input id="signin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
