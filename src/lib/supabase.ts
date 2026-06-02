import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase: SupabaseClient | null =
  url && anon ? createClient(url, anon) : null

export const isCloudConfigured = () => supabase !== null

export function getCloudConfigError(): string | null {
  const missingKeys = [
    ['VITE_SUPABASE_URL', url],
    ['VITE_SUPABASE_ANON_KEY', anon],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (!missingKeys.length) return null
  return `Cloud sync not configured. Add the missing Supabase Vite variables: ${missingKeys.join(', ')}.`
}

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(getCloudConfigError() ?? 'Cloud sync not configured.')
  }

  return supabase
}
