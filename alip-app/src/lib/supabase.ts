import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use untyped clients at MVP to avoid deep generic issues with supabase-js v2.
// The types in src/types/database.ts are used for application-level type safety instead.

// Lazy initialization - validate env vars only when client is first used
function getRequiredEnvVar(name: string): string {
    const value = process.env[name];
    if (!value || value.includes('your_') || value.includes('placeholder')) {
        throw new Error(`Missing or invalid environment variable: ${name}`);
    }
    return value;
}

// Server-side client (API routes, server components)
// Uses service role key — bypasses RLS
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('CRITICAL: Supabase server-side environment variables are missing!');
    console.error('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
    console.error('SUPABASE_SERVICE_KEY exists:', !!process.env.SUPABASE_SERVICE_KEY);
}

export const supabaseServer: SupabaseClient = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || ''
);

// Client-side client (client components)
// Uses anon key — respects RLS
export const supabaseClient: SupabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
);
