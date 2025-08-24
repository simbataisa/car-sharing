import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  try {
    // Get user token for authentication
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // Check if accessing admin routes
    if (request.nextUrl.pathname.startsWith("/admin")) {
      // Allow access to admin login page
      if (request.nextUrl.pathname === "/admin/login") {
        return NextResponse.next();
      }

      if (!token) {
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }

      // For other admin routes, we'll let the AdminLayout component handle admin role checking
      // since we need to make API calls to verify admin status
    }

    // Check if accessing dashboard routes
    if (request.nextUrl.pathname.startsWith("/dashboard")) {
      if (!token) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }

    // Check if accessing protected car routes
    if (request.nextUrl.pathname.startsWith("/cars/") && 
        request.nextUrl.pathname !== "/cars") {
      if (!token) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }

    // Redirect authenticated users away from auth pages
    if (token && (request.nextUrl.pathname === "/login" || 
                  request.nextUrl.pathname === "/signup")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/cars/:path*",
    "/login",
    "/signup",
    "/",
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
};
