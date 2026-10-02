
'use strict';

/* ══════════════════════════════════════════════════════════════
   scene3d.js — 3D KATMANI
   Gerekenler (önce yüklenmeli): three.min.js, OrbitControls.js,
   config.js (CONFIG, PAGES) ve ui.js ($, reduce, hooks, pageState, openPage)
══════════════════════════════════════════════════════════════ */
function webglOK() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); }
  catch (e) { return false; }
}

function boot3D() {
const statEl = $('stat'), tipEl = $('tip');
let playing = true, rpm = 33, pitch = 0, pitchDisp = 0, omega = 0;
const PMAX = 8;
let animSpeed = 1;
const baseSpeed = reduce ? 8 : 1;
const damp = (k, dt) => 1 - Math.exp(-k * dt);
const ease = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
function nominalOmega() { return (rpm * (1 + pitchDisp / 100) / 60) * Math.PI * 2; }

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
document.body.insertBefore(renderer.domElement, document.body.firstChild);
renderer.domElement.style.touchAction = 'none';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x120d0a);
scene.fog = new THREE.Fog(0x120d0a, 120, 300);

{ const pm = new THREE.PMREMGenerator(renderer);
  const envS = new THREE.Scene(); envS.background = new THREE.Color(0x1a120c);
  [[0,30,10, 40,1,18, 3.2,2.7,2.1],[-30,12,0, 2,14,30, 2.0,1.5,1.0],[30,10,10, 2,12,26, 1.0,1.1,1.5],[0,10,-30, 40,10,1, 1.4,1.0,0.6]]
    .forEach(([x,y,z,w,h,d,r,g,b]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshBasicMaterial({ color: new THREE.Color(r,g,b) })); m.position.set(x,y,z); envS.add(m); });
  scene.environment = pm.fromScene(envS, 0.04).texture; pm.dispose(); }

const cam = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.1, 500);
const orbit = new THREE.OrbitControls(cam, renderer.domElement);
orbit.enableDamping = true; orbit.dampingFactor = 0.07;
orbit.enablePan = false;
orbit.minDistance = 18; orbit.maxDistance = 170;
orbit.minPolarAngle = 0.05; orbit.maxPolarAngle = Math.PI * 0.49;
orbit.minAzimuthAngle = -0.9; orbit.maxAzimuthAngle = 0.9;

/* lights — sıcak ana ışık, soğuk dolgu */
scene.add(new THREE.AmbientLight(0x7a6450, 0.30));
scene.add(new THREE.HemisphereLight(0xffd9ae, 0x1a100a, 0.30));
const kL = new THREE.DirectionalLight(0xffe2bd, 0.95);
kL.position.set(-14, 40, 20); kL.castShadow = true; kL.shadow.mapSize.set(2048, 2048);
kL.shadow.camera.left = kL.shadow.camera.bottom = -40; kL.shadow.camera.right = kL.shadow.camera.top = 40;
kL.shadow.camera.far = 140; kL.shadow.bias = -0.0008; kL.shadow.normalBias = 0.03; scene.add(kL);
const fL = new THREE.DirectionalLight(0x8fa8ff, 0.16); fL.position.set(28, 20, 16); scene.add(fL);
const spotL = new THREE.SpotLight(0xffd7a0, 2.6);
spotL.position.set(0, 50, 12); spotL.target.position.set(0, 0, 0);
spotL.angle = 0.36; spotL.penumbra = 0.45; spotL.decay = 1.4; spotL.castShadow = true;
spotL.shadow.mapSize.set(2048, 2048); spotL.shadow.bias = -0.0008;
scene.add(spotL); scene.add(spotL.target);
const rL = new THREE.DirectionalLight(0xff9a4d, 0.22); rL.position.set(0, 8, -46); scene.add(rL);
const shelfLight = new THREE.SpotLight(0xffc98a, 2.4);
shelfLight.position.set(0, 24, -4); shelfLight.target.position.set(0, 5, -15.5);
shelfLight.angle = 0.75; shelfLight.penumbra = 0.7; shelfLight.decay = 1.1;
scene.add(shelfLight); scene.add(shelfLight.target);
if (matchMedia('(pointer:coarse)').matches) { kL.shadow.mapSize.set(1024,1024); spotL.shadow.mapSize.set(1024,1024); }

/* materials / helpers */
function sm(col, rough=0.5, metal=0, emCol, emInt=1) {
  const m = new THREE.MeshStandardMaterial({ color: col, roughness: rough, metalness: metal });
  if (emCol) { m.emissive.set(emCol); m.emissiveIntensity = emInt; }
  return m;
}
const M = {
  body: sm(0x282828,0.38,0.55), bodyT: sm(0x2e2e2e,0.32,0.60), trim: sm(0x404040,0.25,0.70),
  sil: sm(0x909090,0.12,0.88), silL: sm(0xb8b8b8,0.06,0.94), silD: sm(0x505050,0.32,0.72),
  plat: sm(0x1c1c1c,0.22,0.78), platRim: sm(0x353535,0.08,0.90), platT: sm(0x141414,0.20,0.68),
  felt: sm(0x070707,1.0,0), rub: sm(0x0e0e0e,0.98,0), btnT: sm(0x2e2e2e,0.46,0.44),
  bLED: sm(0x1166ff,0.2,0,0x0055ff,2.0), bLED2: sm(0x2288ff,0.2,0,0x1166ff,1.8), wood: sm(0x3a2618,0.7,0.05),
};
function bm(w,h,d,mat,x=0,y=0,z=0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat); m.position.set(x,y,z); m.castShadow = m.receiveShadow = true; return m; }
function cy(rT,rB,h,seg,mat,x=0,y=0,z=0) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rT,rB,h,seg,1), mat); m.position.set(x,y,z); m.castShadow = m.receiveShadow = true; return m; }
function sph(r,mat,x=0,y=0,z=0) { const m = new THREE.Mesh(new THREE.SphereGeometry(r,20,14), mat); m.position.set(x,y,z); m.castShadow = true; return m; }
function rod(r, z0, z1, mat) { const len = Math.abs(z1 - z0); const m = new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,20,1), mat); m.rotation.x = Math.PI/2; m.position.z = (z0+z1)/2; m.castShadow = true; return m; }
function ga(g,...k) { k.forEach(c=>g.add(c)); return g; }

/* textures */
function canvasTex(cv) { const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; }
function fitFont(cx, text, max, min, w, weight='bold', fam='Arial') {
  let s = max; do { cx.font = `${weight} ${s}px ${fam}`; s -= 2; } while (cx.measureText(text).width > w && s > min);
}
function makeLogoTexture() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
  const cx = cv.getContext('2d');
  cx.fillStyle = '#2a2a2a'; cx.fillRect(0,0,512,128);
  cx.shadowColor='rgba(0,0,0,0.6)'; cx.shadowBlur=5; cx.shadowOffsetX=1; cx.shadowOffsetY=2;
  cx.fillStyle='#cccccc'; fitFont(cx, CONFIG.barName, 64, 24, 480, 'bold', 'Georgia,serif'); cx.textBaseline='alphabetic';
  cx.fillText(CONFIG.barName, 16, 78);
  cx.shadowBlur=2; cx.fillStyle='#888'; cx.font='bold 16px Arial'; cx.fillText(CONFIG.tagline.toUpperCase(), 18, 108);
  return canvasTex(cv);
}
function makeStartStopTexture() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512;
  const cx = cv.getContext('2d');
  cx.fillStyle='#2e2e2e'; cx.fillRect(0,0,512,512);
  cx.strokeStyle='rgba(255,255,255,0.12)'; cx.lineWidth=8; cx.strokeRect(14,14,484,484);
  cx.shadowColor='rgba(0,0,0,0.9)'; cx.shadowBlur=8; cx.shadowOffsetX=2; cx.shadowOffsetY=3;
  cx.fillStyle='#bbb'; cx.font='bold 105px Arial'; cx.textAlign='center'; cx.textBaseline='middle';
  cx.fillText('START',256,185);
  cx.strokeStyle='rgba(255,255,255,0.22)'; cx.lineWidth=3; cx.beginPath(); cx.moveTo(60,265); cx.lineTo(452,265); cx.stroke();
  cx.fillText('STOP',256,345);
  return canvasTex(cv);
}
function makeVinylTexture(tint) {
  const S = 1024, c = S/2, [tr,tg,tb] = tint;
  const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
  const cx = cv.getContext('2d');
  cx.fillStyle=`rgb(${tr},${tg},${tb})`; cx.fillRect(0,0,S,S);
  for (let r=40; r<500; r+=1.6) { const v = Math.random()*9; cx.strokeStyle=`rgb(${tr+v|0},${tg+v|0},${tb+v|0})`; cx.lineWidth=1.1; cx.beginPath(); cx.arc(c,c,r,0,Math.PI*2); cx.stroke(); }
  [150,215,290,360,430].forEach(r => { cx.strokeStyle=`rgb(${tr*0.5|0},${tg*0.5|0},${tb*0.5|0})`; cx.lineWidth=5; cx.beginPath(); cx.arc(c,c,r,0,Math.PI*2); cx.stroke(); });
  cx.strokeStyle=`rgb(${tr+8},${tg+8},${tb+8})`; cx.lineWidth=8; cx.beginPath(); cx.arc(c,c,506,0,Math.PI*2); cx.stroke();
  cx.strokeStyle=`rgb(${tr*0.4|0},${tg*0.4|0},${tb*0.4|0})`; cx.lineWidth=14; cx.beginPath(); cx.arc(c,c,98,0,Math.PI*2); cx.stroke();
  return canvasTex(cv);
}

