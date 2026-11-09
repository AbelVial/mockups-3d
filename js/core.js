/* =========================================================================
   Meu Mockup — núcleo: estado, utilidades, cena 3D e geometrias auxiliares
   ========================================================================= */
const $ = s => document.querySelector(s);
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;

/* ================= estado ================= */
const state = {
  art: null,              // imagem enviada pelo usuário
  product: null,          // produto aberto no editor
  colors: {},             // cores escolhidas por produto
  toggles: {},            // opções liga/desliga por produto
  tf: {}, cam: {},        // ajuste da arte e câmera por produto
  bg: '#4dabf7', sceneId: 'none', transparent: true, watermark: '', guides: true,
  templates: [], defining: false, autoRotate: false, busy: false,
};
try {
  const s = JSON.parse(localStorage.getItem('meu-mockup-prefs-v2') || '{}');
  ['colors', 'toggles', 'bg', 'watermark'].forEach(k => { if (s[k] !== undefined) state[k] = s[k]; });
  if (s.sceneId) state.sceneId = s.sceneId;
  if (s.v === 4 && s.bg) state.bg = s.bg;
  state.transparent = state.sceneId === 'none';
} catch (e) {}
function savePrefs() {
  try {
    localStorage.setItem('meu-mockup-prefs-v2', JSON.stringify({
      v: 4, colors: state.colors, toggles: state.toggles, bg: state.bg, sceneId: state.sceneId, watermark: state.watermark,
    }));
  } catch (e) {}
}

/* ================= arte ================= */
// arte de exemplo usada enquanto o usuário não envia a dele
const placeholderArt = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 800;
  const x = c.getContext('2d');
  x.fillStyle = '#e8590c'; x.beginPath(); x.arc(400, 400, 360, 0, TAU); x.fill();
  x.strokeStyle = '#fff'; x.lineWidth = 14; x.beginPath(); x.arc(400, 400, 318, 0, TAU); x.stroke();
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '700 64px system-ui,sans-serif'; x.fillText('SUA ARTE', 400, 340);
  x.font = '800 132px system-ui,sans-serif'; x.fillText('AQUI', 400, 455);
  x.font = '600 40px system-ui,sans-serif'; x.fillText('★ ★ ★', 400, 570);
  return c;
})();
const currentArt = () => state.art || placeholderArt;
function artSize(a = currentArt()) { return [a.naturalWidth || a.width || 1000, a.naturalHeight || a.height || 1000]; }
function drawArt(ctx, area, t) {
  const a = currentArt(), [aw, ah] = artSize(a);
  const s = Math.min(area.w / aw, area.h / ah) * t.scale;
  ctx.save();
  ctx.translate(area.x + area.w / 2 + t.x * area.w, area.y + area.h / 2 + t.y * area.h);
  ctx.rotate(t.rot * Math.PI / 180);
  ctx.drawImage(a, -aw * s / 2, -ah * s / 2, aw * s, ah * s);
  ctx.restore();
}

