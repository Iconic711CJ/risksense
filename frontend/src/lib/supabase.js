import { createClient } from '@supabase/supabase-js'

// Try to load from environment variables first (if user sets them in Vite)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
