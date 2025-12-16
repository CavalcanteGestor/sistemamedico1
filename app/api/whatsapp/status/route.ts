import { NextResponse } from 'next/server'
import { getWhatsAppStatus } from '@/lib/services/whatsapp-service'

export async function GET() {
  try {
    const status = await getWhatsAppStatus()
    return NextResponse.json(status)
  } catch (error: any) {
    console.error('Erro ao obter status WhatsApp:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao obter status' },
      { status: 500 }
    )
  }
}

