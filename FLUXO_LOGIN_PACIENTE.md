# 📋 Fluxo de Login do Paciente - Guia Completo

## 📧 **Qual Email é Usado?**

O email usado para login do paciente é **o mesmo email cadastrado no formulário de criação do paciente** no sistema.

### Como funciona:

1. **Cadastro do Paciente:**
   - Quando um admin/recepcionista cadastra um novo paciente, ele preenche o campo **"Email"** no formulário
   - Este email é usado para criar a conta de usuário no sistema
   - O email é salvo na tabela `patients` e também na tabela `auth.users` do Supabase

2. **Credenciais Iniciais:**
   - **Email:** O email cadastrado no formulário
   - **Senha padrão:** `paciente123` (temporária, deve ser alterada no primeiro acesso)

---

## 🔐 **Como o Paciente Faz Login Depois?**

Após criar a senha pela primeira vez, o paciente pode fazer login de **duas formas**:

### **Opção 1: Login Normal (Recomendado para Acessos Futuros)**

1. Acesse: `https://seu-dominio.com/login`
2. Digite:
   - **Email:** O email que foi cadastrado quando o paciente foi criado
   - **Senha:** A senha que o paciente criou no primeiro acesso
3. Clique em "Entrar"
4. O sistema redireciona automaticamente para `/portal/dashboard`

### **Opção 2: Link com Token (Primeiro Acesso ou Acesso Especial)**

1. Acesse o link único gerado: `https://seu-dominio.com/login-paciente/[token]`
2. Este link é usado principalmente para:
   - Primeiro acesso (criar senha)
   - Acesso rápido sem precisar digitar email/senha
   - Links compartilhados via WhatsApp/Email

---

## 📝 **Fluxo Completo**

### **1. Cadastro do Paciente (Admin/Recepcionista)**

```
Admin/Recepcionista cadastra paciente:
├── Nome: Francisco Cavalcante
├── Email: francisco@exemplo.com  ← Este será o email de login
├── CPF: 123.456.789-00
├── Telefone: (11) 99999-9999
└── ... outros dados

Sistema cria automaticamente:
├── Conta de usuário no Supabase Auth
├── Email: francisco@exemplo.com
├── Senha padrão: paciente123
└── Link único: /login-paciente/[token]
```

### **2. Primeiro Acesso do Paciente**

```
Paciente recebe link único:
└── Acessa: /login-paciente/[token]

Sistema:
├── Valida o token
├── Verifica se paciente tem user_id
├── Se não tiver, cria automaticamente
└── Mostra tela de criação de senha

Paciente:
├── Define nova senha (ex: MinhaSenha123!)
├── Confirma senha
└── Clica em "Criar Senha e Entrar"

Sistema:
├── Faz login com senha padrão
├── Atualiza para nova senha
├── Cria sessão
└── Redireciona para /portal/dashboard
```

### **3. Acessos Futuros**

```
Paciente acessa: /login

Digita:
├── Email: francisco@exemplo.com
└── Senha: MinhaSenha123!

Sistema:
├── Valida credenciais
├── Cria sessão
└── Redireciona para /portal/dashboard
```

---

## 🔍 **Onde Ver o Email do Paciente?**

### **No Sistema (Admin/Recepcionista):**

1. Acesse: `/dashboard/pacientes`
2. Clique no paciente desejado
3. O email está visível nos dados do paciente

### **Ao Criar Novo Paciente:**

Quando um paciente é criado, o sistema mostra:
```
✅ Paciente criado com sucesso!

Email/Login: francisco@exemplo.com
Senha padrão: paciente123
⚠️ O paciente precisará alterar a senha no primeiro login.
```

---

## ⚠️ **Importante**

1. **Email é Obrigatório:**
   - O paciente **DEVE** ter um email cadastrado para fazer login
   - Sem email, não é possível criar a conta de usuário

2. **Senha Padrão:**
   - A senha padrão (`paciente123`) é temporária
   - O paciente **DEVE** alterar no primeiro acesso
   - Após alterar, a senha padrão não funciona mais

3. **Link com Token:**
   - O link com token tem validade (geralmente 1 ano)
   - Pode ser regenerado a qualquer momento
   - Útil para primeiro acesso ou acesso rápido

4. **Login Normal:**
   - Após criar a senha, o paciente pode usar sempre o login normal
   - Mais prático para acessos frequentes
   - Não precisa do link com token

---

## 🆘 **Problemas Comuns**

### **"Email não encontrado"**
- Verifique se o email foi cadastrado corretamente
- Confirme que o paciente tem `user_id` na tabela `patients`

### **"Senha incorreta"**
- Se é primeiro acesso, use o link com token
- Se já criou senha, use a senha que criou (não a padrão)

### **"Link expirado"**
- Gere um novo link de login para o paciente
- Acesse: `/dashboard/pacientes` → Clique no paciente → "Gerar Link de Login"

---

## 📱 **Exemplo Prático**

**Cenário:** Paciente "Maria Silva" foi cadastrada com email `maria.silva@gmail.com`

**Primeiro Acesso:**
1. Recebe link: `https://clinica.com/login-paciente/abc123...`
2. Acessa o link
3. Define senha: `MinhaSenhaSegura123!`
4. É redirecionada para o portal

**Próximos Acessos:**
1. Acessa: `https://clinica.com/login`
2. Email: `maria.silva@gmail.com`
3. Senha: `MinhaSenhaSegura123!`
4. Entra no portal

---

**Última atualização:** Dezembro 2025