/* düz (sans) yazı için yardımcılar: harf aralıklı büyük harf çizimi */
const SANS = '"Jost","Helvetica Neue",Arial,sans-serif';
function spacedWidth(cx, text, sp) { let w = 0; for (const ch of text) w += cx.measureText(ch).width + sp; return w - sp; }
function drawSpaced(cx, text, x, y, sp, align) {
  const w = spacedWidth(cx, text, sp);
  let px = align === 'center' ? x - w/2 : align === 'right' ? x - w : x;
  const old = cx.textAlign; cx.textAlign = 'left';
  for (const ch of text) { cx.fillText(ch, px, y); px += cx.measureText(ch).width + sp; }
  cx.textAlign = old;
}
function fitSpaced(cx, text, max, min, w, weight, em) {
  let s = max;
  for (; s > min; s -= 2) { cx.font = `${weight} ${s}px ${SANS}`; if (spacedWidth(cx, text, s*em) <= w) break; }
  cx.font = `${weight} ${s}px ${SANS}`; return s;
}

function makeLabelTexture(r) {
  const S = 512, c = S/2, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
  const cx = cv.getContext('2d');
  cx.fillStyle = r.c2; cx.fillRect(0,0,S,S);
  cx.strokeStyle = r.c1; cx.lineWidth = 3; cx.beginPath(); cx.arc(c,c,c-14,0,Math.PI*2); cx.stroke();
  cx.lineWidth = 1.5; cx.beginPath(); cx.arc(c,c,c-26,0,Math.PI*2); cx.stroke();
  cx.fillStyle = r.c1; cx.textBaseline = 'alphabetic';
  cx.font = `500 16px ${SANS}`; drawSpaced(cx, CONFIG.barName, c, c-120, 4, 'center');
  const s = fitSpaced(cx, r.title, 58, 24, 300, '600', 0.05);
  drawSpaced(cx, r.title, c, c-62, s*0.05, 'center');
  cx.fillRect(c-60, c-44, 120, 3);                              // orta delik bölgesine girmez
  cx.font = `500 16px ${SANS}`; drawSpaced(cx, r.sub.toLocaleUpperCase('tr-TR'), c, c+82, 3, 'center');
  cx.font = `400 14px ${SANS}`; drawSpaced(cx, '33 RPM · STEREO', c, c+124, 3, 'center');
  return canvasTex(cv);
}

function makeCoverTexture(r) {
  const S = 512, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
  const cx = cv.getContext('2d'), n = PAGES.findIndex(p => p.id === r.id) + 1;
  cx.fillStyle = r.c1; cx.fillRect(0,0,S,S);
  cx.fillStyle = r.c2; cx.strokeStyle = r.c2;
  if (r.art === 'circles') {                                    // menü
    cx.beginPath(); cx.arc(350,170,128,0,Math.PI*2); cx.fill();
    cx.lineWidth = 2; cx.globalAlpha = 0.45;
    [162,196].forEach(rr => { cx.beginPath(); cx.arc(350,170,rr,0,Math.PI*2); cx.stroke(); });
    cx.globalAlpha = 1; cx.fillStyle = '#f1e6d2'; cx.beginPath(); cx.arc(120,250,34,0,Math.PI*2); cx.fill();
  } else if (r.art === 'waves') {                               // etkinlik: equalizer
    const hs = [70,120,95,170,140,210,160,240,180,130,190,110,150,80], bw = 24, gap = 10;
    const x0 = (S - (hs.length*(bw+gap) - gap)) / 2;
    hs.forEach((h,i) => { cx.globalAlpha = i === 7 ? 1 : 0.8; cx.fillRect(x0 + i*(bw+gap), 330 - h, bw, h); });
  } else if (r.art === 'stripes') {                             // rezervasyon: koltuk ızgarası
    const cols = 6, rows = 4, gx = 70, gy = 62, x0 = (S - (cols-1)*gx) / 2, y0 = 100;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const x = x0 + i*gx, y = y0 + j*gy;
      cx.beginPath(); cx.arc(x,y,17,0,Math.PI*2);
      if ((i*3 + j*5) % 7 === 2) cx.fill();
      else { cx.lineWidth = 3; cx.globalAlpha = 0.55; cx.stroke(); cx.globalAlpha = 1; }
    }
  } else {                                                      // hakkımızda: yarım güneş
    cx.beginPath(); cx.arc(256,300,130,Math.PI,0); cx.fill();
    for (let k = 0; k < 4; k++) cx.fillRect(110, 312 + k*14, 292, 6);
  }
  cx.globalAlpha = 1;
  cx.strokeStyle = 'rgba(241,230,210,0.18)'; cx.lineWidth = 2; cx.strokeRect(16,16,S-32,S-32);
  cx.textBaseline = 'alphabetic'; cx.fillStyle = '#f1e6d2';
  cx.font = `500 15px ${SANS}`; drawSpaced(cx, 'N° 0' + n, 40, 58, 3.5);
  cx.font = `500 13px ${SANS}`; drawSpaced(cx, CONFIG.barName, S-40, 58, 3.5, 'right');
  cx.fillStyle = r.c2; cx.fillRect(40,376,56,4);
  cx.fillStyle = '#f1e6d2';
  const s = fitSpaced(cx, r.title, 70, 30, S-80, '600', 0.06);
  drawSpaced(cx, r.title, 40, 390 + s*0.78, s*0.06);
  cx.fillStyle = 'rgba(241,230,210,0.7)'; cx.font = `400 16px ${SANS}`;
  drawSpaced(cx, r.sub.toLocaleUpperCase('tr-TR'), 40, 482, 3.5);
  return canvasTex(cv);
}

function makeStrobeTexture() {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 64;
  const cx = cv.getContext('2d'); cx.fillStyle='#161616'; cx.fillRect(0,0,1024,64);
  const N = 180, w = 1024 / N; cx.fillStyle='#d9d9d9';
  for (let i=0;i<N;i+=2) cx.fillRect(i*w, 14, w, 36);
  return canvasTex(cv);
}

/* ROOT + PLINTH */
const TT = new THREE.Group(); scene.add(TT);
const clickables = []; let hoveredMesh = null;
ga(TT,
  bm(24,4,18,M.body,0,2,0), bm(23.8,0.08,17.8,M.bodyT,0,4.04,0), bm(24,0.22,0.12,M.trim,0,4.11,9.06),
  bm(0.12,4,18,M.silD,-12.06,2,0), bm(0.12,4,18,M.silD,12.06,2,0), bm(24,0.12,18,M.trim,0,0.06,0),
  bm(23,0.40,0.45,M.silD,0,4.20,-8.78), bm(23,0.14,0.18,M.sil,0,4.43,-8.78));
[[-10.5,0.35,-7],[10.5,0.35,-7],[-10.5,0.35,7],[10.5,0.35,7]].forEach(([x,y,z]) => TT.add(cy(1.1,1.3,0.7,24,M.rub,x,y,z)));

/* PLATTER */
const PLAT_X = -3.5, PLAT_SURFACE_Y = 6.0;
const platGroup = new THREE.Group(); platGroup.position.set(PLAT_X,4,0); TT.add(platGroup);
ga(platGroup,
  cy(6.5,6.5,1.80,96,M.plat,0,0.90,0), cy(6.65,6.50,0.55,96,M.platRim,0,0.27,0), cy(6.5,6.5,0.07,96,M.platT,0,1.835,0),
  cy(0.22,0.22,2.50,12,M.sil,0,1.25,0), cy(0.55,0.55,0.22,12,M.silD,0,0.11,0),
  cy(6.10,6.10,0.10,96,M.felt,0,1.92,0), cy(0.16,0.16,0.30,16,sm(0xaaaaaa,0.2,0.95),0,2.12,0));
{ const band = new THREE.Mesh(new THREE.CylinderGeometry(6.52,6.52,0.5,128,1,true), new THREE.MeshStandardMaterial({ map: makeStrobeTexture(), roughness:0.4, metalness:0.5 }));
  band.position.y = 1.2; platGroup.add(band); }
ga(TT, cy(1.15,1.15,0.60,24,M.silD,PLAT_X,4.30,0), cy(7.00,7.00,0.22,96,M.silD,PLAT_X,4.12,0));

