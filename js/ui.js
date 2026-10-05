
'use strict';

/* ══════════════════════════════════════════════════════════════
   UI KATMANI (3D'den bağımsız — 3D yoksa da çalışır)
══════════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = n => CONFIG.currency + n;

/* 3D tarafı burayı doldurur; 3D yoksa bu boş kalır ve site yine çalışır */
const hooks = {
  want: () => {}, mount: () => {}, view: () => {}, play: () => {}, toggle: () => {},
  labelXY: () => [innerWidth / 2, innerHeight / 2],
  settled: () => true,
};

let pageState = 'closed';       // closed | opening | open | closing
let currentPage = null, afterClose = null, pendingReveal = false;

$('bar').textContent = CONFIG.barName;
$('tag').textContent = CONFIG.tagline;
$('brand').textContent = CONFIG.barName;
document.title = `${CONFIG.barName} — ${CONFIG.tagline}`;

/* alt menü çubuğu + sayfa içi sekmeler */
const chips = [], tabEls = [];
PAGES.forEach(p => {
  const c = document.createElement('button');
  c.className = 'pb'; c.textContent = p.title; c.onclick = () => openPage(p.id);
  $('panel').appendChild(c); chips.push([p.id, c]);
  const t = document.createElement('button');
  t.className = 'tab'; t.textContent = p.title; t.setAttribute('role', 'tab'); t.onclick = () => openPage(p.id);
  $('tabs').appendChild(t); tabEls.push([p.id, t]);
});
{
  const sep = document.createElement('div'); sep.className = 'sep'; $('panel').appendChild(sep);
  const pl = document.createElement('button');
  pl.className = 'pb on'; pl.id = 'bPlay'; pl.textContent = '▶ ■'; pl.title = 'Pikabı başlat / durdur';
  pl.style.flex = '0 0 auto'; pl.onclick = () => hooks.toggle();
  $('panel').appendChild(pl);

  const sb = document.createElement('button');
  sb.className = 'pb on'; sb.id = 'bSnd'; sb.textContent = '♪'; sb.title = 'Plak cızırtısını aç / kapat';
  sb.style.flex = '0 0 auto'; sb.onclick = () => hooks.sound && hooks.sound();
  $('panel').appendChild(sb);
}

function centerTab() {
  const t = $('tabs'), el = t.querySelector('.tab.on'); if (!el) return;
  t.scrollLeft = el.offsetLeft - (t.clientWidth - el.offsetWidth) / 2;
}
function setNavActive(id) {
  chips.forEach(([i, el]) => el.classList.toggle('on', i === id));
  tabEls.forEach(([i, el]) => el.classList.toggle('on', i === id));
  centerTab();
}

function hideHint() { $('hint').classList.add('off'); }

/* ───── Sayfa içerikleri ───── */
const eyebrow = (n, t) => `<div class="eyebrow">N° ${n} — ${t}</div>`;
const kvs  = rows => rows.map(r => `<div class="kv"><span>${r[0]}</span><span>${r[1]}</span></div>`).join('');
const foot = () => `<div class="foot"><span>${CONFIG.barName}</span><span>${CONFIG.address.split(',')[0]}</span></div>`;


/* ───── Takvim yardımcıları ───── */
const DAYS_TR     = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];                       // takvim sütun başlıkları
const DAYNAMES_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']; // Date.getDay() sırası
const MONTHS_TR   = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const pad2 = n => String(n).padStart(2, '0');
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const evColor = e => e.color || 'var(--accent)';

/* ayın her günü için: tarih, haftanın günü, kapalı mı, etkinliği var mı */
function monthData() {
  const [y, m] = CONFIG.calendar.month.split('-').map(Number);       // m: 1–12
  const total = new Date(y, m, 0).getDate();
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;             // ayın 1'inden önce kaç boş hücre (Pazartesi = 0)
  const days = [];
  for (let d = 1; d <= total; d++) {
    const iso = `${y}-${pad2(m)}-${pad2(d)}`;
    const wd = new Date(y, m - 1, d).getDay();
    const closed = wd === CONFIG.calendar.closedDay;
    const ev = closed ? null
      : CONFIG.events.find(e => e.date === iso) || (CONFIG.weekly || []).find(w => w.day === wd) || null;
    days.push({ d, iso, wd, closed, ev });
  }
  return { y, m, lead, days };
}



