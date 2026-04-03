import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'llave-ultra-secreta-de-beach-camp-2026')

export async function POST(request) {
  try {
    const { cedula, password } = await request.json()

    if (!cedula || !password) {
      return NextResponse.json({ error: 'Proporcione su cédula y contraseña' }, { status: 400 })
    }

    const unformatedCedula = cedula.replace(/\D/g, '')

    const user = await prisma.user.findUnique({
      where: { cedula: unformatedCedula }
    })

    if (!user) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const isValid = await bcrypt.compare(password, user.password)

    if (!isValid) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    // Create JWT
    const alg = 'HS256'
    const jwt = await new SignJWT({ id: user.id, cedula: user.cedula, nombre: user.nombre })
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime('12h')
      .sign(JWT_SECRET)

    const response = NextResponse.json({ success: true }, { status: 200 })
    
    // Set httpOnly cookie
    response.cookies.set('auth_token', jwt, {
      httpOnly: true,
      secure: false, // Permitir HTTP en red local
      sameSite: 'lax', // Lax previene problemas de redirección cruzada

      maxAge: 60 * 60 * 12, // 12 hours
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Error del servidor al iniciar sesión' }, { status: 500 })
  }
}
