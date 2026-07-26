// Dil katmanı — Türkçe kaynak, İngilizce karşılık.
//
// Kullanım:  const t = useT();  ...  <Text>{t('settings.title')}</Text>
// React dışında: t('...') doğrudan çağrılabilir (anlık dili okur).
// Yeni metin eklerken önce `tr` sözlüğüne yaz — `en` eksik kalırsa TS uyarır.

import { getPrefs, usePrefs, type Lang } from '@/lib/prefs';

const tr = {
  // Ortak
  'common.save': 'Kaydet',
  'common.cancel': 'Vazgeç',
  'common.delete': 'Sil',
  'common.done': 'Tamam',
  'common.continue': 'Devam',
  'common.on': 'Açık',
  'common.off': 'Kapalı',
  'common.soon': 'Yakında',

  // Sekmeler
  'tab.feed': 'Akış',
  'tab.explore': 'Keşfet',
  'tab.tasks': 'Görevler',
  'tab.profile': 'Profil',

  // Ayarlar — başlık
  'settings.title': 'Ayarlar',

  // Görünüm
  'settings.appearance': 'Görünüm',
  'settings.theme': 'Tema',
  'settings.theme.system': 'Sistem',
  'settings.theme.dark': 'Karanlık',
  'settings.theme.light': 'Aydınlık',
  'settings.accent': 'Vurgu rengi',
  'settings.accentHint': 'Butonlar, rozetler ve vurgular bu renge döner',
  'accent.ember': 'Ateş',
  'accent.ice': 'Buz',
  'accent.toxic': 'Zehir',
  'accent.violet': 'Menekşe',
  'accent.gold': 'Altın',
  'accent.steel': 'Çelik',

  // Dil
  'settings.language': 'Dil',
  'settings.languageHint': 'Uygulama metinlerinin dili',

  // Antrenman
  'settings.training': 'Antrenman',
  'settings.units': 'Ağırlık birimi',
  'settings.unitsHint': 'Rekorların bu birimle gösterilir',
  'settings.weeklyGoal': 'Haftalık hedef',
  'settings.weeklyGoalHint': 'Haftada kaç gün antrenman hedefliyorsun',
  'settings.days': '{n} gün',

  // Akış
  'settings.feed': 'Akış',
  'settings.autoplay': 'Videolar otomatik oynasın',
  'settings.autoplayHint': 'Kapalıyken videolar dokununca başlar',
  'settings.defaultShare': 'Varsayılan paylaşım',
  'settings.defaultShareHint': 'Paylaş ekranı bu seçimle açılır',
  'share.team': 'Takım',
  'share.social': 'Sosyal',
  'share.both': 'İkisi',

  // Bildirimler
  'settings.notifications': 'Bildirimler',
  'settings.notificationsHint': 'Günlük hatırlatma ve saati',

  // Etkileşim
  'settings.feedbackSection': 'His',
  'settings.haptics': 'Titreşim',
  'settings.hapticsHint': 'Dokunuşlarda hafif geri bildirim',
  'settings.celebrations': 'Kutlamalar',
  'settings.celebrationsHint': 'Konfeti ve başarı animasyonları',

  // Hesap
  'settings.account': 'Hesap',
  'settings.username': 'Kullanıcı adı',
  'settings.usernamePlaceholder': 'yeni kullanıcı adı',
  'settings.usernameSaved': 'Kullanıcı adın güncellendi',
  'settings.usernameTaken': 'Bu isim alınmış',
  'settings.usernameShort': 'En az 3 karakter',
  'settings.password': 'Şifreyi değiştir',
  'settings.passwordPlaceholder': 'yeni şifre',
  'settings.passwordSaved': 'Şifren güncellendi',
  'settings.passwordShort': 'En az 6 karakter',
  'settings.signOut': 'Çıkış yap',
  'settings.signOutTitle': 'Çıkış yapılsın mı?',
  'settings.signOutMessage': 'Tekrar girmek için e-posta ve şifren gerekecek.',
  'settings.deleteAccount': 'Hesabı sil',
  'settings.deleteTitle': 'Hesabını sil',
  'settings.deleteMessage':
    'Postların, görevlerin, puanların, takımların — hepsi silinir. Geri dönüşü yok.',
  'settings.deleted': 'Hesabın silindi',

  // Uygulama
  'settings.app': 'Uygulama',
  'settings.invite': 'Arkadaşını davet et',
  'settings.inviteText':
    'Tünel\'e gel — takımınla antren, görev ve liderlik tablosu. Tek uygulamada.',
  'settings.contact': 'Geri bildirim gönder',
  'settings.contactSubject': 'Tünel geri bildirim',
  'settings.clearCache': 'Önbelleği temizle',
  'settings.clearCacheHint': 'Fotoğraf ve videoların yerel kopyaları',
  'settings.cacheCleared': 'Önbellek temizlendi',
  'settings.reset': 'Ayarları sıfırla',
  'settings.resetTitle': 'Ayarlar sıfırlansın mı?',
  'settings.resetMessage': 'Tema, dil ve tüm tercihler varsayılana döner.',
  'settings.resetDone': 'Ayarlar sıfırlandı',
  'settings.version': 'Sürüm',
  'settings.demoMode': 'Demo modu — Supabase bağlı değil',

  // Profil ekranı
  'profile.settings': 'Ayarlar',
  'profile.streak': 'gün seri',
  'profile.longest': 'en uzun',
  'profile.posts': 'paylaşım',
  'profile.lastWeeks': 'Son 5 hafta',
  'profile.activeDays': '{n} gün aktif',
  'profile.yourTeams': 'Takımların',
  'profile.noTeamTitle': 'Tek başınasın.',
  'profile.noTeamSub': 'Takım kur ya da bir davet koduyla katıl — asıl iş orada.',
  'profile.captain': 'Kaptan',
  'profile.member': 'Üye',
  'profile.code': 'Kod',
  'profile.avatarHint': 'Fotoğraf ekle — takımın seni tanısın',
  'profile.avatarUpdated': 'Profil fotoğrafın güncellendi',
  'profile.records': 'Kişisel rekorlar (PR)',
  'profile.notifications': 'Bildirimler',
  'profile.joinTeam': 'Takıma katıl / oluştur',
  'profile.captainPanel': 'Kaptan paneli',
  'profile.leaderboard': 'Liderlik',
  'profile.deleteTeam': 'Takımı sil',
  'profile.deleteTeamMessage':
    '"{name}" tamamen gider: üyeler, görevler, puanlar. Geri dönüşü yok.',
  'profile.teamDeleted': '"{name}" silindi',
} as const;

