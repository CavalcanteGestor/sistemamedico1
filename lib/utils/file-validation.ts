/**
 * Validação de arquivos para upload
 * Protege contra uploads maliciosos
 */

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
  medical: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
}

const MAX_FILE_SIZES: Record<string, number> = {
  image: 10 * 1024 * 1024, // 10MB
  document: 20 * 1024 * 1024, // 20MB
  medical: 20 * 1024 * 1024, // 20MB
  default: 10 * 1024 * 1024, // 10MB
}

/**
 * Valida tipo MIME do arquivo
 */
export function validateMimeType(
  mimeType: string,
  category: 'image' | 'document' | 'medical' = 'medical'
): boolean {
  const allowed = ALLOWED_MIME_TYPES[category] || ALLOWED_MIME_TYPES.default
  return allowed.includes(mimeType)
}

/**
 * Valida tamanho do arquivo
 */
export function validateFileSize(
  size: number,
  category: 'image' | 'document' | 'medical' = 'medical'
): boolean {
  const maxSize = MAX_FILE_SIZES[category] || MAX_FILE_SIZES.default
  return size <= maxSize
}

/**
 * Valida extensão do arquivo
 */
export function validateFileExtension(filename: string, allowedExtensions: string[]): boolean {
  const extension = filename.split('.').pop()?.toLowerCase()
  if (!extension) return false
  return allowedExtensions.includes(extension)
}

/**
 * Validação completa de arquivo
 */
export interface FileValidationResult {
  valid: boolean
  error?: string
}

export function validateFile(
  file: File,
  category: 'image' | 'document' | 'medical' = 'medical'
): FileValidationResult {
  // Validar tipo MIME
  if (!validateMimeType(file.type, category)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido. Tipos aceitos: ${ALLOWED_MIME_TYPES[category].join(', ')}`,
    }
  }

  // Validar tamanho
  if (!validateFileSize(file.size, category)) {
    const maxSizeMB = (MAX_FILE_SIZES[category] || MAX_FILE_SIZES.default) / (1024 * 1024)
    return {
      valid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`,
    }
  }

  // Validar nome do arquivo (sem caracteres perigosos)
  const dangerousChars = /[<>:"|?*\x00-\x1f]/
  if (dangerousChars.test(file.name)) {
    return {
      valid: false,
      error: 'Nome de arquivo contém caracteres inválidos',
    }
  }

  return { valid: true }
}

/**
 * Sanitiza nome do arquivo
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"|?*\x00-\x1f]/g, '') // Remove caracteres perigosos
    .replace(/^\.+/, '') // Remove pontos no início
    .replace(/\.+$/, '') // Remove pontos no final
    .substring(0, 255) // Limita tamanho
}

