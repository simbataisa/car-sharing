
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div>
      <Navbar />
      <main className="container mx-auto p-4 flex justify-center items-center min-h-[calc(100vh-65px)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="your@email.com" />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" />
              </div>
              <Button type="submit" className="w-full">Login</Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Don't have an account?{" "}
              <Link href="/signup" className="underline">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
