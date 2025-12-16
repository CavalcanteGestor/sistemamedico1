'use client'

import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Check, CheckCheck, Download, File, Image as ImageIcon, Video, Music, Play, Pause } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'

interface MessageBubbleProps {
  message: string
  timestamp: string
  isSent: boolean
  read?: boolean
  mediaUrl?: string
  mediaType?: string
  contactName?: string
  contactAvatar?: string
  showAvatar?: boolean
  isGrouped?: boolean // Se a mensagem faz parte de um grupo de mensagens consecutivas
}

export function MessageBubble({
  message,
  timestamp,
  isSent,
  read = false,
  mediaUrl,
  mediaType,
  contactName,
  contactAvatar,
  showAvatar = true,
  isGrouped = false,
}: MessageBubbleProps) {
  const [mediaError, setMediaError] = useState(false)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioDuration, setAudioDuration] = useState(0)
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Cores do WhatsApp
  const sentBgColor = '#DCF8C6' // Verde claro do WhatsApp
  const receivedBgColor = '#FFFFFF' // Branco do WhatsApp

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setAudioCurrentTime(audio.currentTime)
    const updateDuration = () => setAudioDuration(audio.duration)
    const handleEnd = () => setAudioPlaying(false)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnd)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnd)
    }
  }, [mediaUrl, mediaType])

  // Resetar erro de mídia quando a URL mudar
  useEffect(() => {
    setMediaError(false)
  }, [mediaUrl])

  const toggleAudio = () => {
    const audio = audioRef.current
    if (!audio) return

    if (audioPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setAudioPlaying(!audioPlaying)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatTimestamp = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: ptBR })
    } else if (isYesterday(date)) {
      return 'Ontem ' + format(date, 'HH:mm', { locale: ptBR })
    } else {
      return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR })
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }
  const renderMedia = () => {
    if (!mediaUrl || mediaError) return null

    switch (mediaType) {
      case 'image':
        return (
          <div className="rounded-lg overflow-hidden mb-2 max-w-full">
            <img 
              src={mediaUrl} 
              alt={message || 'Imagem'} 
              className="max-w-full h-auto cursor-pointer"
              onClick={() => window.open(mediaUrl, '_blank')}
              onError={() => {
                setMediaError(true)
                // Silenciosamente ignorar erro 404
              }}
              loading="lazy"
            />
          </div>
        )
      
      case 'video':
        return (
          <div className="rounded-lg overflow-hidden mb-2 max-w-full relative">
            <video 
              src={mediaUrl} 
              controls 
              className="max-w-full h-auto"
              style={{ maxHeight: '400px' }}
              onError={() => {
                setMediaError(true)
              }}
            />
          </div>
        )
      
      case 'audio':
        return (
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-lg mb-2",
            isSent ? "bg-white/20" : "bg-gray-100"
          )}>
            <button
              onClick={toggleAudio}
              className={cn(
                "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                isSent ? "bg-white/30 hover:bg-white/40" : "bg-primary hover:bg-primary/90 text-white"
              )}
            >
              {audioPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className={cn(
                  "flex-1 h-1 rounded-full overflow-hidden",
                  isSent ? "bg-white/30" : "bg-gray-300"
                )}>
                  <div 
                    className={cn(
                      "h-full transition-all",
                      isSent ? "bg-white" : "bg-primary"
                    )}
                    style={{ width: audioDuration > 0 ? `${(audioCurrentTime / audioDuration) * 100}%` : '0%' }}
                  />
                </div>
                <span className={cn(
                  "text-xs whitespace-nowrap",
                  isSent ? "text-white/80" : "text-gray-600"
                )}>
                  {formatTime(audioCurrentTime)} / {formatTime(audioDuration || 0)}
                </span>
              </div>
            </div>
            <audio ref={audioRef} src={mediaUrl} className="hidden" />
          </div>
        )
      
      case 'document':
        const fileName = message || 'Documento'
        const isPdf = fileName.toLowerCase().endsWith('.pdf')
        const isImage = /\.(jpg|jpeg|png|gif)$/i.test(fileName)
        
        return (
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-lg mb-2 border",
            isSent ? "bg-white/10 border-white/20" : "bg-gray-50 border-gray-200"
          )}>
            <div className={cn(
              "flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center",
              isSent ? "bg-white/20" : "bg-primary/10"
            )}>
              {isPdf ? (
                <File className={cn("h-6 w-6", isSent ? "text-white" : "text-primary")} />
              ) : isImage ? (
                <ImageIcon className={cn("h-6 w-6", isSent ? "text-white" : "text-primary")} />
              ) : (
                <File className={cn("h-6 w-6", isSent ? "text-white" : "text-primary")} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium truncate",
                isSent ? "text-white" : "text-gray-900"
              )}>
                {fileName}
              </p>
              <a
                href={mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "text-xs flex items-center gap-1 mt-1",
                  isSent ? "text-white/80 hover:text-white" : "text-primary hover:underline"
                )}
              >
                <Download className="h-3 w-3" />
                Download
              </a>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className={cn(
      'flex w-full mb-0.5 group',
      isSent ? 'justify-end' : 'justify-start'
    )}>
      {/* Avatar (apenas para mensagens recebidas e se não estiver agrupada) */}
      {!isSent && showAvatar && !isGrouped && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden mr-2 mt-1">
          {contactAvatar ? (
            <img 
              src={contactAvatar} 
              alt={contactName || ''} 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Se a imagem falhar, mostrar iniciais
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  parent.innerHTML = `<div class="w-full h-full bg-primary text-white text-xs flex items-center justify-center font-medium">${getInitials(contactName)}</div>`
                }
              }}
            />
          ) : (
            <div className="w-full h-full bg-primary text-white text-xs flex items-center justify-center font-medium">
              {getInitials(contactName)}
            </div>
          )}
        </div>
      )}
      
      {/* Espaço para avatar quando não mostramos */}
      {(!showAvatar || isSent || isGrouped) && !isSent && (
        <div className="w-8 mr-2" />
      )}

      {/* Mensagem */}
      <div className={cn(
        'max-w-[65%] rounded-lg px-2 py-1 relative',
        isSent 
          ? 'rounded-br-none' 
          : 'rounded-bl-none'
      )}
      style={{
        backgroundColor: isSent ? sentBgColor : receivedBgColor,
      }}>
        {/* Conteúdo da mídia */}
        {renderMedia()}
        
        {/* Texto da mensagem */}
        {message && !mediaUrl && (
          <p className={cn(
            "text-sm whitespace-pre-wrap break-words",
            isSent ? "text-gray-800" : "text-gray-900"
          )}>
            {message}
          </p>
        )}
        
        {/* Caption de mídia */}
        {message && mediaUrl && (
          <p className={cn(
            "text-sm whitespace-pre-wrap break-words mt-2",
            isSent ? "text-gray-800" : "text-gray-900"
          )}>
            {message}
          </p>
        )}

        {/* Rodapé com horário e status */}
        <div className={cn(
          'flex items-center justify-end gap-1 mt-1',
          isSent ? 'text-gray-600' : 'text-gray-500'
        )}>
          <span className="text-xs leading-none opacity-70">
            {formatTimestamp(new Date(timestamp))}
          </span>
          {isSent && (
            <span className={cn(
              "text-xs leading-none opacity-70",
              read ? "text-blue-500" : ""
            )}>
              {read ? (
                <CheckCheck className="h-4 w-4" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
