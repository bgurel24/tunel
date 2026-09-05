// Bildirimler — iki sekme:
//   Gelen kutusu: alkış/yorum/kanıt/onay/görev/çağrı bildirimleri (Supabase)
//   Ayarlar: günlük yerel hatırlatma + push kaydı + test bildirimi

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { OutlineButton } from '@/components/GradientButton';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { ListSkeleton } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { Touchable } from '@/components/Touchable';
import { useT } from '@/lib/i18n';
import {
  getDailySettings,
  getNotifications,
  isExpoGo,
  isWeb,
  markAllRead,
  notificationText,
  registerPushToken,
  sendTestNotification,
  setDailyReminder,
  type AppNotification,
  type NotificationKind,
} from '@/lib/notifications';
import { colors, fontSize, makeStyles, radius, spacing, useThemeTick } from '@/theme';

const HOURS = [8, 12, 18, 21];

const ICON: Record<NotificationKind, keyof typeof Ionicons.glyphMap> = {
  reaction: 'flame',
  comment: 'chatbubble',
  submission: 'cloud-upload',
  decision: 'checkmark-done',
  task: 'list',
  session: 'flash',
  join: 'person-add',
};

type Tab = 'inbox' | 'settings';

export default function BildirimlerScreen() {
  useThemeTick();
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>('inbox');
  const [items, setItems] = useState<AppNotification[] | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [hour, setHour] = useState(18);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getDailySettings().then((s) => {
      setEnabled(s.enabled);
      setHour(s.hour);
    });
  }, []);

  // Ekran açılınca listeyi çek ve hepsini okundu say — rozet sıfırlansın.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getNotifications().then((list) => {
        if (!active) return;
        setItems(list);
        if (list.some((n) => !n.read)) markAllRead();
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const apply = async (nextEnabled: boolean, nextHour: number) => {
    setBusy(true);
    const { error } = await setDailyReminder(nextEnabled, nextHour, 0);
    setBusy(false);
    if (error) {
      toast(error, 'error');
      setEnabled(false);
      return;
    }
    setEnabled(nextEnabled);
    setHour(nextHour);
    toast(t(nextEnabled ? 'notif.on' : 'notif.off'), nextEnabled ? 'success' : 'info');
  };

  const test = async () => {
    const { error } = await sendTestNotification();
    if (error) toast(error, 'error');
    else toast(t('notif.testSent'), 'info');
  };

  const enablePush = async () => {
    setBusy(true);
    const { error } = await registerPushToken();
    setBusy(false);
    if (error) toast(error, 'error');
    else toast(t('notif.pushRegistered'));
  };

  // Bildirime dokununca ilgili yere git — gidilecek yer olmayanlar sessiz kalır.
  const open = (n: AppNotification) => {
    switch (n.kind) {
      case 'comment':
        if (n.postId) router.push({ pathname: '/yorumlar', params: { postId: n.postId } });
        break;
      case 'reaction':
        if (n.actorId) router.push({ pathname: '/kullanici', params: { id: n.actorId } });
        break;
      case 'submission':
        if (n.teamId) router.push({ pathname: '/kaptan', params: { teamId: n.teamId } });
        break;
      case 'decision':
      case 'task':
        router.push('/gorevler');
        break;
      case 'session':
        break;
      case 'join':
        // İstek → kaptan üyeler ekranında onaylar; karar → kişi profilinde görür.
        if (n.detail === 'request' && n.teamId) router.push({ pathname: '/uyeler', params: { teamId: n.teamId } });
        else router.push('/profil');
        break;
    }
  };

  const header = (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} hitSlop={12}>
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </Pressable>
      <Text style={styles.title}>{t('settings.notifications')}</Text>
      <View style={{ width: 26 }} />
    </View>
  );

  const tabs = (
    <View style={{ marginBottom: spacing.lg }}>
      <Segmented
        options={[
          { key: 'inbox' as const, label: t('inbox.tab') },
          { key: 'settings' as const, label: t('inbox.tabSettings') },
        ]}
        value={tab}
        onChange={setTab}
      />
    </View>
  );

  if (tab === 'settings') {
    // Tarayıcıda işletim sistemi bildirimi yok — açılmayacak anahtarı
    // göstermek yerine neden olmadığını yazıyoruz. Gelen kutusu sekmesi çalışır.
    if (isWeb) {
      return (
        <Screen>
          {header}
          {tabs}
          <View style={styles.info}>
            <Ionicons name="information-circle-outline" size={15} color={colors.textFaint} />
            <Text style={styles.infoText}>{t('notif.infoWeb')}</Text>
          </View>
        </Screen>
      );
    }

    return (
      <Screen>
        {header}
        {tabs}

        <Pressable style={styles.row} onPress={() => apply(!enabled, hour)} disabled={busy}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{t('notif.dailyTitle')}</Text>
            <Text style={styles.rowSub}>{t('notif.dailySub')}</Text>
          </View>
          <View style={[styles.switch, enabled && styles.switchOn]}>
            <View style={[styles.knob, enabled && styles.knobOn]} />
          </View>
        </Pressable>

        {enabled && (
          <>
            <Text style={styles.label}>{t('notif.hour')}</Text>
            <View style={styles.chips}>
              {HOURS.map((h) => (
                <Pressable
                  key={h}
                  style={[styles.chip, hour === h && styles.chipActive]}
                  onPress={() => apply(true, h)}
                  disabled={busy}
                >
                  <Text style={[styles.chipText, hour === h && styles.chipTextActive]}>
                    {String(h).padStart(2, '0')}:00
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          {!isExpoGo && <OutlineButton label={t('notif.enablePush')} onPress={enablePush} />}
          <OutlineButton label={t('notif.test')} onPress={test} />
        </View>

        <View style={styles.info}>
          <Ionicons name="information-circle-outline" size={15} color={colors.textFaint} />
          <Text style={styles.infoText}>{t(isExpoGo ? 'notif.infoExpoGo' : 'notif.info')}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing.xl }}>
        {header}
        {tabs}
      </View>

      {!items ? (
        <View style={{ paddingHorizontal: spacing.xl }}>
          <ListSkeleton count={5} height={62} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Touchable style={styles.item} onPress={() => open(item)} scaleTo={0.98}>
              {item.actorName ? (
                <Avatar username={item.actorName} url={item.actorAvatarUrl} size={38} />
              ) : (
                <View style={styles.kindIcon}>
                  <Ionicons name={ICON[item.kind]} size={18} color={colors.accent} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.itemText}>{notificationText(item)}</Text>
                <Text style={styles.itemTime}>{item.timeLabel}</Text>
              </View>
              {!item.read && <View style={styles.unreadDot} />}
            </Touchable>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-outline"
              title={t('inbox.empty')}
              body={t('inbox.emptySub')}
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = makeStyles((colors) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: '500' },

  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.sm, flexGrow: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: spacing.md,
  },
  kindIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { color: colors.text, fontSize: fontSize.sm, lineHeight: 19 },
  itemTime: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: 3 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  rowTitle: { color: colors.text, fontSize: fontSize.sm, fontWeight: '500' },
  rowSub: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 2, lineHeight: 16 },
  switch: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    padding: 3,
    justifyContent: 'center',
  },
  switchOn: { backgroundColor: colors.accent },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  knobOn: { alignSelf: 'flex-end' },
  label: { color: colors.textDim, fontSize: fontSize.sm, marginTop: spacing.lg, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: fontSize.sm },
  chipTextActive: { color: colors.text, fontWeight: '500' },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.xl },
  infoText: { color: colors.textFaint, fontSize: fontSize.xs, flex: 1, lineHeight: 16 },
}));
