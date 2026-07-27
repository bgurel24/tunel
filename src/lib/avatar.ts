// Kullanıcı adından deterministik avatar gradyanı (her kullanıcı farklı ama şık renk).

// Kasıtlı olarak mat/koyu tonlar: avatar bir imza, neon bir rozet değil.
// Feed'de yan yana dizildiklerinde gökkuşağı değil sakin bir doku oluşturmalı.
const PAIRS: [string, string][] = [
  ['#B0486B', '#C25E42'], // marka (soluk magenta-turuncu)
  ['#655FB5', '#4A4491'], // mor
  ['#2E8468', '#1E6350'], // teal
  ['#3E76B4', '#2B568C'], // mavi
  ['#A85579', '#7E3D59'], // pembe
  ['#B08036', '#8A6224'], // amber
];

export function avatarGradient(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PAIRS[h % PAIRS.length];
}

/** Fotoğrafı olmayan kullanıcı için baş harfler ("burak_g" → "BU"). */
export function initialsOf(username: string): string {
  const letters = username.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ]/g, '');
  return (letters.slice(0, 2) || username.slice(0, 2)).toUpperCase();
}
