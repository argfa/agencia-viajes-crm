import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

function formatDestinoName(str) {
  if (!str) return '';
  const lowerWords = ['de', 'la', 'el', 'los', 'las', 'en', 'y', 'a', 'del'];
  return str.trim().toLowerCase().split(/\s+/).map((word, index) => {
    if (index > 0 && lowerWords.includes(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

export async function GET(request) {
  try {
    const destinos = await prisma.destinoPrecargado.findMany({
      orderBy: { name: 'asc' }
    })
    
    // Si no hay ninguno, podríamos devolver unos por defecto, 
    // pero la UI se encargará de crear los predeterminados.
    return NextResponse.json(destinos)
  } catch (error) {
    console.error('Error fetching destinos:', error)
    return NextResponse.json({ error: 'Error fetching destinos', details: String(error) }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, id, name } = body
    
    if (action === 'create') {
      const formattedName = formatDestinoName(name)
      const allDestinos = await prisma.destinoPrecargado.findMany()
      const existing = allDestinos.find(d => d.name.toLowerCase() === formattedName.toLowerCase())
      if (existing) {
        return NextResponse.json({ error: 'Este destino ya está en tu lista' }, { status: 400 })
      }
      const result = await prisma.destinoPrecargado.create({ data: { name: formattedName } })
      return NextResponse.json(result)
    } 
    else if (action === 'update') {
      const formattedName = formatDestinoName(name)
      const allDestinos = await prisma.destinoPrecargado.findMany()
      const existing = allDestinos.find(d => d.name.toLowerCase() === formattedName.toLowerCase())
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: 'Ya existe este destino registrado' }, { status: 400 })
      }
      const result = await prisma.destinoPrecargado.update({
        where: { id },
        data: { name: formattedName }
      })
      return NextResponse.json(result)
    }
    else if (action === 'delete') {
      await prisma.destinoPrecargado.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }
    else if (action === 'seed') {
      // Create multiple targets
      const current = await prisma.destinoPrecargado.findMany()
      const currentNames = current.map(d => d.name)
      const dataToCreate = name.filter(n => !currentNames.includes(n)).map(n => ({name: n}))
      
      if (dataToCreate.length > 0) {
        await prisma.destinoPrecargado.createMany({ data: dataToCreate })
      }
      return NextResponse.json({ success: true })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error modifying destino:', error)
    return NextResponse.json({ error: 'Error modifying destino' }, { status: 500 })
  }
}
