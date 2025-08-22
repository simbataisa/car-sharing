import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  // Check if accessing admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // Allow access to admin login page
    if (request.nextUrl.pathname === "/admin/login") {
      return NextResponse.next()
    }

    // Check if user is authenticated
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }

    // For other admin routes, we'll let the AdminLayout component handle admin role checking
    // since we need to make API calls to verify admin status
  }

  // Check if accessing dashboard routes
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*"
  ]
}
