module.exports = {
  apps: [{
    name: 'sistema-medico',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: process.cwd(),
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    // Aguardar 10 segundos antes de considerar que o app iniciou
    wait_ready: true,
    listen_timeout: 10000,
    // Reiniciar se usar mais de 1GB de RAM
    max_memory_restart: '1G'
  }]
}

