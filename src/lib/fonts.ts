// Marka fontları — gövde Inter, başlık/sayı Sora, ikonlar Ionicons.
// Alt yol import'ları kullanılıyor ki paketin tüm ağırlıkları bundle'a girmesin.

import { Ionicons } from '@expo/vector-icons';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Sora_600SemiBold } from '@expo-google-fonts/sora/600SemiBold';
import { Sora_700Bold } from '@expo-google-fonts/sora/700Bold';

export const fontAssets = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Sora_600SemiBold,
  Sora_700Bold,
  // İkon fontu. Native'de @expo/vector-icons kendi fontunu kendi yüklüyor ama
  // web'de bu güvenilir çalışmıyor: font gelmeden ikonlar boş kare olarak
  // çiziliyordu. Diğer fontlarla birlikte, splash kalkmadan önce yüklensin.
  ...Ionicons.font,
};
