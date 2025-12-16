'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, X, Image as ImageIcon, File } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface FileUploadProps {
  onUploadComplete: (file: {
    url: string
    path: string
    fileName: string
    fileSize: number
    fileType: string
  }) => void
  bucket: string
  folder?: string
  accept?: string
  maxSize?: number // em MB
  label?: string
  multiple?: boolean
}

export function FileUpload({
  onUploadComplete,
  bucket,
  folder = '',
  accept = '*/*',
  maxSize = 10,
  label = 'Upload de Arquivo',
  multiple = false,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tamanho
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: `O arquivo deve ter no máximo ${maxSize}MB`,
        variant: 'destructive',
      })
      return
    }

    // Preview para imagens
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }

    await handleUpload(file)
  }

  const handleUpload = async (file: File) => {
    try {
      setUploading(true)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', bucket)
      if (folder) formData.append('folder', folder)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao fazer upload')
      }

      const data = await response.json()
      onUploadComplete(data)

      toast({
        title: 'Upload realizado com sucesso!',
        description: 'O arquivo foi enviado.',
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao fazer upload',
        description: error.message || 'Não foi possível fazer o upload',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          id="file-upload"
          multiple={multiple}
        />
        <Label htmlFor="file-upload" className="cursor-pointer">
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? 'Enviando...' : 'Selecionar Arquivo'}
          </Button>
        </Label>
        {preview && (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="h-20 w-20 object-cover rounded border"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Tamanho máximo: {maxSize}MB
      </p>
    </div>
  )
}

