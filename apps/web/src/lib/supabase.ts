import { createBrowserClient } from '@supabase/ssr'

// createBrowserClient stores the session in cookies instead of localStorage,
// which survives PWA install/reopen and avoids the localStorage isolation issue
// on iOS where the homescreen context has a separate storage origin.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