/* TONEARM */
const ARM_REST = 2.90, ARM_MIN = 2.00;
let armAngle = ARM_REST, armTarget = ARM_REST, armLift = 0.3, armDragging = false, armGrabOffset = 0;
const armDark = sm(0x181818,0.28,0.75), armMid = sm(0x252525,0.25,0.75), armRing = sm(0x383838,0.15,0.85), armChrome = sm(0xa0a0a0,0.12,0.95);
const PIVX = 8.5, PIVZ = -6, PLINTH_TOP = 4.08, ARM_Y = 7.4;
ga(TT,
  cy(2.00,2.20,0.50,48,sm(0x2a2a2a,0.2,0.82),PIVX,PLINTH_TOP+0.25,PIVZ), cy(1.55,1.70,0.90,48,sm(0x181818,0.25,0.78),PIVX,PLINTH_TOP+0.95,PIVZ),
  cy(1.60,1.60,0.08,48,sm(0x555555,0.1,0.9),PIVX,PLINTH_TOP+1.44,PIVZ), cy(0.62,0.78,2.00,32,armRing,PIVX,6.50,PIVZ), cy(0.50,0.50,0.10,32,armChrome,PIVX,7.55,PIVZ));
const pivG = new THREE.Group(); pivG.position.set(PIVX, ARM_Y, PIVZ); pivG.rotation.y = ARM_REST; TT.add(pivG);
const seg1 = new THREE.Group(); seg1.rotation.y = 0.18; seg1.add(rod(0.15,0,-4.8,armDark)); seg1.add(sph(0.22,armChrome)); pivG.add(seg1);
const seg2 = new THREE.Group(); seg2.position.set(0,0,-4.8); seg2.rotation.y = -0.14; seg2.add(rod(0.14,0,-5.8,armDark)); seg2.add(sph(0.17,armDark)); seg1.add(seg2);
const seg3 = new THREE.Group(); seg3.position.set(0,0,-5.8); seg3.rotation.y = 0.06; seg3.add(rod(0.12,0,-1.6,armDark));
seg3.add(cy(0.20,0.20,0.5,16,armChrome,0,0,-1.5).rotateX(Math.PI/2)); seg2.add(seg3);
const hsG = new THREE.Group(); const HS_BASE_Y = -0.05; hsG.position.set(0,HS_BASE_Y,-1.6); seg3.add(hsG);
hsG.add(bm(1.15,0.14,2.60,sm(0x1c1c1c,0.35,0.6),0,0,-1.30));
hsG.add(bm(0.10,0.30,2.30,sm(0x222222,0.3,0.7),-0.60,0.10,-1.30)); hsG.add(bm(0.10,0.30,2.30,sm(0x222222,0.3,0.7),0.60,0.10,-1.30));
hsG.add(bm(0.55,0.25,1.00,sm(0x111111,0.55,0.15),0,-0.18,-0.35)); hsG.add(bm(1.00,0.55,1.60,sm(0x101010,0.5,0.2),0,-0.35,-1.50));
hsG.add(bm(0.60,0.12,0.50,sm(0xdd5500,0.4,0.1),0,-0.69,-2.0)); hsG.add(bm(0.05,0.32,0.05,sm(0xbbbbbb,0.2,0.9),0,-0.82,-2.18));
[-0.35,0.35].forEach(dx => hsG.add(cy(0.06,0.06,0.22,8,sm(0x888888,0.1,0.9),dx,0.05,-0.10)));
const stylusTip = new THREE.Object3D(); stylusTip.position.set(0,-1.0,-2.18); hsG.add(stylusTip);
const cwG = new THREE.Group(); cwG.rotation.y = Math.PI; pivG.add(cwG);
cwG.add(rod(0.10,0,-3.0,armMid)); cwG.add(cy(0.68,0.68,0.25,32,sm(0x707070,0.1,0.92),0,0,-2.40).rotateX(Math.PI/2));
{ const w = cy(0.62,0.62,1.10,32,sm(0x181818,0.18,0.88),0,0,-3.20); w.rotation.x = Math.PI/2; cwG.add(w); }
const armClickBox = bm(1.4,1.4,14.0,new THREE.MeshBasicMaterial({ transparent:true, opacity:0, depthWrite:false }),0,0,-6.0);
armClickBox.castShadow = armClickBox.receiveShadow = false;
armClickBox.userData = { label:'TONEARM — sürükle · çift tık = dinlenme', isDragArm:true, origColor:new THREE.Color(0), hoverColor:new THREE.Color(0) };
pivG.add(armClickBox); clickables.push(armClickBox);
{ scene.updateMatrixWorld(true); const v = new THREE.Vector3(); seg3.getWorldPosition(v);
  ga(TT, cy(0.95,1.10,0.40,32,sm(0x2a2a2a,0.2,0.8),v.x,PLINTH_TOP+0.20,v.z), cy(0.30,0.38,2.63,20,armChrome,v.x,5.795,v.z), cy(0.42,0.42,0.16,24,sm(0x0c0c0c,0.95,0),v.x,7.19,v.z)); }
{ const asg = new THREE.Group(); asg.position.set(8.0,PLINTH_TOP,-2.6); TT.add(asg);
  asg.add(cy(0.75,0.75,0.20,20,armMid,0,0.10,0)); asg.add(cy(0.55,0.55,0.35,20,sm(0x303030,0.3,0.65),0,0.35,0)); asg.add(bm(0.28,0.12,1.20,armRing,0,0.58,0.60)); }
TT.add(cy(0.55,0.55,0.60,24,sm(0x303030,0.25,0.7),4.8,PLINTH_TOP+0.30,-7.4));
TT.add(cy(0.42,0.42,0.75,24,armDark,4.8,PLINTH_TOP+0.55,-7.4));
TT.add(cy(0.14,0.14,0.20,8,M.bLED,6.0,PLINTH_TOP+0.10,-3.8));
const ptTgt = new THREE.PointLight(0x1166ff,0.28,8); ptTgt.position.set(6.0,PLINTH_TOP+0.6,-3.8); TT.add(ptTgt);

function stylusRadius() { const v = stylusTip.getWorldPosition(new THREE.Vector3()); return Math.hypot(v.x - PLAT_X, v.z); }
let CUE_ANGLE = 2.3;
{ let best = 1e9; const save = pivG.rotation.y;
  for (let a = ARM_MIN; a <= ARM_REST; a += 0.005) { pivG.rotation.y = a; pivG.updateMatrixWorld(true); const d = Math.abs(stylusRadius() - 5.4); if (d < best) { best = d; CUE_ANGLE = a; } }
  pivG.rotation.y = save; pivG.updateMatrixWorld(true); }

/* BUTTONS */
function mkBtn(w,h,d,col,hCol,x,y,z,label,onDown) {
  const mesh = bm(w,h,d,sm(col,0.52,0.40),x,y,z);
  mesh.userData = { label, origColor:new THREE.Color(col), hoverColor:new THREE.Color(hCol), onDown };
  clickables.push(mesh); TT.add(mesh); return mesh;
}
const SS_X=-10.2, SS_Z=7.2, SS_BTN_W=2.2, SS_PRESS_DEPTH=0.22, SS_PRESS_DUR=0.28;
let ssPressT = 0;
const ssGroup = new THREE.Group(); ssGroup.position.set(SS_X,0,SS_Z); TT.add(ssGroup);
const ssMesh = new THREE.Mesh(new THREE.BoxGeometry(SS_BTN_W,0.5,SS_BTN_W), sm(0x3a3a3a,0.52,0.42));
ssMesh.position.set(0,4.25,0); ssMesh.castShadow = ssMesh.receiveShadow = true;
function toggleTT() { playing = !playing; refreshHUD(); ssPressT = 0.001; }
ssMesh.userData = { label:'START / STOP', origColor:new THREE.Color(0x3a3a3a), hoverColor:new THREE.Color(0x606060), onDown:toggleTT };
clickables.push(ssMesh); ssGroup.add(ssMesh);
{ const relief = new THREE.Mesh(new THREE.BoxGeometry(SS_BTN_W-0.6,0.22,1.6), M.btnT); relief.position.set(0,4.61,0); relief.castShadow = true; ssGroup.add(relief);
  const lbl = new THREE.Mesh(new THREE.PlaneGeometry(SS_BTN_W-0.6,SS_BTN_W-0.6), new THREE.MeshStandardMaterial({ map:makeStartStopTexture(), roughness:0.48, metalness:0.28 }));
  lbl.rotation.x = -Math.PI/2; lbl.position.set(0,4.74,0); ssGroup.add(lbl); }

