// Supabase client — kimlik doğrulama + veri.
// URL ve anon key .env dosyasından (EXPO_PUBLIC_* önekiyle) okunur.
// Değerler yoksa uygulama çökmesin diye guard var (isSupabaseConfigured).

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured =
  supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

// Konfigüre değilken de import edilebilsin diye placeholder değerlerle oluşturuyoruz.
// Gerçek çağrılar yalnızca isSupabaseConfigured true iken yapılmalı (auth context guard eder).
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
