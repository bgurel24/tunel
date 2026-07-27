// Kök layout — marka fontları, tema, tercihler, güvenli alan, auth, toast ve Stack.

import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FeedbackProvider } from '@/components/Toast';
import { AuthProvider } from '@/lib/auth';
import { fontAssets } from '@/lib/fonts';
import { loadPrefs } from '@/lib/prefs';
import { colors } from '@/theme';

// Fontlar yüklenene kadar splash açık kalsın — yazılar bir anda "zıplamasın".
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [prefsReady, setPrefsReady] = useState(false);
  const ready = (fontsLoaded || !!fontError) && prefsReady;

  useEffect(() => {
    loadPrefs().finally(() => setPrefsReady(true));
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Sekmeler arası geçişte kenarlarda görünen kök zemin de temaya uysun.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, []);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  const navTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: colors.bg,
      card: colors.bg,
      text: colors.text,
      border: colors.line,
      primary: colors.accent,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <ThemeProvider value={navTheme}>
          <AuthProvider>
            <FeedbackProvider>
              <StatusBar style="light" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.bg },
                  animation: 'slide_from_right',
                }}
              >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="join-team" />
                <Stack.Screen name="liderlik" />
                <Stack.Screen name="kaptan" />
                <Stack.Screen name="gorev-yukle" />
                <Stack.Screen name="pr" />
                <Stack.Screen name="kullanici" />
                <Stack.Screen name="bildirimler" />
                <Stack.Screen name="ayarlar" />
                <Stack.Screen name="engellenenler" />
                <Stack.Screen name="yasal" />
                <Stack.Screen name="cagri" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
                <Stack.Screen name="paylas" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
                <Stack.Screen name="yorumlar" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              </Stack>
            </FeedbackProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
