/* =========================================================================
   Meu Mockup — modelos 3D importados (.glb)
   Substituem o modelo desenhado por código. A arte é projetada na frente do
   produto (como um adesivo/estampa que acompanha as dobras).
   ========================================================================= */
const NOMINAL = { camiseta: 3.0, body: 2.6, bone: 2.0, chinelo: 2.8, mascara: 2.3 };
// sugestões de modelos gratuitos (Sketchfab, licença CC-BY: grátis, pede crédito ao autor)
const SUGGESTED = {
  camiseta: { name: 'Tshirt — Tabbuso', url: 'https://sketchfab.com/3d-models/5a21282b2e454d1696547148f617d3d0' },
  bone: { name: 'Baseball Cap — vanart', url: 'https://sketchfab.com/3d-models/1c1d34d73fd94e6b9e8f82b1eb7194a0' },
  chinelo: { name: 'Flip Flops — Remie07', url: 'https://sketchfab.com/3d-models/ac0eaae976a545caa52908e977f59ae0' },
  mascara: { name: 'KO SLEEPMASK — reisponsive', url: 'https://sketchfab.com/3d-models/3efa24932b5b4db498542670a3b48977' },
  almofada: { name: 'Corona Cero - Almofada A — lucasdesignex', url: 'https://sketchfab.com/3d-models/efa3f1b4a9a840e2adc433e9cd32a38d' },
  almochaveiro: { name: 'Corona Cero - Almofada A — lucasdesignex', url: 'https://sketchfab.com/3d-models/efa3f1b4a9a840e2adc433e9cd32a38d' },
};
state.custom3d = {};          // id -> { buf, fileName, credit, rotX, rotY, scene }  (importados pelo usuário)

/* ---------- modelos 3D que já vêm com o app (Sketchfab, CC BY 4.0) ---------- */
const BUILTIN3D = {
  camiseta: { src: 'modelos/camiseta.js', whiteBase: true, area: { cy: .63, hw: .2, hh: .21 }, colorKeys: ['body'],
    author: 'Tabbuso', title: 'Tshirt', url: 'https://sketchfab.com/3d-models/5a21282b2e454d1696547148f617d3d0' },
  bone: { src: 'modelos/bone.js', stripMaps: true, whiteBase: true, area: { cy: .6, hw: .2, hh: .17 }, colorKeys: ['body'],
    author: 'vanart', title: 'Baseball Cap', url: 'https://sketchfab.com/3d-models/1c1d34d73fd94e6b9e8f82b1eb7194a0' },
  chinelo: { src: 'modelos/chinelo.js', pair: true, alignLong: true, project: 'top', nominal: 2.8, area: { hw: .46, hh: .46 }, colorKeys: ['body', 'strap'],
    materials: { Sole: { noMap: true, colorKey: 'body' }, Strap: { noMap: true, colorKey: 'strap' } },
    cam: { theta: 0, phi: .85, dist: 7.2 }, label: 'Palmilha (a arte vai nos dois pés)',
    author: 'Remie07', title: 'Flip Flops', url: 'https://sketchfab.com/3d-models/ac0eaae976a545caa52908e977f59ae0' },
  mascara: { src: 'modelos/mascara.js', stripMaps: true, whiteBase: true, nominal: 3.4, area: { cy: .5, hw: .2, hh: .2 }, colorKeys: ['body'],
    cam: { theta: .35, phi: 1.38, dist: 7 },
    author: 'reisponsive', title: 'KO SLEEPMASK', url: 'https://sketchfab.com/3d-models/3efa24932b5b4db498542670a3b48977' },
  almofada: { src: 'modelos/almofada.js', stripMaps: true, whiteBase: true, rotY: -Math.PI / 2, nominal: 2.9, hide: ['Logo'],
    area: { cy: .5, hw: .4, hh: .4 }, colorKeys: ['body'], cam: { theta: .3, phi: 1.4, dist: 7.4 },
    author: 'lucasdesignex', title: 'Corona Cero - Almofada A', url: 'https://sketchfab.com/3d-models/efa3f1b4a9a840e2adc433e9cd32a38d' },
  // almochaveiro: a mesma almofada, em miniatura, mais retangular e com argola
  almochaveiro: { src: 'modelos/almofada.js', glb: 'almofada', stripMaps: true, whiteBase: true, rotY: -Math.PI / 2, nominal: 2.2, hide: ['Logo'],
    stretch: [1, .78, 1.25], keyring: true, area: { cy: .5, hw: .4, hh: .38 }, colorKeys: ['body'], cam: { theta: .3, phi: 1.42, dist: 7.6 },
    author: 'lucasdesignex', title: 'Corona Cero - Almofada A', url: 'https://sketchfab.com/3d-models/efa3f1b4a9a840e2adc433e9cd32a38d' },
};
const glbLoads = {};   // src -> Promise<scene>  (um mesmo arquivo pode servir a mais de um produto)
function loadGLBScript(src, key) {
  return glbLoads[src] ||= new Promise((res, rej) => {
    const sc = document.createElement('script'); sc.src = src;
    sc.onload = () => { const b64 = window.MODEL_GLB?.[key]; delete window.MODEL_GLB?.[key]; b64 ? parseGLB(b64ToBuf(b64)).then(res, rej) : rej(new Error('sem dados ' + key)); };
    sc.onerror = rej; document.head.append(sc);
  });
}
state.builtin3d = {};
function b64ToBuf(b64) { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
function ensureBuiltin(id) {
  const cfg = BUILTIN3D[id]; if (!cfg || state.builtin3d[id]) return;
  state.builtin3d[id] = 'loading';
  loadGLBScript(cfg.src, cfg.glb || id)
    .then(scene3 => { state.builtin3d[id] = { ...cfg, id, scene: scene3 }; })
    .catch(e => { console.warn('modelo embutido falhou', id, e); state.builtin3d[id] = 'erro'; })
    .then(() => { if (state.builtin3d[id] === 'erro') return; resetModel(id); if (!state.product) makeThumbs(); else if (state.product === id) syncUI(); });
}
function modelRecord(id) {
  if (state.custom3d[id]?.scene) return state.custom3d[id];
  const b = state.builtin3d[id];
  if (b && b.scene) return b;
  if (BUILTIN3D[id]) ensureBuiltin(id);
  return null;
}

function parseGLB(buf) {
  return new Promise((res, rej) => new THREE.GLTFLoader().parse(buf.slice(0), '', g => res(g.scene), rej));
}

// textura da arte (proporção da própria arte)
function artTexture() {
  const a = currentArt(), [aw, ah] = artSize(a), k = 2048 / Math.max(aw, ah);
  const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(aw * k)); c.height = Math.max(2, Math.round(ah * k));
  c.getContext('2d').drawImage(a, 0, 0, c.width, c.height);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso;
  return t;
}

