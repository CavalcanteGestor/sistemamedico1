#!/usr/bin/env node

/**
 * Script para substituir console.log/error/warn por logger
 * Uso: node scripts/replace-console-logs.js
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const loggerImport = "import { logger } from '@/lib/logger'"

// Padrões de substituição
const replacements = [
  {
    pattern: /console\.log\(([^)]+)\)/g,
    replacement: (match, args) => {
      // Tentar detectar se é um objeto ou string simples
      if (args.trim().startsWith('{') || args.includes(':')) {
        return `logger.info('', ${args})`
      }
      return `logger.info(${args})`
    }
  },
  {
    pattern: /console\.error\(([^)]+)\)/g,
    replacement: (match, args) => {
      // Se tem error como segundo parâmetro, usar logError
      if (args.includes(',')) {
        const parts = args.split(',').map(p => p.trim())
        if (parts.length >= 2) {
          return `logger.logError(${parts[1]}, { context: ${parts[0]} })`
        }
      }
      return `logger.error(${args})`
    }
  },
  {
    pattern: /console\.warn\(([^)]+)\)/g,
    replacement: (match, args) => `logger.warn(${args})`
  },
  {
    pattern: /console\.debug\(([^)]+)\)/g,
    replacement: (match, args) => `logger.debug(${args})`
  },
  {
    pattern: /console\.info\(([^)]+)\)/g,
    replacement: (match, args) => `logger.info(${args})`
  }
]

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let modified = false
    let hasLoggerImport = content.includes("from '@/lib/logger'")

    // Aplicar substituições
    replacements.forEach(({ pattern, replacement }) => {
      const newContent = content.replace(pattern, replacement)
      if (newContent !== content) {
        content = newContent
        modified = true
      }
    })

    // Adicionar import se necessário
    if (modified && !hasLoggerImport) {
      // Encontrar última linha de import
      const importLines = content.split('\n')
      let lastImportIndex = -1
      
      for (let i = 0; i < importLines.length; i++) {
        if (importLines[i].trim().startsWith('import ')) {
          lastImportIndex = i
        } else if (lastImportIndex !== -1 && importLines[i].trim() === '') {
          break
        }
      }

      if (lastImportIndex !== -1) {
        importLines.splice(lastImportIndex + 1, 0, loggerImport)
        content = importLines.join('\n')
      } else {
        // Se não encontrou imports, adicionar no início
        content = loggerImport + '\n' + content
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8')
      console.log(`✅ Processado: ${filePath}`)
      return true
    }
    return false
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message)
    return false
  }
}

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)

  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      // Ignorar node_modules, .next, etc
      if (!['node_modules', '.next', '.git', 'dist', 'build'].includes(file)) {
        findFiles(filePath, fileList)
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      // Ignorar arquivos de configuração do Sentry
      if (!file.includes('sentry') && !file.includes('.test.') && !file.includes('.spec.')) {
        fileList.push(filePath)
      }
    }
  })

  return fileList
}

// Executar
const appDir = path.join(__dirname, '..')
const files = findFiles(path.join(appDir, 'app'))
  .concat(findFiles(path.join(appDir, 'components')))
  .concat(findFiles(path.join(appDir, 'lib')))

console.log(`📝 Encontrados ${files.length} arquivos para processar...\n`)

let processed = 0
files.forEach(file => {
  if (processFile(file)) {
    processed++
  }
})

console.log(`\n✅ Processamento concluído! ${processed} arquivos modificados.`)
console.log('⚠️  Revise as mudanças antes de commitar!')

