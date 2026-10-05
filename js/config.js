
'use strict';

/* ══════════════════════════════════════════════════════════════
   ✏ İÇERİK — buradaki her şey ÖRNEKTİR, kendi bilgilerinle değiştir
══════════════════════════════════════════════════════════════ */
const CONFIG = {
  barName: 'VINYL ROOM',
  tagline: 'hi-fi listening bar',
  phone: '+90 555 000 00 00',
  email: 'hello@vinylroom.example',
  whatsapp: '905550000000',                         // ülke kodu ile, + ve boşluk olmadan
  address: 'Örnek Mah. Plak Sk. No:12, Beyoğlu, İstanbul',
  
  hours: [['Sal – Per', '18:00 – 01:00'], ['Cum – Cmt', '18:00 – 03:00'], ['Pazar', '18:00 – 01:00'], ['Pazartesi', 'Kapalı']],
  currency: '₺',

  /* Menü: bölüm (code) → grup → ürün
     Ürün: n = isim, d = açıklama, p = fiyat, t = etiket (isteğe bağlı)
     Fiyat tek sayı olabilir (120) veya liste [['33 cl', 130], ['50 cl', 180]] */
  menu: [
    { code: 'A', tab: 'A Yüzü', sub: 'Kokteyller', title: 'Kokteyller', groups: [
      { name: 'Signature', items: [
        { n: 'Blue Note',     d: 'Cin, lavanta, limon, tonik',          p: 380, t: 'Ferah' },
        { n: 'Side B',        d: 'Mezcal, ananas, acı biber, lime',     p: 400, t: 'Acı' },
        { n: 'Tonearm',       d: 'Viski, hurma şurubu, kahve, bitter',  p: 420 },
        { n: 'Dust & Groove', d: 'Rom, tarçın, kakao, portakal',        p: 390 },
        { n: 'Mono Mix',      d: 'Votka, yeşil elma, nane, zencefil',   p: 360, t: 'Ferah' },
      ]},
      { name: 'Klasik', items: [
        { n: 'Old Fashioned',    d: 'Bourbon, şeker, bitter, portakal kabuğu', p: 340 },
        { n: 'Negroni',          d: 'Cin, vermut, campari',                    p: 320 },
        { n: 'Margarita',        d: 'Tekila, triple sec, lime, tuz',           p: 340 },
        { n: 'Espresso Martini', d: 'Votka, kahve likörü, espresso',           p: 360 },
        { n: 'Whisky Sour',      d: 'Viski, limon, şeker, yumurta akı',        p: 350 },
      ]},
    ]},
    { code: 'B', tab: 'B Yüzü', sub: 'Bira & Şarap', title: 'Bira & Şarap', groups: [
      { name: 'Fıçı bira', items: [
        { n: 'Pilsner',  d: 'Çek tarzı lager · %4,8',                  p: [['33 cl', 130], ['50 cl', 180]] },
        { n: 'Pale Ale', d: 'Narenciye notaları · %5,2',               p: [['33 cl', 140], ['50 cl', 190]] },
        { n: 'IPA',      d: 'Reçineli, acı · %6,2',                    p: [['33 cl', 150], ['50 cl', 200]] },
        { n: 'Weizen',   d: 'Buğday birası, muz ve karanfil · %5,0',   p: [['33 cl', 140], ['50 cl', 190]] },
        { n: 'Stout',    d: 'Kahve ve kakao notaları · %5,5',          p: [['33 cl', 150], ['50 cl', 200]] },
      ]},
      { name: 'Şarap', items: [
        { n: 'Narince',        d: 'Beyaz · Tokat · taze, mineral',      p: [['Kadeh', 220], ['Şişe', 880]] },
        { n: 'Kalecik Karası', d: 'Kırmızı · Ankara · hafif, meyveli',  p: [['Kadeh', 240], ['Şişe', 960]] },
        { n: 'Öküzgözü',       d: 'Kırmızı · Elazığ · orta gövde',      p: [['Kadeh', 260], ['Şişe', 1040]] },
        { n: 'Roze',           d: 'Roze · Ege · kuru, ferah',           p: [['Kadeh', 220], ['Şişe', 880]] },
        { n: 'Pet-Nat',        d: 'Köpüklü · doğal fermantasyon',       p: [['Kadeh', 260], ['Şişe', 1040]] },
      ]},
    ]},
    { code: 'C', tab: 'Aperatif', sub: 'Soğuk', title: 'Aperatif', groups: [
      { name: '', items: [
        { n: 'Gilda',                 d: 'Hamsi, zeytin, biber şişi',         p: 120 },
        { n: 'Marine Zeytin & Badem', d: 'Kaya tuzu, kekik',                  p: 110, t: 'V' },
        { n: 'Konserve Sardalya',     d: 'Ekmek, tereyağı, limon',            p: 240 },
        { n: 'Peynir & Şarküteri',    d: 'Seçili peynirler, şarküteri, bal',  p: 420 },
        { n: 'Cornichon & Kraker',    d: 'Küçük turşu, çıtır kraker',         p: 90,  t: 'V' },
      ]},
    ]},
  ],

  
  /* TAKVİM — her ay sadece 'month' ve etkinlikleri güncelle
     month: 'YYYY-AA' · closedDay: 0 Pazar, 1 Pazartesi ... 6 Cumartesi
     events: tek seferlik etkinlik (aynı güne weekly de denk gelirse bu kazanır)
     weekly: her hafta tekrar eden etkinlik, day = haftanın günü (3 = Çarşamba) */
  calendar: { month: '2026-10', closedDay: 1 },
  events: [
    { date: '2026-10-02', time: '21:00', title: 'Vinyl Night: 70s Soul',      desc: 'Sadece plaklarla, baştan sona soul gecesi. Konuk DJ.', color: '#e0685a' },
    { date: '2026-10-09', time: '20:00', title: 'Dinleme Seansı: Jazz',       desc: 'Albüm baştan sona, sessizlikte. Rezervasyon önerilir.', color: '#8fbf9f' },
    { date: '2026-10-10', time: '22:00', title: 'Konuk DJ: Disco Night',      desc: 'Dans pistine geçmeden önce ısınma plakları.',          color: '#b9a4e0' },
    { date: '2026-10-17', time: '19:00', title: 'Plak Takası',                desc: 'Plaklarını getir, değiş tokuş et.',                    color: '#d8c08a' },
    { date: '2026-10-23', time: '20:00', title: 'Dinleme Seansı: Ambient',    desc: 'Işıklar kısık, ses sistemi sonuna kadar açık.',        color: '#7fc4d8' },
    { date: '2026-10-24', time: '21:00', title: 'Vinyl Night: 90s Hip-Hop',   desc: 'Bir gece boyunca sadece 90lar.',                       color: '#e0a458' },
    { date: '2026-10-30', time: '21:00', title: 'Karanlık Dalga Gecesi',      desc: 'Post-punk ve dark wave plakları.',                     color: '#e0685a' },
  ],
  weekly: [
    { day: 3, time: '20:00', title: 'Sürpriz Plak Çarşambası', desc: 'Her çarşamba bir sürpriz plak. Sırayı misafirler seçer.', color: '#f0d56a' },
  ],

  about: {
    story: 'Burada müzik arka plan değil, programın kendisi. Plaklar çalar, ses sistemi iyi kurulmuş bir odada dinlenir. Konuşmak serbest, ama önce bir plak dinleyin.',
    system: [['Pikap', 'Doğrudan tahrikli'], ['Amfi', 'Örnek model'], ['Hoparlör', 'Örnek model'], ['Oda', 'Akustik paneller']],
  },
};

/* sayfalar = plaklar (c1, art, tint, sub: 3D tarafı kullanır, dokunma) */
const PAGES = [
  { id: 'menu',    title: 'MENÜ',        sub: 'İçecek & Aperatif',    c1: '#2a140c', c2: '#e0a458', art: 'circles', tint: [9,9,9] },
  { id: 'events',  title: 'ETKİNLİK',    sub: 'Bu ay çalacaklar',     c1: '#2b1119', c2: '#e0685a', art: 'waves',   tint: [46,10,14] },
  { id: 'reserve', title: 'REZERVASYON', sub: 'Yerini ayırt',         c1: '#12261f', c2: '#8fbf9f', art: 'stripes', tint: [8,30,22] },
  { id: 'about',   title: 'HAKKIMIZDA',  sub: 'Ses sistemi & hikaye', c1: '#2a2216', c2: '#d8c08a', art: 'sun',     tint: [52,30,6] },
];
