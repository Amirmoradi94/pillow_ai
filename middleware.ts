import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
  const isAdminPage = req.nextUrl.pathname.startsWith('/admin')
  const isDashboardPage = req.nextUrl.pathname.startsWith('/dashboard')
  const isApiRoute = req.nextUrl.pathname.startsWith('/api')

  if (isAuthPage || isApiRoute) {
    return res
  }

  // Note: Full auth checking is done in server components
  // This middleware is kept for future session management
  if (!isDashboardPage && !isAdminPage) {
    return res
  }

  return res
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/api/:path*',
  ],
}
