
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
function setNavActive(id) {
  chips.forEach(([i, el]) => el.classList.toggle('on', i === id));
  tabEls.forEach(([i, el]) => el.classList.toggle('on', i === id));
}
function hideHint() { $('hint').classList.add('off'); }

/* ───── Sayfa içerikleri ───── */
const eyebrow = (n, t) => `<div class="eyebrow">N° ${n} — ${t}</div>`;
const kvs  = rows => rows.map(r => `<div class="kv"><span>${r[0]}</span><span>${r[1]}</span></div>`).join('');
const foot = () => `<div class="foot"><span>${CONFIG.barName}</span><span>${CONFIG.address.split(',')[0]}</span></div>`;

const R = {
  menu(p) {
    const cols = CONFIG.menu.map(sec => `<div class="col">
      <div class="sidehead"><span class="disc">${sec.side}</span><h2>${sec.side} Yüzü — ${sec.title}</h2></div>
      <ul class="tracks">${sec.items.map(it =>
        `<li><span class="nm"><b>${it[0]}</b><i>${it[1]}</i></span><span class="pr">${fmt(it[2])}</span></li>`).join('')}</ul></div>`).join('');
    return `<div class="hero">${eyebrow('01', 'Side A / Side B')}
      <h1 class="pt">Önce bir <em>içecek</em>,<br>sonra bir plak.</h1>
      <p class="lead">Fiyatlar ${CONFIG.currency} cinsindendir. Alerjen veya özel diyet için lütfen servis ekibimize sorun.</p></div>
      <div class="menu">${cols}</div>${foot()}`;
  },
  events(p) {
    return `<div class="hero">${eyebrow('02', 'Bu ay çalacaklar')}
      <h1 class="pt">Masada <em>neler</em><br>çalıyor.</h1>
      <p class="lead">Yer sınırlı; rezervasyon önerilir.</p></div>
      <div class="evlist">${CONFIG.events.map(e => `<div class="ev">
        <div class="dateDisc"><b>${e.d}</b></div>
        <div class="evinfo"><small>${e.m} · ${e.day} · ${e.time}</small><h3>${e.title}</h3><p>${e.desc}</p></div>
        <button class="link" data-go="reserve">Yer ayırt →</button></div>`).join('')}</div>${foot()}`;
  },
  reserve(p) {
    /* yerel tarih (UTC değil): gece yarısından sonra da "bugün" doğru olsun */
    const _d = new Date();
    const today = new Date(_d.getTime() - _d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const tel = CONFIG.phone.replace(/\s/g, '');
    return `<div class="hero">${eyebrow('03', 'Yerini ayırt')}
      <h1 class="pt">Sana bir <em>koltuk</em><br>ayıralım.</h1></div>
      <div class="split">
        <div class="info">
          <p class="lead" style="margin-bottom:28px">Formu doldurunca WhatsApp açılır. Mesajı göndererek talebini tamamlarsın, ekibimiz onay verir.</p>
          <div class="cardbox"><h3>Çalışma saatleri</h3>${kvs(CONFIG.hours)}</div>
          <div class="btns"><a class="btn ghost" href="tel:${tel}">${CONFIG.phone}</a></div>
        </div>
        <form class="res" id="resForm" novalidate>
          <div class="field"><label for="fName">İsim</label><input id="fName" required autocomplete="name" placeholder="Adın"></div>
          <div class="grid2">
            <div class="field"><label for="fDate">Tarih</label><input id="fDate" type="date" required min="${today}"></div>
            <div class="field"><label for="fTime">Saat</label><input id="fTime" type="time" required value="20:00"></div>
          </div>
          <div class="field"><label for="fPeople">Kişi sayısı</label>
            <select id="fPeople">${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}"${n === 2 ? ' selected' : ''}>${n} kişi</option>`).join('')}</select></div>
          <div class="field"><label for="fNote">Not (isteğe bağlı)</label><textarea id="fNote" placeholder="Doğum günü, alerji, dinlemek istediğin plak…"></textarea></div>
          <div><button class="btn" type="submit">WhatsApp ile gönder</button></div>
          <div id="resMsg" role="status"></div>
        </form>
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

function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function renderPage(p) {
  const body = $('pageBody');
  body.classList.remove('in');
  body.innerHTML = R[p.id](p);
  [...body.children].forEach((c, i) => c.style.setProperty('--i', i));
  const [r, g, b] = hexRgb(p.c2);
  $('page').style.setProperty('--accent', p.c2);
  $('page').style.setProperty('--glow', `rgba(${r},${g},${b},.24)`);
  setNavActive(p.id);
  body.scrollTop = 0;
  body.querySelectorAll('[data-go]').forEach(x => x.onclick = () => openPage(x.dataset.go));
  bindForm();
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
