// Takım üyeleri — kaptan burada kaptanlığı devreder ya da üyeyi takımdan çıkarır.
// Üye olarak açıldığında liste salt okunur; yetki kontrolünü sunucu da yapıyor.

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { ListSkeleton } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { Touchable } from '@/components/Touchable';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import {
  getMyTeams,
  approveJoinRequest,
  getJoinRequests,
  getTeamMembers,
  rejectJoinRequest,
  type JoinRequest,
  removeMember,
  setMemberRole,
  transferCaptaincy,
  type MyTeam,
  type TeamMember,
  type TeamRole,
} from '@/lib/teams';
import { colors, font, fontSize, makeStyles, radius, spacing, useThemeTick } from '@/theme';

export default function UyelerScreen() {
  useThemeTick();
  const t = useT();
  const router = useRouter();
  const { session } = useAuth();
  const { toast, confirm, menu } = useToast();
  const params = useLocalSearchParams<{ teamId?: string }>();
  const teamId = params.teamId ?? '';
  const myId = session?.user?.id ?? '';

  const [team, setTeam] = useState<MyTeam | null>(null);
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [requests, setRequests] = useState<JoinRequest[]>([]);

  const load = useCallback(async () => {
    if (!teamId) {
      setMembers([]);
      return;
    }
    const [teams, list, reqs] = await Promise.all([
      getMyTeams(),
      getTeamMembers(teamId),
      getJoinRequests(teamId),
    ]);
    setTeam(teams.find((x) => x.id === teamId) ?? null);
    setMembers(list);
    setRequests(reqs);
  }, [teamId]);

  useEffect(() => {
    load();
  }, [load]);

  // Kaptan yetkisi olan herkes üye çıkarabilir; yetki dağıtmak sahibe özel.
  const amCaptain = team?.role === 'captain';
  const amOwner = !!team?.isOwner;

  const decide = async (r: JoinRequest, approve: boolean) => {
    const { error } = approve
      ? await approveJoinRequest(teamId, r.id)
      : await rejectJoinRequest(teamId, r.id);
    if (error) return toast(error, 'error');
    toast(t(approve ? 'members.approved' : 'members.rejected', { name: r.name }));
    load();
  };

  const askTransfer = async (member: TeamMember) => {
    const ok = await confirm({
      title: t('members.transferTitle'),
      message: t('members.transferMessage', { name: member.name }),
      confirmLabel: t('members.transfer'),
      icon: 'shield-checkmark-outline',
    });
    if (!ok) return;
    const { error } = await transferCaptaincy(teamId, member.id);
    if (error) return toast(error, 'error');
    toast(t('members.transferred', { name: member.name }));
    load();
  };

  const askRemove = async (member: TeamMember) => {
    const ok = await confirm({
      title: t('members.removeTitle'),
      message: t('members.removeMessage', { name: member.name }),
      confirmLabel: t('members.remove'),
      destructive: true,
    });
    if (!ok) return;
    const { error } = await removeMember(teamId, member.id);
    if (error) return toast(error, 'error');
    toast(t('members.removed', { name: member.name }), 'info');
    load();
  };

  const askSetRole = async (member: TeamMember, role: TeamRole) => {
    if (role === 'coach' || member.role === 'coach') return askCoach(member, role === 'coach');
    const veriyor = role === 'captain';
    const ok = await confirm({
      title: t(veriyor ? 'members.promoteTitle' : 'members.demoteTitle'),
      message: t(veriyor ? 'members.promoteMessage' : 'members.demoteMessage', {
        name: member.username,
      }),
      confirmLabel: t(veriyor ? 'members.promote' : 'members.demote'),
      icon: veriyor ? 'shield-checkmark-outline' : 'shield-outline',
      destructive: !veriyor,
    });
    if (!ok) return;
    const { error } = await setMemberRole(teamId, member.id, role);
    if (error) return toast(error, 'error');
    toast(t(veriyor ? 'members.promoted' : 'members.demoted', { name: member.name }));
    load();
  };

  // Koç: idman açar, yoklamayı görür. Kaptan yetkisi yok; sahip atar/geri alır.
  const askCoach = async (member: TeamMember, make: boolean) => {
    const ok = await confirm({
      title: t(make ? 'members.coachTitle' : 'members.uncoachTitle'),
      message: t(make ? 'members.coachMessage' : 'members.uncoachMessage', { name: member.name }),
      confirmLabel: t(make ? 'members.makeCoach' : 'members.uncoach'),
      icon: 'clipboard-outline',
      destructive: !make,
    });
    if (!ok) return;
    const { error } = await setMemberRole(teamId, member.id, make ? 'coach' : 'member');
    if (error) return toast(error, 'error');
    toast(t(make ? 'members.coached' : 'members.uncoached', { name: member.name }));
    load();
  };

  // Yetki dağıtmak ve sahipliği devretmek yalnızca takımın sahibinde.
  // Yardımcı kaptanlar üye çıkarabilir ama birbirinin yetkisiyle oynayamaz.
  const openMemberMenu = async (member: TeamMember) => {
    const yardimci = member.role === 'captain';
    const koc = member.role === 'coach';
    const choice = await menu({
      title: member.username,
      options: [
        ...(amOwner
          ? [
              koc
                ? {
                    key: 'uncoach',
                    label: t('members.uncoach'),
                    icon: 'clipboard-outline' as const,
                  }
                : yardimci
                  ? {
                      key: 'demote',
                      label: t('members.demote'),
                      icon: 'shield-outline' as const,
                    }
                  : {
                      key: 'promote',
                      label: t('members.promote'),
                      icon: 'shield-checkmark-outline' as const,
                    },
              ...(!koc && !yardimci
                ? [{ key: 'coach', label: t('members.makeCoach'), icon: 'clipboard-outline' as const }]
                : []),
              {
                key: 'transfer',
                label: t('members.transfer'),
                icon: 'swap-horizontal-outline' as const,
              },
            ]
          : []),
        { key: 'remove', label: t('members.remove'), icon: 'person-remove-outline', destructive: true },
      ],
    });
    if (choice === 'promote') askSetRole(member, 'captain');
    if (choice === 'demote') askSetRole(member, 'member');
    if (choice === 'coach') askCoach(member, true);
    if (choice === 'uncoach') askCoach(member, false);
    if (choice === 'transfer') askTransfer(member);
    if (choice === 'remove') askRemove(member);
  };

  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.header}>
        <Touchable style={styles.back} onPress={() => router.back()} scaleTo={0.9}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Touchable>
        <Text style={styles.title}>{t('members.title')}</Text>
        <View style={styles.back} />
      </View>

      {team && (
        <Text style={styles.subtitle}>
          {team.name} · {t('members.count', { n: members?.length ?? 0 })}
        </Text>
      )}

      {!members ? (
        <View style={styles.loading}>
          <ListSkeleton count={4} height={58} />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            amCaptain && requests.length > 0 ? (
              <View style={styles.requests}>
                <Text style={styles.requestsTitle}>{t('members.requests', { n: requests.length })}</Text>
                {requests.map((r) => (
                  <View key={r.id} style={styles.row}>
                    <Avatar username={r.username} url={r.avatarUrl} size={38} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.username} numberOfLines={1}>{r.name}</Text>
                      <Text style={styles.requestSub}>@{r.username}</Text>
                    </View>
                    <Touchable style={styles.reqBtn} onPress={() => decide(r, false)} scaleTo={0.9}>
                      <Ionicons name="close" size={20} color={colors.danger} />
                    </Touchable>
                    <Touchable style={[styles.reqBtn, styles.reqApprove]} onPress={() => decide(r, true)} scaleTo={0.9}>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    </Touchable>
                  </View>
                ))}
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const isMe = item.id === myId;
            // Kaptan kendi satırını yönetemez — ayrılmak/devretmek başka üzerinden.
            // Sahip herkese dokunabilir; yardımcı kaptan yalnızca düz üyelere —
            // böylece ne sahibi ne de diğer yardımcıları çıkarabiliyor.
            const actionable = !isMe && (amOwner || (amCaptain && item.role !== 'captain'));
            return (
              <View style={styles.row}>
                <Avatar username={item.username} url={item.avatarUrl} size={38} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.username} numberOfLines={1}>
                    {item.name}
                    {isMe ? ` · ${t('members.you')}` : ''}
                  </Text>
                  <View
                    style={[
                      styles.roleBadge,
                      item.role === 'captain'
                        ? styles.roleCaptain
                        : item.role === 'coach'
                          ? styles.roleCoach
                          : styles.roleMember,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        {
                          color:
                            item.role === 'captain'
                              ? colors.accent
                              : item.role === 'coach'
                                ? colors.success
                                : colors.textDim,
                        },
                      ]}
                    >
                      {t(
                        item.role === 'captain'
                          ? 'profile.captain'
                          : item.role === 'coach'
                            ? 'profile.coach'
                            : 'profile.member'
                      )}
                    </Text>
                  </View>
                </View>
                {actionable ? (
                  <Touchable style={styles.more} onPress={() => openMemberMenu(item)} scaleTo={0.9}>
                    <Ionicons name="ellipsis-horizontal" size={20} color={colors.textDim} />
                  </Touchable>
                ) : null}
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title={t('members.empty')}
              body={t('members.emptySub')}
            />
          }
          ListFooterComponent={
            amCaptain && members.length > 0 ? (
              <View style={styles.info}>
                <Ionicons name="information-circle-outline" size={15} color={colors.textFaint} />
                <Text style={styles.infoText}>{t('members.captainHint')}</Text>
              </View>
            ) : null
          }
        />
      )}
    </Screen>
  );
}

const styles = makeStyles((colors) => ({
  requests: {
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  requestsTitle: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontFamily: font.bodySemi,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  requestSub: {
    color: colors.textFaint,
    fontSize: fontSize.xs,
  },
  reqBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  reqApprove: {
    backgroundColor: colors.accent,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  back: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: fontSize.lg, fontFamily: font.display },
  subtitle: {
    color: colors.textFaint,
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },

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
  username: { color: colors.text, fontSize: fontSize.md, fontWeight: '500' },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginTop: 4,
  },
  roleCaptain: { backgroundColor: colors.accentBg },
  roleMember: { backgroundColor: colors.surface2 },
  roleCoach: { backgroundColor: colors.successBg },
  roleText: { fontSize: fontSize.xs, fontWeight: '500' },
  more: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  info: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  infoText: { color: colors.textFaint, fontSize: fontSize.xs, flex: 1, lineHeight: 16 },
}));
