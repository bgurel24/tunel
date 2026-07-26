// Kök layout — marka fontları, tema, güvenli alan, auth context, toast ve ana Stack.

import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FeedbackProvider } from '@/components/Toast';
import { AuthProvider } from '@/lib/auth';
import { fontAssets } from '@/lib/fonts';
import { colors } from '@/theme';

// Fontlar yüklenene kadar splash açık kalsın — yazılar bir anda "zıplamasın".
SplashScreen.preventAutoHideAsync().catch(() => {});

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

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

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
