// Kayıt ekranı — ad soyad + kullanıcı adı + e-posta + şifre.

import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { useT } from '@/lib/i18n';
import { Field } from '@/components/Field';
import { GradientButton } from '@/components/GradientButton';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useAuth } from '@/lib/auth';
import { fontSize, makeStyles, spacing, useThemeTick } from '@/theme';

export default function RegisterScreen() {
  useThemeTick();
  const t = useT();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setNotice(null);
    if (!fullName.trim() || !username || !email || !password) {
      setError(t('auth.allFields'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.passwordShort'));
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, username, fullName);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    // E-posta doğrulaması açıksa oturum hemen gelmez → kullanıcıyı bilgilendir.
    setNotice(t('auth.created'));
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

          <Text style={styles.heading}>{t('auth.join')}</Text>

          <View style={styles.form}>
            {/* Takım ekranlarında bu ad görünür — takma ad değil, gerçek ad. */}
            <Field
              label={t('auth.fullName')}
              value={fullName}
              onChangeText={setFullName}
              placeholder={t('auth.fullNamePlaceholder')}
              autoCapitalize="words"
              autoComplete="name"
            />
            <Field
              label={t('auth.username')}
              value={username}
              onChangeText={setUsername}
              placeholder={t('auth.usernamePlaceholder')}
              autoCapitalize="none"
            />
            <Field
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@mail.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="username"
            />
            <Field
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.passwordHint')}
              secureTextEntry
              textContentType="newPassword"
              autoComplete="new-password"
              passwordRules="minlength: 6;"
            />

            {error && <Text style={styles.error}>{error}</Text>}
            {notice && <Text style={styles.notice}>{notice}</Text>}

            <GradientButton
              label={t('auth.signUp')}
              onPress={submit}
              loading={loading}
              style={{ marginTop: spacing.sm }}
            />
          </View>

          {/* Mağaza şartı: kullanıcı üretimli içerik uygulamalarında şartların
              kayıt anında görünmesi gerekiyor. */}
          <View style={styles.legal}>
            <Text style={styles.legalNote}>{t('auth.legalNote')}</Text>
            <View style={styles.legalLinks}>
              <Link href={{ pathname: '/yasal', params: { doc: 'terms' } }} style={styles.legalLink}>
                {t('legal.terms')}
              </Link>
              <Text style={styles.legalNote}>·</Text>
              <Link href={{ pathname: '/yasal', params: { doc: 'privacy' } }} style={styles.legalLink}>
                {t('legal.privacy')}
              </Link>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.haveAccount')}</Text>
            <Link href="/login" style={styles.footerLink}>
              {t('auth.signIn')}
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
  legal: {
    alignItems: 'center',
    gap: 4,
  },
  legalNote: {
    color: colors.textFaint,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legalLink: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    fontWeight: '500',
    textDecorationLine: 'underline',
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
