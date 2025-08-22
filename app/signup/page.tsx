"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { signupSchema, type SignupFormData } from "@/lib/validations"
import { useAppStore } from "@/lib/store"

export default function SignupPage() {
  const router = useRouter()
  const { setError, setIsLoading, isLoading } = useAppStore()
  const [registrationError, setRegistrationError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormData) => {
    try {
      setIsLoading(true)
      setRegistrationError(null)
      setError(null)

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setRegistrationError(result.error || "Registration failed")
        return
      }

      setIsSuccess(true)
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (error) {
      setRegistrationError("An error occurred during registration")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div>
        <Navbar />
        <main className="container mx-auto p-4 flex justify-center items-center min-h-[calc(100vh-65px)]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-green-600 mb-2">
                  Registration Successful!
                </h2>
                <p className="text-muted-foreground mb-4">
                  Your account has been created successfully. Redirecting to login...
                </p>
                <Button asChild>
                  <Link href="/login">Go to Login</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div>
      <Navbar />
      <main className="container mx-auto p-4 flex justify-center items-center min-h-[calc(100vh-65px)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {registrationError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {registrationError}
                </div>
              )}
              
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  {...register("name")}
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                )}
              </div>
              
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
                  <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  {...register("password")}
                  className={errors.password ? "border-red-500" : ""}
                />
                {errors.password && (
                  <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  {...register("confirmPassword")}
                  className={errors.confirmPassword ? "border-red-500" : ""}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600 mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Sign Up"}
              </Button>
            </form>
            
            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <Link href="/login" className="underline hover:text-primary">
                Login
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
