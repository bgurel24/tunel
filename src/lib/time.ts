// Zaman etiketleri — geçmiş için "2 sa", gelecek için "yarım saate".
// Dil ayarını izler (src/lib/prefs.ts).

import { getPrefs } from '@/lib/prefs';

const LOCALE = { tr: 'tr-TR', en: 'en-US' } as const;

function lang() {
  return getPrefs().lang;
}

export function timeAgo(iso: string): string {
  const tr = lang() === 'tr';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return tr ? 'az önce' : 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} ${tr ? 'dk' : 'm'}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ${tr ? 'sa' : 'h'}`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ${tr ? 'gün' : 'd'}`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} ${tr ? 'hf' : 'w'}`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} ${tr ? 'ay' : 'mo'}`;
  return `${Math.floor(d / 365)} ${tr ? 'yıl' : 'y'}`;
}

/** Antrenman çağrısı için konuşma dilinde geri sayım: "yarım saate", "şu an başlıyor". */
export function timeUntil(iso: string): string {
  const tr = lang() === 'tr';
  const min = Math.round((new Date(iso).getTime() - Date.now()) / 60000);

  if (min <= -60) {
    const h = Math.floor(-min / 60);
    return tr ? `${h} saattir sürüyor` : `going for ${h}h`;
  }
  if (min < -5) return tr ? `${-min} dakikadır başladı` : `started ${-min} min ago`;
  if (min <= 5) return tr ? 'şu an başlıyor' : 'starting now';
  if (min < 25) return tr ? `${min} dakikaya` : `in ${min} min`;
  if (min < 40) return tr ? 'yarım saate' : 'in half an hour';
  if (min < 55) return tr ? `${min} dakikaya` : `in ${min} min`;
  if (min < 75) return tr ? 'bir saate' : 'in an hour';
  if (min < 24 * 60) {
    const h = Math.floor(min / 60);
    const rest = min % 60;
    const half = rest >= 20 && rest <= 40;
    if (tr) return half ? `${h} buçuk saate` : `${h} saate`;
    return half ? `in ${h}.5 hours` : `in ${h} hours`;
  }
  return clockLabel(iso);
}

/**
 * Görev son tarihi: "3 gün kaldı", "bugün son gün", "2 gün geçti".
 * Gün farkı takvim günü üzerinden — saat kalıntısı yüzünden "0 gün" demesin.
 */
export function dueLabel(iso: string): string {
  const tr = lang() === 'tr';
  const days = daysUntil(iso);

  if (days > 1) return tr ? `${days} gün kaldı` : `${days} days left`;
  if (days === 1) return tr ? 'son gün yarın' : 'due tomorrow';
  if (days === 0) return tr ? 'bugün son gün' : 'due today';
  if (days === -1) return tr ? '1 gün geçti' : '1 day overdue';
  return tr ? `${-days} gün geçti` : `${-days} days overdue`;
}

/** Bugünden hedefe kalan takvim günü — geçmişse negatif. */
export function daysUntil(iso: string): number {
  return Math.round(
    (new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000
  );
}

/** Haftanın başı (Pazartesi 00:00). offset 0 bu hafta, -1 geçen hafta. */
export function weekStart(offset = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  // getDay(): 0 Pazar … 6 Cumartesi. Pazartesi'yi 0'a çekiyoruz.
  const fromMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - fromMonday + offset * 7);
  return d;
}

/** "28 Tem – 3 Ağu" — rapor başlığı için hafta aralığı. */
export function weekRangeLabel(start: Date): string {
  const locale = LOCALE[lang()];
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}`;
}

/** "20:30" — bugünse yalnız saat, değilse "yarın 20:30" / "3 Ağu 20:30". */
export function clockLabel(iso: string): string {
  const tr = lang() === 'tr';
  const locale = LOCALE[lang()];
  const d = new Date(iso);
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  const dayDiff = Math.round(
    (new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000
  );
  if (dayDiff === 0) return time;
  if (dayDiff === 1) return tr ? `yarın ${time}` : `tomorrow ${time}`;
  return `${d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} ${time}`;
}