const RPM_Y = 4.15, RPM_Z = SS_Z + 0.66;
const led33Mat = new THREE.MeshStandardMaterial({ color:0x00008b, roughness:0.2, emissive:new THREE.Color(0x4499ff), emissiveIntensity:2.5 });
const led45Mat = new THREE.MeshStandardMaterial({ color:0x00008b, roughness:0.2, emissive:new THREE.Color(0x00008b), emissiveIntensity:0.15 });
const b33 = mkBtn(1.5,0.3,0.9,0xcccccc,0xdddddd,-8.0,RPM_Y,RPM_Z,'33 RPM',()=>{ rpm=33; refreshHUD(); syncRPM(); });
const b45 = mkBtn(1.5,0.3,0.9,0xcccccc,0xdddddd,-6.2,RPM_Y,RPM_Z,'45 RPM',()=>{ rpm=45; refreshHUD(); syncRPM(); });
mkBtn(1.5,0.3,0.9,0xb8b8b8,0xdddddd,-3.2,RPM_Y,RPM_Z,'PLAĞI ÇIKAR',()=>{ if (pageState === 'closed') wantRec = null; });
function btnLabel(text, x) {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; const cx = cv.getContext('2d');
  cx.fillStyle='#ccc'; cx.fillRect(0,0,128,64); cx.fillStyle='#111'; cx.font = text.length>2 ? 'bold 30px Arial' : 'bold 44px Arial';
  cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText(text,64,32);
  const lbl = new THREE.Mesh(new THREE.PlaneGeometry(1.3,0.7), new THREE.MeshStandardMaterial({ map:canvasTex(cv), roughness:0.5 }));
  lbl.rotation.x = -Math.PI/2; lbl.position.set(x,4.32,RPM_Z); TT.add(lbl);
}
btnLabel('33',-8.0); btnLabel('45',-6.2); btnLabel('EJECT',-3.2);
const dot33 = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,0.06,12), led33Mat); dot33.position.set(-8.0,4.33,RPM_Z+0.32); TT.add(dot33);
const dot45 = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,0.06,12), led45Mat); dot45.position.set(-6.2,4.33,RPM_Z+0.32); TT.add(dot45);
function syncRPM() {
  const c33 = rpm===33?0xeeeeee:0xcccccc, c45 = rpm===45?0xeeeeee:0xcccccc;
  b33.material.color.set(c33); b33.userData.origColor.set(c33); b45.material.color.set(c45); b45.userData.origColor.set(c45);
  led33Mat.emissive.set(rpm===33?0x4499ff:0x00008b); led33Mat.emissiveIntensity = rpm===33?2.5:0.15;
  led45Mat.emissive.set(rpm===45?0x4499ff:0x00008b); led45Mat.emissiveIntensity = rpm===45?2.5:0.15;
}

/* PITCH SLIDER */
const SX=10.8, SY=4.0, TH=3.5, CR=TH-0.9, SZ=2.0, CAP_Y=SY+0.92;
TT.add(bm(1.4,0.85,TH*2+0.4,sm(0x3a3a3a,0.22,0.68),SX,SY+0.42,SZ));
TT.add(bm(0.5,1.00,TH*2+0.4,sm(0x505050,0.18,0.72),SX,SY+0.45,SZ));
TT.add(bm(1.9,0.04,0.14,M.silL,SX+0.8,SY+0.93,SZ));
[-3,-2,-1,1,2,3].forEach(dz => TT.add(bm(1.3,0.04,0.10,M.silD,SX+0.78,SY+0.93,SZ+dz)));
TT.add(cy(0.28,0.28,0.30,8,M.bLED2,SX-1.05,SY+1.0,SZ+TH+0.3));
const ptSlG = new THREE.PointLight(0x1166ff,0.28,5); ptSlG.position.set(SX-1.05,SY+1.5,SZ+TH+0.3); TT.add(ptSlG);

const capGrp = new THREE.Group(); capGrp.position.set(SX,CAP_Y,SZ); TT.add(capGrp);
const capBody = bm(2.2,1.0,1.5,sm(0x606060,0.18,0.10)); capGrp.add(capBody);
[-0.25,0,0.25].forEach(dy => capGrp.add(bm(2.3,0.09,1.55,sm(0x888888,0.22,0.08),0,dy,0)));
capGrp.add(bm(2.35,0.05,0.14,sm(0x777777,0.35),0,0.54,0));
capBody.userData = { label:'PITCH — sürükle', origColor:new THREE.Color(0x606060), hoverColor:new THREE.Color(0x888888), isSlider:true };
clickables.push(capBody);
mkBtn(1.8,0.55,1.4,0x3a3a3a,0x606060,SX,SY+0.27,SZ-(TH+1.0),'PITCH SIFIRLA',()=>{ pitch=0; refreshHUD(); });
TT.add(bm(1.4,0.14,1.0,M.btnT,SX,SY+0.56,SZ-(TH+1.0)));

/* LOGO (bar adı) */
{ const panel = new THREE.Mesh(new THREE.BoxGeometry(5.8,0.06,1.52),
    new THREE.MeshStandardMaterial({ map:makeLogoTexture(), roughness:0.38, metalness:0.55 }));
  panel.position.set(1.0,4.07,8.1); TT.add(panel); }

/* TORQUE KNOB */
ga(TT,
  cy(0.70,0.90,0.90,32,M.silD,-10.2,4.55,5.0),
  cy(0.65,0.75,1.10,32,sm(0x484848,0.25,0.65),-10.2,4.55,5.0),
  cy(0.15,0.15,1.20,8,M.sil,-10.2,4.55,5.0));

/* ══════════════════════════════════════════════════════════════
   ODA: ceviz büfe, zemin, akustik duvar, neon, hoparlörler
══════════════════════════════════════════════════════════════ */
function makeWoodTexture(base, vein, plank) {
  const W = 1024, H = 1024, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d');
  cx.fillStyle = base; cx.fillRect(0,0,W,H);
  for (let y = 0; y < H; y++) {
    const n = Math.sin(y*0.35)*0.5 + Math.sin(y*0.071+2)*0.5 + (Math.random()-0.5)*0.9;
    cx.fillStyle = `rgba(${vein},${0.05 + Math.abs(n)*0.08})`; cx.fillRect(0,y,W,1);
  }
  for (let i = 0; i < 140; i++) {
    const y = Math.random()*H, x = Math.random()*W, len = Math.random()*600 + 200;
    cx.strokeStyle = `rgba(${vein},${0.06 + Math.random()*0.1})`; cx.lineWidth = Math.random()*2 + 0.5;
    cx.beginPath(); cx.moveTo(x,y);
    cx.bezierCurveTo(x+len*0.3,y+Math.random()*6-3,x+len*0.6,y+Math.random()*6-3,x+len,y+Math.random()*4-2); cx.stroke();
  }
  if (plank) { cx.fillStyle = 'rgba(0,0,0,0.45)'; for (let y = 0; y < H; y += plank) cx.fillRect(0,y,W,2); }
  const t = canvasTex(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function makeSlatTexture() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
  const cx = cv.getContext('2d');
  for (let x = 0; x < 512; x += 16) {
    const g = cx.createLinearGradient(x,0,x+16,0);
    g.addColorStop(0,'#1c120b'); g.addColorStop(0.5,'#3a2415'); g.addColorStop(1,'#140d08');
    cx.fillStyle = g; cx.fillRect(x,0,16,128);
  }
  const t = canvasTex(cv); t.wrapS = THREE.RepeatWrapping; return t;
}

const brass = sm(0xc9a45c, 0.28, 0.95);
const woodTop = makeWoodTexture('#5a3822', '20,10,4', 0); woodTop.repeat.set(2, 1.3);

/* büfe */
scene.add(bm(48,0.8,32, new THREE.MeshStandardMaterial({ map: woodTop, roughness: 0.42 }), 0,-0.4,-3));
scene.add(bm(46,7,29.6, sm(0x2b1b11,0.6,0.05), 0,-4.3,-3));
{ const front = new THREE.Mesh(new THREE.PlaneGeometry(43,6.2), new THREE.MeshStandardMaterial({ map: makeSlatTexture(), roughness: 0.55 }));
  front.position.set(0,-4.3,11.82); scene.add(front); }
[[-21,-16],[21,-16],[-21,10],[21,10]].forEach(([x,z]) => {
  scene.add(cy(0.7,0.45,2.2,16,sm(0x1c120b,0.5,0.2),x,-8.9,z));
  scene.add(cy(0.47,0.47,0.25,16,brass,x,-9.9,z));
});

/* zemin */
const floorTex = makeWoodTexture('#2c1a10', '0,0,0', 128); floorTex.repeat.set(10,10);
const roomFloor = new THREE.Mesh(new THREE.PlaneGeometry(400,400), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55, metalness: 0.1 }));
roomFloor.rotation.x = -Math.PI/2; roomFloor.position.y = -10; roomFloor.receiveShadow = true; scene.add(roomFloor);

/* duvar + akustik çıtalar */
{ const wall = new THREE.Mesh(new THREE.PlaneGeometry(400,120), sm(0x2a1a10,0.95,0)); wall.position.set(0,20,-22); scene.add(wall);
  scene.add(bm(66,32,0.4, sm(0x1c120b,1,0), 0,15.5,-19.6));
  const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7,31,0.7), new THREE.MeshStandardMaterial({ color: 0x6a4328, roughness: 0.5 }), 44);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 44; i++) { m4.makeTranslation((i-21.5)*1.5, 15.5, -19.1); slats.setMatrixAt(i, m4); }
  scene.add(slats); }

