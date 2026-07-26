// Kayıt ekranı — kullanıcı adı + e-posta + şifre.

import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, } from 'react-native';

import { Field } from '@/components/Field';
import { GradientButton } from '@/components/GradientButton';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useAuth } from '@/lib/auth';
import { colors, fontSize, makeStyles, spacing, useThemeTick } from '@/theme';

export default function RegisterScreen() {
  useThemeTick();
  const { signUp } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setNotice(null);
    if (!username || !email || !password) {
      setError('Tüm alanlar gerekli.');
      return;
    }
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı.');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, username);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    // E-posta doğrulaması açıksa oturum hemen gelmez → kullanıcıyı bilgilendir.
    setNotice('Hesap oluşturuldu. E-posta doğrulaması gerekiyorsa gelen kutunu kontrol et.');
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logo}>
            <Logo size={120} />
          </View>

          <Text style={styles.heading}>Tünel'e katıl</Text>

          <View style={styles.form}>
            <Field
              label="Kullanıcı adı"
              value={username}
              onChangeText={setUsername}
              placeholder="kullanici_adi"
              autoCapitalize="none"
            />
            <Field
              label="E-posta"
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@mail.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Field
              label="Şifre"
              value={password}
              onChangeText={setPassword}
              placeholder="En az 6 karakter"
              secureTextEntry
            />

            {error && <Text style={styles.error}>{error}</Text>}
            {notice && <Text style={styles.notice}>{notice}</Text>}

            <GradientButton
              label="Kayıt ol"
              onPress={submit}
              loading={loading}
              style={{ marginTop: spacing.sm }}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Zaten hesabın var mı? </Text>
            <Link href="/login" style={styles.footerLink}>
              Giriş yap
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = makeStyles((colors) => ({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  logo: {
    alignItems: 'center',
  },
  heading: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '500',
    textAlign: 'center',
  },
  form: {
    gap: spacing.md,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
    marginLeft: 2,
  },
  notice: {
    color: colors.success,
    fontSize: fontSize.sm,
    marginLeft: 2,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    color: colors.textDim,
    fontSize: fontSize.sm,
  },
  footerLink: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
}));
