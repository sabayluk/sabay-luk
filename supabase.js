import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bimrytgbvglhumkybjop.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpbXJ5dGdidmdsaHVta3liam9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNTU4MzUsImV4cCI6MjEwNTczMTgzNX0.zJ1xfED_KaFe5IGH90VH34jbSIo12QSB0pJxmEJIftY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const normalizeEnableTax = (val) => {
  if (val === true || val === 1 || val === '1') return true;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return s === 'true' || s === 'yes' || s === 'on' || s === 'enable' || s === 'enabled';
  }
  return false;
};
