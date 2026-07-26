// Giriş ekranı — e-posta + şifre.

import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, } from 'react-native';

import { useT } from '@/lib/i18n';
import { Field } from '@/components/Field';
import { GradientButton } from '@/components/GradientButton';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useAuth } from '@/lib/auth';
import { colors, fontSize, makeStyles, spacing, useThemeTick } from '@/theme';

export default function LoginScreen() {
  useThemeTick();
  const t = useT();
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email || !password) {
      setError(t('auth.missingFields'));
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    router.replace('/');
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
            <Logo size={140} />
          </View>

          <Text style={styles.heading}>{t('auth.welcomeBack')}</Text>

          <View style={styles.form}>
            <Field
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@mail.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Field
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <GradientButton
              label={t('auth.signIn')}
              onPress={submit}
              loading={loading}
              style={{ marginTop: spacing.sm }}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.noAccount')}</Text>
            <Link href="/register" style={styles.footerLink}>
              {t('auth.signUp')}
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
