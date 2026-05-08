import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authToken = request.cookies.get("sb-auth-token")?.value
  const isLoginPage = pathname === "/login"

  // Forward the pathname so the root layout can decide whether to render the sidebar
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", pathname)

  if (!authToken && !isLoginPage) {
    const url = new URL("/login", request.url)
    // Preserve the intended destination for post-login redirect
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  if (authToken && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  // Run on all routes except Next.js internals, static assets, and API routes
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
}
