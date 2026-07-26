// Tab grubu — oturum guard'ı + özel tab bar.
// Supabase konfigüre değilken UI görülebilsin diye demoya izin verilir.

import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { TabBar } from '@/components/TabBar';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';

export default function TabsLayout() {
  const { session, loading, configured } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (configured && !session) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="kesfet" />
      <Tabs.Screen name="gorevler" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}
