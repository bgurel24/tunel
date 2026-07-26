// Auth grubu — oturum varsa ana akışa yönlendir.

import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';

export default function AuthLayout() {
  const { session, configured } = useAuth();

  if (configured && session) {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
