import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Make sure your .env file contains VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  throw new Error('Missing Supabase environment variables. Check your .env file in the buzz-frontend directory.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)