// Takım ekranlarında gösterilecek ad: gerçek ad varsa o, yoksa kullanıcı adı.
// Rastgele takma adlar ("pump_king_34") kaptan için anlamsızdı; kayıtta
// alınan Ad Soyad öne çıkıyor, kullanıcı adı yedekte kalıyor.

export type Nameable = { username?: string | null; full_name?: string | null };

export function displayName(p: Nameable | null | undefined, fallback = '—'): string {
  const full = p?.full_name?.trim();
  if (full) return full;
  const u = p?.username?.trim();
  return u || fallback;
}
