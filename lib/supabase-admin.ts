import { createClient } from "@supabase/supabase-js";

// Somente server-side: ignora RLS. Nunca importar em componentes "use client".
export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
