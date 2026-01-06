'use client'

import { useState, useRef, KeyboardEvent, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Paperclip, Image as ImageIcon, Mic, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageInputProps {
  onSend: (message: string, mediaFile?: File, mediaType?: string) => void
  disabled?: boolean
  placeholder?: string
  initialMessage?: string
}

export function MessageInput({ onSend, disabled = false, placeholder = 'Digite uma mensagem...', initialMessage }: MessageInputProps) {
  const [message, setMessage] = useState(initialMessage || '')
  
  useEffect(() => {
    if (initialMessage) {
      setMessage(initialMessage)
    }
  }, [initialMessage])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }
  }, [])

  const handleSend = () => {
    if (message.trim() || selectedFile) {
      const fileType = selectedFile?.type.startsWith('image/') ? 'image' :
                      selectedFile?.type.startsWith('video/') ? 'video' :
                      selectedFile?.type.startsWith('audio/') ? 'audio' : 'document'
      
      onSend(message.trim(), selectedFile || undefined, selectedFile ? fileType : undefined)
      setMessage('')
      setSelectedFile(null)
      setFilePreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      
      // Criar preview para imagens e vídeos
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setFilePreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else if (file.type.startsWith('video/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setFilePreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setFilePreview(null)
      }
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' })
        
        setSelectedFile(audioFile)
        setFilePreview(null)
        
        // Parar todos os tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Atualizar tempo de gravação
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error)
      alert('Não foi possível acessar o microfone. Verifique as permissões.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
    }
  }

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <div className="border-t bg-[#F0F2F5] p-2">
      {/* Preview de arquivo selecionado */}
      {selectedFile && (
        <div className="mb-2 p-2 bg-white rounded-lg border relative">
          <button
            onClick={removeFile}
            className="absolute top-1 right-1 p-1 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          
          {filePreview ? (
            selectedFile.type.startsWith('image/') ? (
              <img src={filePreview} alt="Preview" className="max-w-full max-h-32 rounded" />
            ) : selectedFile.type.startsWith('video/') ? (
              <video src={filePreview} controls className="max-w-full max-h-32 rounded" />
            ) : null
          ) : (
            <div className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-gray-600" />
              <span className="text-sm text-gray-700 truncate">{selectedFile.name}</span>
              <span className="text-xs text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          )}
        </div>
      )}

      {/* Indicador de gravação */}
      {isRecording && (
        <div className="mb-2 p-3 bg-red-100 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm text-red-700 font-medium">
              Gravando... {formatRecordingTime(recordingTime)}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={stopRecording}
            className="text-red-700 hover:text-red-800"
          >
            Parar
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleFileSelect}
          disabled={disabled || isRecording}
          type="button"
          className="text-gray-600 hover:text-gray-800"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex-1 relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || isRecording}
            rows={1}
            className={cn(
              'min-h-[44px] max-h-32 resize-none',
              'pr-12 bg-white dark:bg-[#202C33] rounded-lg',
              'border-gray-300 dark:border-gray-600 focus:border-primary',
              'text-gray-900 dark:text-gray-100',
            )}
          />
        </div>

        {message.trim() || selectedFile ? (
          <Button
            onClick={handleSend}
            disabled={disabled || isRecording}
            size="icon"
            type="button"
            className="bg-primary hover:bg-primary/90 text-white rounded-full"
          >
            <Send className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            onClick={handleMicClick}
            disabled={disabled}
            size="icon"
            type="button"
            className={cn(
              "rounded-full transition-colors",
              isRecording 
                ? "bg-red-500 hover:bg-red-600 text-white" 
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
            )}
          >
            {isRecording ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
