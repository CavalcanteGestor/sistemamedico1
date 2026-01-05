#!/usr/bin/env node

/**
 * Script de Verificação de Segurança
 * Verifica se todas as configurações de segurança estão corretas
 */

const fs = require('fs')
const path = require('path')

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
}

let errors = 0
let warnings = 0

function check(condition, message, isWarning = false) {
  if (condition) {
    console.log(`${colors.green}✅${colors.reset} ${message}`)
  } else {
    if (isWarning) {
      console.log(`${colors.yellow}⚠️${colors.reset} ${message}`)
      warnings++
    } else {
      console.log(`${colors.red}❌${colors.reset} ${message}`)
      errors++
    }
  }
}

console.log(`${colors.blue}🔒 Verificando Segurança do Sistema Lumi${colors.reset}\n`)

// 1. Verificar variáveis de ambiente
console.log('1️⃣ Verificando variáveis de ambiente...')
const envExample = path.join(process.cwd(), 'env.local.example')
const envLocal = path.join(process.cwd(), '.env.local')

check(fs.existsSync(envExample), 'Arquivo env.local.example existe')
check(fs.existsSync(envLocal) || process.env.NODE_ENV === 'production', 'Arquivo .env.local existe (ou está em produção)')

if (fs.existsSync(envLocal)) {
  const envContent = fs.readFileSync(envLocal, 'utf-8')
  check(!envContent.includes('SUPABASE_SERVICE_ROLE_KEY=your_key'), 'Service Role Key não está com valor padrão')
  check(envContent.includes('NEXT_PUBLIC_SUPABASE_URL'), 'NEXT_PUBLIC_SUPABASE_URL configurado')
  check(envContent.includes('SUPABASE_SERVICE_ROLE_KEY'), 'SUPABASE_SERVICE_ROLE_KEY configurado')
  check(envContent.includes('CRON_SECRET_KEY'), 'CRON_SECRET_KEY configurado', true)
}

// 2. Verificar .gitignore
console.log('\n2️⃣ Verificando .gitignore...')
const gitignore = path.join(process.cwd(), '.gitignore')
if (fs.existsSync(gitignore)) {
  const gitignoreContent = fs.readFileSync(gitignore, 'utf-8')
  // Verificar se arquivos sensíveis estão sendo ignorados (isso é bom!)
  check(gitignoreContent.includes('.env.local') || gitignoreContent.includes('.env*'), '.env.local está protegido no .gitignore')
  check(gitignoreContent.includes('.env.production') || gitignoreContent.includes('.env*'), '.env.production está protegido no .gitignore')
  check(gitignoreContent.includes('node_modules'), 'node_modules está no .gitignore')
}

// 3. Verificar next.config.js
console.log('\n3️⃣ Verificando next.config.js...')
const nextConfig = path.join(process.cwd(), 'next.config.js')
if (fs.existsSync(nextConfig)) {
  const configContent = fs.readFileSync(nextConfig, 'utf-8')
  check(configContent.includes('X-Frame-Options'), 'Headers de segurança configurados')
  check(configContent.includes('Content-Security-Policy'), 'Content Security Policy configurado')
  check(configContent.includes('Strict-Transport-Security'), 'HSTS configurado')
}

// 4. Verificar middleware
console.log('\n4️⃣ Verificando middleware...')
const middleware = path.join(process.cwd(), 'middleware.ts')
if (fs.existsSync(middleware)) {
  const middlewareContent = fs.readFileSync(middleware, 'utf-8')
  check(middlewareContent.includes('getUser()'), 'Middleware verifica autenticação')
  check(middlewareContent.includes('publicRoutes'), 'Rotas públicas definidas')
}

// 5. Verificar rate limiting
console.log('\n5️⃣ Verificando rate limiting...')
const rateLimit = path.join(process.cwd(), 'lib/middleware/rate-limit.ts')
check(fs.existsSync(rateLimit), 'Rate limiting implementado')

// 6. Verificar validação de arquivos
console.log('\n6️⃣ Verificando validação de arquivos...')
const fileValidation = path.join(process.cwd(), 'lib/utils/file-validation.ts')
check(fs.existsSync(fileValidation), 'Validação de arquivos implementada')

// 7. Verificar RLS nas migrations
console.log('\n7️⃣ Verificando Row Level Security...')
const migrationsDir = path.join(process.cwd(), 'supabase/migrations')
if (fs.existsSync(migrationsDir)) {
  const migrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'))
  const rlsMigrations = migrations.filter(f => {
    const content = fs.readFileSync(path.join(migrationsDir, f), 'utf-8')
    return content.includes('ROW LEVEL SECURITY') || content.includes('ENABLE ROW LEVEL SECURITY')
  })
  check(rlsMigrations.length > 0, `RLS encontrado em ${rlsMigrations.length} migration(s)`)
}

// 8. Verificar se service role não está exposta
console.log('\n8️⃣ Verificando exposição de secrets...')
const appDir = path.join(process.cwd(), 'app')
const componentsDir = path.join(process.cwd(), 'components')

function checkForSecrets(dir) {
  if (!fs.existsSync(dir)) return true
  
  const files = fs.readdirSync(dir, { recursive: true, withFileTypes: true })
  let hasSecrets = false
  
  for (const file of files) {
    if (file.isFile() && (file.name.endsWith('.ts') || file.name.endsWith('.tsx') || file.name.endsWith('.js'))) {
      const filePath = path.join(file.path, file.name)
      const content = fs.readFileSync(filePath, 'utf-8')
      
      // Verificar se é client component
      if (content.includes("'use client'") || content.includes('"use client"')) {
        if (content.includes('SUPABASE_SERVICE_ROLE_KEY') || content.includes('service_role')) {
          console.log(`${colors.red}   ⚠️  Possível exposição em: ${filePath}${colors.reset}`)
          hasSecrets = true
        }
      }
    }
  }
  
  return !hasSecrets
}

check(checkForSecrets(appDir) && checkForSecrets(componentsDir), 'Service Role Key não exposta em client components')

// Resumo
console.log(`\n${colors.blue}═══════════════════════════════════════${colors.reset}`)
console.log(`${colors.blue}📊 Resumo da Verificação${colors.reset}`)
console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}`)

if (errors === 0 && warnings === 0) {
  console.log(`${colors.green}✅ Tudo certo! Sistema seguro para produção.${colors.reset}`)
  process.exit(0)
} else {
  if (errors > 0) {
    console.log(`${colors.red}❌ ${errors} erro(s) encontrado(s)${colors.reset}`)
  }
  if (warnings > 0) {
    console.log(`${colors.yellow}⚠️  ${warnings} aviso(s)${colors.reset}`)
  }
  console.log(`\n${colors.yellow}⚠️  Corrija os erros antes de fazer deploy em produção!${colors.reset}`)
  process.exit(errors > 0 ? 1 : 0)
}

