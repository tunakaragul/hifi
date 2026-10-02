'use strict';

/* ══════════════════════════════════════════════════════════════
   main.js — BAŞLAT
   (webglOK ve boot3D scene3D.js içinde, openPage ve PAGES ui.js / config.js içinde)
══════════════════════════════════════════════════════════════ */
if (webglOK()) {
  try { boot3D(); }
  catch (err) { console.error(err); document.body.classList.add('nogl'); }
} else {
  document.body.classList.add('nogl');
}

/* doğrudan bağlantı (örn. QR → site/#menu): animasyonsuz, direkt açılır */
{
  const h = location.hash.slice(1);
  if (PAGES.some(p => p.id === h)) openPage(h, true);
}