/* neon yazı */
const NEON_Y = 12.5;
const neonCv = document.createElement('canvas'); neonCv.width = 1024; neonCv.height = 256;
const neonTex = new THREE.CanvasTexture(neonCv); neonTex.encoding = THREE.sRGBEncoding;
function drawNeon() {
  const cx = neonCv.getContext('2d'), text = CONFIG.barName.toLowerCase();
  cx.clearRect(0,0,1024,256); cx.textAlign = 'center'; cx.textBaseline = 'middle';
  fitFont(cx, text, 150, 40, 940, 'italic 500', '"Cormorant Garamond",Georgia,serif');
  cx.shadowColor = '#ff9a3c'; cx.shadowBlur = 38; cx.fillStyle = '#ffd9a0'; cx.fillText(text,512,128);
  cx.shadowBlur = 14; cx.fillText(text,512,128);
  neonTex.needsUpdate = true;
}
drawNeon();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawNeon);
{ const neon = new THREE.Mesh(new THREE.PlaneGeometry(22,5.5), new THREE.MeshBasicMaterial({ map: neonTex, transparent: true, toneMapped: false, depthWrite: false }));
  neon.position.set(0,NEON_Y,-18.6); scene.add(neon);
  const nl = new THREE.PointLight(0xffa04d, 1.3, 34); nl.position.set(0,NEON_Y,-16.5); scene.add(nl); }

/* hoparlörler: 15 hücreli multicell horn + woofer kabini */
function hornCellGeo(mcx, mcy, mw, mh, tcx, tcy, tw, th, depth) {
  /* ağızdan (z=0) boğaza (z=-depth) daralan açık dikdörtgen hücre */
  const v = [
    [mcx-mw/2, mcy-mh/2, 0], [mcx+mw/2, mcy-mh/2, 0], [mcx+mw/2, mcy+mh/2, 0], [mcx-mw/2, mcy+mh/2, 0],
    [tcx-tw/2, tcy-th/2,-depth], [tcx+tw/2, tcy-th/2,-depth], [tcx+tw/2, tcy+th/2,-depth], [tcx-tw/2, tcy+th/2,-depth]
  ];
  const quads = [[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]];
  const pos = [], idx = [];
  quads.forEach((q,k) => { q.forEach(i => pos.push(...v[i])); const b = k*4; idx.push(b,b+1,b+2, b,b+2,b+3); });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function makeSpeaker(x, rotY) {
  const S_SCALE = 1.2;      // hoparlör boyutu (1.0 = eski). Kural: |x| + 3.7 * S_SCALE <= 24 (büfe kenarı)
  const HORN_LIFT = 1.2;    // kornanın kabinden yükselme miktarı
  const g = new THREE.Group(); g.position.set(x,0,-8); g.rotation.y = rotY; g.scale.setScalar(S_SCALE);
  const cabMat  = new THREE.MeshStandardMaterial({ map: woodTop, roughness: 0.42 });
  const alu     = sm(0xb9b9b2, 0.3, 0.9);
  const steel   = sm(0x1d1d1d, 0.5, 0.6);
  const hornMat = new THREE.MeshStandardMaterial({ color: 0x77807a, roughness: 0.45, metalness: 0.65, side: THREE.DoubleSide });

  /* kabin */
  g.add(bm(7.4,0.4,5.8,sm(0x120c08,0.5,0.3),0,0.2,0));
  g.add(bm(7.0,7.5,5.4,cabMat,0,4.15,0));
  g.add(bm(7.2,0.15,5.6,sm(0x1a110a,0.5,0.2),0,7.975,0));
  g.add(bm(1.6,0.35,0.06,brass,0,0.95,2.72));                  // boş pirinç plaka (logo yok)

  /* 15" woofer */
  const ringW  = cy(2.9,2.9,0.14,40,sm(0x1a1411,0.6,0.4),0,3.9,2.74); ringW.rotation.x = Math.PI/2; g.add(ringW);
  const frameW = cy(2.6,2.6,0.16,40,alu,0,3.9,2.78);                  frameW.rotation.x = Math.PI/2; g.add(frameW);
  const cone   = cy(2.35,0.9,0.6,40,sm(0x7b5a38,0.85,0),0,3.9,2.55);  cone.rotation.x = Math.PI/2; g.add(cone);
  const dust   = sph(0.62,sm(0x2b211a,0.7,0.1),0,3.9,2.3);            dust.scale.z = 0.5; g.add(dust);

  /* korna ölçüleri */
  const HW = 6.4, HH = 4.6, DEP = 4.2, NX = 5, NY = 3, px = HW/NX, py = HH/NY;
  const hornBaseY = 8.23 + HORN_LIFT;                           // kornanın alt kenarı
  const hornG = new THREE.Group(); hornG.position.set(0, hornBaseY + HH/2, 2.9); g.add(hornG);

  /* kornayı taşıyan ayak (ceviz blok + pirinç şerit) */
  const pedH = hornBaseY - 0.18 - 8.05;
  g.add(bm(3.8, pedH, 3.2, cabMat, 0, 8.05 + pedH/2, 1.0));
  g.add(bm(4.0, 0.1, 3.4, brass, 0, 8.1, 1.0));

  /* 15 hücre */
  for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
    const cx = (i-(NX-1)/2)*px, cyy = (j-(NY-1)/2)*py;
    const m = new THREE.Mesh(hornCellGeo(cx, cyy, px*0.97, py*0.97, cx*0.12, cyy*0.12, 0.24, 0.16, DEP), hornMat);
    m.receiveShadow = true; hornG.add(m);
  }
  /* ağız çerçevesi */
  hornG.add(
    bm(HW+0.5,0.18,0.3,alu,0, HH/2+0.09,0.05), bm(HW+0.5,0.18,0.3,alu,0,-HH/2-0.09,0.05),
    bm(0.18,HH,0.3,alu,-HW/2-0.09,0,0.05),     bm(0.18,HH,0.3,alu, HW/2+0.09,0,0.05));
  /* boğaz + sürücü */
  hornG.add(bm(1.9,1.2,0.5,steel,0,0,-DEP-0.1));
  const drv = cy(0.85,0.85,1.3,24,sm(0x111111,0.4,0.7),0,0,-DEP-0.9);  drv.rotation.x = Math.PI/2; hornG.add(drv);
  const cap = cy(0.55,0.55,0.2,24,brass,0,0,-DEP-1.6);                  cap.rotation.x = Math.PI/2; hornG.add(cap);
  /* sürücü braketi: kabinden sürücüye */
  const brH = (hornBaseY + HH/2 - 0.85) - 8.05;
  g.add(bm(1.2, brH, 1.2, steel, 0, 8.05 + brH/2, -1.9));

  scene.add(g);
}
makeSpeaker(-19.3, 0.25); makeSpeaker(19.3, -0.25);

/* ══════════════════════════════════════════════════════════════
   PLAK STANDI  (stand = navbar, her plak = bir sayfa)
══════════════════════════════════════════════════════════════ */
const RECORDS = PAGES.map(p => Object.assign({}, p));
const byId = id => RECORDS.find(r => r.id === id) || null;
const SHELF_Z = -15.5, SLEEVE = 7.32, GAP = 8.2, DISC_SCALE = 0.6, TILT = -0.12;
const NREC = RECORDS.length, SHELF_W = NREC * GAP + 3.6;

/* ceviz taban, deri arka panel, pirinç detay, sıcak LED */
const walnut  = new THREE.MeshStandardMaterial({ map: woodTop, roughness: 0.4 });
const leather = sm(0x1d1510, 0.92, 0);
const PH = 9.4;
ga(scene,
  bm(SHELF_W,0.7,3.6,walnut,0,0.35,SHELF_Z),
  bm(SHELF_W-0.4,0.06,0.12,brass,0,0.72,SHELF_Z+1.55),
  bm(0.5,3.0,3.8,walnut,-SHELF_W/2,1.5,SHELF_Z),
  bm(0.5,3.0,3.8,walnut, SHELF_W/2,1.5,SHELF_Z),
  bm(SHELF_W-1,0.08,0.1,sm(0xffa94d,0.4,0,0xffa94d,3.0),0,0.12,SHELF_Z+1.82));
{ const panel = bm(SHELF_W,PH,0.3,leather,0, 0.7+(PH/2)*Math.cos(TILT), SHELF_Z-0.85+(PH/2)*Math.sin(TILT));
  panel.rotation.x = TILT; scene.add(panel);
  const rail = bm(SHELF_W+0.4,0.4,0.7,walnut,0, 0.7+PH*Math.cos(TILT), SHELF_Z-0.85+PH*Math.sin(TILT));
  rail.rotation.x = TILT; scene.add(rail); }

function makePlateTexture(rec, idx) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 106;
  const cx = cv.getContext('2d');
  const g = cx.createLinearGradient(0,0,0,106); g.addColorStop(0,'#e3c78a'); g.addColorStop(0.5,'#b8924d'); g.addColorStop(1,'#d4b374');
  cx.fillStyle = g; cx.fillRect(0,0,512,106);
  cx.strokeStyle = 'rgba(40,24,8,0.55)'; cx.lineWidth = 3; cx.strokeRect(8,8,496,90);
  cx.fillStyle = '#2a1a0a'; cx.textBaseline = 'middle';
  cx.font = `500 18px ${SANS}`; drawSpaced(cx, '0' + (idx+1), 44, 55, 3);
  cx.fillRect(84, 30, 2, 46);
  const s = fitSpaced(cx, rec.title, 34, 18, 360, '600', 0.12);
  drawSpaced(cx, rec.title, 300, 55, s*0.12, 'center');
  return canvasTex(cv);
}

