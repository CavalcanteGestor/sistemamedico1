import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables')
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rotas públicas (páginas)
  const publicRoutes = ['/login', '/register', '/forgot-password', '/login-paciente', '/api/auth/create-user-for-patient']
  const isPublicPageRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )
  
  // Rotas da API - sempre permitir e deixar a própria API decidir autenticação
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')

  // Se não está autenticado e tentando acessar rota protegida (mas não API)
  if (!user && !isPublicPageRoute && !isApiRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Se está autenticado e tentando acessar rota pública (apenas páginas, não APIs)
  if (user && isPublicPageRoute && !isApiRoute) {
    // Verificar role do usuário para redirecionar corretamente
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = profile?.role || 'paciente'

    if (role === 'paciente') {
      return NextResponse.redirect(new URL('/portal/dashboard', request.url))
    } else if (role === 'medico') {
      return NextResponse.redirect(new URL('/dashboard/medico', request.url))
    } else if (role === 'admin') {
      return NextResponse.redirect(new URL('/dashboard/admin', request.url))
    } else if (role === 'recepcionista') {
      return NextResponse.redirect(new URL('/dashboard/recepcionista', request.url))
    } else if (role === 'desenvolvedor') {
      return NextResponse.redirect(new URL('/dashboard/desenvolvedor', request.url))
    } else {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }
  
  // Para rotas da API, sempre permitir passar - a própria API decide autenticação

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

