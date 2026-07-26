// Zaman etiketleri — geçmiş için "2 sa", gelecek için "yarım saate".

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return 'az önce';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} gün`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} hf`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} ay`;
  return `${Math.floor(d / 365)} yıl`;
}

/** Antrenman çağrısı için konuşma dilinde geri sayım: "yarım saate", "şu an başladı". */
export function timeUntil(iso: string): string {
  const min = Math.round((new Date(iso).getTime() - Date.now()) / 60000);

  if (min <= -60) return `${Math.floor(-min / 60)} saattir sürüyor`;
  if (min < -5) return `${-min} dakikadır başladı`;
  if (min <= 5) return 'şu an başlıyor';
  if (min < 25) return `${min} dakikaya`;
  if (min < 40) return 'yarım saate';
  if (min < 55) return `${min} dakikaya`;
  if (min < 75) return 'bir saate';
  if (min < 24 * 60) {
    const h = Math.floor(min / 60);
    const rest = min % 60;
    return rest >= 20 && rest <= 40 ? `${h} buçuk saate` : `${h} saate`;
  }
  return clockLabel(iso);
}

/** "20:30" — bugünse yalnız saat, değilse "yarın 20:30" / "3 Ağu 20:30". */
export function clockLabel(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const dayDiff = Math.round(
    (new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000
  );
  if (dayDiff === 0) return time;
  if (dayDiff === 1) return `yarın ${time}`;
  return `${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} ${time}`;
}
