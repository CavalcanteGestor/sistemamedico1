# 🚀 Comandos Rápidos para Executar Análise de CPU

## ✅ Scripts já copiados para /root/

Os scripts foram copiados para `/root/`, então execute assim:

### Opção 1: Executar do diretório /root

```bash
cd /root
./analise-cpu-simples.sh
```

### Opção 2: Executar com caminho completo

```bash
/root/analise-cpu-simples.sh
```

### Opção 3: Versão completa

```bash
/root/analise-cpu.sh
```

## 🔍 Verificar se os scripts existem

```bash
ls -la /root/analise-cpu*.sh
```

Se não existirem, copie novamente:

```bash
cd /var/www
# Se o diretório temp-scripts não existir, clone novamente
git clone https://github.com/CavalcanteGestor/sistemamedico1.git temp-scripts
cp temp-scripts/scripts/analise-cpu*.sh /root/
chmod +x /root/analise-cpu*.sh
```

## 📋 Comando Completo (Copie e Cole)

```bash
cd /root && /root/analise-cpu-simples.sh
```

Ou se preferir a versão completa:

```bash
cd /root && /root/analise-cpu.sh
```

## 💡 Dica

Se ainda der erro, verifique as permissões:

```bash
chmod +x /root/analise-cpu*.sh
ls -la /root/analise-cpu*.sh
```

