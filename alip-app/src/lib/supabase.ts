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
export const supabaseServer: SupabaseClient = createClient(
    getRequiredEnvVar('SUPABASE_URL'),
    getRequiredEnvVar('SUPABASE_SERVICE_KEY')
);

// Client-side client (client components)
// Uses anon key — respects RLS
export const supabaseClient: SupabaseClient = createClient(
    getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')
);
