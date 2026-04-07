import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'llave-ultra-secreta-de-beach-camp-2026')

export async function proxy(request) {
  const path = request.nextUrl.pathname
  const isDashboard = path.startsWith('/dashboard')

  if (isDashboard) {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      const response = NextResponse.redirect(new URL('/', request.url))
      response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
      return response
    }

    try {
      await jwtVerify(token, JWT_SECRET)
      const response = NextResponse.next()
      response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
      return response
    } catch (e) {
      // Invalid token, redirect to login
      let response = NextResponse.redirect(new URL('/', request.url))
      response.cookies.delete('auth_token')
      response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
      return response
    }
  }

  // If path is root '/', optionally redirect to dashboard if they are already logged in
  if (path === '/') {
    const token = request.cookies.get('auth_token')?.value
    if (token) {
      try {
        await jwtVerify(token, JWT_SECRET)
        const response = NextResponse.redirect(new URL('/dashboard', request.url))
        response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
        return response
      } catch (e) {
        // Silently let them stay on login page if token is expired
      }
    }
    const response = NextResponse.next()
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/']
}