/* ================= utilidades ================= */
function shadeHex(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  const f = v => Math.round(v + (t - v) * p).toString(16).padStart(2, '0');
  return '#' + f(r) + f(g) + f(b);
}
function toast(msg, ms = 2400) {
  const t = $('#toast'); t.innerHTML = '<svg class="i" style="width:16px;height:16px;color:#4ade80"><use href="#i-check"/></svg>'; t.append(msg); t.classList.add('show');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), ms);
}
function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img); img.onerror = rej;
    img.src = typeof src === 'string' ? src : URL.createObjectURL(src);
  });
}
function paintBackground(ctx, W, H) {
  ctx.fillStyle = state.bg; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, H * .42, 0, W / 2, H * .42, Math.max(W, H) * .7);
  g.addColorStop(0, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(0,0,0,.08)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function addWatermark(ctx, W, H) {
  const txt = state.watermark.trim(); if (!txt) return;
  const k = W / 1200;
  ctx.save();
  ctx.font = `600 ${Math.round(30 * k)}px system-ui,sans-serif`;
  ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.fillText(txt, W - 30 * k, H - 24 * k);
  ctx.restore();
}
function interp(keys, y) {            // keys: [[x, valor], ...] em ordem crescente
  if (y <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (y <= keys[i][0]) {
    const [y0, v0] = keys[i - 1], [y1, v1] = keys[i], t = (y - y0) / (y1 - y0);
    return lerp(v0, v1, t * t * (3 - 2 * t));
  }
  return keys[keys.length - 1][1];
}

/* ================= cena 3D ================= */
const view3d = $('#view3d');
THREE.ColorManagement.legacyMode = false;
const renderer = new THREE.WebGLRenderer({ canvas: view3d, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.setPixelRatio(1);
renderer.setSize(1200, 1200, false);
renderer.setClearColor(0x000000, 0);
const maxAniso = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

(function studio() {          // ambiente de estúdio para reflexos suaves
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: 0x3c3c3c, side: THREE.BackSide })));
  const panel = (w, h, pos, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(5, 3, [0, 5.5, 2], 5);
  panel(2.2, 5, [-5.5, 1, 2], 3.2);
  panel(1.4, 5, [5.5, 0.5, 1], 2);
  panel(8, 1.2, [0, 1, -5.8], 1.2);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(s, 0.04).texture;
})();
scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b0a6, 0.35));
const key = new THREE.DirectionalLight(0xffffff, 1.3);
key.position.set(2.5, 7, 4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -3.5, near: 1, far: 20 });
key.shadow.radius = 14; key.shadow.blurSamples = 20; key.shadow.bias = -0.0004;
scene.add(key);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.ShadowMaterial({ opacity: 0.26 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
scene.add(ground);

const bgCanvas = document.createElement('canvas'); bgCanvas.width = bgCanvas.height = 512;
const bgTex = new THREE.CanvasTexture(bgCanvas); bgTex.encoding = THREE.sRGBEncoding;
function updateBackground() {
  if (typeof sceneDirty !== 'undefined') { sceneDirty = true; return; }
  paintBackground(bgCanvas.getContext('2d'), 512, 512);
  bgTex.needsUpdate = true;
  scene.background = state.transparent ? null : bgTex;
}

/* ================= materiais e texturas ================= */
function makeTex(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso;
  return { canvas: c, tex: t, ctx: c.getContext('2d') };
}
const std = (o = {}) => new THREE.MeshStandardMaterial({ roughness: .6, ...o });
const glossy = (o = {}) => new THREE.MeshPhysicalMaterial({ roughness: .2, clearcoat: 1, clearcoatRoughness: .06, ...o });
const fabric = (o = {}) => new THREE.MeshStandardMaterial({ roughness: .93, ...o });
const metal = (o = {}) => new THREE.MeshStandardMaterial({ color: 0xd6d6d6, metalness: 1, roughness: .25, ...o });
function castAll(obj) { obj.traverse(o => { if (o.isMesh) o.castShadow = true; }); }

// textura de tecido (ruído)
const noise = document.createElement('canvas'); noise.width = noise.height = 256;
{
  const c = noise.getContext('2d'), d = c.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) { const v = 110 + Math.random() * 145 | 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  c.putImageData(d, 0, 0);
}

/* ================= geometrias auxiliares ================= */
// tubo suave passando por pontos [[x,y,z],...]
function tube(pts, r, m, closed = false, seg = 120) {
  const c = new THREE.CatmullRomCurve3(pts.map(p => p.isVector3 ? p : new THREE.Vector3(...p)), closed);
  return new THREE.Mesh(new THREE.TubeGeometry(c, seg, r, 14, closed), m);
}
// sólido de revolução com u = volta (frente em u=0.5) e v = altura entre y0 e y1
function lathe(profile, y0, y1, segs = 160, phiStart = -Math.PI) {
  const g = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), segs, phiStart, TAU);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setY(i, (p.getY(i) - y0) / (y1 - y0));
  return g;
}
// retângulo arredondado centrado
function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
// placa com espessura; a face (frente/verso) recebe a estampa em projeção plana
function slab(shape, depth, bevel, faceMat, sideMat) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 40 });
  const pts = shape.getPoints(64);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  pts.forEach(p => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - x0) / (x1 - x0), (p.getY(i) - y0) / (y1 - y0));
  return new THREE.Mesh(g, [faceMat, sideMat]);
}
// malha a partir de anéis de pontos; acerta o sentido das faces para fora
function ringMesh(rings, uvs, centers) {
  const R = rings.length, N = rings[0].length, pos = [], uv = [], idx = [];
  rings.forEach((ring, j) => ring.forEach((p, i) => { pos.push(p.x, p.y, p.z); if (uvs) uv.push(...uvs[j][i]); }));
  for (let j = 0; j < R - 1; j++) for (let i = 0; i < N - 1; i++) {
    const a = j * N + i, b = a + 1, c = a + N, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (uvs) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const jm = R >> 1, k = jm * N + (N >> 2), n = new THREE.Vector3().fromBufferAttribute(g.attributes.normal, k);
  const out = new THREE.Vector3().fromBufferAttribute(g.attributes.position, k).sub(centers[jm]);
  if (n.dot(out) < 0) {
    const ix = g.index.array; for (let t = 0; t < ix.length; t += 3) { const s = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = s; }
    g.computeVertexNormals();
  }
  return g;
}
// contorno a partir de segmentos M / L / Q (y para baixo); devolve pontos e partes
function pathPts(segs, n = 24) {
  const pts = [], parts = []; let cx = 0, cy = 0;
  for (const s of segs) {
    if (s[0] === 'M') { cx = s[1]; cy = s[2]; pts.push([cx, cy]); continue; }
    const part = [[cx, cy]];
    if (s[0] === 'L') { cx = s[1]; cy = s[2]; part.push([cx, cy]); }
    else {
      const [, qx, qy, ex, ey] = s;
      for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; part.push([u * u * cx + 2 * u * t * qx + t * t * ex, u * u * cy + 2 * u * t * qy + t * t * ey]); }
      cx = ex; cy = ey;
    }
    pts.push(...part.slice(1)); parts.push(part);
  }
  if (pts.length > 1) { const a = pts[0], b = pts[pts.length - 1]; if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6) pts.pop(); }
  return { pts, parts };
}
/* "Infla" um contorno 2D (como uma almofada): frente e verso com volume.
   poly em unidades quaisquer, y para baixo. Devolve geometrias já centradas e escaladas. */
