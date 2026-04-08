import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request) {
  try {
    const clients = await prisma.clientRecord.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(clients)
  } catch (error) {
    console.error('Prisma GET error:', error)
    return NextResponse.json({ error: 'Error fetching clients', details: String(error) }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { 
      destino, 
      fecha_salida, 
      fecha_retorno,
      nombre, 
      apellido, 
      cedula, 
      edad,
      monto_total, 
      reserva_inicial, 
      abonos, 
      restante_por_pagar, 
      metodo_pago, 
      vendedor,
      cantidad_pax,
      acompanantes
    } = body

    // Regla de un solo nombre y un solo apellido en mayúscula
    const unSoloNombre = nombre.trim().split(/\s+/)[0].toUpperCase();
    const unSoloApellido = apellido.trim().split(/\s+/)[0].toUpperCase();
    const acompMays = acompanantes ? acompanantes.toUpperCase() : '';
    
    // Forzar cédula solo números
    const cleanCedula = cedula.replace(/\D/g, '');

    // Native ISO Parsing form React Datetime-Local
    const parsedSalida = new Date(fecha_salida);
    const parsedRetorno = new Date(fecha_retorno);

    const newClient = await prisma.clientRecord.create({
      data: {
        destino,
        fecha_salida: parsedSalida,
        fecha_retorno: parsedRetorno,
        nombre: unSoloNombre,
        apellido: unSoloApellido,
        cedula: cleanCedula,
        edad: parseInt(edad, 10) || null,
        monto_total: parseFloat(monto_total),
        reserva_inicial: parseFloat(reserva_inicial),
        abonos: parseFloat(abonos),
        restante_por_pagar: parseFloat(restante_por_pagar),
        metodo_pago,
        vendedor,
        cantidad_pax: parseInt(cantidad_pax, 10) || 1,
        acompanantes: acompMays,
        receipts: {
          create: {
            type: 'CONTRATO',
            monto_involucrado: parseFloat(reserva_inicial) || 0
          }
        }
      },
      include: { receipts: true }
    })
    
    return NextResponse.json(newClient)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error creating client' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const body = await request.json()
    const { id, abonos, restante_por_pagar, monto_involucrado } = body
    if (!id) return NextResponse.json({error: 'ID is required'}, {status: 400})
      
    const updatedClient = await prisma.clientRecord.update({
      where: { id },
      data: {
        abonos: parseFloat(abonos),
        restante_por_pagar: parseFloat(restante_por_pagar),
        receipts: {
          create: {
            type: 'ABONO',
            monto_involucrado: parseFloat(monto_involucrado) || 0
          }
        }
      },
      include: { receipts: true }
    })
    
    return NextResponse.json(updatedClient)
  } catch(error) {
    console.error(error)
    return NextResponse.json({ error: 'Error updating client' }, { status: 500 })
  }
}
