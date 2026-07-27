// Yorumlar — bir paylaşımın yorumları + yorum ekleme.

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/lib/i18n';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { addComment, getComments, type Comment } from '@/lib/social';
import { colors, fontSize, makeStyles, radius, spacing, useThemeTick } from '@/theme';

export default function YorumlarScreen() {
  useThemeTick();
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);

  const load = useCallback(async () => {
    if (!postId) return;
    setComments(await getComments(postId));
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const kbOffset = Math.max(kbHeight - insets.bottom, 0);

  const send = async () => {
    if (!postId || !text.trim()) return;
    setSending(true);
    const { error } = await addComment(postId, text);
    setSending(false);
    if (!error) {
      setText('');
      load();
    }
  };

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('comments.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={{ flex: 1, paddingBottom: kbOffset }}>
        {!comments ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(c) => c.id}
            style={styles.flatList}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <View style={styles.comment}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.username.slice(0, 2).toUpperCase()}</Text>
                </View>
                <Text style={styles.commentText}>
                  <Text style={styles.commentUser}>{item.username} </Text>
                  {item.body}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.empty}>{t('comments.empty')}</Text>
              </View>
            }
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Yorum ekle…"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            multiline
          />
          <Pressable onPress={send} disabled={sending || !text.trim()} hitSlop={8}>
            <Text style={[styles.send, { opacity: text.trim() ? 1 : 0.4 }]}>{t('comments.send')}</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = makeStyles((colors) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: '500' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  empty: { color: colors.textDim, fontSize: fontSize.sm },
  flatList: { flex: 1 },
  list: { padding: spacing.xl, gap: spacing.lg, flexGrow: 1 },
  comment: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.accent, fontSize: fontSize.xs, fontWeight: '600' },
  commentText: { flex: 1, color: colors.text, fontSize: fontSize.sm, lineHeight: 20 },
  commentUser: { color: colors.text, fontWeight: '500' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    fontSize: fontSize.md,
  },
  send: { color: colors.accent, fontSize: fontSize.md, fontWeight: '600' },
}));
