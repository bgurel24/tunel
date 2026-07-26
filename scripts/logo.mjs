// Tünel logosunu (bağcıklar düzeltilmiş, Rafine Ember paleti) SVG olarak üretir.
export function mark({ sw = 1, ball = '#FFFFFF' } = {}) {
  const spokes = [
    [271.4, 154, 306.2, 141.4], [243.6, 117.8, 264.8, 87.5], [200, 104, 200, 67],
    [156.4, 117.8, 135.2, 87.5], [128.6, 154, 93.8, 141.4],
    [88, 252, 126, 252], [88, 312, 126, 312], [274, 252, 312, 252], [274, 312, 312, 312],
  ].map(([x1, y1, x2, y2]) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="url(#tg)" stroke-width="${2.4 * sw}" stroke-linecap="round"/>`
  ).join('');

  const laces = [188, 196, 204, 212].map(
    (x) => `<line x1="${x}" y1="207" x2="${x}" y2="221" stroke="${ball}" stroke-width="${3 * sw}" stroke-linecap="round"/>`
  ).join('');

  return `<svg viewBox="60 40 280 345" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <defs><linearGradient id="tg" x1="0.12" y1="0.05" x2="0.9" y2="1">
    <stop offset="0" stop-color="#FF3D71"/><stop offset="0.5" stop-color="#FF6B4A"/><stop offset="1" stop-color="#FF8A3D"/>
  </linearGradient></defs>
  <path d="M88 366 L88 176 A112 112 0 0 1 312 176 L312 366" fill="none" stroke="url(#tg)" stroke-width="${4.5 * sw}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M126 366 L126 186 A74 74 0 0 1 274 186 L274 366" fill="none" stroke="url(#tg)" stroke-width="${3.5 * sw}" stroke-linecap="round" stroke-linejoin="round"/>
  ${spokes}
  <line x1="190" y1="242" x2="150" y2="362" stroke="url(#tg)" stroke-width="${3.2 * sw}" stroke-linecap="round"/>
  <line x1="210" y1="242" x2="250" y2="362" stroke="url(#tg)" stroke-width="${3.2 * sw}" stroke-linecap="round"/>
  <line x1="200" y1="246" x2="200" y2="362" stroke="url(#tg)" stroke-width="${3.4 * sw}" stroke-dasharray="7 12" stroke-linecap="round"/>
  <ellipse cx="200" cy="214" rx="34" ry="20" fill="none" stroke="${ball}" stroke-width="${3 * sw}"/>
  <line x1="184" y1="214" x2="216" y2="214" stroke="${ball}" stroke-width="${3 * sw}" stroke-linecap="round"/>
  ${laces}
  <line x1="176" y1="208" x2="176" y2="220" stroke="${ball}" stroke-width="${3 * sw}" stroke-linecap="round"/>
  <line x1="224" y1="208" x2="224" y2="220" stroke="${ball}" stroke-width="${3 * sw}" stroke-linecap="round"/>
</svg>`;
}
