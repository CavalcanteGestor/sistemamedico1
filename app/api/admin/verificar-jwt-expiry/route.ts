import { NextResponse } from 'next/server'

// Rota removida para produção - retorna 404
export async function GET() {
  return NextResponse.json(
    { error: 'Not found' },
    { status: 404 }
  )
}

