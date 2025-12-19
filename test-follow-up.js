#!/usr/bin/env node

/**
 * Script de teste para o sistema de Follow-up
 * 
 * Uso: node test-follow-up.js
 * 
 * Requisitos:
 * - Servidor rodando (npm run dev)
 * - Estar logado no sistema
 * - Evolution API configurada
 * - OpenAI configurada (se usar IA)
 */

const readline = require('readline');
const https = require('https');
const http = require('http');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configurações
const PHONE_NUMBER = '5537999458769';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const req = client.request(requestOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testFollowUp() {
  log('\n🧪 Teste do Sistema de Follow-up', 'blue');
  log('='.repeat(50), 'blue');
  
  log(`\n📱 Número de teste: ${PHONE_NUMBER}`, 'yellow');
  log(`🌐 URL base: ${BASE_URL}`, 'yellow');
  
  // Mensagem de teste
  const testMessage = `Olá! Esta é uma mensagem de teste do sistema de follow-up.
  
Data/Hora: ${new Date().toLocaleString('pt-BR')}
Sistema: Sistema Médico - Follow-up Test

Se você recebeu esta mensagem, o sistema está funcionando corretamente! ✅`;

  log('\n📝 Criando follow-up de teste...', 'yellow');

  try {
    // Passo 1: Criar follow-up
    log('\n1️⃣ Criando follow-up...', 'blue');
    
    const createData = {
      leadTelefone: PHONE_NUMBER,
      leadNome: 'Teste Follow-up',
      tipoFollowUp: 'contato_inicial',
      tipoMensagem: 'manual',
      mensagem: testMessage,
    };

    log(`   Enviando para: ${BASE_URL}/api/follow-up/create`, 'yellow');
    
    const createResponse = await makeRequest(
      `${BASE_URL}/api/follow-up/create`,
      { method: 'POST' },
      createData
    );

    if (createResponse.status !== 200 || !createResponse.data.success) {
      log(`\n❌ Erro ao criar follow-up:`, 'red');
      log(`   Status: ${createResponse.status}`, 'red');
      log(`   Erro: ${createResponse.data.error || JSON.stringify(createResponse.data)}`, 'red');
      
      if (createResponse.status === 401) {
        log('\n⚠️  Você precisa estar logado no sistema!', 'yellow');
        log('   Acesse o sistema no navegador e faça login primeiro.', 'yellow');
      }
      
      return;
    }

    const followUpId = createResponse.data.data.id;
    log(`   ✅ Follow-up criado com ID: ${followUpId}`, 'green');

    // Passo 2: Enviar follow-up
    log('\n2️⃣ Enviando follow-up via WhatsApp...', 'blue');
    
    const sendResponse = await makeRequest(
      `${BASE_URL}/api/follow-up/send`,
      { method: 'POST' },
      { followUpId }
    );

    if (sendResponse.status !== 200 || !sendResponse.data.success) {
      log(`\n❌ Erro ao enviar follow-up:`, 'red');
      log(`   Status: ${sendResponse.status}`, 'red');
      log(`   Erro: ${sendResponse.data.error || JSON.stringify(sendResponse.data)}`, 'red');
      
      if (sendResponse.data.error?.includes('Evolution API')) {
        log('\n⚠️  Verifique se a Evolution API está configurada corretamente!', 'yellow');
        log('   Variáveis necessárias:', 'yellow');
        log('   - NEXT_PUBLIC_EVOLUTION_API_URL', 'yellow');
        log('   - EVOLUTION_API_KEY', 'yellow');
        log('   - EVOLUTION_INSTANCE_NAME', 'yellow');
      }
      
      return;
    }

    log(`   ✅ Follow-up enviado com sucesso!`, 'green');

    // Resumo
    log('\n' + '='.repeat(50), 'green');
    log('✅ TESTE CONCLUÍDO COM SUCESSO!', 'green');
    log('='.repeat(50), 'green');
    log(`\n📱 Verifique o WhatsApp do número ${PHONE_NUMBER}`, 'yellow');
    log('   A mensagem deve ter sido enviada.', 'yellow');
    log(`\n📊 ID do Follow-up: ${followUpId}`, 'blue');
    log('   Você pode verificar o status no dashboard.', 'blue');

  } catch (error) {
    log(`\n❌ Erro durante o teste:`, 'red');
    log(`   ${error.message}`, 'red');
    
    if (error.code === 'ECONNREFUSED') {
      log('\n⚠️  Servidor não está rodando!', 'yellow');
      log('   Execute: npm run dev', 'yellow');
    }
  }

  rl.close();
}

// Executar teste
log('\n🚀 Iniciando teste do sistema de Follow-up...', 'blue');
log('⚠️  Certifique-se de que:', 'yellow');
log('   1. O servidor está rodando (npm run dev)', 'yellow');
log('   2. Você está logado no sistema', 'yellow');
log('   3. Evolution API está configurada', 'yellow');

rl.question('\nPressione ENTER para continuar ou Ctrl+C para cancelar...', () => {
  testFollowUp();
});

