import { createClient } from '@supabase/supabase-js'

// Server-side client — uses service role key, bypasses RLS
// Use in: API routes, server components, services
export const supabaseServer = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Client-side client — uses anon key, respects RLS
// Use in: client components only
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
