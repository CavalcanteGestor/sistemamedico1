import { type EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'
  
  // Verificar se há erro na URL (vindo do Supabase quando token expira)
  const errorParam = requestUrl.searchParams.get('error')
  const errorCode = requestUrl.searchParams.get('error_code')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Log mínimo apenas para erros críticos

  // Se houver erro na URL (token expirado, etc), redirecionar para página de erro
  if (errorParam || errorCode) {
    if (!token_hash) {
      // Traduzir mensagens de erro do Supabase para português
      let errorMessage = errorDescription || 'Link inválido ou expirado'
      
      if (errorDescription) {
        // Traduções comuns
        if (errorDescription.includes('invalid') || errorDescription.includes('expired')) {
          errorMessage = 'Link inválido ou expirado. Solicite um novo link de recuperação.'
        } else if (errorDescription.includes('redirect')) {
          errorMessage = 'URL de redirecionamento não permitida. Verifique as configurações do Supabase.'
        }
      }
      
      if (type === 'recovery') {
        redirect(`/forgot-password?error=expired&message=${encodeURIComponent(errorMessage)}`)
      } else {
        redirect(`/login?error=${errorCode || 'invalid_token'}&message=${encodeURIComponent(errorMessage)}`)
      }
      return
    }
  }

  if (token_hash && type) {
    const supabase = await createClient()

    const { error, data } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      // Se for recuperação de senha, redirecionar para página de redefinição
      if (type === 'recovery') {
        // Usar o parâmetro 'next' se fornecido, senão usar '/reset-password' como padrão
        const resetPath = next !== '/dashboard' ? next : '/reset-password'
        redirect(resetPath)
        return
      }

      // Garantir que o perfil existe após confirmação
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()

        if (!profile) {
          // Criar perfil se não existir
          await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email!,
              name: user.user_metadata?.name || 'Usuário',
              role: user.user_metadata?.role || 'paciente',
            })
        }
      }

      redirect(next)
      return
    } else {
      // Se houver erro ao verificar OTP, redirecionar com mensagem de erro
      if (type === 'recovery') {
        // Traduzir mensagens de erro para português
        let errorMessage = error.message
        
        if (error.message.includes('expired')) {
          errorMessage = 'Link expirado. Solicite um novo link de recuperação.'
        } else if (error.message.includes('invalid')) {
          errorMessage = 'Link inválido ou expirado. Verifique se está usando o link correto do email.'
        } else if (error.message.includes('redirect') || error.message.includes('redirect_to')) {
          errorMessage = 'URL de redirecionamento não permitida. Verifique se localhost:3000 está configurado no Supabase.'
        }
        
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          redirect(`/forgot-password?error=expired&message=${encodeURIComponent(errorMessage)}`)
        } else {
          redirect(`/forgot-password?error=invalid&message=${encodeURIComponent(errorMessage)}`)
        }
      } else {
        redirect(`/login?error=invalid_token&message=${encodeURIComponent(error.message)}`)
      }
      return
    }
  }

  // Se não houver token ou type, redirecionar para login
  redirect('/login?error=invalid_token')
}