export type TranslationKey = keyof typeof tr;

const en: Record<TranslationKey, string> = {
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.done': 'Done',
  'common.continue': 'Continue',
  'common.on': 'On',
  'common.off': 'Off',
  'common.soon': 'Soon',

  'tab.feed': 'Feed',
  'tab.explore': 'Explore',
  'tab.tasks': 'Tasks',
  'tab.profile': 'Profile',

  'settings.title': 'Settings',

  'settings.appearance': 'Appearance',
  'settings.theme': 'Theme',
  'settings.theme.system': 'System',
  'settings.theme.dark': 'Dark',
  'settings.theme.light': 'Light',
  'settings.accent': 'Accent color',
  'settings.accentHint': 'Buttons, badges and highlights follow this color',
  'accent.ember': 'Ember',
  'accent.ice': 'Ice',
  'accent.toxic': 'Toxic',
  'accent.violet': 'Violet',
  'accent.gold': 'Gold',
  'accent.steel': 'Steel',

  'settings.language': 'Language',
  'settings.languageHint': 'Language of the app',

  'settings.training': 'Training',
  'settings.units': 'Weight unit',
  'settings.unitsHint': 'Your records are shown in this unit',
  'settings.weeklyGoal': 'Weekly goal',
  'settings.weeklyGoalHint': 'How many days a week you aim to train',
  'settings.days': '{n} days',

  'settings.feed': 'Feed',
  'settings.autoplay': 'Autoplay videos',
  'settings.autoplayHint': 'When off, videos start on tap',
  'settings.defaultShare': 'Default share target',
  'settings.defaultShareHint': 'The share screen opens with this selection',
  'share.team': 'Team',
  'share.social': 'Social',
  'share.both': 'Both',

  'settings.notifications': 'Notifications',
  'settings.notificationsHint': 'Daily reminder and its time',

  'settings.feedbackSection': 'Feel',
  'settings.haptics': 'Haptics',
  'settings.hapticsHint': 'Subtle feedback on every tap',
  'settings.celebrations': 'Celebrations',
  'settings.celebrationsHint': 'Confetti and success animations',

  'settings.account': 'Account',
  'settings.username': 'Username',
  'settings.usernamePlaceholder': 'new username',
  'settings.usernameSaved': 'Username updated',
  'settings.usernameTaken': 'That name is taken',
  'settings.usernameShort': 'At least 3 characters',
  'settings.password': 'Change password',
  'settings.passwordPlaceholder': 'new password',
  'settings.passwordSaved': 'Password updated',
  'settings.passwordShort': 'At least 6 characters',
  'settings.signOut': 'Sign out',
  'settings.signOutTitle': 'Sign out?',
  'settings.signOutMessage': 'You will need your email and password to get back in.',
  'settings.deleteAccount': 'Delete account',
  'settings.deleteTitle': 'Delete your account',
  'settings.deleteMessage':
    'Your posts, tasks, points and teams are all removed. This cannot be undone.',
  'settings.deleted': 'Your account is deleted',

  'settings.app': 'App',
  'settings.invite': 'Invite a friend',
  'settings.inviteText':
    'Join me on Tünel — train with your team, take on tasks, climb the leaderboard.',
  'settings.contact': 'Send feedback',
  'settings.contactSubject': 'Tünel feedback',
  'settings.clearCache': 'Clear cache',
  'settings.clearCacheHint': 'Local copies of photos and videos',
  'settings.cacheCleared': 'Cache cleared',
  'settings.reset': 'Reset settings',
  'settings.resetTitle': 'Reset settings?',
  'settings.resetMessage': 'Theme, language and all preferences go back to default.',
  'settings.resetDone': 'Settings reset',
  'settings.version': 'Version',
  'settings.demoMode': 'Demo mode — Supabase is not connected',

  'profile.settings': 'Settings',
  'profile.streak': 'day streak',
  'profile.longest': 'longest',
  'profile.posts': 'posts',
  'profile.lastWeeks': 'Last 5 weeks',
  'profile.activeDays': '{n} active days',
  'profile.yourTeams': 'Your teams',
  'profile.noTeamTitle': 'You are on your own.',
  'profile.noTeamSub': 'Start a team or join with an invite code — that is where it happens.',
  'profile.captain': 'Captain',
  'profile.member': 'Member',
  'profile.code': 'Code',
  'profile.avatarHint': 'Add a photo — let your team recognise you',
  'profile.avatarUpdated': 'Profile photo updated',
  'profile.records': 'Personal records (PR)',
  'profile.notifications': 'Notifications',
  'profile.joinTeam': 'Join / create a team',
  'profile.captainPanel': 'Captain panel',
  'profile.leaderboard': 'Leaderboard',
  'profile.deleteTeam': 'Delete team',
  'profile.deleteTeamMessage':
    '"{name}" is gone for good: members, tasks, points. This cannot be undone.',
  'profile.teamDeleted': '"{name}" deleted',
};

const DICTS: Record<Lang, Record<TranslationKey, string>> = { tr, en };

export type Vars = Record<string, string | number>;

function format(text: string, vars?: Vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/** Anlık dilde çeviri — React dışında da kullanılabilir. */
export function t(key: TranslationKey, vars?: Vars): string {
  return format(DICTS[getPrefs().lang][key] ?? tr[key] ?? key, vars);
}

/** Dil değişince bileşeni yeniden çizen çeviri hook'u. */
export function useT() {
  const { lang } = usePrefs();
  return (key: TranslationKey, vars?: Vars) =>
    format(DICTS[lang][key] ?? tr[key] ?? key, vars);
}

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'tr', label: 'Türkçe' },
  { id: 'en', label: 'English' },
];