const P3 = new THREE.Vector3(PLAT_X,14,0);
const tiltQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI/2,0,0));

RECORDS.forEach((rec,i) => {
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(SLEEVE,SLEEVE,0.25),
    new THREE.MeshStandardMaterial({ map:makeCoverTexture(rec), roughness:0.6, metalness:0 }));
  const sx = (i - (NREC-1)/2) * GAP;
  rec.homePos = new THREE.Vector3(sx, 0.6 + (SLEEVE/2)*Math.cos(TILT), SHELF_Z - 0.3 + (SLEEVE/2)*Math.sin(TILT));
  sleeve.position.copy(rec.homePos); sleeve.rotation.x = TILT;
  sleeve.castShadow = sleeve.receiveShadow = true;
  sleeve.userData = { origColor:new THREE.Color(1,1,1), hoverColor:new THREE.Color(1.3,1.3,1.4),
    label:`♫ ${rec.title} — aç`, onDown:()=>openPage(rec.id) };
  scene.add(sleeve); clickables.push(sleeve);
  rec.sleeve = sleeve; rec.out = false; rec.dim = 1;

  /* pirinç isim plakası (tıklanabilir) */
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(4.6,0.95),
    new THREE.MeshStandardMaterial({ map: makePlateTexture(rec,i), roughness: 0.35, metalness: 0.7 }));
  plate.rotation.x = -Math.PI/2; plate.position.set(sx, 0.74, SHELF_Z + 1.15); plate.receiveShadow = true;
  plate.userData = { origColor: new THREE.Color(1,1,1), hoverColor: new THREE.Color(1.35,1.3,1.2),
    label: `♫ ${rec.title} — aç`, onDown: () => openPage(rec.id) };
  scene.add(plate); clickables.push(plate);
  rec.plate = plate;

  /* disk */
  const disc = new THREE.Group();
  const vinyl = new THREE.Mesh(new THREE.CylinderGeometry(5.9,5.9,0.06,128),
    new THREE.MeshStandardMaterial({ map:makeVinylTexture(rec.tint), roughness:0.32, metalness:0.35 }));
  vinyl.castShadow = vinyl.receiveShadow = true;
  const label = new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,0.02,64),
    [sm(0x333333,0.7), new THREE.MeshStandardMaterial({ map:makeLabelTexture(rec), roughness:0.7 }), sm(0x333333,0.7)]);
  label.position.y = 0.04;
  disc.add(vinyl, label);
  rec.disc = disc;
  rec.qShelf = new THREE.Quaternion().copy(sleeve.quaternion).multiply(tiltQ);
  rec.qFlat = new THREE.Quaternion();
  rec.c1 = rec.homePos.clone().add(new THREE.Vector3(0,8,0));
  rec.c2 = P3.clone().add(new THREE.Vector3(0,6,-8));
  disc.position.copy(rec.homePos); disc.quaternion.copy(rec.qShelf); disc.scale.setScalar(DISC_SCALE);
  disc.visible = false; scene.add(disc);
});

/* Jost yüklenince kapak, etiket ve plakaları yeniden çiz */
if (document.fonts && document.fonts.load) {
  Promise.all([
    document.fonts.load('600 40px Jost', 'İÇŞĞÜÖ'),
    document.fonts.load('500 20px Jost', 'İÇŞĞÜÖ'),
    document.fonts.load('400 20px Jost')
  ]).then(() => RECORDS.forEach((rec, i) => {
    const swap = (mat, make) => { if (mat.map) mat.map.dispose(); mat.map = make(); mat.needsUpdate = true; };
    swap(rec.sleeve.material, () => makeCoverTexture(rec));
    swap(rec.disc.children[1].material[1], () => makeLabelTexture(rec));
    swap(rec.plate.material, () => makePlateTexture(rec, i));
  })).catch(() => {});
}

/* ───── plak yükleme durumu ───── */
let loaded = null, anim = null, wantRec = null;     // wantRec: istenen sayfa id'si ya da null
const DUR_PATH = 1.2, DUR_DROP = 0.35;
const qTmp = new THREE.Quaternion();
const armAtRest = () => !armDragging && armAngle > ARM_REST - 0.03 && armLift > 0.25;
const busy = () => !!anim || wantRec !== (loaded ? loaded.id : null);

function mountOnPlatter(rec) {
  platGroup.add(rec.disc);
  rec.disc.visible = true;
  rec.disc.position.set(0,2.0,0); rec.disc.quaternion.identity(); rec.disc.scale.setScalar(1);
  rec.out = true; loaded = rec;
  if (wantRec) armTarget = CUE_ANGLE;               // iğne plağa insin
  refreshHUD();
}
function mountInstant(rec) {
  if (anim) { anim.rec.disc.visible = false; anim.rec.out = false; scene.add(anim.rec.disc); anim = null; }
  if (loaded && loaded !== rec) { scene.add(loaded.disc); loaded.disc.visible = false; loaded.out = false; loaded = null; }
  mountOnPlatter(rec);
  armAngle = armTarget = CUE_ANGLE; armLift = 0;
}

function placeOnPath(rec, u) {
  const mt = 1-u, d = rec.disc;
  d.position.set(0,0,0)
    .addScaledVector(rec.homePos, mt*mt*mt)
    .addScaledVector(rec.c1, 3*mt*mt*u)
    .addScaledVector(rec.c2, 3*mt*u*u)
    .addScaledVector(P3, u*u*u);
  qTmp.copy(rec.qShelf).slerp(rec.qFlat, ease((u-0.25)/0.6));
  d.quaternion.copy(qTmp);
  d.scale.setScalar(DISC_SCALE + (1-DISC_SCALE) * ease(u/0.8));
}
function startEject() {
  const rec = loaded;
  scene.attach(rec.disc);
  rec.qFlat.copy(rec.disc.quaternion);
  loaded = null;
  anim = { rec, type:'out', phase:0, t:0, fromY:rec.disc.position.y };
  refreshHUD();
}
function startLoad(rec) {
  rec.disc.visible = true; rec.out = true; rec.qFlat.identity();
  placeOnPath(rec,0);
  anim = { rec, type:'in', phase:0, t:0 };
  refreshHUD();
}

function updateJobs(dt) {
  if (!anim) {
    const want = wantRec ? byId(wantRec) : null;
    if (wantRec && !want) wantRec = null;
    if (loaded && loaded !== want) {                // yanlış plak var: önce çıkar
      armTarget = ARM_REST;
      if (armAtRest()) startEject();
    } else if (!loaded && want) {
      armTarget = ARM_REST;
      if (armAtRest()) startLoad(want);
    }
  }
  if (!anim) return;
  const A = anim, d = A.rec.disc;
  A.t += dt;
  if (A.type === 'in') {
    if (A.phase === 0) {
      placeOnPath(A.rec, ease(A.t/DUR_PATH));
      if (A.t >= DUR_PATH) { A.phase = 1; A.t = 0; }
    } else {
      const k = ease(A.t/DUR_DROP);
      d.position.set(PLAT_X, P3.y + (PLAT_SURFACE_Y-P3.y)*k, 0);
      d.quaternion.identity(); d.scale.setScalar(1);
      if (A.t >= DUR_DROP) { anim = null; mountOnPlatter(A.rec); }
    }
  } else {
    if (A.phase === 0) {
      d.position.y = A.fromY + (P3.y-A.fromY) * ease(A.t/DUR_DROP);
      if (A.t >= DUR_DROP) { A.phase = 1; A.t = 0; }
    } else {
      placeOnPath(A.rec, 1 - ease(A.t/DUR_PATH));
      if (A.t >= DUR_PATH) { d.visible = false; A.rec.out = false; anim = null; refreshHUD(); }
    }
  }
}

/* ───── HUD ───── */
function refreshHUD() {
  const ps = pitch >= 0 ? `+${pitch.toFixed(1)}` : pitch.toFixed(1);
  const rec = loaded ? `♫ ${loaded.title}` : (anim ? '…' : 'PLAK YOK');
  statEl.textContent = (playing ? '▶ ÇALIYOR' : '■ DURDU') + `  ·  ${rpm} RPM  ·  PITCH ${ps}%  ·  ${rec}`;
  const b = $('bPlay'); if (b) b.classList.toggle('on', playing);
}

/* ══════════════════════════════════════════════════════════════
   KAMERA GÖRÜNÜMLERİ
══════════════════════════════════════════════════════════════ */
const V3 = THREE.Vector3;
let currentView = 'default', userMoved = false, viewTween = null;

