// Göreli zaman etiketi (ör. "az önce", "2 sa", "3 gün").

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
