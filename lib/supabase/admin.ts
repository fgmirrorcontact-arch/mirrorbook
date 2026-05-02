import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

let adminClient: ReturnType<typeof createClient<Database>> | null = null

/**
 * Service role client — bypasses RLS.
 * Only use in server-side code: API routes, webhooks, server actions.
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the client.
 */
export function getSupabaseAdminClient() {
  if (adminClient) return adminClient

  adminClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  return adminClient
}
