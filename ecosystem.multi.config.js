/**
 * Configuração PM2 para Múltiplos Sistemas
 * Use este arquivo quando tiver n8n e Lumi rodando na mesma VPS
 */

module.exports = {
  apps: [
    {
      name: 'lumi-sistema-medico',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/var/www/sistema-medico', // Ajuste o caminho
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G', // Limitar memória a 1GB
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/lumi-error.log',
      out_file: '/var/log/pm2/lumi-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      // Limitar CPU (opcional, requer PM2 Plus)
      // cpu: 50, // Máximo 50% de 1 core
    },
    {
      name: 'n8n',
      script: 'n8n',
      cwd: '/root/.n8n', // Ajuste o caminho do n8n
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G', // Limitar memória do n8n
      env: {
        NODE_ENV: 'production',
        N8N_PORT: 5678,
        N8N_HOST: '0.0.0.0',
        // Otimizações do n8n
        N8N_METRICS: 'false', // Desabilitar métricas se não usar
        N8N_LOG_LEVEL: 'info', // Reduzir logs
      },
      error_file: '/var/log/pm2/n8n-error.log',
      out_file: '/var/log/pm2/n8n-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
}

