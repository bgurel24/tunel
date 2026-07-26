// Gizlilik politikası ve kullanım şartları metinleri (TR/EN).
//
// Uygulama içinde `src/app/yasal.tsx` bunları gösterir. Mağaza başvurusunda
// istenen HALKA AÇIK URL için aynı metinlerin HTML kopyası `docs/` klasöründe
// duruyor (GitHub Pages ile yayınlanabilir) — metni burada değiştirirsen
// oradakini de güncelle.

import type { Lang } from '@/lib/prefs';

export type LegalDoc = 'privacy' | 'terms';

export type LegalSection = { heading: string; body: string[] };
export type LegalContent = { title: string; updated: string; intro: string; sections: LegalSection[] };

/** Metinlerin son güncellenme tarihi — değişiklik yaparsan güncelle. */
export const LEGAL_UPDATED = '2026-07-27';

export const CONTACT_EMAIL = 'burakgurel81@gmail.com';

const tr: Record<LegalDoc, LegalContent> = {
  privacy: {
    title: 'Gizlilik Politikası',
    updated: 'Son güncelleme: 27 Temmuz 2026',
    intro:
      'Tünel, takımınla antrenman paylaşmak için yapılmış bir uygulamadır. Bu metin hangi verini aldığımızı, neden aldığımızı ve nasıl sildirebileceğini anlatır.',
    sections: [
      {
        heading: 'Topladığımız veriler',
        body: [
          'Hesap bilgileri: e-posta adresin, kullanıcı adın ve şifrenin şifrelenmiş hâli.',
          'Paylaştıkların: fotoğraflar, videolar, açıklamalar, yorumlar, antrenman etiketleri, kişisel rekorlar, görev kanıtları ve takım üyeliklerin.',
          'Kullanım verisi: paylaşım zamanları gibi uygulamanın çalışması için gereken kayıtlar.',
          'Konumunu, rehberini veya sağlık uygulamalarındaki verilerini almıyoruz.',
        ],
      },
      {
        heading: 'Verini neden kullanıyoruz',
        body: [
          'Akışı, takım sayfalarını, liderlik tablosunu ve profilini oluşturmak için.',
          'Görev kanıtlarını kaptanın onayına sunmak için.',
          'Kural ihlallerini incelemek ve şikayetleri değerlendirmek için.',
          'Verini reklam amacıyla kullanmıyoruz ve satmıyoruz.',
        ],
      },
      {
        heading: 'Verinin saklandığı yer',
        body: [
          'Veriler Supabase (PostgreSQL ve dosya depolama) üzerinde tutulur. Supabase bu hizmeti bizim adımıza sağlayan altyapı sağlayıcısıdır.',
          'Bağlantılar şifrelidir; medya dosyaların yalnızca uygulama üzerinden erişilebilen bağlantılarla sunulur.',
        ],
      },
      {
        heading: 'Kimler görebilir',
        body: [
          'Takım akışına attığın paylaşımları takım arkadaşların görür.',
          '“Sosyal”e açtığın paylaşımları uygulamadaki diğer kullanıcılar görebilir.',
          'Ayarlar > Gizli profil açıkken paylaşımlarını ve rekorlarını yalnızca takım arkadaşların görür.',
        ],
      },
      {
        heading: 'Verini silme',
        body: [
          'Tek tek paylaşımlarını istediğin an silebilirsin.',
          'Ayarlar > Hesabı sil ile hesabın ve ona bağlı her şey (paylaşımlar, yorumlar, rekorlar, üyelikler, yüklediğin medya) kalıcı olarak silinir. Bu işlemin geri dönüşü yoktur.',
          `Yardıma ihtiyacın olursa ${CONTACT_EMAIL} adresine yazabilirsin.`,
        ],
      },
      {
        heading: 'Çocuklar',
        body: [
          'Tünel 13 yaşından küçükler için tasarlanmamıştır. 13 yaşından küçük birine ait hesap tespit edersek sileriz.',
        ],
      },
      {
        heading: 'Değişiklikler ve iletişim',
        body: [
          'Bu metni güncellersek üstteki tarih değişir; önemli değişiklikleri uygulama içinde duyururuz.',
          `Sorularını ${CONTACT_EMAIL} adresine iletebilirsin.`,
        ],
      },
    ],
  },
  terms: {
    title: 'Kullanım Şartları',
    updated: 'Son güncelleme: 27 Temmuz 2026',
    intro:
      'Tünel’i kullanarak aşağıdaki kuralları kabul etmiş olursun. Kurallar kısa ve net: burası antrenman yapan insanların alanı.',
    sections: [
      {
        heading: 'Hesabın',
        body: [
          'Hesap açmak için en az 13 yaşında olmalısın.',
          'Şifrenin güvenliği sana ait; hesabında yapılan işlemlerden sen sorumlusun.',
          'Başkasının adına ya da sahte kimlikle hesap açamazsın.',
        ],
      },
      {
        heading: 'Kabul edilmeyen içerik',
        body: [
          'Taciz, tehdit, nefret söylemi, ayrımcılık.',
          'Cinsel içerik, çıplaklık, şiddet içeren veya rahatsız edici görüntüler.',
          'Spam, dolandırıcılık, yasa dışı ürün veya madde tanıtımı.',
          'Başkasının fotoğrafını, videosunu veya kimliğini izinsiz kullanmak.',
          'Tehlikeli antrenman tavsiyelerini “profesyonel tavsiye” gibi sunmak.',
        ],
      },
      {
        heading: 'Sıfır tolerans',
        body: [
          'Kabul edilmeyen içeriğe karşı sıfır tolerans uygulanır.',
          'Her paylaşımı ve kullanıcıyı “…” menüsünden şikayet edebilir, istemediğin kişiyi engelleyebilirsin.',
          'Bildirilen içerik 24 saat içinde incelenir; kural dışıysa kaldırılır ve gerekirse hesap kapatılır.',
          'Engellediğin kişilerin paylaşımları ve yorumları sana görünmez.',
        ],
      },
      {
        heading: 'Senin içeriğin',
        body: [
          'Paylaştığın içerik sana aittir.',
          'Paylaşımını uygulamada göstermemiz için bize sınırlı bir kullanım izni vermiş olursun; içeriğini silersen bu izin de sona erer.',
        ],
      },
      {
        heading: 'Sağlık uyarısı',
        body: [
          'Tünel bir spor takibi ve sosyal uygulamadır, sağlık hizmeti değildir.',
          'Uygulamadaki görevler, rekorlar ve paylaşımlar tıbbi tavsiye yerine geçmez. Antrenman kararlarını kendi sorumluluğunda alırsın.',
        ],
      },
      {
        heading: 'Hesabın kapatılması',
        body: [
          'Kuralları ihlal eden hesapları uyarmadan askıya alabilir veya kapatabiliriz.',
          'Sen de dilediğin an Ayarlar > Hesabı sil ile ayrılabilirsin.',
        ],
      },
      {
        heading: 'İletişim',
        body: [`Sorular ve bildirimler için: ${CONTACT_EMAIL}`],
      },
    ],
  },
};

