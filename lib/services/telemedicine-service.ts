import { createClient } from '@/lib/supabase/client'

interface CreateTelemedicineSessionParams {
  appointmentId: string
  provider?: 'webrtc' | 'daily' | 'twilio' | 'agora'
}

export async function createTelemedicineSession({
  appointmentId,
  provider = 'webrtc',
}: CreateTelemedicineSessionParams) {
  const supabase = createClient()

  // Gerar ID único para a sala (WebRTC nativo - sem Jitsi)
  // Formato simplificado do roomId
  const roomId = `${appointmentId}-${Date.now()}`

  // Gerar URL baseado no provedor
  let roomUrl = ''
  if (provider === 'webrtc') {
    // WebRTC nativo - não precisa de URL externa
    roomUrl = `webrtc://${roomId}`
  } else if (provider === 'daily') {
    // Daily.co - requer API key
    roomUrl = await createDailyRoom(roomId)
  } else {
    // Padrão para outros provedores
    roomUrl = `/${roomId}`
  }

  // Criar sessão no banco
  const { data, error } = await supabase
    .from('telemedicine_sessions')
    .insert({
      appointment_id: appointmentId,
      room_id: roomId,
      room_url: roomUrl,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar sessão de telemedicina:', error)
    throw error
  }

  return data
}

async function createDailyRoom(roomId: string): Promise<string> {
  // Implementação para Daily.co (requer API key)
  // Por enquanto, retorna uma URL placeholder
  const dailyApiKey = process.env.NEXT_PUBLIC_DAILY_API_KEY
  if (!dailyApiKey) {
    throw new Error('Daily.co API key não configurada')
  }

  try {
    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dailyApiKey}`,
      },
      body: JSON.stringify({
        name: roomId,
        privacy: 'private',
        properties: {
          enable_chat: true,
          enable_screenshare: true,
          enable_recording: true,
        },
      }),
    })

    if (!response.ok) {
      throw new Error('Erro ao criar sala no Daily.co')
    }

    const data = await response.json()
    return data.url
  } catch (error) {
    console.error('Erro ao criar sala Daily.co:', error)
    // Fallback para WebRTC nativo
    return `webrtc://${roomId}`
  }
}

export async function getTelemedicineSession(appointmentId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('telemedicine_sessions')
    .select('*')
    .eq('appointment_id', appointmentId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return data
}

export async function startTelemedicineSession(sessionId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('telemedicine_sessions')
    .update({
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (error) throw error
}

export async function endTelemedicineSession(sessionId: string, recordingUrl?: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('telemedicine_sessions')
    .update({
      status: 'ended',
      ended_at: new Date().toISOString(),
      recording_url: recordingUrl || null,
    })
    .eq('id', sessionId)

  if (error) throw error
}