function applyLayout() {
  const a = innerWidth / innerHeight;
  cam.aspect = a; cam.fov = a < 0.9 ? 50 : 36;
  cam.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
function viewPose(name) {
  const portrait = cam.aspect < 0.9;
  const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  let tgt, dir, dist;
  if (name === 'platter') {                         // tam tepeden platter
    tgt = new V3(PLAT_X,6,0); dir = new V3(0,1,0.07);
    dist = portrait ? Math.max(24, 8.4/(tanV*cam.aspect)) : Math.max(24, 8.6/tanV);
  } else {                                          // stand + pikap + duvardaki neon birlikte
    tgt = new V3(0,4,portrait?-3:-4); dir = new V3(0,0.67,0.74);
    dist = portrait ? Math.max(40, 19/(tanV*cam.aspect)) : 54;
  }
  return { pos: tgt.clone().add(dir.normalize().multiplyScalar(dist)), tgt };
}
function setView(name, instant) {
  currentView = name; userMoved = false;
  const p = viewPose(name);
  if (instant) { cam.position.copy(p.pos); orbit.target.copy(p.tgt); orbit.update(); viewTween = null; }
  else viewTween = p;
}
orbit.addEventListener('start', () => { viewTween = null; userMoved = true; });

/* ───── UI ↔ 3D köprüsü ───── */
hooks.want    = id => { wantRec = id; };
hooks.mount   = id => { const r = byId(id); if (r) { wantRec = id; mountInstant(r); } };
hooks.view    = (name, instant) => setView(name, instant || reduce);
hooks.play    = on => { if (on && !playing) { playing = true; ssPressT = 0.001; refreshHUD(); } };
hooks.toggle  = toggleTT;
hooks.labelXY = () => {
  cam.updateMatrixWorld();
  const v = new THREE.Vector3(PLAT_X, PLAT_SURFACE_Y + 0.05, 0).project(cam);
  return [(v.x*0.5+0.5)*innerWidth, (-v.y*0.5+0.5)*innerHeight];
};
hooks.settled = () => !anim && !!loaded && loaded.id === wantRec && !viewTween;

/* ══════════════════════════════════════════════════════════════
   ETKİLEŞİM
══════════════════════════════════════════════════════════════ */
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
const armPlane    = new THREE.Plane(new THREE.Vector3(0,1,0), -ARM_Y);
const sliderPlane = new THREE.Plane(new THREE.Vector3(0,1,0), -CAP_Y);
const tmpV = new THREE.Vector3();
let sliderDragging = false, sliderGrabOffset = 0, tipTimer = 0, uiDrag = false, skip = false;
let tapPending = null;                    // bekleyen "dokunuş": parmak kalkınca karar verilir
const activePtrs = new Set();

function updateMouse(e) {
  const r = renderer.domElement.getBoundingClientRect();
  mouse.x =  ((e.clientX-r.left)/r.width)  * 2 - 1;
  mouse.y = -((e.clientY-r.top) /r.height) * 2 + 1;
}
function armAngleFromPointer() {
  ray.setFromCamera(mouse,cam);
  if (!ray.ray.intersectPlane(armPlane,tmpV)) return null;
  let a = Math.atan2(-(tmpV.x-PIVX), -(tmpV.z-PIVZ));
  if (a < 0) a += Math.PI*2;
  return a;
}
function sliderZFromPointer() {
  ray.setFromCamera(mouse,cam);
  return ray.ray.intersectPlane(sliderPlane,tmpV) ? tmpV.z : null;
}
function clearHover() {
  if (hoveredMesh) hoveredMesh.material.color.copy(hoveredMesh.userData.origColor);
  hoveredMesh = null; tipEl.classList.remove('on'); renderer.domElement.style.cursor = '';
}

renderer.domElement.addEventListener('pointermove', e => {
  if (tapPending && e.pointerId === tapPending.id &&
      Math.hypot(e.clientX - tapPending.x, e.clientY - tapPending.y) > 10) tapPending = null;   // kaydırıyor: dokunuş iptal

  if (pageState !== 'closed') return;
  if (e.pointerType === 'touch' && !armDragging && !sliderDragging) return;
  updateMouse(e);
  if (sliderDragging) {
    const z = sliderZFromPointer();
    if (z !== null) {
      let p = -((z+sliderGrabOffset)-SZ)/CR*PMAX;
      p = Math.max(-PMAX,Math.min(PMAX,p));
      if (Math.abs(p) < 0.2) p = 0;
      pitch = p; refreshHUD();
    }
    return;
  }
  if (armDragging) {
    const a = armAngleFromPointer();
    if (a !== null) armTarget = Math.max(ARM_MIN, Math.min(ARM_REST, a + armGrabOffset));
    return;
  }
  ray.setFromCamera(mouse,cam);
  const hits = ray.intersectObjects(clickables,false);
  const hit = hits.length ? hits[0].object : null;
  if (hit !== hoveredMesh) {
    if (hoveredMesh) hoveredMesh.material.color.copy(hoveredMesh.userData.origColor);
    hoveredMesh = hit;
    if (hit) {
      hit.material.color.copy(hit.userData.hoverColor);
      tipEl.textContent = hit.userData.label; tipEl.classList.add('on');
      renderer.domElement.style.cursor = 'pointer';
    } else { tipEl.classList.remove('on'); renderer.domElement.style.cursor = ''; }
  }
});

/* capture=true: OrbitControls'tan önce çalışır */
renderer.domElement.addEventListener('pointerdown', e => {
  activePtrs.add(e.pointerId);
  if (activePtrs.size > 1) { tapPending = null; return; }     // iki parmak: yakınlaştırma
  if (pageState === 'opening') { skip = true; return; }       // dokun = animasyonu atla
  if (pageState !== 'closed' || e.button !== 0) return;
  updateMouse(e); ray.setFromCamera(mouse,cam);
  const hits = ray.intersectObjects(clickables,false);
  if (!hits.length) return;
  const obj = hits[0].object;

  if (obj.userData.isDragArm) {
    if (busy()) return;
    const a = armAngleFromPointer();
    armGrabOffset = a === null ? 0 : (armTarget - a);
    armDragging = true; uiDrag = true; orbit.enabled = false;
    renderer.domElement.setPointerCapture(e.pointerId);
    renderer.domElement.style.cursor = 'grabbing';
  } else if (obj.userData.isSlider) {
    const z = sliderZFromPointer();
    sliderGrabOffset = z === null ? 0 : (capGrp.position.z - z);
    sliderDragging = true; uiDrag = true; orbit.enabled = false;
    renderer.domElement.setPointerCapture(e.pointerId);
    renderer.domElement.style.cursor = 'ns-resize';
  } else if (obj.userData.onDown) {
    /* hemen çalıştırma: parmak kalkınca "gerçek dokunuş" mu diye bakılacak.
       Kamera serbest kalır, yani plağın üstünden de kaydırabilirsin. */
    tapPending = { obj, x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
  }
}, true);

renderer.domElement.addEventListener('dblclick', e => {
  if (pageState !== 'closed' || busy()) return;
  updateMouse(e); ray.setFromCamera(mouse,cam);
  const hits = ray.intersectObjects(clickables,false);
  if (hits.length && hits[0].object.userData.isDragArm) armTarget = ARM_REST;
});
function endDrag() {
  armDragging = false; sliderDragging = false; uiDrag = false;
  renderer.domElement.style.cursor = hoveredMesh ? 'pointer' : '';
}

window.addEventListener('pointerup', e => {
  activePtrs.delete(e.pointerId);
  const tp = tapPending; tapPending = null;
  if (tp && e.pointerId === tp.id && pageState === 'closed' &&
      performance.now() - tp.t < 600 &&
      Math.hypot(e.clientX - tp.x, e.clientY - tp.y) < 10) {
    updateMouse(e); ray.setFromCamera(mouse,cam);
    const hits = ray.intersectObjects(clickables,false);
    if (hits.length && hits[0].object === tp.obj) {          // parmak hâlâ aynı nesnenin üstünde
      if (e.pointerType === 'touch' && tp.obj.userData.label) {
        tipEl.textContent = tp.obj.userData.label; tipEl.classList.add('on');
        clearTimeout(tipTimer); tipTimer = setTimeout(() => tipEl.classList.remove('on'), 1300);
      }
      tp.obj.userData.onDown();
    }
  }
  endDrag();
});
window.addEventListener('pointercancel', e => { activePtrs.delete(e.pointerId); tapPending = null; endDrag(); });

renderer.domElement.addEventListener('pointerleave', () => { if (!armDragging && !sliderDragging) clearHover(); });
renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); document.body.classList.add('nogl'); });

/* ═══════ CIZIRTI SESİ (WebAudio, kodla üretilir, dosya yok) ═══════ */
let actx = null, master = null, hissSrc = null, popSrc = null, wasDown = false;
let soundOn = true; try { soundOn = localStorage.getItem('vr_sound') !== '0'; } catch (e) {}