const en: Record<LegalDoc, LegalContent> = {
  privacy: {
    title: 'Privacy Policy',
    updated: 'Last updated: 27 July 2026',
    intro:
      'Tünel is an app for training with your team. This page explains what data we collect, why we collect it, and how you can delete it.',
    sections: [
      {
        heading: 'What we collect',
        body: [
          'Account details: your email address, username and a hashed version of your password.',
          'What you post: photos, videos, captions, comments, workout tags, personal records, task proofs and your team memberships.',
          'Usage data: records the app needs to work, such as when a post was created.',
          'We do not collect your location, your contacts or data from health apps.',
        ],
      },
      {
        heading: 'Why we use it',
        body: [
          'To build your feed, team pages, leaderboard and profile.',
          'To show task proofs to your captain for approval.',
          'To review reports and enforce the rules.',
          'We do not sell your data and we do not use it for advertising.',
        ],
      },
      {
        heading: 'Where it is stored',
        body: [
          'Data is stored on Supabase (PostgreSQL and file storage), our infrastructure provider.',
          'Connections are encrypted and your media is served through links used by the app.',
        ],
      },
      {
        heading: 'Who can see it',
        body: [
          'Posts you share to the team feed are visible to your teammates.',
          'Posts you share to “Social” can be seen by other people on the app.',
          'With Settings > Private profile turned on, only teammates can see your posts and records.',
        ],
      },
      {
        heading: 'Deleting your data',
        body: [
          'You can delete any of your posts at any time.',
          'Settings > Delete account permanently removes your account and everything tied to it: posts, comments, records, memberships and uploaded media. This cannot be undone.',
          `If you need help, write to ${CONTACT_EMAIL}.`,
        ],
      },
      {
        heading: 'Children',
        body: [
          'Tünel is not designed for children under 13. If we find an account belonging to someone under 13, we delete it.',
        ],
      },
      {
        heading: 'Changes and contact',
        body: [
          'If we update this policy the date above changes; significant changes are announced in the app.',
          `Questions: ${CONTACT_EMAIL}`,
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of Use',
    updated: 'Last updated: 27 July 2026',
    intro:
      'By using Tünel you agree to the rules below. They are short: this is a place for people who train.',
    sections: [
      {
        heading: 'Your account',
        body: [
          'You must be at least 13 years old to create an account.',
          'Keep your password safe — you are responsible for what happens on your account.',
          'Do not impersonate anyone or create an account under a false identity.',
        ],
      },
      {
        heading: 'Content that is not allowed',
        body: [
          'Harassment, threats, hate speech or discrimination.',
          'Sexual content, nudity, violent or otherwise disturbing imagery.',
          'Spam, scams or promotion of illegal goods and substances.',
          "Using someone else's photo, video or identity without permission.",
          'Presenting dangerous training advice as professional guidance.',
        ],
      },
      {
        heading: 'Zero tolerance',
        body: [
          'There is zero tolerance for objectionable content and abusive users.',
          'You can report any post or user from the “…” menu, and block anyone you do not want to see.',
          'Reported content is reviewed within 24 hours; if it breaks the rules it is removed and the account may be closed.',
          'Posts and comments from people you block are hidden from you.',
        ],
      },
      {
        heading: 'Your content',
        body: [
          'You own the content you post.',
          'You give us a limited licence to display it inside the app; deleting your content ends that licence.',
        ],
      },
      {
        heading: 'Health notice',
        body: [
          'Tünel is a training log and social app, not a health service.',
          'Tasks, records and posts are not medical advice. Training decisions are your own responsibility.',
        ],
      },
      {
        heading: 'Account termination',
        body: [
          'We may suspend or close accounts that break these rules, without prior notice.',
          'You can leave at any time with Settings > Delete account.',
        ],
      },
      {
        heading: 'Contact',
        body: [`Questions and reports: ${CONTACT_EMAIL}`],
      },
    ],
  },
};

const DOCS: Record<Lang, Record<LegalDoc, LegalContent>> = { tr, en };

export function legalContent(doc: LegalDoc, lang: Lang): LegalContent {
  return DOCS[lang][doc];
}
