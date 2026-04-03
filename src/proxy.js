import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'llave-ultra-secreta-de-beach-camp-2026')

export async function proxy(request) {
  const path = request.nextUrl.pathname
  const isDashboard = path.startsWith('/dashboard')

  if (isDashboard) {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    try {
      await jwtVerify(token, JWT_SECRET)
      return NextResponse.next()
    } catch (e) {
      // Invalid token, redirect to login
      response = NextResponse.redirect(new URL('/', request.url))
      response.cookies.delete('auth_token')
      return response
    }
  }

  // If path is root '/', optionally redirect to dashboard if they are already logged in
  if (path === '/') {
    const token = request.cookies.get('auth_token')?.value
    if (token) {
      try {
        await jwtVerify(token, JWT_SECRET)
        return NextResponse.redirect(new URL('/dashboard', request.url))
      } catch (e) {
        // Silently let them stay on login page if token is expired
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/']
}