function initAudio() {
  if (actx) { if (actx.state === 'suspended' && !document.hidden) actx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  actx = new AC();
  const sr = actx.sampleRate;
  master = actx.createGain(); master.gain.value = 0; master.connect(actx.destination);

  /* yüzey hışırtısı */
  const hb = actx.createBuffer(1, sr*3, sr), hd = hb.getChannelData(0);
  for (let i = 0; i < hd.length; i++) hd[i] = Math.random()*2 - 1;
  hissSrc = actx.createBufferSource(); hissSrc.buffer = hb; hissSrc.loop = true;
  const hp = actx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
  const lp = actx.createBiquadFilter(); lp.type = 'lowpass';  lp.frequency.value = 9000;
  const hg = actx.createGain(); hg.gain.value = 0.02;
  hissSrc.connect(hp); hp.connect(lp); lp.connect(hg); hg.connect(master); hissSrc.start();

  /* pop ve tıkırtılar (13 sn'lik rastgele desen, döngüde çalar) */
  const pl = sr*13, pb = actx.createBuffer(1, pl, sr), pd = pb.getChannelData(0);
  let t = 0;
  while (t < pl) {
    t += Math.floor(sr * (0.025 + Math.random()*0.32));
    const big = Math.random() < 0.1;
    const amp = big ? 0.8 : 0.12 + Math.random()*0.3;
    const len = 10 + Math.floor(Math.random() * (big ? 80 : 30));
    const sign = Math.random() < 0.5 ? -1 : 1;
    for (let k = 0; k < len && t + k < pl; k++)
      pd[t+k] += (k === 0 ? sign : (Math.random()*2 - 1)) * amp * Math.exp(-k / (len*0.3));
  }
  popSrc = actx.createBufferSource(); popSrc.buffer = pb; popSrc.loop = true;
  const php = actx.createBiquadFilter(); php.type = 'highpass'; php.frequency.value = 700;
  const pg = actx.createGain(); pg.gain.value = 0.45;
  popSrc.connect(php); php.connect(pg); pg.connect(master); popSrc.start();

  /* hafif düşük uğultu */
  const rb = actx.createBuffer(1, sr*4, sr), rd = rb.getChannelData(0); let last = 0;
  for (let i = 0; i < rd.length; i++) { last = (last + 0.02*(Math.random()*2 - 1)) / 1.02; rd[i] = last*3.5; }
  const rs = actx.createBufferSource(); rs.buffer = rb; rs.loop = true;
  const rlp = actx.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 90;
  const rg = actx.createGain(); rg.gain.value = 0.5;
  rs.connect(rlp); rlp.connect(rg); rg.connect(master); rs.start();
}

function needleDrop() {                      // iğne plağa inerken: tok ses + kısa pop
  if (!actx || !soundOn) return;
  const t0 = actx.currentTime, sr = actx.sampleRate;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(90, t0); o.frequency.exponentialRampToValueAtTime(38, t0 + 0.18);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.45, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
  o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + 0.3);
  const nb = actx.createBuffer(1, Math.floor(sr*0.12), sr), nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = (Math.random()*2 - 1) * Math.exp(-i / (nd.length*0.2));
  const ns = actx.createBufferSource(); ns.buffer = nb;
  const nh = actx.createBiquadFilter(); nh.type = 'highpass'; nh.frequency.value = 700;
  const ng = actx.createGain(); ng.gain.value = 0.5;
  ns.connect(nh); nh.connect(ng); ng.connect(actx.destination); ns.start(t0 + 0.02);
}

function updateAudio(overRecord) {
  const down = !!loaded && !anim && overRecord && armLift < 0.08;     // iğne plakta mı?
  if (actx && master) {
    const nom  = rpm / 60 * Math.PI * 2;
    const rate = Math.min(1.5, Math.max(0.05, omega / nom));          // platter yavaşlarsa cızırtı da yavaşlar
    hissSrc.playbackRate.setTargetAtTime(rate, actx.currentTime, 0.1);
    popSrc.playbackRate.setTargetAtTime(rate, actx.currentTime, 0.1);
    const lvl = (soundOn && down && omega > 0.3) ? Math.min(1, omega / nom) : 0;
    master.gain.setTargetAtTime(lvl * 0.55, actx.currentTime, 0.15);  // 0.55 = genel ses seviyesi
    if (down && !wasDown && soundOn) needleDrop();
  }
  wasDown = down;
}

/* tarayıcılar sesi ancak kullanıcı dokununca başlatmaya izin verir */
['pointerup', 'touchend', 'click', 'keydown'].forEach(ev => window.addEventListener(ev, initAudio, { passive: true }));
document.addEventListener('visibilitychange', () => {
  if (!actx) return;
  if (document.hidden) actx.suspend(); else actx.resume();
});

hooks.sound = () => {
  soundOn = !soundOn;
  try { localStorage.setItem('vr_sound', soundOn ? '1' : '0'); } catch (e) {}
  const b = $('bSnd'); if (b) b.classList.toggle('on', soundOn);
  if (soundOn) initAudio();
};
{ const b = $('bSnd'); if (b) b.classList.toggle('on', soundOn); }

/* ══════════════════════════════════════════════════════════════
   ANİMASYON DÖNGÜSÜ
══════════════════════════════════════════════════════════════ */
const clock = new THREE.Clock();
let elapsed = 0, frames = 0;
const REC_R_MIN = 2.5, REC_R_MAX = 5.85;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt; const t = elapsed;

  if (pageState !== 'opening') skip = false;
  animSpeed = pageState === 'open' ? 2.5 : 1;       // sayfa açıkken değişimler arkada hızlı biter
  orbit.enabled = pageState === 'closed' && !uiDrag;

  /* kamera geçişi */
  if (viewTween) {
    const k = damp(skip ? 14 : 5, dt);
    cam.position.lerp(viewTween.pos, k);
    orbit.target.lerp(viewTween.tgt, k);
    if (cam.position.distanceTo(viewTween.pos) < 0.25) {
      cam.position.copy(viewTween.pos); orbit.target.copy(viewTween.tgt); viewTween = null;
    }
  }

  /* pitch + platter motoru */
  pitchDisp += (pitch - pitchDisp) * damp(12,dt);
  if (Math.abs(pitch - pitchDisp) < 0.002) pitchDisp = pitch;
  const target = playing ? nominalOmega() : 0;
  omega += (target - omega) * damp(playing ? 4.5 : 1.4, dt);
  if (!playing && omega < 0.005) omega = 0;
  platGroup.rotation.y += omega * dt;

  /* plak değişimi */
  updateJobs(dt * baseSpeed * animSpeed * (skip ? 5 : 1));

  /* tonearm */
  armAngle += (armTarget - armAngle) * damp(armDragging ? 22 : 14, dt);
  pivG.rotation.y = armAngle; pivG.updateMatrixWorld(true);
  const r = stylusRadius();
  const overRecord = !!loaded && r > REC_R_MIN && r < REC_R_MAX;
  const liftTarget = armDragging ? 0.9 : (overRecord ? 0 : 0.3);
  armLift += (liftTarget - armLift) * damp(armDragging ? 10 : 6, dt);
  hsG.position.y = HS_BASE_Y + armLift;

  updateAudio(overRecord);

  if (!armDragging && overRecord && armLift < 0.05 && omega > 1)
    armTarget = Math.max(ARM_MIN, armTarget - 0.0035 * dt * (omega / nominalOmega()));

  /* kılıflar: plak dışarıdaysa öne kayar ve kararır */
  RECORDS.forEach(rec => {
    const s = rec.sleeve;
    s.position.z += ((rec.homePos.z + (rec.out ? 1.4 : 0)) - s.position.z) * damp(6,dt);
    rec.dim += ((rec.out ? 0.35 : 1) - rec.dim) * damp(6,dt);
    s.userData.origColor.setScalar(rec.dim); s.userData.hoverColor.setScalar(rec.dim * 1.3);
    if (hoveredMesh !== s) s.material.color.copy(s.userData.origColor);
  });

  if (ssPressT > 0) {
    ssPressT = Math.min(1, ssPressT + dt / SS_PRESS_DUR);
    ssGroup.position.y = -SS_PRESS_DEPTH * Math.sin(ssPressT * Math.PI);
    if (ssPressT >= 1) { ssGroup.position.y = 0; ssPressT = 0; }
  }
  capGrp.position.z = SZ - (pitchDisp / PMAX) * CR;

  M.bLED.emissiveIntensity  = 1.20 + 0.70 * Math.sin(t * 2.1);
  M.bLED2.emissiveIntensity = 1.00 + 0.60 * Math.sin(t * 1.5 + 0.4);
  ptTgt.intensity = 0.28 + 0.16 * Math.sin(t * 1.5 + 0.4);
  ptSlG.intensity = 0.20 + 0.12 * Math.sin(t * 2.1 + 1.0);

  /* sayfa tamamen açıkken çizimi durdur: pil ve ısınma için */
  if (pageState !== 'open' || frames < 3) {
    orbit.update();
    renderer.render(scene, cam);
    frames++;
  }
}

applyLayout(); setView('default', true);
refreshHUD(); syncRPM();
animate();

window.addEventListener('resize', () => {
  applyLayout();
  if (!userMoved || pageState !== 'closed') setView(currentView, true);
});
}   /* ← boot3D sonu */
