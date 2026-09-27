import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://bgezpyfpouayqadqtycj.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_So5qnzgC-c3IdAxCmv7qog_gkIrWIuw';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

