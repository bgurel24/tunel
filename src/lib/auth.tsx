// Auth context — oturum durumu ve e-posta/şifre işlemleri.
// Supabase konfigüre değilse çağrılar anlamlı bir hata döner, uygulama çökmez.

import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { t } from '@/lib/i18n';
import { clearHiddenCache } from '@/lib/moderation';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type AuthResult = { error: string | null };

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (
    email: string,
    password: string,
    username: string,
    fullName: string
  ) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  /** Şifremi unuttum 1. adım — e-postaya tek kullanımlık kod gönderir. */
  sendResetCode: (email: string) => Promise<AuthResult>;
  /** Şifremi unuttum 2. adım — kodu doğrular, yeni şifreyi kaydeder (oturum açılır). */
  resetWithCode: (email: string, code: string, nextPassword: string) => Promise<AuthResult>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const NOT_CONFIGURED = () => t('err.notConfiguredLong');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      // Kullanıcı değişti — engel listesi önbelleği bir öncekine ait olmasın.
      clearHiddenCache();
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      configured: isSupabaseConfigured,
      signIn: async (email, password) => {
        if (!isSupabaseConfigured) return { error: NOT_CONFIGURED() };
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        return { error: error?.message ?? null };
      },
      signUp: async (email, password, username, fullName) => {
        if (!isSupabaseConfigured) return { error: NOT_CONFIGURED() };
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { username: username.trim(), full_name: fullName.trim() } },
        });
        if (error) return { error: error.message };
        // Supabase, e-posta zaten kayıtlıysa (enumeration koruması) hata vermez;
        // identities boş bir sahte kullanıcı döner. Bunu "zaten kayıtlı" olarak göster.
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          return { error: t('auth.alreadyRegistered') };
        }
        return { error: null };
      },
      signOut: async () => {
        if (!isSupabaseConfigured) return;
        await supabase.auth.signOut();
      },
      sendResetCode: async (email) => {
        if (!isSupabaseConfigured) return { error: NOT_CONFIGURED() };
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        return { error: error?.message ?? null };
      },
      resetWithCode: async (email, code, nextPassword) => {
        if (!isSupabaseConfigured) return { error: NOT_CONFIGURED() };
        // Kod doğrulanınca Supabase oturum açar; şifreyi hemen ardından güncelliyoruz.
        const { error: otpError } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: code.trim(),
          type: 'recovery',
        });
        if (otpError) return { error: t('auth.codeInvalid') };
        const { error } = await supabase.auth.updateUser({ password: nextPassword });
        return { error: error?.message ?? null };
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth AuthProvider içinde kullanılmalı');
  return ctx;
}
