import { auth } from "@/lib/auth"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith("/auth")
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth")
  const isApiHealth = req.nextUrl.pathname === "/api/health"

  if (isApiAuth || isApiHealth) return

  if (!isLoggedIn && !isAuthPage) {
    return Response.redirect(new URL("/auth/login", req.nextUrl))
  }

  if (isLoggedIn && isAuthPage) {
    return Response.redirect(new URL("/dashboard", req.nextUrl))
  }

  // Admin route protection
  if (req.nextUrl.pathname.startsWith("/admin")) {
    const role = req.auth?.user?.role
    if (role !== "ADMIN" && role !== "TRAINER") {
      return Response.redirect(new URL("/dashboard", req.nextUrl))
    }
  }
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
