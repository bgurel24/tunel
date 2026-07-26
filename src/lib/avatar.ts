// Kullanıcı adından deterministik avatar gradyanı (her kullanıcı farklı ama şık renk).

const PAIRS: [string, string][] = [
  ['#FF3D71', '#FF8A3D'], // marka (magenta-turuncu)
  ['#7F77DD', '#534AB7'], // mor
  ['#1D9E75', '#0F6E56'], // teal
  ['#378ADD', '#185FA5'], // mavi
  ['#D4537E', '#993556'], // pembe
  ['#EF9F27', '#BA7517'], // amber
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
