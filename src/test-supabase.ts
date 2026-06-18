import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function testConnection() {
  try {
    const { data, error } = await supabase.from('provinces').select('*');
    if (error) throw error;
    console.log('✅ Connexion réussie!', data);
  } catch (error) {
    console.error('❌ Erreur de connexion:', error);
  }
}
