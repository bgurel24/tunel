// Şifremi unuttum — e-postaya kod gönder, kodu + yeni şifreyi gir.
// Kod doğrulanınca Supabase oturum açar; (auth) düzeni kullanıcıyı ana akışa alır.
//
// Not: Supabase panelinde Authentication → Email Templates → "Reset Password"
// şablonunda {{ .Token }} geçmeli, yoksa e-postada kod değil sadece link gelir.

import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Field } from '@/components/Field';
import { GradientButton } from '@/components/GradientButton';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { fontSize, makeStyles, spacing, useThemeTick } from '@/theme';

export default function ForgotPasswordScreen() {
  useThemeTick();
  const t = useT();
  const { sendResetCode, resetWithCode } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState(params.email ?? '');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    setError(null);
    if (!email.trim()) return setError(t('auth.missingFields'));
    setLoading(true);
    const { error } = await sendResetCode(email);
    setLoading(false);
    if (error) return setError(error);
    setCodeSent(true);
  };

  const save = async () => {
    setError(null);
    if (!code.trim() || !password) return setError(t('auth.allFields'));
    if (password.length < 6) return setError(t('auth.passwordShort'));
    if (password !== repeat) return setError(t('auth.passwordMismatch'));
    setLoading(true);
    const { error } = await resetWithCode(email, code, password);
    setLoading(false);
    if (error) setError(error);
    // Başarılıysa oturum açıldı; (auth)/_layout ana sayfaya yönlendirir.
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.heading}>{t('auth.forgotTitle')}</Text>
            <Text style={styles.lead}>
              {codeSent ? t('auth.codeSent', { email: email.trim() }) : t('auth.forgotLead')}
            </Text>
          </View>

          <View style={styles.form}>
            <Field
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@mail.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="username"
              editable={!codeSent}
            />

            {codeSent && (
              <>
                <Field
                  label={t('auth.code')}
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
                  placeholder="123456"
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  maxLength={10}
                />
                <Field
                  label={t('auth.newPassword')}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t('auth.passwordHint')}
                  secureTextEntry
                  textContentType="newPassword"
                  autoComplete="new-password"
                  passwordRules="minlength: 6;"
                />
                <Field
                  label={t('auth.newPasswordRepeat')}
                  value={repeat}
                  onChangeText={setRepeat}
                  placeholder="••••••••"
                  secureTextEntry
                  textContentType="newPassword"
                  autoComplete="new-password"
                />
              </>
            )}

            {error && <Text style={styles.error}>{error}</Text>}

            <GradientButton
              label={codeSent ? t('auth.resetSave') : t('auth.sendCode')}
              onPress={codeSent ? save : send}
              loading={loading}
              style={{ marginTop: spacing.sm }}
            />

            {codeSent && (
              <Touchable onPress={send} haptic={false} style={styles.resend}>
                <Text style={styles.link}>{t('auth.resendCode')}</Text>
              </Touchable>
            )}
          </View>

          <View style={styles.footer}>
            <Link href="/login" style={styles.link}>
              {t('auth.backToLogin')}
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = makeStyles((colors) => ({
  content: { flexGrow: 1, justifyContent: 'center', gap: spacing.xl, paddingVertical: spacing.xxl },
  heading: { color: colors.text, fontSize: fontSize.xl, fontWeight: '500', textAlign: 'center' },
  lead: { color: colors.textDim, fontSize: fontSize.sm, lineHeight: 20, textAlign: 'center' },
  form: { gap: spacing.md },
  error: { color: colors.danger, fontSize: fontSize.sm, marginLeft: 2 },
  resend: { alignSelf: 'center', paddingVertical: spacing.xs },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  link: { color: colors.accent, fontSize: fontSize.sm, fontWeight: '500' },
}));
