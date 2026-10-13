import { createClient } from '@supabase/supabase-js'
import { createServerClient as createSSRClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export function createServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

type AuthSuccess = {
  user: { id: string; user_metadata?: { name?: string } & Record<string, unknown> }
  errorResponse: null
}
type AuthFailure = { user: null; errorResponse: NextResponse }

export async function requireUser(request: NextRequest): Promise<AuthSuccess | AuthFailure> {
  const supabase = createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {},
      },
    }
  )
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { user, errorResponse: null }
}
