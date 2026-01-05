# 📊 Como Usar os Scripts de Análise de CPU

## 🎯 Objetivo

Estes scripts geram relatórios formatados que você pode copiar/colar ou fazer print para eu analisar o que está consumindo CPU na sua VPS.

## 📋 Scripts Disponíveis

### 1. `analise-cpu.sh` - Análise Completa
Relatório detalhado com todas as informações.

### 2. `analise-cpu-simples.sh` - Análise Rápida
Versão compacta para análise rápida.

## 🚀 Como Usar

### Passo 1: Conectar ao VPS

```bash
ssh root@31.97.242.100
```

### Passo 2: Baixar os Scripts

```bash
# Se ainda não tiver o repositório
cd /var/www
git clone https://github.com/CavalcanteGestor/sistemamedico1.git temp-scripts
cp temp-scripts/scripts/analise-cpu*.sh /root/
chmod +x /root/analise-cpu*.sh
```

Ou se já tiver o repositório:

```bash
cd /var/www/sistema-medico  # ou onde está o projeto
chmod +x scripts/analise-cpu*.sh
```

### Passo 3: Executar o Script

**Opção A - Análise Completa:**
```bash
./scripts/analise-cpu.sh
# ou se copiou para /root:
/root/analise-cpu.sh
```

**Opção B - Análise Rápida:**
```bash
./scripts/analise-cpu-simples.sh
# ou se copiou para /root:
/root/analise-cpu-simples.sh
```

### Passo 4: Copiar o Resultado

1. **Selecione todo o texto** do terminal
2. **Copie** (Ctrl+Shift+C ou botão direito > Copiar)
3. **Cole aqui** na conversa para eu analisar

Ou:

1. **Faça print** da tela (Print Screen)
2. **Envie a imagem** aqui

## 📸 O que o Script Mostra

### Análise Completa (`analise-cpu.sh`):

1. ✅ **Uso Geral de CPU** - Percentual total e status
2. ✅ **Top 15 Processos por CPU** - Quais processos estão consumindo mais
3. ✅ **Processos Node.js Detalhados** - Todos os processos Node/n8n/next
4. ✅ **Status PM2** - Status de todos os processos gerenciados pelo PM2
5. ✅ **Uso de Memória** - RAM total, usada, disponível
6. ✅ **Top 10 Processos por Memória** - Processos consumindo mais RAM
7. ✅ **Load Average** - Carga média do sistema
8. ✅ **Portas em Uso** - Portas Node.js ativas
9. ✅ **Recomendações** - Sugestões baseadas nos dados

### Análise Rápida (`analise-cpu-simples.sh`):

1. ✅ **CPU Usage** - Percentual com status visual
2. ✅ **Top 10 Processos** - Processos consumindo mais CPU
3. ✅ **Processos Node.js** - Lista de processos Node/n8n/next
4. ✅ **Status PM2** - Lista de processos PM2
5. ✅ **Memória** - Resumo de uso de RAM

## 🔍 Exemplo de Uso

```bash
# No VPS
cd /var/www/sistema-medico
chmod +x scripts/analise-cpu-simples.sh
./scripts/analise-cpu-simples.sh
```

**Saída esperada:**
```
═══════════════════════════════════════════════════════════════
🔍 ANÁLISE RÁPIDA DE CPU - 05/01/2025 16:45:00
═══════════════════════════════════════════════════════════════

🔴 CPU: 99.2% (CRÍTICO!)

TOP 10 PROCESSOS POR CPU:
─────────────────────────────────────────────────────────────
PID      CPU%     MEM%    COMANDO
─────────────────────────────────────────────────────────────
12345    85.3%    12.4%   /usr/bin/node /root/.n8n/node_modules/n8n/bin/n8n
...
```

## 💡 Dicas

1. **Execute quando CPU estiver alta** para identificar o problema
2. **Compare antes e depois** de reiniciar serviços
3. **Execute periodicamente** para monitorar tendências
4. **Use a versão simples** para análises rápidas
5. **Use a versão completa** quando precisar de detalhes

## 🆘 Troubleshooting

### Script não executa:
```bash
chmod +x scripts/analise-cpu.sh
```

### Erro "bc: command not found":
```bash
apt install bc -y
```

### Erro "jq: command not found" (apenas na versão completa):
```bash
apt install jq -y
# Ou ignore - o script funciona sem jq
```

## 📝 Próximos Passos

Após executar e me enviar o resultado:

1. ✅ Vou analisar quais processos estão consumindo CPU
2. ✅ Vou identificar se há processos órfãos
3. ✅ Vou sugerir ações específicas para resolver
4. ✅ Vou ajudar a configurar limites de recursos se necessário

---

**Execute o script e me envie o resultado!** 🚀

