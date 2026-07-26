// Titreşim — ayarlardaki "His > Titreşim" kapalıysa sessiz kalır.
//
// Kullanım expo-haptics ile birebir aynı; ekranlarda sadece import satırı
// değişir:  import { Haptics } from '@/lib/haptics';

import * as Base from 'expo-haptics';

import { getPrefs } from '@/lib/prefs';

const noop = Promise.resolve();
const on = () => getPrefs().haptics;

export const Haptics = {
  ImpactFeedbackStyle: Base.ImpactFeedbackStyle,
  NotificationFeedbackType: Base.NotificationFeedbackType,
  impactAsync: (style?: Base.ImpactFeedbackStyle) =>
    on() ? Base.impactAsync(style) : noop,
  selectionAsync: () => (on() ? Base.selectionAsync() : noop),
  notificationAsync: (type?: Base.NotificationFeedbackType) =>
    on() ? Base.notificationAsync(type) : noop,
};
