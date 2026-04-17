import { createClient } from '@supabase/supabase-js';

// Configura en .env.local:
//   VITE_SUPABASE_URL=https://pnxxinbmlynujwcwvkaw.supabase.co
//   VITE_SUPABASE_ANON_KEY=ey...
//   VITE_DEFAULT_ACCOUNT_SLUG=enllacdigital
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabaseClient] Falten VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
      'La capa de Finances no funcionarà fins configurar-ho a .env.local.'
  );
}

export const supabase = createClient(SUPABASE_URL || 'https://invalid', SUPABASE_ANON_KEY || 'invalid', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Login amb magic link (email). Xavi introdueix el correu, rep enllaç, i cada
// instància del panel queda autenticada contra Supabase durant la sessió.
export async function signInWithEmail(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

// Account slug per defecte (útil per prefiltres en UI). Canvia via env var.
export const DEFAULT_ACCOUNT_SLUG = import.meta.env.VITE_DEFAULT_ACCOUNT_SLUG || 'enllacdigital';
