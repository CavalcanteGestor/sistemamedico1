/**
 * Função auxiliar para adicionar logo aos PDFs
 */
export async function addLogoToPDF(
  doc: any,
  logoUrl: string | undefined,
  pageWidth: number,
  yPos: number,
  maxWidth: number = 50,
  maxHeight: number = 30
): Promise<number> {
  if (!logoUrl) return yPos

  try {
    // Buscar imagem
    const response = await fetch(logoUrl)
    if (!response.ok) return yPos

    const blob = await response.blob()
    
    // Converter para base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })

    // Criar imagem HTML para obter dimensões
    const img = document.createElement('img')
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = base64
    })

    // Calcular dimensões mantendo proporção
    let logoWidth = maxWidth
    let logoHeight = (img.height / img.width) * logoWidth

    if (logoHeight > maxHeight) {
      logoHeight = maxHeight
      logoWidth = (img.width / img.height) * logoHeight
    }

    // Adicionar logo centralizada
    const xPos = (pageWidth - logoWidth) / 2
    doc.addImage(base64, 'PNG', xPos, yPos, logoWidth, logoHeight)

    return yPos + logoHeight + 5
  } catch (error) {
    console.error('Erro ao adicionar logo ao PDF:', error)
    return yPos
  }
}

