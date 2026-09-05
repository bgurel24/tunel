// Web'in HTML kabuğu — yalnızca `expo export -p web` çıktısında kullanılır,
// native tarafı hiç görmez.
//
// Buradaki iş çoğunlukla iOS Safari için: "Ana Ekrana Ekle" dendiğinde uygulama
// gibi açılsın (adres çubuğu olmadan), doğru ikonla ve doğru isimle görünsün.

import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const BG = '#08080B';

/**
 * Gövde arka planı burada elle veriliyor: React ağacı basılmadan önceki ilk
 * karede beyaz bir yanıp sönme oluyordu, koyu temada göze batıyor.
 *
 * `overscroll-behavior: none` → sayfayı sonuna kadar çekince tarayıcının
 * lastik efekti / yenile hareketi devreye girmesin, uygulama hissi bozulmasın.
 *
 * Geri kalanı iOS Safari'yi "web sayfası" gibi davranmaktan vazgeçirmek için:
 *   user-select      → basılı tutunca metin seçilip mavi tutamaklar çıkmasın
 *   touch-callout    → basılı tutunca kopyala/paylaş/önizleme balonu açılmasın
 *   tap-highlight    → her dokunuşta gri kutu yanıp sönmesin
 *   touch-action     → çift dokunuşla sayfa zıplayarak yakınlaşmasın
 *                      (parmakla yakınlaştırma açık kalıyor, erişilebilirlik için)
 *
 * Yazı alanları bunun dışında: orada seçim ve kopyala/yapıştır çalışmalı.
 */
const rawStyles = `
  html, body { background-color: ${BG}; }
  body {
    overscroll-behavior: none;
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  input, textarea, [contenteditable="true"] {
    -webkit-user-select: text;
    user-select: text;
    -webkit-touch-callout: default;
  }

  /* Açılış perdesi — aşağıdaki açıklamaya bak. */
  #ilk-yukleme {
    position: fixed; inset: 0; z-index: 9999;
    background: ${BG}; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 22px;
    transition: opacity .25s ease;
  }
  #ilk-yukleme.bitti { opacity: 0; pointer-events: none; }
  #ilk-yukleme .halka {
    width: 26px; height: 26px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.14); border-top-color: #FF6B4A;
    animation: don .8s linear infinite;
  }
  @keyframes don { to { transform: rotate(360deg); } }
  #ilk-yukleme .gec {
    color: #9C9CA8; font-size: 14px; text-align: center; max-width: 260px;
    line-height: 1.5; display: none;
  }
  #ilk-yukleme .gec button {
    margin-top: 12px; background: #1C1C24; color: #F5F5F8;
    border: 0; border-radius: 999px; padding: 10px 22px; font-size: 14px;
  }
`;

/**
 * Perdeyi kaldıran betik. React kök öğeye ilk çocuğu ekleyince perde iner.
 * `defer` ile yüklenen paket bundan sonra çalıştığı için gözlemciyi burada
 * kurmak güvenli — kök zaten doluysa da hemen kapatıyoruz.
 */
const bootScript = `
(function () {
  var perde = document.getElementById('ilk-yukleme');
  var kok = document.getElementById('root');
  if (!perde || !kok) return;

  var kapandi = false;
  function kapat() {
    if (kapandi) return;
    kapandi = true;
    perde.className = 'bitti';
    setTimeout(function () { perde.remove(); }, 300);
  }

  if (kok.firstChild) { kapat(); return; }

  new MutationObserver(function (_m, gozlemci) {
    if (kok.firstChild) { gozlemci.disconnect(); kapat(); }
  }).observe(kok, { childList: true });

  var yenile = document.getElementById('ilk-yukleme-yenile');
  if (yenile) yenile.addEventListener('click', function () { location.reload(); });

  setTimeout(function () {
    if (kapandi) return;
    var gec = document.getElementById('ilk-yukleme-gec');
    if (gec) gec.style.display = 'block';
  }, 12000);
})();
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="tr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover → çentikli telefonlarda güvenli alan hesabı doğru çalışsın */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />

        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content={BG} />

        {/* iOS ana ekran kısayolu — Safari manifest'i tam okumuyor, bunlar şart */}
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Tünel" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Expo Router'ın web'de kaydırmayı düzelten sıfırlaması */}
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: rawStyles }} />
      </head>
      <body>
        {children}

        {/*
          Açılış perdesi. Uygulama paketi sıkıştırılmış halde ~840 KB; inip
          çalışana kadar ekranda hiçbir şey yoktu, kullanıcı kapkara bir sayfa
          görüp "açılmadı" diye yeniliyordu. Üstelik iOS "Ana Ekrana Ekle"
          sırasında ikonu o an indirdiği için, sayfa daha yüklenmeden eklenince
          simge yerine "T" harfi çıkıyordu.

          Bu blok HTML'in içinde geldiği için ilk karede görünür — JavaScript
          beklemez. React kök öğeye çizdiği anda kalkar; hiç çizemezse 12 saniye
          sonra yenileme düğmesi verir, kullanıcı boşluğa bakmaz.
        */}
        <div id="ilk-yukleme">
          <svg width="76" height="94" viewBox="60 40 280 345" aria-hidden="true">
            <defs>
              <linearGradient id="acilis-g" x1="0.12" y1="0.05" x2="0.9" y2="1">
                <stop offset="0" stopColor="#FF3D71" />
                <stop offset="0.5" stopColor="#FF6B4A" />
                <stop offset="1" stopColor="#FF8A3D" />
              </linearGradient>
            </defs>
            <path
              d="M88 366 L88 176 A112 112 0 0 1 312 176 L312 366"
              fill="none"
              stroke="url(#acilis-g)"
              strokeWidth={9}
              strokeLinecap="round"
            />
            <path
              d="M126 366 L126 186 A74 74 0 0 1 274 186 L274 366"
              fill="none"
              stroke="url(#acilis-g)"
              strokeWidth={7}
              strokeLinecap="round"
            />
            <ellipse
              cx={200}
              cy={214}
              rx={34}
              ry={20}
              fill="none"
              stroke="#F5F5F8"
              strokeWidth={6}
            />
          </svg>
          <div className="halka" />
          <div className="gec" id="ilk-yukleme-gec">
            Bağlantı yavaş görünüyor.
            <br />
            <button type="button" id="ilk-yukleme-yenile">
              Yeniden dene
            </button>
          </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </body>
    </html>
  );
}
