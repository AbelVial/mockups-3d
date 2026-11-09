/* =========================================================================
   Meu Mockup — cenas: fundo (padrão, transparente, cor, ambiente 360°, imagem),
   mesa 3D (redonda, retangular, pódio) com texturas, iluminação e sombra.
   Tudo é desenhado aqui mesmo — funciona sem internet.
   ========================================================================= */

/* ---------- utilidades de pintura ---------- */
function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function vgrad(ctx, x, y, w, h, stops) { const g = ctx.createLinearGradient(0, y, 0, y + h); stops.forEach(([o, c]) => g.addColorStop(o, c)); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }
function rgrad(ctx, W, H, inner, outer, cy = .42) {
  const g = ctx.createRadialGradient(W / 2, H * cy, 0, W / 2, H * cy, Math.max(W, H) * .78);
  g.addColorStop(0, inner); g.addColorStop(1, outer); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function blurAll(ctx, W, H, px) {
  const t = document.createElement('canvas'); t.width = W; t.height = H;
  t.getContext('2d').drawImage(ctx.canvas, 0, 0);
  ctx.save(); ctx.filter = `blur(${px}px)`; ctx.drawImage(t, 0, 0); ctx.restore();
}
function glow(ctx, x, y, r, color, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
}
function heart(ctx, x, y, s) {
  ctx.beginPath(); ctx.moveTo(x, y + s * .3);
  ctx.bezierCurveTo(x, y, x - s * .5, y, x - s * .5, y + s * .3);
  ctx.bezierCurveTo(x - s * .5, y + s * .6, x, y + s * .8, x, y + s);
  ctx.bezierCurveTo(x, y + s * .8, x + s * .5, y + s * .6, x + s * .5, y + s * .3);
  ctx.bezierCurveTo(x + s * .5, y, x, y, x, y + s * .3); ctx.fill();
}

/* ---------- texturas de mesa ---------- */
function woodTex(ctx, S, base, seed = 3) {
  const R = rng(seed), planks = 6, ph = S / planks;
  for (let p = 0; p < planks; p++) {
    const y0 = p * ph, tone = (R() - .5) * .16;
    ctx.fillStyle = shadeHex(base, tone); ctx.fillRect(0, y0, S, ph);
    for (let l = 0; l < 46; l++) {
      const yy = y0 + R() * ph, amp = 1 + R() * 5, fq = .004 + R() * .01, ph0 = R() * 10;
      ctx.strokeStyle = R() < .5 ? 'rgba(60,35,15,.13)' : 'rgba(255,240,220,.08)'; ctx.lineWidth = .6 + R() * 1.8;
      ctx.beginPath();
      for (let x = 0; x <= S; x += 16) { const v = yy + Math.sin(x * fq + ph0) * amp + Math.sin(x * fq * 3.1) * amp * .3; x ? ctx.lineTo(x, v) : ctx.moveTo(x, v); }
      ctx.stroke();
    }
    for (let k = 0; k < 2; k++) { const kx = R() * S, ky = y0 + ph * (.25 + R() * .5); ctx.fillStyle = 'rgba(70,40,20,.18)'; ctx.beginPath(); ctx.ellipse(kx, ky, 10 + R() * 14, 4 + R() * 4, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(30,18,8,.35)'; ctx.fillRect(0, y0, S, 2); ctx.fillRect(R() * S, y0, 2, ph);
  }
}
function marbleTex(ctx, S) {
  const R = rng(7);
  ctx.fillStyle = '#f3f2ef'; ctx.fillRect(0, 0, S, S);
  for (let pass = 0; pass < 2; pass++) {
    ctx.save(); ctx.filter = pass ? 'blur(0.6px)' : 'blur(3px)';
    for (let v = 0; v < 14; v++) {
      let x = R() * S, y = R() * S; const a = R() * TAU;
      ctx.strokeStyle = pass ? 'rgba(110,110,120,.45)' : 'rgba(150,150,160,.25)'; ctx.lineWidth = pass ? .8 + R() * 1.4 : 4 + R() * 6;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 8; k++) { const nx = x + Math.cos(a + (R() - .5) * 1.4) * S * .14, ny = y + Math.sin(a + (R() - .5) * 1.4) * S * .14; ctx.quadraticCurveTo(x + (R() - .5) * 80, y + (R() - .5) * 80, nx, ny); x = nx; y = ny; }
      ctx.stroke();
    }
    ctx.restore();
  }
}
function concreteTex(ctx, S, base = '#a7a6a2') {
  ctx.fillStyle = base; ctx.fillRect(0, 0, S, S);
  const R = rng(5);
  ctx.save(); ctx.filter = 'blur(14px)';
  for (let i = 0; i < 90; i++) { ctx.globalAlpha = .15 + R() * .3; ctx.fillStyle = ['#8f8d89', '#bdbbb6', '#9d9b97', '#c9c7c2'][i % 4]; ctx.beginPath(); ctx.arc(R() * S, R() * S, S * (.03 + R() * .1), 0, TAU); ctx.fill(); }
  ctx.restore();
  const d = ctx.getImageData(0, 0, S, S), R2 = rng(11);
  for (let i = 0; i < d.data.length; i += 4) { const v = (R2() - .5) * 26; d.data[i] += v; d.data[i + 1] += v; d.data[i + 2] += v; }
  ctx.putImageData(d, 0, 0);
}
const TABLE_TEX = [
  { id: 'pinus', name: 'Pinus', paint: (c, S) => woodTex(c, S, '#dcb98e', 3), rough: .6 },
  { id: 'carvalho', name: 'Carvalho', paint: (c, S) => woodTex(c, S, '#b98a5c', 21), rough: .55 },
  { id: 'envernizada', name: 'Madeira envernizada', paint: (c, S) => woodTex(c, S, '#8a5a35', 31), rough: .25, clearcoat: 1 },
  { id: 'escura', name: 'Madeira escura', paint: (c, S) => woodTex(c, S, '#4a3020', 41), rough: .45 },
  { id: 'marmore', name: 'Mármore', paint: marbleTex, rough: .15, clearcoat: 1, repeat: .5 },
  { id: 'cimento', name: 'Cimento queimado', paint: (c, S) => concreteTex(c, S), rough: .85 },
  { id: 'branca', name: 'Branca', color: '#f4f4f2', rough: .4 },
  { id: 'preta', name: 'Preta', color: '#18181b', rough: .35, clearcoat: .6 },
  { id: 'cor', name: 'Cor sólida', rough: .5 },
  { id: 'imagem', name: 'Imagem própria', rough: .6 },
];

/* ---------- fundo 360° ----------
   Única cena cadastrada: estúdio fotográfico (foto 360° CC0 do Poly Haven, em assets/estudio-360.js).
   O usuário também pode enviar a própria foto 360°. */
const ENVS = [
  { id: 'estudio', name: 'Estúdio fotográfico' },
  { id: 'custom', name: 'Minha foto 360°' },
];
const envImgs = {};
function envImage(id) {
  if (id === 'custom') return state.env360 || null;
  if (!envImgs.estudio && window.STUDIO_360) {
    const im = new Image();
    im.onload = () => { markScene('env'); thumbsDirty = needs3D = true; if (!state.product) makeThumbs(); else if (!$('#drawer').classList.contains('hidden')) renderSceneOpts(); };
    im.src = window.STUDIO_360; envImgs.estudio = im;
  }
  const im = envImgs.estudio; return im && im.complete && im.naturalWidth ? im : null;
}

/* ---------- opções de cena (estado) ---------- */
const SCENE_DEFAULT = {
  bg: 'env', color: '#4dabf7', env: 'estudio', envRot: 250, envBlur: 20, imgBlur: 0,
  table: { show: true, shape: 'round', size: 3.2, tex: 'pinus', color: '#ffffff' },
  ambient: 1, key: 1, shadow: { show: true, strength: 50 },
};
const clone = o => JSON.parse(JSON.stringify(o));
state.so = (() => {
  try {
    const s = JSON.parse(localStorage.getItem('meu-mockup-scene-v2') || 'null');
    if (s) { const so = { ...clone(SCENE_DEFAULT), ...s, table: { ...SCENE_DEFAULT.table, ...s.table }, shadow: { ...SCENE_DEFAULT.shadow, ...s.shadow } }; if (so.env !== 'estudio') so.env = 'estudio'; return so; }
  } catch (e) {}
  return clone(SCENE_DEFAULT);
})();
function saveScene() { try { localStorage.setItem('meu-mockup-scene-v2', JSON.stringify({ ...state.so, env: 'estudio' })); } catch (e) {} }
function resetScene() { state.so = clone(SCENE_DEFAULT); saveScene(); markScene('all'); }

/* ---------- objetos 3D ---------- */
const flatCanvas = document.createElement('canvas'); flatCanvas.width = flatCanvas.height = 1024;
let flatTex = null, envTex = null, tableTexObj = null;
const envCanvas = document.createElement('canvas'); envCanvas.width = LITE ? 2048 : 4096; envCanvas.height = LITE ? 1024 : 2048;
const studioEnvMap = scene.environment, pmremGen = new THREE.PMREMGenerator(renderer);
let envLight = null;
const tableCanvas = document.createElement('canvas'); tableCanvas.width = tableCanvas.height = 1024;
const tableMat = new THREE.MeshPhysicalMaterial({ roughness: .6 });
const legMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: .5, metalness: .4 });
const table = new THREE.Group(); scene.add(table);
let tableKey = '';
const dirty = { flat: true, env: true, tableGeo: true, tableTex: true };
function markScene(what = 'all') { if (what === 'all') Object.keys(dirty).forEach(k => dirty[k] = true); else dirty[what] = true; state.transparent = state.so.bg === 'transparent'; }