const R = {
  
  menu(p) {
    /* fiyat: tek sayı → tek fiyat; liste → alt alta etiketli fiyatlar */
    const price = v => Array.isArray(v)
      ? `<span class="pr multi">${v.map(([label, val]) => `<span><small>${label}</small>${fmt(val)}</span>`).join('')}</span>`
      : `<span class="pr">${fmt(v)}</span>`;

    const cols = CONFIG.menu.map(sec => {
      let count = 0;                                  // A1, A2... gruplar arasında devam eder
      const groups = sec.groups.map(g => `
        <div class="grp">
          ${g.name ? `<h3 class="grphead">${g.name}</h3>` : ''}
          <ol class="trklist">${g.items.map(it => { count++; return `
            <li class="trk">
              <span class="no">${sec.code}${count}</span>
              <div class="main">
                <div class="top"><b>${it.n}</b>${it.t ? `<em class="tag">${it.t}</em>` : ''}<span class="dots" aria-hidden="true"></span></div>
                <i class="desc">${it.d}</i>
              </div>
              ${price(it.p)}
            </li>`; }).join('')}
          </ol>
        </div>`).join('');
      return `<section class="col" data-code="${sec.code}" aria-label="${sec.title}">
        <div class="sidehead"><span class="disc" aria-hidden="true">${sec.code}</span>
          <div><h2>${sec.title}</h2><small>${sec.tab}</small></div></div>${groups}</section>`;
    }).join('');

    const switcher = CONFIG.menu.map((sec, i) =>
      `<button type="button" data-code="${sec.code}" aria-pressed="${i === 0}"><b>${sec.title}</b><small>${sec.tab}</small></button>`).join('');

    return `<div class="sides" role="group" aria-label="Menü bölümü seç">${switcher}</div>
      <div class="menu" data-show="${CONFIG.menu[0].code}">${cols}</div>
      <p class="menunote">V = vejetaryen · Alerjen veya özel diyet için lütfen servis ekibimize sorun.</p>
      ${foot()}`;
  },

  
  events(p) {
    const { y, m, lead, days } = monthData();
    const today = todayISO(), closed = CONFIG.calendar.closedDay;
    const monthName = MONTHS_TR[m - 1];

    const heads = DAYS_TR.map((n, i) => `<div class="wd${(i + 1) % 7 === closed ? ' closed' : ''}">${n}</div>`).join('');
    const blanks = '<div class="cell blank" aria-hidden="true"></div>'.repeat(lead);

    /* açılışta seçili gün: bugün veya sonraki etkinlik; yoksa ayın son etkinliği */
    const evDays = days.filter(x => x.ev);
    const sel = (evDays.find(x => x.iso >= today) || evDays[evDays.length - 1] || {}).iso;

    const cells = days.map(x => {
      const cls = ['cell', x.closed && 'closed', x.ev && 'has', x.iso === today && 'today', x.iso < today && 'past'].filter(Boolean).join(' ');
      const inner = `<span class="num">${x.d}</span>`
        + (x.ev ? `<span class="nmx">${x.ev.title}</span>` : '')
        + (x.closed ? '<span class="clx">kapalı</span>' : '');
      return x.ev
        ? `<button type="button" class="${cls}" data-iso="${x.iso}" style="--c:${evColor(x.ev)}" aria-pressed="${x.iso === sel}" aria-label="${x.d} ${monthName}, ${x.ev.title}">${inner}</button>`
        : `<div class="${cls}">${inner}</div>`;
    }).join('');

    const cards = evDays.map(x => `
      <article class="evcard" id="ev-${x.iso}" style="--c:${evColor(x.ev)}"${x.iso === sel ? '' : ' hidden'}>
        <div class="evdate"><b>${x.d}</b><span>${monthName.slice(0, 3)}</span></div>
        <div class="evbody">
          <small>${DAYNAMES_TR[x.wd]} · ${x.ev.time}${x.ev.day !== undefined ? ' · Her hafta' : ''}</small>
          <h3>${x.ev.title}</h3><p>${x.ev.desc}</p>
        </div>
      </article>`).join('');

    return `<div class="hero calhead">
        <h1 class="pt">${monthName} <em>${y}</em></h1>
        <p class="lead">${DAYNAMES_TR[closed]} günleri kapalıyız. Bir güne dokun, detayı gör.</p></div>
      <div class="calwrap">
        <div class="cal" role="group" aria-label="${monthName} ${y} etkinlik takvimi">${heads}${blanks}${cells}</div>
        ${cards || '<p class="evempty">Bu ay için etkinlikler yakında.</p>'}
      </div>${foot()}`;
  },

  
  reserve(p) {
    const tel = CONFIG.phone.replace(/\s/g, '');
    return `<div class="split">
        <div class="cardbox"><h3>İletişim</h3>
          <a class="cline" href="tel:${tel}"><span>Telefon</span><b>${CONFIG.phone}</b></a>
          <a class="cline" href="mailto:${CONFIG.email}"><span>E-posta</span><b>${CONFIG.email}</b></a>
        </div>
        <div class="cardbox"><h3>Çalışma günleri ve saatleri</h3>${kvs(CONFIG.hours)}</div>
      </div>${foot()}`;
  },

  about(p) {
    const a = CONFIG.about, tel = CONFIG.phone.replace(/\s/g, '');
    const map = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(CONFIG.address);
    return `<div class="hero">${eyebrow('04', 'Ses sistemi & hikaye')}
      <h1 class="pt">Müzik <em>arka plan</em><br>değil.</h1></div>
      <p class="story">${a.story}</p>
      <div class="split">
        <div class="cardbox"><h3>Ses sistemi</h3>${kvs(a.system)}</div>
        <div class="cardbox"><h3>Çalışma saatleri</h3>${kvs(CONFIG.hours)}
          <h3 style="margin-top:36px">Adres</h3><div class="addr">${CONFIG.address}</div>
          <div class="btns"><a class="btn" href="${map}" target="_blank" rel="noopener">Yol tarifi</a><a class="btn ghost" href="tel:${tel}">${CONFIG.phone}</a></div>
        </div>
      </div>${foot()}`;
  },
};

