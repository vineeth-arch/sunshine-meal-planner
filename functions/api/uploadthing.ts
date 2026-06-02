import { createClient } from '@supabase/supabase-js'
import { createRouteHandler, createUploadthing, UploadThingError } from 'uploadthing/server'
import type { FileRouter } from 'uploadthing/server'

type Env = {
  UPLOADTHING_TOKEN?: string
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
  SUPABASE_URL?: string
  SUPABASE_ANON_KEY?: string
}

type PagesFunctionContext = {
  request: Request
  env: Env
  waitUntil(promise: Promise<unknown>): void
}

type ProfileRow = {
  role: string
  household_id: string | null
}

const f = createUploadthing()

function getSupabaseConfig(env: Env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new UploadThingError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Supabase upload auth is not configured.',
    })
  }

  return { url, anonKey }
}

function getBearerToken(request: Request) {
  const header = request.headers.get('authorization')
  const match = header?.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? ''
}

async function verifyUploadAccess(request: Request, env: Env) {
  const token = getBearerToken(request)
  if (!token) {
    throw new UploadThingError({ code: 'FORBIDDEN', message: 'Connect to edit.' })
  }

  const { url, anonKey } = getSupabaseConfig(env)
  const supabase = createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) {
    throw new UploadThingError({ code: 'FORBIDDEN', message: 'Connect to edit.' })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, household_id')
    .eq('id', userData.user.id)
    .maybeSingle<ProfileRow>()

  if (profileError || !profile?.household_id || !['admin', 'editor'].includes(profile.role)) {
    throw new UploadThingError({ code: 'FORBIDDEN', message: 'Connect to edit. This profile is read-only.' })
  }

  return {
    userId: userData.user.id,
    householdId: profile.household_id,
    role: profile.role,
  }
}

function createHouseholdFileRouter(env: Env) {
  return {
    imageUploader: f({ image: { maxFileSize: '4MB', maxFileCount: 1 } })
      .middleware(async ({ req }) => verifyUploadAccess(req, env))
      .onUploadComplete(async ({ file }) => ({ url: file.ufsUrl })),
  } satisfies FileRouter
}

export type HouseholdFileRouter = ReturnType<typeof createHouseholdFileRouter>

function uploadThingFetch(input: RequestInfo | URL, init?: RequestInit) {
  const nextInit = init ? { ...init } : undefined
  if (nextInit) {
    delete nextInit.cache
  }

  return fetch(input, nextInit)
}

export async function onRequest(context: PagesFunctionContext) {
  if (!context.env.UPLOADTHING_TOKEN) {
    return Response.json({ error: 'UPLOADTHING_TOKEN is not configured.' }, { status: 500 })
  }

  const handler = createRouteHandler({
    router: createHouseholdFileRouter(context.env),
    config: {
      token: context.env.UPLOADTHING_TOKEN,
      fetch: uploadThingFetch,
      handleDaemonPromise: (promise) => context.waitUntil(promise),
    },
  })

  return handler({ request: context.request })
}