function buildCustom(id, rec) {
  const cfg = { area: { cy: .58, hw: .42, hh: .42 }, project: 'front', ...rec }, mats_extra = [];
  const g = new THREE.Group(), holder = new THREE.Group();
  // cada unidade: u (modelo) dentro de w (rotação/centralização) dentro de o (espelho/posição no par)
  const units = [], outers = [];
  for (let i = 0; i < (cfg.pair ? 2 : 1); i++) {
    const u = rec.scene.clone(true), w = new THREE.Group(), o = new THREE.Group();
    if (cfg.hide) { const del = []; u.traverse(m => { if (m.isMesh && cfg.hide.some(h => (m.name + ' ' + (m.material?.name || '')).includes(h))) del.push(m); }); del.forEach(m => m.parent.remove(m)); }
    w.rotation.set(rec.rotX || 0, rec.rotY || 0, 0); w.add(u); o.add(w); holder.add(o);
    if (cfg.alignLong) {     // gira para o lado comprido apontar para a câmera
      o.updateMatrixWorld(true);
      let sx = 0, sz = 0, sxx = 0, szz = 0, sxz = 0, n = 0; const v = new THREE.Vector3();
      u.traverse(m => { if (!m.isMesh) return; const pa = m.geometry.attributes.position; for (let k = 0; k < pa.count; k += 7) { v.fromBufferAttribute(pa, k).applyMatrix4(m.matrixWorld); sx += v.x; sz += v.z; sxx += v.x * v.x; szz += v.z * v.z; sxz += v.x * v.z; n++; } });
      const mx = sx / n, mz = sz / n, cxx = sxx / n - mx * mx, czz = szz / n - mz * mz, cxz = sxz / n - mx * mz;
      const ang = .5 * Math.atan2(2 * cxz, cxx - czz);   // ângulo do eixo principal (a partir de +X)
      w.rotation.y += ang + Math.PI / 2;
    }
    o.updateMatrixWorld(true);
    const c = new THREE.Box3().setFromObject(w).getCenter(new THREE.Vector3()); w.position.sub(c);
    if (cfg.stretch) o.scale.set(...cfg.stretch);
    if (i === 1) o.scale.x *= -1;
    units.push(u); outers.push(o);
  }
  if (cfg.pair) {
    holder.updateMatrixWorld(true);
    const bw = new THREE.Box3().setFromObject(outers[0]).getSize(new THREE.Vector3()).x;
    outers[0].position.x = -bw * .62; outers[1].position.x = bw * .62;
    outers[0].rotation.y = .07; outers[1].rotation.y = -.07;
  }
  g.add(holder);
  // normaliza tamanho e posição
  holder.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(holder);
  const sz0 = box.getSize(new THREE.Vector3()), k = (cfg.nominal || NOMINAL[id] || 2.5) / Math.max(sz0.x, sz0.y, sz0.z, 1e-6);
  holder.scale.setScalar(k); holder.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(holder);
  holder.position.sub(box.getCenter(new THREE.Vector3())); g.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(holder);
  const size = box.getSize(new THREE.Vector3());
  if (cfg.keyring) {          // alça de tecido + elo + argola de chaveiro, no meio da borda de cima
    const ring = metal(), tab = fabric(), r = size.x;
    const yTop = box.max.y - size.y * .04, zc = box.getCenter(new THREE.Vector3()).z;
    const loop = tube([[-r * .035, yTop, zc], [-r * .045, yTop + r * .09, zc], [0, yTop + r * .15, zc], [r * .045, yTop + r * .09, zc], [r * .035, yTop, zc]], r * .018, tab, false, 40);
    loop.scale.z = .45; loop.position.z = zc * .55;
    const link = new THREE.Mesh(new THREE.TorusGeometry(r * .035, r * .008, 10, 32), ring);
    link.position.set(0, yTop + r * .17, zc); link.rotation.y = Math.PI / 2;
    const big = new THREE.Mesh(new THREE.TorusGeometry(r * .12, r * .012, 14, 72), ring);
    big.position.set(0, yTop + r * .31, zc); big.rotation.y = .5;
    [loop, link, big].forEach(m => { m.castShadow = true; g.add(m); });
    tab.userData.base = new THREE.Color('#ffffff'); mats_extra.push(tab);
  }
  // materiais próprios (tingir sem estragar o original)
  const meshes = [], mats = [...mats_extra];
  units.forEach(u => u.traverse(o => {
    if (!o.isMesh) return;
    o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
      const ov = cfg.materials?.[m.name];
      if (cfg.stripMaps || ov?.noMap) { m.map = null; m.vertexColors = false; m.needsUpdate = true; }
      if (cfg.whiteBase && !m.map && m.color) m.color.set('#ffffff');
      m.userData.base = m.color ? m.color.clone() : null; m.userData.key = ov?.colorKey || null;
      m.side = THREE.DoubleSide; mats.push(m);
    });
    o.castShadow = true; o.receiveShadow = true; meshes.push(o); o.userData.unit = u;
  }));
  // estampa projetada (uma por unidade: no par de chinelos, uma em cada pé)
  const decalMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: .85 });
  const decal = new THREE.Group(); g.add(decal);
  const top = cfg.project === 'top';
  const ub = units.map(u => new THREE.Box3().setFromObject(u));
  const b0 = ub[0], s0 = b0.getSize(new THREE.Vector3()), c0 = b0.getCenter(new THREE.Vector3());
  // área em unidades do mundo (meia largura/altura), relativa à primeira unidade
  const area = top ? { x: 0, y: 0, w: s0.x * cfg.area.hw, h: s0.z * cfg.area.hh }
    : { x: 0, y: box.min.y + size.y * cfg.area.cy, w: size.x * cfg.area.hw, h: size.y * cfg.area.hh };
  let artVersion = -1;
  const ray = new THREE.Raycaster();
  return {
    group: g, printable: holder, custom: true, ground: box.min.y, size,
    cam: cfg.cam || { theta: .3, phi: 1.4, dist: Math.max(size.x, size.y) * 3.1 + 1 },
    area, tex: { canvas: { width: 1, height: 1 } }, label: cfg.label,
    toWorld(t) { return top ? [t.x * area.w * 2, t.y * area.h * 2] : [t.x * area.w * 2, area.y - t.y * area.h * 2]; },
    fromHit(p, t) { if (top) { const c = ub.reduce((a, bb) => { const cc = bb.getCenter(new THREE.Vector3()); return Math.abs(cc.x - p.x) < Math.abs(a.x - p.x) ? cc : a; }, c0); t.x = (p.x - c.x) / (area.w * 2); t.y = (p.z - c.z) / (area.h * 2); } else { t.x = p.x / (area.w * 2); t.y = (area.y - p.y) / (area.h * 2); } },
    apply(c) {
      const tint = new THREE.Color(c.body);
      mats.forEach(mm => { if (!mm.userData.base) return; if (mm.userData.key) mm.color.set(c[mm.userData.key] || c.body); else mm.color.copy(mm.userData.base).multiply(tint); });
    },
    updateDecal(t) {
      if (artVersion !== artStamp) { if (decalMat.map) decalMat.map.dispose(); decalMat.map = artTexture(); decalMat.needsUpdate = true; artVersion = artStamp; }
      const [aw, ah] = artSize(), s = Math.min(area.w * 2 / aw, area.h * 2 / ah) * t.scale, w = aw * s, h = ah * s;
      g.updateMatrixWorld(true);
      decal.children.forEach(c => c.geometry.dispose()); decal.clear();
      const rot = top ? new THREE.Euler(-Math.PI / 2, 0, -t.rot * Math.PI / 180) : new THREE.Euler(0, 0, -t.rot * Math.PI / 180);
      units.forEach((u, ui) => {
        const cc = ub[ui].getCenter(new THREE.Vector3()), um = meshes.filter(o => o.userData.unit === u);
        let origin, dir;
        if (top) { origin = new THREE.Vector3(cc.x + t.x * area.w * 2, box.max.y + 5, cc.z + t.y * area.h * 2); dir = new THREE.Vector3(0, -1, 0); }
        else { origin = new THREE.Vector3(t.x * area.w * 2, area.y - t.y * area.h * 2, box.max.z + 5); dir = new THREE.Vector3(0, 0, -1); }
        ray.set(origin, dir);
        const hit = ray.intersectObjects(um, false)[0]; if (!hit) return;
        const depth = top ? Math.min(size.y * .5, .25) : Math.min(size.z * .45, Math.max(w, h) * .8);
        const dim = top ? new THREE.Vector3(w, h, depth) : new THREE.Vector3(w, h, depth);
        const reach = new THREE.Box3().setFromCenterAndSize(hit.point, new THREE.Vector3(w * 1.6, top ? depth * 2 : h * 1.6, top ? h * 1.6 : depth * 2));
        um.forEach(o => {
          if (!new THREE.Box3().setFromObject(o).intersectsBox(reach)) return;
          const geo = new THREE.DecalGeometry(o, hit.point, rot, dim);
          if (!geo.attributes.position || !geo.attributes.position.count) { geo.dispose(); return; }
          if (o.matrixWorld.determinant() < 0) {   // modelo espelhado: desvira a ordem dos triângulos
            for (const key of ['position', 'normal', 'uv']) {
              const at = geo.attributes[key]; if (!at) continue; const n = at.itemSize, arr = at.array;
              for (let q = 0; q < at.count; q += 3) for (let c = 0; c < n; c++) { const i1 = (q + 1) * n + c, i2 = (q + 2) * n + c, tmp = arr[i1]; arr[i1] = arr[i2]; arr[i2] = tmp; }
              at.needsUpdate = true;
            }
          }
          const dm = new THREE.Mesh(geo, decalMat); dm.renderOrder = 2; decal.add(dm);
        });
      });
    },
  };
}
let artStamp = 0;   // muda quando a arte muda (para recriar a textura da estampa)

