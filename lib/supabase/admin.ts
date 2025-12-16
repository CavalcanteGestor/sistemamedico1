import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase Admin (usando service_role key)
 * ATENÇÃO: Este cliente tem privilégios administrativos.
 * Use APENAS em server-side (API routes, server components).
 * NUNCA exponha a service_role key no client-side!
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase admin environment variables. Please check your .env.local file.\n' +
      `URL: ${supabaseUrl ? 'OK' : 'MISSING'}\n` +
      `SERVICE_ROLE_KEY: ${supabaseServiceKey ? 'OK' : 'MISSING'}`
    )
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