function inflate(poly, { puff = 3.3, scale = 1 / 400, res = 180, fold = 0, extra = null } = {}) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  poly.forEach(([x, y]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
  const W = maxX - minX, H = maxY - minY, C = Math.max(W, H) / res;
  const X0 = minX - 2 * C, Y0 = minY - 2 * C, NX = Math.ceil(W / C) + 4, NY = Math.ceil(H / C) + 4, n = poly.length;
  const pip = (x, y) => { let c = false; for (let i = 0, j = n - 1; i < n; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  const near = (x, y) => {
    let best = 1e18, bx = 0, by = 0;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const [ax, ay] = poly[j], [qx, qy] = poly[i], dx = qx - ax, dy = qy - ay, L = dx * dx + dy * dy || 1;
      let t = ((x - ax) * dx + (y - ay) * dy) / L; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = ax + t * dx, py = ay + t * dy, d = (x - px) ** 2 + (y - py) ** 2;
      if (d < best) { best = d; bx = px; by = py; }
    }
    return [Math.sqrt(best), bx, by];
  };
  const N = (NX + 1) * (NY + 1), ins = new Uint8Array(N), D = new Float32Array(N), PX = new Float32Array(N), PY = new Float32Array(N);
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
    const k = j * (NX + 1) + i, x = X0 + i * C, y = Y0 + j * C;
    ins[k] = pip(x, y) ? 1 : 0;
    const [d, px, py] = near(x, y); D[k] = ins[k] ? d : -d; PX[k] = px; PY[k] = py;
  }
  const Hh = new Float32Array(N); for (let k = 0; k < N; k++) Hh[k] = ins[k] ? D[k] : 0;
  for (let it = 0; it < 120; it++) for (let j = 1; j < NY; j++) for (let i = 1; i < NX; i++) {
    const k = j * (NX + 1) + i; if (!ins[k]) continue;
    Hh[k] = (Hh[k - 1] + Hh[k + 1] + Hh[k - NX - 1] + Hh[k + NX + 1]) / 4 + .12 * C;
  }
  const cx = minX + W / 2, cy = minY + H / 2;
  const build = sign => {
    const idx = new Int32Array(N).fill(-1), pos = [], uv = [], index = [];
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
      const k = j * (NX + 1) + i;
      let x = X0 + i * C, y = Y0 + j * C, z;
      if (ins[k]) {
        const d = Hh[k], f = fold ? fold * (Math.sin(x * .021 / C * 5 + Math.sin(y * .013 / C * 5) * 1.5) + .6 * Math.sin(y * .017 / C * 5 + x * .004 / C * 5)) * Math.min(1, d / (10 * C)) : 0;
        z = puff * Math.sqrt(Math.max(0, d) * C) + f * C;
        if (extra) z += extra(x, y, sign) * Math.min(1, Math.max(0, d) / (14 * C)) ** .7;   // volume extra (some perto da borda)
      } else if (-D[k] < C * 1.5) { x = PX[k]; y = PY[k]; z = 0; }
      else continue;
      idx[k] = pos.length / 3;
      pos.push((x - cx) * scale, -(y - cy) * scale, sign * z * scale);
      uv.push((x - minX) / W, 1 - (y - minY) / H);
    }
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const ka = j * (NX + 1) + i, kb = ka + 1, kc = ka + NX + 1, kd = kc + 1;
      const a = idx[ka], b = idx[kb], c = idx[kc], d = idx[kd];
      if (a < 0 || b < 0 || c < 0 || d < 0 || !(ins[ka] | ins[kb] | ins[kc] | ins[kd])) continue;
      if (sign > 0) index.push(a, c, b, b, c, d); else index.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(index); g.computeVertexNormals();
    return g;
  };
  // converte pontos do contorno (unidades originais) para coordenadas 3D
  const to3 = (x, y, z = 0) => new THREE.Vector3((x - cx) * scale, -(y - cy) * scale, z);
  // converte um retângulo em unidades do contorno para pixels da textura (largura texW)
  const areaPx = (texW, r) => { const k = texW / W; return { x: (r.x - minX) * k, y: (r.y - minY) * k, w: r.w * k, h: r.h * k }; };
  return { front: build(1), back: build(-1), to3, areaPx, aspect: H / W };
}
// textura proporcional a um contorno inflado
function texFor(inf, w = 2048) { return makeTex(w, Math.round(w * inf.aspect)); }
