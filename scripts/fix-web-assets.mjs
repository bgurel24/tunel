// Web derlemesi sonrası varlık yollarını düzeltir.
//
// SORUN
// Expo, paketten gelen varlıkları (fontlar, ikonlar, navigasyon görselleri)
// `dist/assets/node_modules/...` altına koyuyor. Netlify — ve genel olarak çoğu
// statik yayın aracı — yüklerken `node_modules` adlı klasörleri atlıyor. Sonuç:
// dosyalar sitede 404 dönüyor, bütün fontlar sessizce kayboluyor. Yazılar sistem
// fontuna düşüyor (fark edilmesi zor), ikonlar boş kare çıkıyor (fark edilmesi kolay).
//
// ÇÖZÜM
// Klasörü `assets/vendor` diye yeniden adlandır, sonra paketteki ve HTML'lerdeki
// referansları da aynı şekilde güncelle.
//
// Kullanım:  npm run build:web   (expo export'tan sonra kendiliğinden çalışır)

import { createHash } from 'node:crypto';
import { readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const DIST = 'dist';
const ESKI = 'assets/node_modules';
const YENI = 'assets/vendor';

const DUZENLENECEK = ['.js', '.html', '.json', '.map'];

const PAKET_DIZIN = join(DIST, '_expo/static/js/web');

async function* dosyalar(dizin) {
  for (const girdi of await readdir(dizin, { withFileTypes: true })) {
    const yol = join(dizin, girdi.name);
    if (girdi.isDirectory()) yield* dosyalar(yol);
    else yield yol;
  }
}

async function main() {
  if (!existsSync(DIST)) {
    console.error(`✗ "${DIST}" yok. Önce: npx expo export --platform web`);
    process.exit(1);
  }

  const kaynak = join(DIST, ESKI);
  const hedef = join(DIST, YENI);

  if (existsSync(kaynak)) {
    await rename(kaynak, hedef);
  } else if (!existsSync(hedef)) {
    console.log('· Taşınacak varlık klasörü yok, atlanıyor.');
    return;
  }

  let degisen = 0;
  for await (const yol of dosyalar(DIST)) {
    if (!DUZENLENECEK.some((u) => yol.endsWith(u))) continue;
    const icerik = await readFile(yol, 'utf8');
    if (!icerik.includes(ESKI)) continue;
    await writeFile(yol, icerik.split(ESKI).join(YENI));
    degisen++;
  }

  // Paketin adındaki özet, biz içeriği değiştirmeden önce hesaplanıyor. Adı aynı
  // bırakırsak yayın sunucusu bu dosyaya "bir yıl değişmez" başlığı koyduğu için
  // siteyi daha önce açmış tarayıcılar ESKİ paketi önbellekten kullanmaya devam
  // eder — doğru deploy'a rağmen ekranda hiçbir şey düzelmez. Yeni içeriğe göre
  // yeniden adlandırıp HTML'lerdeki referansları da güncelliyoruz.
  let yenidenAdlandirilan = 0;
  if (existsSync(PAKET_DIZIN)) {
    for (const ad of await readdir(PAKET_DIZIN)) {
      if (!ad.endsWith('.js')) continue;
      const yol = join(PAKET_DIZIN, ad);
      const icerik = await readFile(yol);
      const ozet = createHash('md5').update(icerik).digest('hex');
      const yeniAd = ad.replace(/-[0-9a-f]{32}\.js$/, `-${ozet}.js`);
      if (yeniAd === ad) continue;

      await rename(yol, join(dirname(yol), yeniAd));
      yenidenAdlandirilan++;

      for await (const y of dosyalar(DIST)) {
        if (!y.endsWith('.html') && !y.endsWith('.json')) continue;
        const metin = await readFile(y, 'utf8');
        if (!metin.includes(ad)) continue;
        await writeFile(y, metin.split(ad).join(yeniAd));
      }
    }
  }

  const adet = (await stat(hedef)).isDirectory() ? 'taşındı' : '?';
  console.log(
    `✓ Varlıklar ${YENI} altına ${adet}, ${degisen} dosyada referans güncellendi, ` +
      `${yenidenAdlandirilan} paket önbellek için yeniden adlandırıldı.`
  );
}

main().catch((e) => {
  console.error('✗ Varlık yolu düzeltmesi başarısız:', e);
  process.exit(1);
});
