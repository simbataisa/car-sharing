
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <nav className="flex items-center justify-between p-4 border-b">
      <Link href="/" className="text-2xl font-bold">
        CarShare
      </Link>
      <div className="flex items-center gap-4">
        <Link href="/cars">
          <Button variant="ghost">Cars</Button>
        </Link>
        <Link href="/login">
          <Button>Login</Button>
        </Link>
      </div>
    </nav>
  );
}
