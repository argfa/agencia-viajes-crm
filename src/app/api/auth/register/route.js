import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request) {
  try {
    const { nombre, cedula, fecha_nacimiento, direccion, email, password } = await request.json()

    if (!nombre || !cedula || !fecha_nacimiento || !direccion || !email || !password) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 })
    }

    const passRegex = /^(?=.*[A-Z])(?=.*[^a-zA-Z\d]).{6,}$/
    if (!passRegex.test(password)) {
      return NextResponse.json({ error: 'La contraseña debe tener de un mínimo 6 caracteres, incluir al menos 1 mayúscula y 1 carácter especial.' }, { status: 400 })
    }

    const unformatedCedula = cedula.replace(/\D/g, '')

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { cedula: unformatedCedula },
          { email }
        ]
      }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'La cédula o el correo ya están registrados en el sistema.' }, { status: 400 })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const [day, month, year] = fecha_nacimiento.split('/')
    let parsedDate = null
    if (day && month && year) {
      parsedDate = new Date(`${year}-${month}-${day}T12:00:00Z`)
    } else {
      parsedDate = new Date(fecha_nacimiento) // fallback
    }

    const newUser = await prisma.user.create({
      data: {
        nombre,
        cedula: unformatedCedula,
        fecha_nacimiento: parsedDate,
        direccion,
        email,
        password: hashedPassword
      }
    })

    return NextResponse.json({ success: true, message: 'Usuario registrado con éxito.' }, { status: 201 })
  } catch (error) {
    console.error('Error in register:', error)
    return NextResponse.json({ error: 'Error del servidor al registrar usuario' }, { status: 500 })
  }
}