/* ---------- armazenamento (IndexedDB, loja "models3d") ---------- */
function idb3(mode, fn) {
  return new Promise((res, rej) => {
    if (!db || !db.objectStoreNames.contains('models3d')) return res(null);
    const tx = db.transaction('models3d', mode), r = fn(tx.objectStore('models3d'));
    tx.oncomplete = () => res(r?.result); tx.onerror = () => rej(tx.error);
  });
}
async function loadCustomModels() {
  const all = await idb3('readonly', st => st.getAll()) || [];
  for (const rec of all) {
    try { rec.scene = await parseGLB(rec.buf); state.custom3d[rec.id] = rec; } catch (e) { console.warn('modelo 3D inválido', rec.id, e); }
  }
}
function saveCustom(rec) { const { scene, ...r } = rec; return idb3('readwrite', st => st.put(r)).catch(() => toast('Não deu para salvar o modelo 3D neste navegador')); }
function resetModel(id) {     // força reconstruir o modelo do produto
  if (models[id]) { scene.remove(models[id].group); delete models[id]; }
  delete state.cam[id]; thumbsDirty = needs3D = dirtyTex = true;
}
async function importModel(id, file) { return importModelBuf(id, await file.arrayBuffer(), file.name); }
async function importModelBuf(id, buf, fileName) {
  try {
    const sc = await parseGLB(buf);
    const rec = { id, buf, fileName, credit: '', rotX: 0, rotY: 0, scene: sc };
    state.custom3d[id] = rec; resetModel(id); saveCustom(rec);
    toast('Modelo 3D importado! Ajuste a rotação se ele não estiver de frente.', 4000);
  } catch (e) { console.error(e); toast('Não consegui abrir esse arquivo. Use um .glb (no Sketchfab: Download → glTF Binary / GLB).', 5000); }
}
function removeModel(id) { delete state.custom3d[id]; idb3('readwrite', st => st.delete(id)).catch(() => {}); resetModel(id); }
