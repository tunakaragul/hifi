
'use strict';

/* ══════════════════════════════════════════════════════════════
   ✏ İÇERİK — buradaki her şey ÖRNEKTİR, kendi bilgilerinle değiştir
══════════════════════════════════════════════════════════════ */
const CONFIG = {
  barName: 'VINYL ROOM',
  tagline: 'hi-fi listening bar',
  phone: '+90 555 000 00 00',
  whatsapp: '905550000000',                         // ülke kodu ile, + ve boşluk olmadan
  address: 'Örnek Mah. Plak Sk. No:12, Beyoğlu, İstanbul',
  hours: [['Pzt – Per', '18:00 – 01:00'], ['Cum – Cmt', '18:00 – 03:00'], ['Pazar', 'Kapalı']],
  currency: '₺',
  menu: [
    { side: 'A', title: 'İÇECEKLER', items: [
      ['Old Fashioned', 'Bourbon, şeker, bitter, portakal kabuğu', 340],
      ['Negroni', 'Cin, vermut, campari', 320],
      ['Highball', 'Japon viskisi, soda, limon', 360],
      ['Natürel Şarap', 'Kadeh, günün seçimi', 280],
      ['El Yapımı Limonata', 'Nane, zencefil', 140],
      ['Filtre Kahve', 'Günün çekirdeği', 110],
    ]},
    { side: 'B', title: 'YEMEKLER', items: [
      ['Peynir Tabağı', 'Üç peynir, bal, ceviz, kraker', 380],
      ['Bruschetta', 'Domates, fesleğen, zeytinyağı', 190],
      ['Trüflü Patates', 'Parmesan, taze otlar', 220],
      ['Charcuterie', 'Seçili şarküteri, turşu, ekmek', 460],
    ]},
  ],
  events: [
    { d: '12', m: 'EKİM', day: 'CUMA',  title: 'Vinyl Night: 70s Soul', desc: 'Sadece plaklarla, baştan sona soul gecesi. Konuk DJ.', time: '21:00' },
    { d: '19', m: 'EKİM', day: 'CUMA',  title: 'Dinleme Seansı: Jazz Klasikleri', desc: 'Albüm baştan sona, sessizlikte. Rezervasyon önerilir.', time: '20:00' },
    { d: '26', m: 'EKİM', day: 'CUMA',  title: 'Plak Takası', desc: 'Plaklarını getir, değiş tokuş et.', time: '19:00' },
  ],
  about: {
    story: 'Burada müzik arka plan değil, programın kendisi. Plaklar çalar, ses sistemi iyi kurulmuş bir odada dinlenir. Konuşmak serbest, ama önce bir plak dinleyin.',
    system: [['Pikap', 'Doğrudan tahrikli'], ['Amfi', 'Örnek model'], ['Hoparlör', 'Örnek model'], ['Oda', 'Akustik paneller']],
  },
};

/* sayfalar = plaklar */
const PAGES = [
  { id: 'menu',    title: 'MENÜ',        sub: 'İçecek & Yemek',       c1: '#2a140c', c2: '#e0a458', art: 'circles', tint: [9,9,9] },
  { id: 'events',  title: 'ETKİNLİK',    sub: 'Bu ay çalacaklar',     c1: '#2b1119', c2: '#e0685a', art: 'waves',   tint: [46,10,14] },
  { id: 'reserve', title: 'REZERVASYON', sub: 'Yerini ayırt',         c1: '#12261f', c2: '#8fbf9f', art: 'stripes', tint: [8,30,22] },
  { id: 'about',   title: 'HAKKIMIZDA',  sub: 'Ses sistemi & hikaye', c1: '#2a2216', c2: '#d8c08a', art: 'sun',     tint: [52,30,6] },
];
