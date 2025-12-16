'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Upload, File, X, Download, Image as ImageIcon, FileText, FileIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ScrollArea } from '@/components/ui/scroll-area'

interface FileShareProps {
  sessionId: string
  isDoctor: boolean
}

interface SharedFile {
  id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  created_at: string
  user_id: string
  profiles?: {
    name: string
  }
}

export function FileShare({ sessionId, isDoctor }: FileShareProps) {
  const [files, setFiles] = useState<SharedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    // Só carregar arquivos se sessionId existir
    if (!sessionId) return
    
    loadFiles()
    const unsubscribe = subscribeToFiles()
    
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [sessionId])

  const loadFiles = async () => {
    if (!sessionId) return
    
    try {
      // Buscar arquivos sem join (evita erro 400)
      const { data, error } = await supabase
        .from('telemedicine_files')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })

      if (error) {
        // Erro pode ser normal se a tabela não existir ou RLS bloquear
        if (error.code === 'PGRST116' || error.code === '42P01') {
          // Tabela não existe ou sem acesso - não é um erro crítico
          setFiles([])
          return
        }
        throw error
      }

      // Buscar perfis separadamente
      const userIds = [...new Set((data || []).map((file: any) => file.user_id).filter(Boolean))]
      const profilesMap: Record<string, { name: string }> = {}
      
      if (userIds.length > 0) {
        for (const userId of userIds) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', userId)
              .maybeSingle()
            
            if (profile) {
              profilesMap[userId] = profile
            }
          } catch {
            // Erro silencioso
          }
        }
      }

      // Adicionar nome do usuário aos arquivos
      const filesWithProfiles = (data || []).map((file: any) => ({
        ...file,
        profiles: profilesMap[file.user_id] ? { name: profilesMap[file.user_id].name } : undefined,
      }))

      setFiles(filesWithProfiles)
    } catch (error: any) {
      // Erro silencioso - tabela pode não existir ou RLS pode bloquear
      // Não bloquear a interface se houver erro
      setFiles([])
    }
  }

  const subscribeToFiles = () => {
    if (!sessionId) return () => {}
    
    try {
      const channel = supabase.channel(`files-${sessionId}`)
      channel
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'telemedicine_files',
          filter: `session_id=eq.${sessionId}`,
        }, () => {
          loadFiles()
        })
        .subscribe()

      return () => {
        channel.unsubscribe()
      }
    } catch (error) {
      // Erro silencioso ao criar subscription
      return () => {}
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    await uploadFile(selectedFile)
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadFile = async (file: File) => {
    try {
      setUploading(true)

      // Upload para Supabase Storage
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'medical-records')
      formData.append('folder', `telemedicine-files/${sessionId}`)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Erro ao fazer upload')
      }

      const { url, path, fileName, fileSize, fileType } = await response.json()

      // Salvar referência no banco
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { error: dbError } = await supabase
        .from('telemedicine_files')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          file_name: fileName,
          file_url: url,
          file_type: fileType,
          file_size: fileSize,
        })

      if (dbError) throw dbError

      toast({
        title: 'Arquivo enviado',
        description: `${fileName} foi compartilhado com sucesso.`,
      })

      loadFiles()
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar arquivo',
        description: error.message || 'Não foi possível enviar o arquivo.',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-500" />
    } else {
      return <FileIcon className="h-5 w-5 text-gray-500" />
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Arquivos Compartilhados</CardTitle>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,application/pdf,.doc,.docx"
          />
          {(isDoctor || true) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Enviando...' : 'Enviar'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum arquivo compartilhado ainda</p>
            {(isDoctor || true) && (
              <p className="text-xs mt-1">Clique em "Enviar" para compartilhar um arquivo</p>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {getFileIcon(file.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.file_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.file_size)}</span>
                      <span>•</span>
                      <span>{file.profiles?.name || 'Usuário'}</span>
                      <span>•</span>
                      <span>{new Date(file.created_at).toLocaleTimeString('pt-BR')}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(file.file_url, '_blank')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

