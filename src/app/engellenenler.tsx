// Engellenen kullanıcılar — Ayarlar > Gizlilik. Engeli buradan kaldırılır.

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { ListSkeleton } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { Touchable } from '@/components/Touchable';
import { useT } from '@/lib/i18n';
import { getBlockedUsers, unblockUser, type BlockedUser } from '@/lib/moderation';
import { colors, font, fontSize, makeStyles, radius, spacing, useThemeTick } from '@/theme';

export default function EngellenenlerScreen() {
  useThemeTick();
  const t = useT();
  const router = useRouter();
  const { toast, confirm } = useToast();
  const [users, setUsers] = useState<BlockedUser[] | null>(null);

  const load = useCallback(() => {
    getBlockedUsers().then(setUsers);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const askUnblock = async (user: BlockedUser) => {
    const ok = await confirm({
      title: t('blocked.unblockTitle'),
      message: t('blocked.unblockMessage', { name: user.username }),
      confirmLabel: t('blocked.unblock'),
      icon: 'person-add-outline',
    });
    if (!ok) return;
    const { error } = await unblockUser(user.id);
    if (error) return toast(error, 'error');
    toast(t('blocked.unblocked', { name: user.username }), 'info');
    load();
  };

  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.header}>
        <Touchable style={styles.back} onPress={() => router.back()} scaleTo={0.9}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Touchable>
        <Text style={styles.title}>{t('blocked.title')}</Text>
        <View style={styles.back} />
      </View>

      {!users ? (
        <View style={styles.loading}>
          <ListSkeleton count={4} height={58} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Avatar username={item.username} url={item.avatarUrl} size={38} />
              <Text style={styles.username} numberOfLines={1}>
                {item.username}
              </Text>
              <Touchable style={styles.unblock} onPress={() => askUnblock(item)} scaleTo={0.95}>
                <Text style={styles.unblockText}>{t('blocked.unblock')}</Text>
              </Touchable>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="shield-checkmark-outline"
              title={t('blocked.empty')}
              body={t('blocked.emptySub')}
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  back: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: fontSize.lg, fontFamily: font.display },

  loading: { paddingHorizontal: spacing.xl, gap: spacing.md },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.sm, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: spacing.md,
  },
  username: { flex: 1, color: colors.text, fontSize: fontSize.md, fontWeight: '500' },
  unblock: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.accentBg,
  },
  unblockText: { color: colors.accent, fontSize: fontSize.xs, fontWeight: '700' },
}));
