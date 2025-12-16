'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileUpload } from '@/components/forms/file-upload'
import { useToast } from '@/hooks/use-toast'
import { Paperclip, Download, Trash2, FileText, Image as ImageIcon, File } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CaseStudyFilesProps {
  caseStudyId: string
  isAuthor: boolean
  currentUser: any
  onUpdate?: () => void
}

export function CaseStudyFiles({ 
  caseStudyId, 
  isAuthor, 
  currentUser,
  onUpdate 
}: CaseStudyFilesProps) {
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [fileDescription, setFileDescription] = useState('')
  const [uploadedFile, setUploadedFile] = useState<any>(null)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadFiles()
  }, [caseStudyId])

  const loadFiles = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('case_study_files')
        .select(`
          *,
          uploaded_by_profile:uploaded_by (
            id,
            name
          )
        `)
        .eq('case_study_id', caseStudyId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setFiles(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar arquivos:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os arquivos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUploadComplete = async (fileData: any) => {
    setUploadedFile(fileData)
  }

  const handleSaveFile = async () => {
    if (!uploadedFile) {
      toast({
        title: 'Erro',
        description: 'Nenhum arquivo foi selecionado.',
        variant: 'destructive',
      })
      return
    }

    try {
      setUploading(true)
      const { error } = await supabase
        .from('case_study_files')
        .insert({
          case_study_id: caseStudyId,
          file_url: uploadedFile.url,
          file_name: uploadedFile.fileName,
          file_type: uploadedFile.fileType,
          file_size: uploadedFile.fileSize,
          description: fileDescription || null,
          uploaded_by: currentUser?.id || null,
        })

      if (error) throw error

      toast({
        title: 'Arquivo adicionado',
        description: 'O arquivo foi adicionado com sucesso.',
      })

      setShowUploadDialog(false)
      setFileDescription('')
      setUploadedFile(null)
      loadFiles()
      onUpdate?.()
    } catch (error: any) {
      console.error('Erro ao salvar arquivo:', error)
      toast({
        title: 'Erro ao salvar arquivo',
        description: error.message || 'Não foi possível salvar o arquivo.',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Tem certeza que deseja excluir este arquivo?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('case_study_files')
        .delete()
        .eq('id', fileId)

      if (error) throw error

      toast({
        title: 'Arquivo excluído',
        description: 'O arquivo foi excluído com sucesso.',
      })

      loadFiles()
      onUpdate?.()
    } catch (error: any) {
      console.error('Erro ao excluir arquivo:', error)
      toast({
        title: 'Erro ao excluir',
        description: error.message || 'Não foi possível excluir o arquivo.',
        variant: 'destructive',
      })
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
    }
    return <File className="h-5 w-5 text-gray-500" />
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando arquivos...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Arquivos ({files.length})
          </CardTitle>
          {isAuthor && (
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Paperclip className="mr-2 h-4 w-4" />
                  Adicionar Arquivo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Arquivo</DialogTitle>
                  <DialogDescription>
                    Faça upload de um arquivo para este estudo de caso.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Arquivo</Label>
                    <FileUpload
                      onUploadComplete={handleUploadComplete}
                      bucket="medical-records"
                      folder={`case-studies/${caseStudyId}`}
                      accept="*/*"
                      maxSize={50}
                      label="Selecionar arquivo"
                      multiple={false}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descrição (opcional)</Label>
                    <Input
                      id="description"
                      value={fileDescription}
                      onChange={(e) => setFileDescription(e.target.value)}
                      placeholder="Descreva o arquivo..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowUploadDialog(false)
                        setFileDescription('')
                        setUploadedFile(null)
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveFile}
                      disabled={!uploadedFile || uploading}
                    >
                      {uploading ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Paperclip className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum arquivo anexado ainda.</p>
            {isAuthor && (
              <p className="text-sm mt-2">
                Clique em "Adicionar Arquivo" para fazer upload de documentos.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getFileIcon(file.file_type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.file_name}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{formatFileSize(file.file_size || 0)}</span>
                      <span>•</span>
                      <span>
                        {format(new Date(file.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                      </span>
                      {file.uploaded_by_profile && (
                        <>
                          <span>•</span>
                          <span>por {file.uploaded_by_profile.name}</span>
                        </>
                      )}
                    </div>
                    {file.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {file.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(file.file_url, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar
                  </Button>
                  {(isAuthor || file.uploaded_by === currentUser?.id) && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteFile(file.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