function buildTable() {
  const t = state.so.table, key = t.shape + t.size;
  if (key === tableKey) return;
  tableKey = key; table.clear();
  const add = (geo, m, y = 0, x = 0, z = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.receiveShadow = true; me.castShadow = true; table.add(me); return me; };
  const R = t.size;
  if (t.shape === 'podio') {
    add(new THREE.CylinderGeometry(Math.min(R, 2.6) * .72, Math.min(R, 2.6) * .72, .45, 128), tableMat, -.225);
    add(new THREE.CylinderGeometry(Math.min(R, 2.6) * .78, Math.min(R, 2.6) * .78, .2, 128), tableMat, -.55);
  } else if (t.shape === 'square') {
    add(new THREE.BoxGeometry(R * 2, .15, R * 2), tableMat, -.075);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.BoxGeometry(.12, 3, .12), legMat, -1.65, sx * (R - .25), sz * (R - .25));
  } else if (t.shape === 'rect') {
    add(new THREE.BoxGeometry(R * 2.4, .15, R * 1.6), tableMat, -.075);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.BoxGeometry(.12, 3, .12), legMat, -1.65, sx * (R * 1.2 - .25), sz * (R * .8 - .25));
  } else {
    add(new THREE.CylinderGeometry(R, R, .15, 160), tableMat, -.075);
    add(new THREE.CylinderGeometry(.18, .25, 3, 32), legMat, -1.65);
    add(new THREE.CylinderGeometry(.9, 1, .08, 64), legMat, -3.1);
  }
}
function paintTableTex() {
  const t = state.so.table, def = TABLE_TEX.find(x => x.id === t.tex) || TABLE_TEX[0];
  const ctx = tableCanvas.getContext('2d');
  if (tableTexObj) tableTexObj.dispose();
  tableTexObj = null;
  if (def.paint) def.paint(ctx, 1024);
  else if (def.id === 'imagem' && state.tableImg) { const im = state.tableImg, k = Math.max(1024 / im.width, 1024 / im.height); ctx.drawImage(im, (1024 - im.width * k) / 2, (1024 - im.height * k) / 2, im.width * k, im.height * k); }
  if (def.paint || (def.id === 'imagem' && state.tableImg)) {
    tableTexObj = new THREE.CanvasTexture(tableCanvas);
    tableTexObj.encoding = THREE.sRGBEncoding; tableTexObj.wrapS = tableTexObj.wrapT = THREE.RepeatWrapping; tableTexObj.anisotropy = maxAniso;
    const rep = (def.repeat ?? 1) * t.size / 1.6; tableTexObj.repeat.set(rep, rep);
    tableMat.map = tableTexObj; tableMat.color.set('#ffffff');
  } else { tableMat.map = null; tableMat.color.set(def.id === 'cor' ? t.color : (def.color || '#ffffff')); }
  tableMat.roughness = def.rough ?? .6; tableMat.clearcoat = def.clearcoat || 0; tableMat.needsUpdate = true;
}
function paintFlat() {
  const so = state.so, c = flatCanvas.getContext('2d'), W = 1024, H = 1024;
  c.save(); c.clearRect(0, 0, W, H);
  if (so.bg === 'default' || so.bg === 'env') rgrad(c, W, H, '#f8f9fa', '#d5dae0');
  else if (so.bg === 'color') rgrad(c, W, H, shadeHex(so.color, .3), shadeHex(so.color, -.1));
  else if (so.bg === 'image' && state.bgImg) {
    const im = state.bgImg, k = Math.max(W / im.width, H / im.height);
    if (so.imgBlur) c.filter = `blur(${so.imgBlur / 4}px)`;
    c.drawImage(im, (W - im.width * k) / 2, (H - im.height * k) / 2, im.width * k, im.height * k);
  } else c.fillStyle = '#f1f3f5', c.fillRect(0, 0, W, H);
  c.restore();
  if (flatTex) flatTex.dispose();
  flatTex = new THREE.CanvasTexture(flatCanvas); flatTex.encoding = THREE.sRGBEncoding;
}
function paintEnv() {
  const so = state.so, img = envImage(so.env), c = envCanvas.getContext('2d'), W = envCanvas.width, H = envCanvas.height;
  if (envTex) { envTex.dispose(); envTex = null; }
  if (envLight) { envLight.dispose(); envLight = null; }
  if (!img) return false;
  const sh = Math.round(((so.envRot % 360) + 360) % 360 / 360 * W);
  c.drawImage(img, -sh, 0, W, H); c.drawImage(img, W - sh, 0, W, H);
  envTex = new THREE.CanvasTexture(envCanvas);
  envTex.mapping = THREE.EquirectangularReflectionMapping; envTex.encoding = THREE.sRGBEncoding;
  envLight = pmremGen.fromEquirectangular(envTex);   // reflexos do próprio estúdio no produto
  return true;
}
// aplica a cena em volta do produto (a cada quadro)
function applyScene(m, aspect) {
  const so = state.so;
  if (dirty.tableGeo) { buildTable(); dirty.tableGeo = false; }
  if (dirty.tableTex) { paintTableTex(); dirty.tableTex = false; }
  if (so.bg === 'env' && dirty.env) { paintEnv(); dirty.env = false; }
  if (so.bg === 'env' && envTex) {
    scene.background = envTex; scene.backgroundBlurriness = so.envBlur / 100 * .45;
    scene.environment = envLight ? envLight.texture : studioEnvMap;
  } else if (so.bg === 'transparent') { scene.background = null; scene.backgroundBlurriness = 0; scene.environment = studioEnvMap; }
  else {
    if (dirty.flat) { paintFlat(); dirty.flat = false; }
    scene.background = flatTex; scene.backgroundBlurriness = 0; scene.environment = studioEnvMap;
    if (aspect >= 1) { flatTex.repeat.set(1, 1 / aspect); flatTex.offset.set(0, (1 - 1 / aspect) / 2); }
    else { flatTex.repeat.set(aspect, 1); flatTex.offset.set((1 - aspect) / 2, 0); }
  }
  const t = so.table;
  table.visible = t.show; table.position.y = m.ground + (t.show && t.shape === 'podio' ? 0 : 0);
  ground.visible = !t.show && so.shadow.show; ground.position.y = m.ground;
  ground.material.opacity = so.shadow.strength / 100 * .55;
  key.castShadow = so.shadow.show;
  key.intensity = 1.3 * so.key;
  renderer.toneMappingExposure = 1.15 * so.ambient;
}