function bindForm() {
  const f = $('resForm'); if (!f) return;
  f.addEventListener('submit', e => {
    e.preventDefault();
    if (!f.checkValidity()) { f.reportValidity(); return; }
    const txt = `Rezervasyon talebi — ${CONFIG.barName}\nİsim: ${$('fName').value}\nTarih: ${$('fDate').value}\nSaat: ${$('fTime').value}\nKişi: ${$('fPeople').value}\nNot: ${$('fNote').value || '-'}`;
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(txt)}`, '_blank', 'noopener');
    $('resMsg').textContent = 'WhatsApp açıldı. Mesajı göndererek talebini tamamla; ekibimiz onay verecek.';
  });
}

/* menü: mobilde bölüm geçişi (A / B / Aperatif) */


function bindMenu() {
  const sw = document.querySelector('.sides'), menu = document.querySelector('.menu');
  if (!sw || !menu) return;
  sw.addEventListener('click', e => {
    const b = e.target.closest('button[data-code]'); if (!b) return;
    menu.dataset.show = b.dataset.code;
    sw.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    $('pageBody').scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });   // yeni liste en baştan başlasın
  });
}

/* takvim: güne dokununca altındaki kart değişir */
function bindCalendar() {
  const cal = document.querySelector('.cal'); if (!cal) return;
  cal.addEventListener('click', e => {
    const b = e.target.closest('button.cell'); if (!b) return;
    cal.querySelectorAll('button.cell').forEach(x => x.setAttribute('aria-pressed', x === b));
    document.querySelectorAll('.evcard').forEach(c => { c.hidden = c.id !== 'ev-' + b.dataset.iso; });
    const card = document.getElementById('ev-' + b.dataset.iso);
    if (card) card.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });   // kart ekran dışındaysa görünür yap
  });
}



function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

function renderPage(p) {
  const body = $('pageBody');
  body.classList.remove('in');
  $('pageBar').querySelectorAll('.sides').forEach(n => n.remove());   // önceki sayfanın geçiş çubuğu
  body.innerHTML = R[p.id](p);

  /* menü geçiş çubuğunu üst çubuğa taşı: en tepede sabit kalır */
  const sw = body.querySelector('.sides');
  if (sw) $('pageBar').appendChild(sw);

  const hero = body.querySelector('.hero');
  if (hero) hero.dataset.n = String(PAGES.indexOf(p) + 1).padStart(2, '0');

  [...body.children].forEach((c, i) => c.style.setProperty('--i', i));
  const [r, g, b] = hexRgb(p.c2);
  $('page').style.setProperty('--accent', p.c2);
  $('page').style.setProperty('--glow', `rgba(${r},${g},${b},.24)`);
  setNavActive(p.id);
  body.scrollTop = 0;
  body.querySelectorAll('[data-go]').forEach(x => x.onclick = () => openPage(x.dataset.go));
  bindForm();
  bindMenu();
  bindCalendar();

}


/* ───── Açma / kapama akışı ───── */
function setHash(id) { if (location.hash.slice(1) !== id) location.hash = id; }

function openPage(id, instant) {
  const p = PAGES.find(x => x.id === id); if (!p) return;
  hideHint();
  if (pageState === 'closing') { afterClose = id; return; }
  if (pageState === 'open' || pageState === 'opening') {
    if (currentPage && currentPage.id === id) return;
    currentPage = p; hooks.want(id); setHash(id);
    if (pageState === 'open') {
      $('pageBody').classList.remove('in');
      setTimeout(() => { renderPage(p); $('pageBody').classList.add('in'); }, reduce ? 0 : 160);
    } else renderPage(p);
    return;
  }
  currentPage = p; pageState = 'opening'; setHash(id);
  renderPage(p);
  hooks.play(true);
  if (instant) {
    hooks.mount(id); hooks.view('platter', true);
    const pg = $('page');
    pg.style.transition = 'none'; pg.style.clipPath = 'none';
    pg.classList.add('show', 'fadein'); pg.setAttribute('aria-hidden', 'false');
    setTimeout(() => pg.classList.remove('fadein'), 600);
    pageState = 'open'; $('pageBody').classList.add('in');
  } else {
    hooks.want(id); hooks.view('platter', false);
    pendingReveal = true;
  }
}

function doReveal() {
  if (pageState !== 'opening') return;
  const [x, y] = hooks.labelXY(), pg = $('page');
  pg.style.transition = 'none';
  pg.style.clipPath = `circle(0px at ${x}px ${y}px)`;
  pg.classList.add('show'); pg.setAttribute('aria-hidden', 'false');
  void pg.offsetWidth;
  pg.style.transition = reduce ? 'none' : 'clip-path .85s cubic-bezier(.65,0,.25,1)';
  pg.style.clipPath = `circle(150vmax at ${x}px ${y}px)`;
  setTimeout(() => $('pageBody').classList.add('in'), reduce ? 0 : 380);
  setTimeout(() => { if (pageState === 'opening') { pageState = 'open'; pg.style.clipPath = 'none'; $('closeBtn').focus({ preventScroll: true }); } }, reduce ? 0 : 880);
}

function closePage() {
  if (pageState !== 'open') return;
  pageState = 'closing';
  if (location.hash.slice(1)) location.hash = '';
  $('pageBody').classList.remove('in');
  const [x, y] = hooks.labelXY(), pg = $('page');
  pg.style.transition = 'none';
  pg.style.clipPath = `circle(150vmax at ${x}px ${y}px)`;
  void pg.offsetWidth;
  pg.style.transition = reduce ? 'none' : 'clip-path .65s cubic-bezier(.5,0,.3,1)';
  pg.style.clipPath = `circle(0px at ${x}px ${y}px)`;
  setTimeout(() => {
    pg.classList.remove('show'); pg.setAttribute('aria-hidden', 'true');
    pageState = 'closed'; currentPage = null; setNavActive(null);
    hooks.view('default', false);
    if (afterClose) { const id = afterClose; afterClose = null; openPage(id); }
  }, reduce ? 0 : 680);
}

$('closeBtn').onclick = closePage;


/* üst çubuğun yüksekliğini CSS'e ver; sekmelerde aktif olanı ortala */
if ('ResizeObserver' in window) {
  new ResizeObserver(() => {
    $('page').style.setProperty('--barH', $('pageBar').offsetHeight + 'px');
    centerTab();
  }).observe($('pageBar'));
}

function route() {
  const id = location.hash.slice(1);
  if (PAGES.some(p => p.id === id)) {
    if (pageState === 'closed') openPage(id);
    else if ((pageState === 'open' || pageState === 'opening') && currentPage && currentPage.id !== id) openPage(id);
  } else if (pageState === 'open') closePage();
}
window.addEventListener('hashchange', route);
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') closePage();
});
(function tick() {
  if (pendingReveal && hooks.settled()) { pendingReveal = false; doReveal(); }
  requestAnimationFrame(tick);
})();
