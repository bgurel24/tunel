// Takım sohbeti — sadece takım üyelerinin görebildiği canlı mesajlaşma.
// Akış başlığındaki balon ikonundan açılır.

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { ListSkeleton } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { useT } from '@/lib/i18n';
import { getMessages, sendMessage, subscribeMessages, type ChatMessage } from '@/lib/chat';
import { getMyTeams, type MyTeam } from '@/lib/teams';
import { colors, font, fontSize, makeStyles, radius, spacing, useThemeTick } from '@/theme';

function timeOf(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function SohbetScreen() {
  useThemeTick();
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [kbOpen, setKbOpen] = useState(false);
  useEffect(() => {
    const s = Keyboard.addListener('keyboardWillShow', () => setKbOpen(true));
    const h = Keyboard.addListener('keyboardWillHide', () => setKbOpen(false));
    return () => { s.remove(); h.remove(); };
  }, []);
  const { toast } = useToast();

  const [team, setTeam] = useState<MyTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const teams = await getMyTeams();
        if (!active) return;
        const sel = teams[0] ?? null;
        setTeam(sel);
        if (sel) {
          const msgs = await getMessages(sel.id);
          if (!active) return;
          setMessages(msgs);
          unsubRef.current = subscribeMessages(sel.id, (m) => {
            setMessages((cur) => (cur.some((x) => x.id === m.id) ? cur : [m, ...cur]));
          });
        }
        setLoading(false);
      })();
      return () => {
        active = false;
        unsubRef.current?.();
        unsubRef.current = null;
      };
    }, [])
  );

  const send = async () => {
    if (!team || !draft.trim() || sending) return;
    const text = draft;
    setDraft('');
    setSending(true);
    const { error } = await sendMessage(team.id, text);
    setSending(false);
    if (error) {
      setDraft(text);
      toast(error, 'error');
      return;
    }
    // Realtime aboneliği mesajı getirir; garanti olsun diye tazele.
    const msgs = await getMessages(team.id);
    setMessages(msgs);
  };

  return (
    <Screen padded={false} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{team?.name ?? t('chat.title')}</Text>
          <Text style={styles.subtitle}>{t('chat.subtitle')}</Text>
        </View>
        <Ionicons name="chatbubbles-outline" size={20} color={colors.textFaint} />
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: spacing.xl }}>
          <ListSkeleton count={6} height={52} />
        </View>
      ) : !team ? (
        <EmptyState
          icon="people-outline"
          title={t('tasks.noTeamTitle')}
          body={t('tasks.noTeamBody')}
          actionLabel={t('tasks.noTeamAction')}
          onAction={() => router.push('/join-team')}
        />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <FlatList
            data={messages}
            inverted
            keyExtractor={(m) => m.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item: m, index }) => {
              const prev = messages[index + 1]; // inverted: bir önceki mesaj listede sonraki eleman
              const showName = !m.isMine && (!prev || prev.userId !== m.userId);
              return (
                <View style={[styles.msgWrap, m.isMine ? styles.mineWrap : styles.otherWrap]}>
                  {showName && <Text style={styles.msgName}>{m.username}</Text>}
                  <View style={[styles.bubble, m.isMine ? styles.mineBubble : styles.otherBubble]}>
                    <Text style={styles.msgBody}>{m.body}</Text>
                    <Text style={styles.msgTime}>{timeOf(m.createdAt)}</Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubble-ellipses-outline" size={38} color={colors.textFaint} />
                <Text style={styles.emptyText}>{t('chat.empty')}</Text>
              </View>
            }
          />

          <View style={[styles.inputRow, { paddingBottom: kbOpen ? spacing.sm : Math.max(insets.bottom, spacing.md) }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t('chat.placeholder')}
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              multiline
              maxLength={1000}
            />
            <Pressable
              onPress={send}
              disabled={!draft.trim() || sending}
              style={[styles.sendBtn, (!draft.trim() || sending) && { opacity: 0.4 }]}
              hitSlop={8}
            >
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}

const styles = makeStyles((colors) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  title: { color: colors.text, fontSize: fontSize.lg, fontFamily: font.display },
  subtitle: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: 1 },
  listContent: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: 6 },
  msgWrap: { maxWidth: '78%' },
  mineWrap: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  otherWrap: { alignSelf: 'flex-start' },
  msgName: { color: colors.accent, fontSize: fontSize.xs, fontWeight: '600', marginBottom: 2, marginLeft: 4 },
  bubble: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    gap: 2,
  },
  mineBubble: {
    backgroundColor: colors.brandBg,
    borderWidth: 1,
    borderColor: colors.accentBg,
    borderBottomRightRadius: radius.sm,
  },
  otherBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderBottomLeftRadius: radius.sm,
  },
  msgBody: { color: colors.text, fontSize: fontSize.md, lineHeight: 21 },
  msgTime: { color: colors.textFaint, fontSize: 10, alignSelf: 'flex-end' },
  emptyChat: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    transform: [{ scaleY: -1 }], // inverted listede düz görünsün
  },
  emptyText: { color: colors.textDim, fontSize: fontSize.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    backgroundColor: colors.bgElevated,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    fontSize: fontSize.md,
    maxHeight: 110,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
