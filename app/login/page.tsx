"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loginSchema, type LoginFormData } from "@/lib/validations";
import { useAppStore } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const { setError, setIsLoading, isLoading } = useAppStore();
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setAuthError(null);
      setError(null);

      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setAuthError("Invalid email or password");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      setAuthError("An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <main className="container mx-auto p-4 flex justify-center items-center min-h-[calc(100vh-65px)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {authError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {authError}
                </div>
              )}

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  {...register("email")}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  {...register("password")}
                  className={errors.password ? "border-red-500" : ""}
                />
                {errors.password && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Login"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Don't have an account?{" "}
              <Link href="/signup" className="underline hover:text-primary">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
