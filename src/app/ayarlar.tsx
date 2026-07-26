// Ayarlar — görünüm (tema + vurgu rengi), dil, antrenman, akış, bildirimler,
// his (titreşim/kutlama), hesap ve uygulama.
//
// Tercihler src/lib/prefs.ts'te; değişiklik anında uygulanır ve kaydedilir.

import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { Touchable } from '@/components/Touchable';
import { deleteMyAccount, updatePassword, updateUsername } from '@/lib/account';
import { useAuth } from '@/lib/auth';
import { Haptics } from '@/lib/haptics';
import { useT, type TranslationKey } from '@/lib/i18n';
import { resetPrefs, setPref, usePrefs } from '@/lib/prefs';
import {
  ACCENTS,
  ACCENT_ORDER,
  colors,
  font,
  fontSize,
  gradientEnd,
  gradientStart,
  makeStyles,
  radius,
  shadow,
  spacing,
  useThemeTick,
  type AccentId,
} from '@/theme';

const FEEDBACK_EMAIL = 'burakgurel81@gmail.com';
const WEEKLY_GOALS = [2, 3, 4, 5, 6, 7];

export default function AyarlarScreen() {
  useThemeTick();
  const t = useT();
  const prefs = usePrefs();
  const router = useRouter();
  const { toast, confirm } = useToast();
  const { session, signOut, configured } = useAuth();

  const [editing, setEditing] = useState<'username' | 'password' | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const username = (session?.user?.user_metadata?.username as string | undefined) ?? '—';
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const openEditor = (which: 'username' | 'password') => {
    if (editing === which) {
      setEditing(null);
      return;
    }
    setDraft(which === 'username' ? (username === '—' ? '' : username) : '');
    setEditing(which);
  };

  const saveUsername = async () => {
    const name = draft.trim();
    if (name.length < 3) return toast(t('settings.usernameShort'), 'error');
    setBusy(true);
    const { error, taken } = await updateUsername(name);
    setBusy(false);
    if (error) return toast(taken ? t('settings.usernameTaken') : error, 'error');
    setEditing(null);
    toast(t('settings.usernameSaved'));
  };

  const savePassword = async () => {
    if (draft.length < 6) return toast(t('settings.passwordShort'), 'error');
    setBusy(true);
    const { error } = await updatePassword(draft);
    setBusy(false);
    if (error) return toast(error, 'error');
    setEditing(null);
    setDraft('');
    toast(t('settings.passwordSaved'));
  };

  const askSignOut = async () => {
    const ok = await confirm({
      title: t('settings.signOutTitle'),
      message: t('settings.signOutMessage'),
      confirmLabel: t('settings.signOut'),
      icon: 'log-out-outline',
    });
    if (ok) signOut();
  };

  const askDelete = async () => {
    const ok = await confirm({
      title: t('settings.deleteTitle'),
      message: t('settings.deleteMessage'),
      confirmLabel: t('settings.deleteAccount'),
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    const { error } = await deleteMyAccount();
    setBusy(false);
    if (error) return toast(error, 'error');
    toast(t('settings.deleted'), 'info');
  };

  const askReset = async () => {
    const ok = await confirm({
      title: t('settings.resetTitle'),
      message: t('settings.resetMessage'),
      confirmLabel: t('settings.reset'),
      icon: 'refresh-outline',
    });
    if (!ok) return;
    resetPrefs();
    toast(t('settings.resetDone'), 'info');
  };

  const clearCache = async () => {
    await Promise.all([Image.clearDiskCache(), Image.clearMemoryCache()]).catch(() => {});
    toast(t('settings.cacheCleared'), 'info');
  };

  const invite = () => {
    Share.share({ message: t('settings.inviteText') }).catch(() => {});
  };

  const sendFeedback = () => {
    const subject = encodeURIComponent(t('settings.contactSubject'));
    Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${subject}`).catch(() => {});
  };

  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.header}>
        <Touchable style={styles.back} onPress={() => router.back()} scaleTo={0.9}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Touchable>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <View style={styles.back} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Görünüm */}
        <Section title={t('settings.appearance')} delay={0}>
          <Block icon="contrast-outline" title={t('settings.theme')}>
            <Segmented
              value={prefs.themeMode}
              onChange={(v) => setPref('themeMode', v)}
              options={[
                { key: 'system' as const, label: t('settings.theme.system') },
                { key: 'light' as const, label: t('settings.theme.light') },
                { key: 'dark' as const, label: t('settings.theme.dark') },
              ]}
            />
          </Block>

          <Divider />

          <Block
            icon="color-palette-outline"
            title={t('settings.accent')}
            subtitle={t('settings.accentHint')}
          >
            <View style={styles.accentRow}>
              {ACCENT_ORDER.map((id) => (
                <AccentDot
                  key={id}
                  id={id}
                  active={prefs.accent === id}
                  label={t(`accent.${id}` as TranslationKey)}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPref('accent', id);
                  }}
                />
              ))}
            </View>
          </Block>
        </Section>

        {/* Dil */}
        <Section title={t('settings.language')} delay={40}>
          <Block
            icon="language-outline"
            title={t('settings.language')}
            subtitle={t('settings.languageHint')}
          >
            <Segmented
              value={prefs.lang}
              onChange={(v) => setPref('lang', v)}
              options={[
                { key: 'tr' as const, label: 'Türkçe' },
                { key: 'en' as const, label: 'English' },
              ]}
            />
          </Block>
        </Section>

        {/* Antrenman */}
        <Section title={t('settings.training')} delay={80}>
          <Block
            icon="barbell-outline"
            title={t('settings.units')}
            subtitle={t('settings.unitsHint')}
          >
            <Segmented
              value={prefs.units}
              onChange={(v) => setPref('units', v)}
              options={[
                { key: 'kg' as const, label: 'kg' },
                { key: 'lb' as const, label: 'lb' },
              ]}
            />
          </Block>

          <Divider />

          <Block
            icon="calendar-outline"
            title={t('settings.weeklyGoal')}
            subtitle={t('settings.weeklyGoalHint')}
          >
            <View style={styles.chips}>
              {WEEKLY_GOALS.map((n) => {
                const active = prefs.weeklyGoal === n;
                return (
                  <Touchable
                    key={n}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setPref('weeklyGoal', n)}
                    scaleTo={0.92}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{n}</Text>
                  </Touchable>
                );
              })}
            </View>
          </Block>
        </Section>

        {/* Akış */}
        <Section title={t('settings.feed')} delay={120}>
          <ToggleRow
            icon="play-circle-outline"
            title={t('settings.autoplay')}
            subtitle={t('settings.autoplayHint')}
            value={prefs.autoplay}
            onToggle={() => setPref('autoplay', !prefs.autoplay)}
          />

          <Divider />

          <Block
            icon="share-social-outline"
            title={t('settings.defaultShare')}
            subtitle={t('settings.defaultShareHint')}
          >
            <Segmented
              value={prefs.defaultShare}
              onChange={(v) => setPref('defaultShare', v)}
              options={[
                { key: 'team' as const, label: t('share.team') },
                { key: 'social' as const, label: t('share.social') },
                { key: 'both' as const, label: t('share.both') },
              ]}
            />
          </Block>
        </Section>

        {/* Bildirimler */}
        <Section title={t('settings.notifications')} delay={160}>
          <Row
            icon="notifications-outline"
            title={t('settings.notifications')}
            subtitle={t('settings.notificationsHint')}
            onPress={() => router.push('/bildirimler')}
          />
        </Section>

        {/* His */}
        <Section title={t('settings.feedbackSection')} delay={200}>
          <ToggleRow
            icon="pulse-outline"
            title={t('settings.haptics')}
            subtitle={t('settings.hapticsHint')}
            value={prefs.haptics}
            onToggle={() => {
              setPref('haptics', !prefs.haptics);
              if (!prefs.haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          />
          <Divider />
          <ToggleRow
            icon="sparkles-outline"
            title={t('settings.celebrations')}
            subtitle={t('settings.celebrationsHint')}
            value={prefs.celebrations}
            onToggle={() => setPref('celebrations', !prefs.celebrations)}
          />
        </Section>

        {/* Hesap */}
        <Section title={t('settings.account')} delay={240}>
          {!configured && (
            <>
              <View style={styles.warn}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
                <Text style={styles.warnText}>{t('settings.demoMode')}</Text>
              </View>
              <Divider />
            </>
          )}

          <Row
            icon="person-outline"
            title={t('settings.username')}
            subtitle={username}
            trailing={editing === 'username' ? 'chevron-up' : 'chevron-down'}
            onPress={() => openEditor('username')}
          />
          {editing === 'username' && (
            <Editor
              value={draft}
              onChange={setDraft}
              placeholder={t('settings.usernamePlaceholder')}
              saveLabel={t('common.save')}
              onSave={saveUsername}
              busy={busy}
              autoCapitalize="none"
            />
          )}

          <Divider />

          <Row
            icon="lock-closed-outline"
            title={t('settings.password')}
            subtitle={session?.user?.email ?? undefined}
            trailing={editing === 'password' ? 'chevron-up' : 'chevron-down'}
            onPress={() => openEditor('password')}
          />
          {editing === 'password' && (
            <Editor
              value={draft}
              onChange={setDraft}
              placeholder={t('settings.passwordPlaceholder')}
              saveLabel={t('common.save')}
              onSave={savePassword}
              busy={busy}
              secureTextEntry
              autoCapitalize="none"
            />
          )}

          <Divider />

          <Row icon="log-out-outline" title={t('settings.signOut')} onPress={askSignOut} />

          <Divider />

          <Row
            icon="trash-outline"
            title={t('settings.deleteAccount')}
            onPress={askDelete}
            danger
          />
        </Section>

        {/* Uygulama */}
        <Section title={t('settings.app')} delay={280}>
          <Row icon="gift-outline" title={t('settings.invite')} onPress={invite} />
          <Divider />
          <Row
            icon="chatbubble-ellipses-outline"
            title={t('settings.contact')}
            onPress={sendFeedback}
          />
          <Divider />
          <Row
            icon="refresh-outline"
            title={t('settings.clearCache')}
            subtitle={t('settings.clearCacheHint')}
            onPress={clearCache}
          />
          <Divider />
          <Row icon="reload-outline" title={t('settings.reset')} onPress={askReset} />
        </Section>

        <View style={styles.footer}>
          <Logo size={54} showWordmark={false} />
          <Text style={styles.footerText}>
            TÜNEL · {t('settings.version')} {version}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

// ---------------------------------------------------------------------------

function Section({
  title,
  delay,
  children,
}: {
  title: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(320).delay(delay)} style={styles.section}>
      <Text style={styles.sectionTitle}>{title.toLocaleUpperCase('tr')}</Text>
      <View style={styles.card}>{children}</View>
    </Animated.View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function RowIcon({ icon, danger }: { icon: keyof typeof Ionicons.glyphMap; danger?: boolean }) {
  return (
    <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
      <Ionicons name={icon} size={17} color={danger ? colors.danger : colors.accent} />
    </View>
  );
}

function Row({
  icon,
  title,
  subtitle,
  onPress,
  danger,
  trailing = 'chevron-forward',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
  trailing?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Touchable style={styles.row} onPress={onPress} scaleTo={0.98}>
      <RowIcon icon={icon} danger={danger} />
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, danger && { color: colors.danger }]}>{title}</Text>
        {subtitle ? (
          <Text style={styles.rowSub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name={trailing} size={17} color={colors.textFaint} />
    </Touchable>
  );
}

function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onToggle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <Touchable style={styles.row} onPress={onToggle} scaleTo={0.98}>
      <RowIcon icon={icon} />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.switch, value && styles.switchOn]}>
        <View style={[styles.knob, value && styles.knobOn]} />
      </View>
    </Touchable>
  );
}

function Block({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.block}>
      <View style={styles.blockHead}>
        <RowIcon icon={icon} />
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>{title}</Text>
          {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.blockBody}>{children}</View>
    </View>
  );
}

function AccentDot({
  id,
  active,
  label,
  onPress,
}: {
  id: AccentId;
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const a = ACCENTS[id];
  return (
    <Touchable style={styles.dotWrap} onPress={onPress} scaleTo={0.88} haptic={false}>
      <View style={[styles.dotRing, active && { borderColor: a.mid }]}>
        <LinearGradient
          colors={[a.from, a.mid, a.to]}
          start={gradientStart}
          end={gradientEnd}
          style={styles.dot}
        >
          {active && <Ionicons name="checkmark" size={16} color="#fff" />}
        </LinearGradient>
      </View>
      <Text style={[styles.dotLabel, active && styles.dotLabelActive]}>{label}</Text>
    </Touchable>
  );
}

function Editor({
  value,
  onChange,
  placeholder,
  saveLabel,
  onSave,
  busy,
  ...input
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  saveLabel: string;
  onSave: () => void;
  busy: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences';
}) {
  return (
    <Animated.View entering={FadeIn.duration(180)} style={styles.editor}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        style={styles.input}
        autoCorrect={false}
        {...input}
      />
      <Touchable style={styles.saveBtn} onPress={onSave} scaleTo={0.95}>
        {busy ? (
          <ActivityIndicator color={colors.onBrand} size="small" />
        ) : (
          <Text style={styles.saveText}>{saveLabel}</Text>
        )}
      </Touchable>
    </Animated.View>
  );
}

const styles = makeStyles((colors) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  back: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: fontSize.lg, fontFamily: font.display },

  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  section: { marginTop: spacing.lg },
  sectionTitle: {
    color: colors.textFaint,
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 1.1,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    overflow: 'hidden',
    ...shadow.card,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.lineSoft,
    marginLeft: 56,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: { backgroundColor: colors.dangerBg },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '500' },
  rowSub: { color: colors.textDim, fontSize: fontSize.xs, lineHeight: 15 },

  block: { paddingHorizontal: spacing.lg, paddingVertical: 14, gap: spacing.md },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  blockBody: { marginLeft: 0 },

  switch: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface3,
    padding: 3,
    justifyContent: 'center',
  },
  switchOn: { backgroundColor: colors.accent },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  knobOn: { alignSelf: 'flex-end' },

  accentRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dotWrap: { alignItems: 'center', gap: 5, width: 48 },
  dotRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 3,
  },
  dot: {
    flex: 1,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotLabel: { color: colors.textFaint, fontSize: 10 },
  dotLabelActive: { color: colors.text, fontWeight: '600' },

  chips: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: colors.accentBg, borderWidth: 1, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: fontSize.sm },
  chipTextActive: { color: colors.accent, fontWeight: '700' },

  editor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: font.body,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    minWidth: 78,
    alignItems: 'center',
  },
  saveText: { color: colors.onBrand, fontSize: fontSize.sm, fontWeight: '600' },

  warn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningBg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  warnText: { color: colors.warning, fontSize: fontSize.xs, flex: 1 },

  footer: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xxl, opacity: 0.5 },
  footerText: { color: colors.textFaint, fontSize: fontSize.xs, letterSpacing: 1 },
}));
