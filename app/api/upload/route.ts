import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function uploadToSupabase(
  bucket: string,
  path: string,
  file: File
): Promise<{ url: string; path: string }> {
  const supabase = await createClient()
  
  // Verificar se o arquivo é muito grande (100MB)
  const maxSize = 100 * 1024 * 1024 // 100MB
  if (file.size > maxSize) {
    throw new Error(`Arquivo muito grande. Tamanho máximo: 100MB. Tamanho atual: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    // Mensagens de erro mais claras
    if (error.message?.includes('duplicate') || error.message?.includes('already exists')) {
      throw new Error('Arquivo já existe. Tente novamente.')
    }
    if (error.message?.includes('File size')) {
      throw new Error('Arquivo muito grande. Tamanho máximo: 100MB')
    }
    if (error.message?.includes('MIME type') || error.message?.includes('mime')) {
      throw new Error(`Tipo de arquivo não permitido. Tipo: ${file.type}`)
    }
    if (error.message?.includes('not found') || error.message?.includes('bucket')) {
      throw new Error(`Bucket "${bucket}" não encontrado ou sem permissão`)
    }
    throw error
  }

  if (!data) {
    throw new Error('Erro ao fazer upload: nenhum dado retornado')
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path)

  return {
    url: urlData.publicUrl,
    path: data.path,
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string
    const folder = formData.get('folder') as string || ''

    if (!file || !bucket) {
      return NextResponse.json(
        { error: 'Arquivo e bucket são obrigatórios' },
        { status: 400 }
      )
    }

    const timestamp = Date.now()
    const fileName = `${timestamp}-${file.name}`
    const filePath = folder ? `${folder}/${fileName}` : fileName

    const { url, path } = await uploadToSupabase(bucket, filePath, file)

    return NextResponse.json({
      url,
      path,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    })
  } catch (error: any) {
    // Log detalhado para debug
    const errorDetails = {
      message: error.message,
      name: error.name,
      code: error.code,
      statusCode: error.statusCode,
    }
    
    // Determinar status HTTP apropriado
    let status = 500
    if (error.message?.includes('Tamanho máximo') || error.message?.includes('muito grande')) {
      status = 413 // Payload Too Large
    } else if (error.message?.includes('não permitido') || error.message?.includes('MIME type')) {
      status = 415 // Unsupported Media Type
    } else if (error.message?.includes('não encontrado') || error.message?.includes('bucket')) {
      status = 404
    } else if (error.message?.includes('já existe')) {
      status = 409 // Conflict
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Erro ao fazer upload',
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status }
    )
  }
}

