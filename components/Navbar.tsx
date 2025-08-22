"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Shield, User, LogOut, Menu, X } from "lucide-react";

export function Navbar() {
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (session?.user) {
        try {
          const response = await fetch("/api/admin/users", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });
          setIsAdmin(response.ok && response.status !== 403);
        } catch (error) {
          setIsAdmin(false);
        }
      }
    };

    if (status !== "loading") {
      checkAdminStatus();
    }
  }, [session, status]);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <nav className="flex items-center justify-between p-4 border-b bg-white shadow-sm">
      <Link href="/" className="text-2xl font-bold text-blue-600">
        CarShare
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-4">
        <Link href="/cars">
          <Button variant="ghost">Cars</Button>
        </Link>

        {session ? (
          <>
            <Link href="/dashboard">
              <Button variant="ghost" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Dashboard</span>
              </Button>
            </Link>

            {isAdmin && (
              <Link href="/admin">
                <Button
                  variant="ghost"
                  className="flex items-center space-x-2 text-purple-600"
                >
                  <Shield className="h-4 w-4" />
                  <span>Admin</span>
                </Button>
              </Link>
            )}

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                Hello, {session.user?.name || session.user?.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/signup">
              <Button>Sign Up</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Mobile menu button */}
      <div className="md:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b shadow-lg md:hidden z-50">
          <div className="px-4 py-2 space-y-2">
            <Link href="/cars" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                Cars
              </Button>
            </Link>

            {session ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button variant="ghost" className="w-full justify-start">
                    <User className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>

                {isAdmin && (
                  <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-purple-600"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                )}

                <div className="border-t pt-2">
                  <p className="text-sm text-gray-600 mb-2 px-2">
                    {session.user?.name || session.user?.email}
                  </p>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    Login
                  </Button>
                </Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full justify-start">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
