# Solução: Erro "upstream sent too big header" no Nginx

## 🔴 Problema

O erro `upstream sent too big header while reading response header from upstream` ocorre quando o Next.js envia headers HTTP muito grandes para o Nginx, que tem um limite padrão de 4KB para buffers de proxy.

### Causas Comuns:
- Cookies grandes (sessões, tokens JWT)
- Headers de segurança do Next.js (CSP, HSTS, etc.)
- Múltiplos headers customizados
- Dados de sessão armazenados em cookies

### Sintomas:
- Erro 502 Bad Gateway
- Logs do Nginx mostrando "upstream sent too big header"
- Aplicação funciona localmente mas não através do Nginx

## ✅ Solução

### Opção 1: Usar o Script Automático (Recomendado)

```bash
# No servidor VPS
cd /var/www/sistema-medico
git pull origin main
chmod +x CORRIGIR_HEADERS_GRANDES_NGINX.sh
sudo ./CORRIGIR_HEADERS_GRANDES_NGINX.sh
```

### Opção 2: Correção Manual

1. **Encontrar o arquivo de configuração do Nginx:**
```bash
sudo grep -r "mercuri.ialumi.cloud" /etc/nginx/sites-available/
```

2. **Editar o arquivo encontrado:**
```bash
sudo nano /etc/nginx/sites-available/mercuri.ialumi.cloud
```

3. **Adicionar dentro do bloco `location /` ou `server {`:**
```nginx
# Buffers aumentados para headers grandes do Next.js
proxy_buffer_size 16k;
proxy_buffers 8 16k;
proxy_busy_buffers_size 32k;
fastcgi_buffers 16 16k;
fastcgi_buffer_size 32k;
```

4. **Exemplo completo de configuração:**
```nginx
server {
    listen 443 ssl http2;
    server_name mercuri.ialumi.cloud;

    # ... outras configurações SSL ...

    location / {
        proxy_pass http://[::1]:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Buffers aumentados para headers grandes do Next.js
        proxy_buffer_size 16k;
        proxy_buffers 8 16k;
        proxy_busy_buffers_size 32k;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    client_max_body_size 50M;
}
```

5. **Testar e recarregar:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 🔧 Configurações Avançadas

Se o problema persistir mesmo com buffers aumentados, você pode aumentar ainda mais:

```nginx
# Configuração mais agressiva (se necessário)
proxy_buffer_size 32k;
proxy_buffers 16 32k;
proxy_busy_buffers_size 64k;
```

## 📊 Verificação

Após aplicar a correção:

1. **Verificar logs do Nginx:**
```bash
sudo tail -f /var/log/nginx/error.log
```

2. **Testar a aplicação:**
```bash
curl -I https://mercuri.ialumi.cloud
```

3. **Verificar se o erro desapareceu:**
```bash
sudo grep "too big header" /var/log/nginx/error.log | tail -5
```

## 🎯 Valores Recomendados

| Configuração | Valor Padrão | Valor Recomendado | Valor Máximo |
|-------------|--------------|-------------------|--------------|
| `proxy_buffer_size` | 4k ou 8k | 16k | 32k |
| `proxy_buffers` | 8 4k ou 8 8k | 8 16k | 16 32k |
| `proxy_busy_buffers_size` | 8k ou 16k | 32k | 64k |

## ⚠️ Notas Importantes

1. **Performance:** Buffers maiores consomem mais memória, mas são necessários para aplicações Next.js modernas.

2. **Limite do Sistema:** O valor máximo prático depende da RAM disponível. Para servidores com 1GB+ de RAM, os valores recomendados são seguros.

3. **IPv6:** Se você estiver usando `[::1]:3000` (IPv6), certifique-se de que o Nginx está configurado corretamente para IPv6.

4. **Backup:** Sempre faça backup antes de modificar configurações do Nginx:
```bash
sudo cp /etc/nginx/sites-available/mercuri.ialumi.cloud /etc/nginx/sites-available/mercuri.ialumi.cloud.backup
```

## 🐛 Troubleshooting

### Problema: Erro persiste após aplicar correção

**Solução:**
1. Verifique se a configuração foi aplicada corretamente:
```bash
sudo nginx -T | grep proxy_buffer
```

2. Aumente os valores conforme necessário (veja "Configurações Avançadas")

3. Verifique se há múltiplos arquivos de configuração conflitantes:
```bash
sudo grep -r "mercuri.ialumi.cloud" /etc/nginx/
```

### Problema: Nginx não recarrega

**Solução:**
```bash
# Verificar sintaxe
sudo nginx -t

# Se houver erro, verificar logs
sudo journalctl -u nginx -n 50

# Reiniciar ao invés de recarregar
sudo systemctl restart nginx
```

## 📚 Referências

- [Nginx Proxy Buffer Settings](http://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_buffer_size)
- [Next.js Headers Configuration](https://nextjs.org/docs/app/api-reference/next-config-js/headers)
- [Nginx Troubleshooting](https://www.nginx.com/resources/wiki/start/topics/tutorials/troubleshooting/)

