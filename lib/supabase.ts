import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Cliente de DADOS — sempre usa a anon key, sem sessão.
 * Garante que todas as queries se comportem igual antes e após o login,
 * independente do estado de autenticação do usuário.
 */
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})

/**
 * Cliente de AUTH — usado exclusivamente para login e logout.
 * Gerencia sessão normalmente (localStorage).
 */
export const supabaseAuth = createClient(url, anonKey)
