#!/usr/bin/env node

/**
 * Script para verificar se o projeto está pronto para build
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando projeto antes do build...\n');

let hasErrors = false;

// 1. Verificar se package.json existe
console.log('1️⃣ Verificando package.json...');
if (!fs.existsSync('package.json')) {
  console.error('❌ package.json não encontrado!');
  hasErrors = true;
} else {
  console.log('✅ package.json encontrado');
}

// 2. Verificar se node_modules existe
console.log('\n2️⃣ Verificando dependências...');
if (!fs.existsSync('node_modules')) {
  console.warn('⚠️  node_modules não encontrado. Execute: npm install');
  hasErrors = true;
} else {
  console.log('✅ node_modules encontrado');
}

// 3. Verificar variáveis de ambiente
console.log('\n3️⃣ Verificando variáveis de ambiente...');
const envPath = path.join(process.cwd(), '.env.local');
const envExamplePath = path.join(process.cwd(), 'env.local.example');

if (!fs.existsSync(envPath)) {
  console.warn('⚠️  .env.local não encontrado');
  if (fs.existsSync(envExamplePath)) {
    console.log('💡 Copiando env.local.example para .env.local...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Arquivo .env.local criado. Configure as variáveis antes do build!');
    hasErrors = true;
  } else {
    console.error('❌ env.local.example também não encontrado!');
    hasErrors = true;
  }
} else {
  console.log('✅ .env.local encontrado');
  
  // Ler e verificar variáveis críticas
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];
  
  const missingVars = [];
  requiredVars.forEach(varName => {
    const regex = new RegExp(`^${varName}=`, 'm');
    if (!regex.test(envContent)) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    console.warn(`⚠️  Variáveis críticas não configuradas: ${missingVars.join(', ')}`);
    console.warn('   O build pode falhar ou a aplicação não funcionará corretamente.');
  } else {
    console.log('✅ Variáveis críticas configuradas');
  }
}

// 4. Verificar estrutura de diretórios importantes
console.log('\n4️⃣ Verificando estrutura do projeto...');
const requiredDirs = ['app', 'components', 'lib'];
requiredDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`✅ Diretório ${dir}/ encontrado`);
  } else {
    console.error(`❌ Diretório ${dir}/ não encontrado!`);
    hasErrors = true;
  }
});

// 5. Verificar arquivos de configuração
console.log('\n5️⃣ Verificando arquivos de configuração...');
const configFiles = [
  'next.config.js',
  'tsconfig.json',
  'tailwind.config.ts',
  'postcss.config.js'
];

configFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} encontrado`);
  } else {
    console.warn(`⚠️  ${file} não encontrado`);
  }
});

// Resumo
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ Verificação encontrou problemas!');
  console.log('\n📝 Próximos passos:');
  console.log('   1. Configure o arquivo .env.local com suas credenciais');
  console.log('   2. Execute: npm install (se necessário)');
  console.log('   3. Execute: npm run build');
  process.exit(1);
} else {
  console.log('✅ Projeto pronto para build!');
  console.log('\n📝 Execute: npm run build');
  process.exit(0);
}

