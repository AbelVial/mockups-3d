/* =========================================================================
   Meu Mockup — interface: catálogo, editor, modelos com foto e exportação
   ========================================================================= */
const view = $('#view');

/* ================= modelos 3D (construídos sob demanda) ================= */
const models = {};
function model(id) {
  if (!models[id]) {
    const rec = modelRecord(id), m = rec ? buildCustom(id, rec) : PRODUCTS[id].build();
    m.group.visible = false; castAll(m.group); scene.add(m.group);
    models[id] = m;
  }
  return models[id];
}
const is3D = id => !!PRODUCTS[id];
const getTpl = id => state.templates.find(t => t.id === id);
const nameOf = id => PRODUCTS[id]?.name || getTpl(id)?.name || '';

const editKey = () => state.product === 'bottonCartao' && state.layer === 'card' ? CARD_KEY : state.product;
function tf(id = editKey()) {
  if (id === CARD_KEY) return cardTf();
  if (!state.tf[id]) state.tf[id] = { scale: PRODUCTS[id]?.scale ?? 1, x: 0, y: 0, rot: 0 };
  return state.tf[id];
}
function colorsOf(id) {
  const P = PRODUCTS[id], saved = state.colors[id] || {}, c = {};
  P.colors.forEach(d => c[d.key] = saved[d.key] || d.def);
  P.colors.forEach(d => { if (c[d.key].startsWith('=')) c[d.key] = c[c[d.key].slice(1)]; });
  return c;
}
function togglesOf(id) {
  const P = PRODUCTS[id], saved = state.toggles[id] || {}, t = {};
  P.toggles.forEach(d => t[d.key] = saved[d.key] ?? d.def);
  return t;
}
function paintTexture(id) {
  const P = PRODUCTS[id], m = model(id), c = colorsOf(id), tg = togglesOf(id);
  if (m.custom) { m.apply(c, tg); m.updateDecal(tf(id)); return; }
  const { ctx, canvas, tex } = m.tex, W = canvas.width, H = canvas.height;
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = c.body; ctx.fillRect(0, 0, W, H);
  if (P.fabric) {
    ctx.globalAlpha = .07; ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = ctx.createPattern(noise, 'repeat'); ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  if (P.fabric) ctx.globalAlpha = .96;
  // a arte pode ocupar o produto inteiro (a área é só a sugestão); nas peças que dão a volta, o que passa de uma ponta continua na outra
  for (const off of (m.wrap || m.clip) ? [-W, 0, W] : [0]) { ctx.save(); ctx.translate(off, 0); drawArt(ctx, m.area, tf(id)); ctx.restore(); }
  ctx.globalAlpha = 1;
  if (m.paintExtra) m.paintExtra(ctx, W, H, c, tg);
  tex.needsUpdate = true;
  if (m.apply) m.apply(c, tg);
}
function camOf(id) {
  if (!state.cam[id]) state.cam[id] = { ...model(id).cam };
  return state.cam[id];
}
let viewAspect = 1;
function setCam(aspect) {   // mantém o produto inteiro mesmo em formatos verticais
  camera.aspect = aspect;
  camera.fov = aspect < 1 ? 2 * Math.atan(Math.tan(17.5 * Math.PI / 180) / aspect) * 180 / Math.PI : 35;
  camera.updateProjectionMatrix();
}
function setup3D(id, aspect = viewAspect) {
  const m = model(id);
  Object.entries(models).forEach(([k, mm]) => mm.group.visible = k === id);
  const c = camOf(id);
  camera.position.setFromSphericalCoords(c.dist, c.phi, c.theta);
  camera.lookAt(0, 0, 0);
  setCam(aspect);
  applyScene(m, aspect);
}
function resize3D() {
  const st = $('#stage'); if (!st.clientWidth || !document.body.classList.contains('editing')) return;
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  renderer.setSize(Math.round(st.clientWidth * dpr), Math.round(st.clientHeight * dpr), false);
  viewAspect = st.clientWidth / st.clientHeight; needs3D = true; updateFrame();
}
new ResizeObserver(resize3D).observe($('#stage'));
/* formato da imagem exportada */
const FORMATS = { '1:1': [1, 1], '4:5': [4, 5], '9:16': [9, 16], '16:9': [16, 9] };
state.format = (() => { try { return localStorage.getItem('meu-mockup-format') || '1:1'; } catch (e) { return '1:1'; } })();
function exportDims(long) { const [a, b] = FORMATS[state.format], r = a / b; return r >= 1 ? [long, Math.round(long / r / 2) * 2] : [Math.round(long * r / 2) * 2, long]; }
function updateFrame() {
  const f = $('#frame'), st = $('#stage');
  if (!f) return;
  if (!state.product || !is3D(state.product)) return f.classList.add('hidden');
  f.classList.remove('hidden');
  const W = st.clientWidth, H = st.clientHeight, s = W / H, [a0, b0] = FORMATS[state.format], a = a0 / b0;
  const tv = x => x < 1 ? Math.tan(17.5 * Math.PI / 180) / x : Math.tan(17.5 * Math.PI / 180);
  const hF = tv(a) / tv(s), wF = tv(a) * a / (tv(s) * s);
  f.style.width = wF * W + 'px'; f.style.height = hF * H + 'px';
  f.dataset.label = 'Área da imagem · ' + state.format;
}
let needs3D = true, dirtyTex = true, drag3d = null;
function loop() {
  requestAnimationFrame(loop);
  const id = state.product;
  if (!id || !is3D(id) || state.busy || !document.body.classList.contains('editing')) return;
  if (state.autoRotate && !drag3d) { camOf(id).theta += .008; needs3D = true; }
  if (!needs3D) return;
  needs3D = false;
  if (dirtyTex) { paintTexture(id); dirtyTex = false; }
  setup3D(id);
  renderer.render(scene, camera);
}
function snap3D(id, W, H = W) {
  paintTexture(id);
  renderer.setSize(W, H, false);
  setup3D(id, W / H);
  renderer.render(scene, camera);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  c.getContext('2d').drawImage(view3d, 0, 0);
  resize3D();
  dirtyTex = needs3D = true;
  return c;
}

/* ================= modelos com foto (2D) ================= */
function tplSize(tpl) {
  const w = tpl.img.naturalWidth, h = tpl.img.naturalHeight, k = Math.min(1, 1600 / Math.max(w, h));
  return [Math.round(w * k), Math.round(h * k)];
}
function tplArea(tpl) { const [W, H] = tplSize(tpl), r = tpl.rect; return { x: r.x * W, y: r.y * H, w: r.w * W, h: r.h * H }; }
function render2D(canvas, tpl, opt = {}) {
  const [W, H] = tplSize(tpl);
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(tpl.img, 0, 0, W, H);
  const area = tplArea(tpl);
  const shape = () => {
    ctx.beginPath();
    if (tpl.shape === 'ellipse') ctx.ellipse(area.x + area.w / 2, area.y + area.h / 2, Math.max(1, area.w / 2), Math.max(1, area.h / 2), 0, 0, TAU);
    else ctx.rect(area.x, area.y, area.w, area.h);
  };
  if (area.w > 4 && area.h > 4) {
    ctx.save(); shape(); ctx.clip();
    ctx.globalCompositeOperation = tpl.blend;
    drawArt(ctx, area, tf(tpl.id));
    ctx.restore();
  }
  if (opt.guides || state.defining) {
    ctx.save(); ctx.setLineDash([10, 8]); ctx.lineWidth = 2 * W / 1200; ctx.strokeStyle = 'rgba(217,72,15,.9)';
    shape(); ctx.stroke(); ctx.restore();
  }
  return canvas;
}

/* ================= desenhar / exportar ================= */
function draw() {
  const id = state.product; if (!id) return;
  if (is3D(id)) dirtyTex = needs3D = true;
  else { const t = getTpl(id); if (t) render2D(view, t, { guides: state.guides }); }
}
function currentArea() { return is3D(state.product) ? model(state.product).area : tplArea(getTpl(state.product)); }
function exportCanvas(id, S = 2000, wm = true) {
  let c;
  if (is3D(id)) c = snap3D(id, ...exportDims(S));
  else c = render2D(document.createElement('canvas'), getTpl(id));
  if (wm) addWatermark(c.getContext('2d'), c.width, c.height);
  return c;
}
function saveBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
function download(canvas, name) { canvas.toBlob(b => saveBlob(b, name), 'image/png'); }
function fileName(id) { return nameOf(id).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-'); }

/* ================= catálogo ================= */
const thumbs = {};          // id -> elemento <img>
let thumbsDirty = true, thumbJob = 0;
let catFilter = 'all', catQuery = '';
const norm = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function renderChips() {
  const el = $('#chips'); el.innerHTML = '';
  const total = CATEGORIES.reduce((n, [, ids]) => n + ids.length, 0);
  const opts = [['all', 'Todos', total], ...CATEGORIES.map(([t, ids]) => [t, t, ids.length]), ['mine', 'Meus modelos', state.templates.length]];
  opts.forEach(([k, label, n]) => {
    const b = document.createElement('button'); b.className = 'chip' + (catFilter === k ? ' on' : '');
    b.innerHTML = `${label}<em>${n}</em>`;
    b.onclick = () => { catFilter = k; renderCatalog(); };
    el.append(b);
  });
}
function renderCatalog() {
  renderChips();
  const el = $('#catalog'); el.innerHTML = '';
  const q = norm(catQuery.trim());
  const match = id => !q || norm(nameOf(id) + ' ' + (PRODUCTS[id]?.desc || '')).includes(q);
  let shown = 0;
  const section = (title, ids, extra) => {
    ids = ids.filter(match);
    if (!ids.length && !extra) return;
    const s = document.createElement('section'); s.className = 'cat';
    s.innerHTML = `<h3>${title} <small>${ids.length} ${ids.length === 1 ? 'produto' : 'produtos'}</small></h3><div class="grid"></div>`;
    const grid = s.querySelector('.grid');
    ids.forEach(id => {
      const a = document.createElement('a'); a.className = 'card'; a.href = '#p=' + encodeURIComponent(id);
      const img = thumbs[id] || (thumbs[id] = Object.assign(document.createElement('img'), { alt: '' }));
      const th = document.createElement('div'); th.className = 'thumb'; th.append(img);
      th.insertAdjacentHTML('beforeend', `<span class="tag">${PRODUCTS[id] ? '3D' : 'Foto'}</span>`);
      a.append(th);
      a.insertAdjacentHTML('beforeend', `<div class="info"><b>${nameOf(id)}</b><small>${PRODUCTS[id]?.desc || 'Modelo com foto'}</small>
        <span class="go">Personalizar <svg class="i" style="width:14px;height:14px"><use href="#i-arrow"/></svg></span></div>`);
      grid.append(a); shown++;
    });
    if (extra) grid.append(extra);
    el.append(s);
  };
  CATEGORIES.forEach(([t, ids]) => { if (catFilter === 'all' || catFilter === t) section(t, ids); });
  if (catFilter === 'all' || catFilter === 'mine') {
    const add = document.createElement('button'); add.className = 'card add';
    add.innerHTML = '<div class="thumb"><svg class="i"><use href="#i-camera"/></svg></div><div class="info"><b>Novo modelo com foto</b><small>Use a foto de qualquer produto seu</small></div>';
    add.onclick = () => $('#tplFile').click();
    section('Meus modelos com foto', state.templates.map(t => t.id), q ? null : add);
  }
  if (!shown && q) el.innerHTML = `<div class="empty">Nenhum produto encontrado para “${catQuery}”.</div>`;
  makeThumbs();
}
$('#q').oninput = e => { catQuery = e.target.value; renderCatalog(); };
async function makeThumbs() {
  if (!thumbsDirty) return;
  thumbsDirty = false;
  const job = ++thumbJob;
  const ids = [...CATEGORIES.flatMap(([, ids]) => ids), ...state.templates.map(t => t.id)];
  for (const id of ids) {
    await new Promise(r => setTimeout(r, 0));
    if (job !== thumbJob) return;
    try {
      const c = is3D(id) ? snap3D(id, 420) : exportCanvas(id, 0, false);
      const k = Math.min(1, 420 / Math.max(c.width, c.height)), o = document.createElement('canvas');
      o.width = c.width * k; o.height = c.height * k; o.getContext('2d').drawImage(c, 0, 0, o.width, o.height);
      thumbs[id].src = o.toDataURL('image/png');
      if (id === state.product) $('#prodThumb').src = thumbs[id].src;
    } catch (e) { console.error(id, e); }
  }
}

/* ================= navegação ================= */
function route() {
  if (location.hash.startsWith('#ver=')) { if (!state.client) setTimeout(() => openClientLink().then(ok => { if (!ok) { location.hash = ''; } })); return; }
  if (state.client) return;
  const m = location.hash.match(/^#p=(.+)$/), id = m && decodeURIComponent(m[1]);
  if (id && (PRODUCTS[id] || getTpl(id))) {
    state.product = id; state.defining = false;
    document.body.classList.add('editing');
    syncUI(); draw(); resize3D();
  } else {
    state.product = null; state.autoRotate = false;
    document.body.classList.remove('editing');
    renderCatalog();
  }
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
$('#back').onclick = () => { location.hash = ''; };

/* ================= editor ================= */
function swatchRow(el, colors, current, set, allowSame) {
  el.innerHTML = '';
  if (allowSame) {
    const b = document.createElement('button'); b.className = 'same'; b.textContent = '='; b.title = 'Igual à cor principal';
    b.onclick = () => { set(null); }; el.appendChild(b);
  }
  colors.forEach(c => {
    const b = document.createElement('button'); b.style.background = c; b.title = c;
    if (c.toLowerCase() === current.toLowerCase()) b.classList.add('on');
    b.onclick = () => set(c); el.appendChild(b);
  });
  const inp = document.createElement('input'); inp.type = 'color'; inp.value = current;
  inp.oninput = () => set(inp.value, true); el.appendChild(inp);
}
function renderOptions() {
  const id = state.product, P = PRODUCTS[id], box = $('#options');
  box.innerHTML = '';
  if (!P) return;
  const c = colorsOf(id), cm = state.custom3d[id], sug = SUGGESTED[id], bi = !cm && state.builtin3d[id]?.scene ? state.builtin3d[id] : null, keys = (cm ? ['body'] : bi?.colorKeys) || null;
  const mb = document.createElement('div'); mb.className = 'm3d';
  if (cm) {
    mb.innerHTML = `<div class="m3d-name"><svg class="i"><use href="#i-cube"/></svg><span><b>Modelo importado</b><small>${cm.fileName}</small></span></div>
      <div class="seg" style="grid-template-columns:repeat(auto-fit,minmax(84px,1fr));margin-top:8px">
        <button class="btn sm" data-a="ry">Girar 90°</button><button class="btn sm" data-a="rx">Deitar/levantar</button><button class="btn sm" data-a="rm">Usar padrão</button></div>
      <label class="row" style="margin-bottom:0"><span>Crédito</span><input type="text" placeholder="autor do modelo (licença CC-BY)" value="${(cm.credit || '').replace(/"/g, '&quot;')}"></label>`;
    mb.querySelector('[data-a=ry]').onclick = () => { cm.rotY = ((cm.rotY || 0) + Math.PI / 2) % TAU; saveCustom(cm); resetModel(id); };
    mb.querySelector('[data-a=rx]').onclick = () => { cm.rotX = ((cm.rotX || 0) + Math.PI / 2) % TAU; saveCustom(cm); resetModel(id); };
    mb.querySelector('[data-a=rm]').onclick = () => { if (confirm('Voltar para o modelo padrão deste produto?')) { removeModel(id); renderOptions(); } };
    mb.querySelector('input').onchange = e => { cm.credit = e.target.value; saveCustom(cm); };
  } else {
    mb.innerHTML = (bi ? `<div class="m3d-name" style="margin-bottom:8px"><svg class="i"><use href="#i-cube"/></svg><span><b>Modelo 3D: ${bi.title}</b><small>por <a href="${bi.url}" target="_blank" rel="noopener">${bi.author}</a> · Sketchfab · CC BY 4.0</small></span></div>` : '') +
      `<button class="btn sm block" data-a="imp"><svg class="i"><use href="#i-upload"/></svg>${bi ? 'Trocar por outro modelo (.glb)' : 'Importar modelo 3D (.glb)'}</button>` +
      (!bi && sug ? `<p class="hint"><svg class="i"><use href="#i-info"/></svg><span>Sugestão gratuita: <a href="${sug.url}" target="_blank" rel="noopener">${sug.name}</a> (Sketchfab, conta grátis → Download → GLB).</span></p>` : '');
    mb.querySelector('[data-a=imp]').onclick = () => { $('#glbFile').dataset.pid = id; $('#glbFile').click(); };
  }
  box.append(mb);
  P.colors.forEach((d, i) => {
    if (keys && !keys.includes(d.key)) return;
    const h = document.createElement('h5'); h.textContent = cm ? 'Cor (tingimento do modelo)' : d.label; box.append(h);
    const row = document.createElement('div'); row.className = 'sw'; box.append(row);
    swatchRow(row, d.pal, c[d.key], (v, live) => {
      (state.colors[id] ||= {})[d.key] = v || d.def;
      if (!v) delete state.colors[id][d.key];
      savePrefs(); thumbsDirty = true; draw();
      if (!live) renderOptions();
    }, d.def.startsWith('='));
  });
  (P.uploads || []).forEach(d => {
    const h = document.createElement('h5'); h.textContent = d.label; box.append(h);
    const b = document.createElement('button'); b.className = 'btn sm block';
    b.innerHTML = `<svg class="i"><use href="#i-upload"/></svg>${state[d.key] ? 'Trocar arte do cartão' : 'Enviar arte do cartão'}`;
    b.onclick = () => { const f = $('#extraFile'); f.dataset.key = d.key; f.click(); };
    box.append(b);
    if (d.hint) box.insertAdjacentHTML('beforeend', `<p class="hint"><svg class="i"><use href="#i-info"/></svg><span>${d.hint}</span></p>`);
  });
  const tg = togglesOf(id);
  P.toggles.forEach(d => {
    const l = document.createElement('label'); l.className = 'check';
    l.innerHTML = `<input type="checkbox" ${tg[d.key] ? 'checked' : ''}> ${d.label}`;
    l.querySelector('input').onchange = e => { (state.toggles[id] ||= {})[d.key] = e.target.checked; savePrefs(); thumbsDirty = true; draw(); };
    box.append(l);
  });
}
function syncWm() {
  const c = is3D(state.product) ? view3d : view;
  $('#wmPrev').textContent = state.watermark.trim();
  $('#wmPrev').style.fontSize = (c.clientWidth * 30 / (c.width || 1200)) + 'px';
}
function syncUI() {
  const id = state.product; if (!id) return;
  const t = tf(), tpl = getTpl(id), d3 = is3D(id);
  $('#layerSeg').classList.toggle('hidden', id !== 'bottonCartao');
  $('#layerSeg').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.l === state.layer));
  $('#prodName').textContent = $('#crumbName').textContent = nameOf(id);
  let ts = thumbs[id]?.src;
  if (!ts) { try { ts = (is3D(id) ? snap3D(id, 160) : exportCanvas(id, 0, false)).toDataURL('image/png'); } catch (e) { ts = ''; } }
  $('#prodThumb').src = ts;
  $('#prodDesc').textContent = PRODUCTS[id]?.desc || 'Modelo com foto';
  $('#scale').value = Math.round(t.scale * 100);
  $('#posX').value = Math.round(t.x * 100);
  $('#posY').value = Math.round(t.y * 100);
  $('#rot').value = t.rot;
  view3d.classList.toggle('hidden', !d3);
  $('.wrap').classList.toggle('is3d', d3);
  view.classList.toggle('hidden', d3);
  $('#box3d').classList.toggle('hidden', !d3);
  $('#tabCores').classList.toggle('hidden', !d3);
  $('#video').classList.toggle('hidden', !d3);
  $('#guidesRow').classList.toggle('hidden', d3);
  $('#customBox').classList.toggle('hidden', !tpl);
  $('#colorBox').classList.toggle('hidden', !d3);
  $('#auto').classList.toggle('on', state.autoRotate);
  $('#defArea').classList.toggle('on', state.defining);
  $('#defArea').textContent = state.defining ? 'Concluir área' : 'Marcar área da arte';
  view.classList.toggle('def', state.defining);
  $('#artHint').textContent = d3 ? 'Dica: dê dois cliques no produto para levar a arte até aquele ponto.'
    : 'Arraste a arte direto na foto; use a rodinha do mouse para aumentar/diminuir.';
  $('#stageTip').textContent = d3 ? 'Arraste para girar o produto · rodinha do mouse = zoom' : '';
  if (tpl) { $('#tplShape').value = tpl.shape; $('#tplBlend').value = tpl.blend; }
  renderOptions();
  syncOutputs();
  syncWm();
}
function syncOutputs() {
  const v = { scale: x => x + '%', posX: x => x, posY: x => x, rot: x => x + '°' };
  Object.entries(v).forEach(([id, f]) => { const i = $('#' + id); i.nextElementSibling.textContent = f(i.value); });
}
document.querySelectorAll('.field input').forEach(i => i.addEventListener('input', syncOutputs));
new ResizeObserver(syncWm).observe($('#stage'));

/* ---------- arte ---------- */
async function setArt(file) {
  if (!file || !file.type.startsWith('image/')) return;
  try {
    state.art = await loadImage(file); artStamp++;
    document.querySelectorAll('.artThumb').forEach(i => { i.src = state.art.src; i.classList.remove('hidden'); });
    document.querySelectorAll('.artIco').forEach(i => i.classList.add('hidden'));
    document.querySelectorAll('.artTitle').forEach(s => s.textContent = file.name || 'Imagem colada');
    document.querySelectorAll('.artTxt').forEach(s => s.textContent = 'Clique para trocar a arte');
    thumbsDirty = true;
    if (state.product) draw(); else makeThumbs();
    toast('Arte aplicada em todos os produtos');
  } catch (e) { toast('Não consegui abrir essa imagem'); }
}
document.querySelectorAll('.artFile').forEach(i => i.onchange = e => setArt(e.target.files[0]));
['dragover', 'drop'].forEach(ev => document.addEventListener(ev, e => {
  e.preventDefault();
  if (ev === 'drop' && e.dataTransfer.files[0]) setArt(e.dataTransfer.files[0]);
}));
document.addEventListener('paste', e => {
  const it = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
  if (it) setArt(it.getAsFile());
});

const artChanged = () => { thumbsDirty = true; draw(); };
$('#scale').oninput = e => { tf().scale = e.target.value / 100; artChanged(); };
$('#posX').oninput = e => { tf().x = e.target.value / 100; artChanged(); };
$('#posY').oninput = e => { tf().y = e.target.value / 100; artChanged(); };
$('#rot').oninput = e => { tf().rot = +e.target.value; artChanged(); };
$('#center').onclick = () => { const t = tf(); t.x = t.y = 0; t.rot = 0; syncUI(); artChanged(); };
$('#fit').onclick = () => { const t = tf(); t.scale = 1; t.x = t.y = 0; syncUI(); artChanged(); };
$('#cover').onclick = () => {
  const card = editKey() === CARD_KEY, area = card ? cardArea() : currentArea(), [aw, ah] = artSize(card ? cardImage() : undefined), t = tf(), id = state.product, m = is3D(id) && model(id);
  if (!card && m && !m.custom && (m.clip || m.wrap)) {   // peças que dão a volta: a arte ocupa a altura toda (ou a volta toda, se for larga)
    const T = m.tex.canvas, A = m.area;
    t.scale = Math.min(T.width / aw, T.height / ah) / Math.min(A.w / aw, A.h / ah);
    t.x = (T.width / 2 - (A.x + A.w / 2)) / A.w; t.y = (T.height / 2 - (A.y + A.h / 2)) / A.h;
  } else { t.scale = Math.max(area.w / aw, area.h / ah) / Math.min(area.w / aw, area.h / ah); t.x = t.y = 0; }
  syncUI(); artChanged();
};
$('#auto').onclick = () => { state.autoRotate = !state.autoRotate; syncUI(); };
const zoom = k => { const c = camOf(state.product); c.dist = Math.max(2.5, Math.min(18, c.dist * k)); needs3D = true; };
$('#zoomIn').onclick = () => zoom(.88); $('#zoomOut').onclick = () => zoom(1.14);
$('#front').onclick = () => { delete state.cam[state.product]; needs3D = true; };

$('#wm').value = state.watermark;
/* ---------- cenas prontas + opções de cena ---------- */
function renderScenes() {}
function sceneChanged(what) {
  if (what) { markScene(what); saveScene(); }
  needs3D = thumbsDirty = true;
  if (!$('#drawer').classList.contains('hidden')) renderSceneOpts();
}
function ui(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function segRow(opts, val, pick) {
  const d = ui('div', 'segc');
  opts.forEach(([v, l]) => { const b = ui('button', v === val ? 'on' : '', l); b.onclick = () => pick(v); d.append(b); });
  return d;
}
function sliderRow(label, min, max, val, fmt, onInput) {
  const l = ui('label', 'field', `<span>${label}</span><input type="range" min="${min}" max="${max}" value="${val}"><output>${fmt(val)}</output>`);
  const i = l.querySelector('input'), o = l.querySelector('output');
  i.oninput = () => { o.textContent = fmt(+i.value); onInput(+i.value); };
  return l;
}
function colorRow(label, val, onInput) {
  const l = ui('label', 'row', `<span>${label}</span><input type="color" value="${val}">`);
  l.querySelector('input').oninput = e => onInput(e.target.value); return l;
}
const envThumbs = {}, texThumbs = {};
function renderSceneOpts() {
  const so = state.so, box = $('#drawerBody'); box.innerHTML = '';
  const sec = (title, icon) => { const s = ui('section', 'dsec', `<h5><svg class="i"><use href="#${icon}"/></svg>${title}</h5>`); box.append(s); return s; };
  // ---- fundo
  let s1 = sec('Fundo da cena', 'i-image');
  s1.append(segRow([['default', 'Padrão'], ['transparent', 'Transparente'], ['color', 'Cor'], ['env', 'Ambiente 3D'], ['image', 'Imagem']], so.bg, v => { so.bg = v; sceneChanged('flat'); }));
  if (so.bg === 'color') s1.append(colorRow('Cor', so.color, v => { so.color = v; sceneChanged('flat'); }));
  if (so.bg === 'env') {
    const g = ui('div', 'tiles');
    ENVS.forEach(e => {
      const img = envImage(e.id);
      if (!envThumbs[e.id] && img) { const c = document.createElement('canvas'); c.width = 150; c.height = 96; c.getContext('2d').drawImage(img, img.width * (e.id === 'estudio' ? .85 : .16), img.height * .3, img.width * .14, img.height * .3, 0, 0, 150, 96); envThumbs[e.id] = c.toDataURL(); }
      const thumb = envThumbs[e.id] ? `<img src="${envThumbs[e.id]}" alt="">` : `<div class="ph"><svg class="i"><use href="#i-upload"/></svg></div>`;
      const b = ui('button', 'tile' + (so.env === e.id ? ' on' : ''), `${thumb}<span>${e.name}</span>`);
      b.onclick = () => { if (e.id === 'custom' && !state.env360) return $('#env360File').click(); so.env = e.id; sceneChanged('env'); };
      g.append(b);
    });
    s1.append(g);
    s1.append(sliderRow('Rotação', 0, 360, so.envRot, v => v + '°', v => { so.envRot = v; markScene('env'); saveScene(); needs3D = thumbsDirty = true; }));
    s1.append(sliderRow('Desfoque', 0, 100, so.envBlur, v => v + '%', v => { so.envBlur = v; saveScene(); needs3D = thumbsDirty = true; }));
  }
  if (so.bg === 'image') {
    const b = ui('button', 'btn sm block', '<svg class="i"><use href="#i-upload"/></svg>' + (state.bgImg ? 'Trocar imagem de fundo' : 'Enviar imagem de fundo'));
    b.onclick = () => $('#bgImgFile').click(); s1.append(b);
    s1.append(sliderRow('Desfoque', 0, 100, so.imgBlur, v => v + '%', v => { so.imgBlur = v; markScene('flat'); saveScene(); needs3D = true; }));
  }
  // ---- mesa
  const t = so.table, s2 = sec('Mesa', 'i-cube');
  const chk = ui('label', 'check', `<input type="checkbox" ${t.show ? 'checked' : ''}> Mostrar mesa`);
  chk.querySelector('input').onchange = e => { t.show = e.target.checked; sceneChanged('tableGeo'); };
  s2.append(chk);
  if (t.show) {
    s2.append(segRow([['round', 'Redonda'], ['square', 'Quadrada'], ['rect', 'Retangular'], ['podio', 'Pódio']], t.shape, v => { t.shape = v; sceneChanged('tableGeo'); }));
    s2.append(sliderRow('Tamanho', 15, 70, Math.round(t.size * 10), v => (v / 10).toFixed(1), v => { t.size = v / 10; markScene('tableGeo'); markScene('tableTex'); saveScene(); needs3D = thumbsDirty = true; }));
    const g = ui('div', 'tiles tex');
    TABLE_TEX.forEach(d => {
      if (!texThumbs[d.id]) {
        const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
        if (d.paint) { const f = document.createElement('canvas'); f.width = f.height = 512; d.paint(f.getContext('2d'), 512); x.drawImage(f, 0, 0, 512, 512, 0, 0, 128, 128); }
        else if (d.id === 'imagem') { x.fillStyle = '#eef2f7'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#64748b'; x.font = '600 44px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('⇪', 64, 64); }
        else if (d.id === 'cor') { const gr = x.createLinearGradient(0, 0, 128, 128); ['#ff6b6b', '#ffd43b', '#63e6be', '#4dabf7', '#b197fc'].forEach((cc, i) => gr.addColorStop(i / 4, cc)); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); }
        else { x.fillStyle = d.color; x.fillRect(0, 0, 128, 128); }
        texThumbs[d.id] = c.toDataURL();
      }
      const b = ui('button', 'tile' + (t.tex === d.id ? ' on' : ''), `<img src="${texThumbs[d.id]}" alt=""><span>${d.name}</span>`);
      b.onclick = () => { t.tex = d.id; if (d.id === 'imagem' && !state.tableImg) $('#tableImgFile').click(); sceneChanged('tableTex'); };
      g.append(b);
    });
    s2.append(g);
    if (t.tex === 'cor') s2.append(colorRow('Cor da mesa', t.color, v => { t.color = v; markScene('tableTex'); saveScene(); needs3D = true; }));
    if (t.tex === 'imagem') { const b = ui('button', 'btn sm block', '<svg class="i"><use href="#i-upload"/></svg>Enviar imagem da mesa'); b.onclick = () => $('#tableImgFile').click(); s2.append(b); }
  }
  // ---- luz e sombra
  const s3 = sec('Iluminação e sombra', 'i-target');
  const live = () => { saveScene(); needs3D = thumbsDirty = true; };
  s3.append(sliderRow('Ambiente', 40, 180, Math.round(so.ambient * 100), v => v + '%', v => { so.ambient = v / 100; live(); }));
  s3.append(sliderRow('Luz principal', 0, 200, Math.round(so.key * 100), v => v + '%', v => { so.key = v / 100; live(); }));
  const sh = ui('label', 'check', `<input type="checkbox" ${so.shadow.show ? 'checked' : ''}> Mostrar sombra`);
  sh.querySelector('input').onchange = e => { so.shadow.show = e.target.checked; live(); };
  s3.append(sh);
  if (so.shadow.show && !t.show) s3.append(sliderRow('Intensidade', 0, 100, so.shadow.strength, v => v + '%', v => { so.shadow.strength = v; live(); }));
  const reset = ui('button', 'btn sm block', '<svg class="i"><use href="#i-rotate"/></svg>Restaurar cena padrão');
  reset.onclick = () => { resetScene(); sceneChanged(); };
  box.append(reset);
}
const toggleDrawer = force => {
  const d = $('#drawer'), open = force ?? d.classList.contains('hidden');
  d.classList.toggle('hidden', !open); $('#gearBtn').classList.toggle('on', open);
  if (open) renderSceneOpts();
};
$('#gearBtn').onclick = () => toggleDrawer(); $('#sceneOptsBtn').onclick = () => { if (typeof openTab === 'function') openTab(null); toggleDrawer(true); }; $('#drawerClose').onclick = () => toggleDrawer(false);
$('#env360File').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  state.env360 = await loadImage(f); delete envThumbs.custom; state.so.env = 'custom'; state.so.bg = 'env'; sceneChanged('env');
  toast('Foto 360° aplicada (vale enquanto a página estiver aberta)');
};
/* ---------- restaurar todas as configurações ---------- */
$('#resetAll').onclick = () => {
  if (!confirm('Restaurar todas as configurações?\n\nCores, posição da arte, cena, formato e marca d\'água voltam ao padrão. Seus modelos com foto continuam salvos.')) return;
  try { Object.keys(localStorage).filter(k => k.startsWith('meu-mockup')).forEach(k => localStorage.removeItem(k)); } catch (e) {}
  location.hash = ''; location.reload();
};
$('#bgImgFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; state.bgImg = await loadImage(f); state.so.bg = 'image'; sceneChanged('flat'); };
$('#tableImgFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; state.tableImg = await loadImage(f); state.so.table.tex = 'imagem'; sceneChanged('tableTex'); };
$('#format').value = state.format;
$('#format').onchange = e => { state.format = e.target.value; try { localStorage.setItem('meu-mockup-format', state.format); } catch (er) {} updateFrame(); };
$('#wm').oninput = e => { state.watermark = e.target.value; savePrefs(); syncWm(); };
$('#guides').onchange = e => { state.guides = e.target.checked; draw(); };

/* ---------- mouse no 3D ---------- */
view3d.addEventListener('pointerdown', e => { view3d.setPointerCapture(e.pointerId); drag3d = { x: e.clientX, y: e.clientY }; });
view3d.addEventListener('pointermove', e => {
  if (!drag3d) return;
  const c = camOf(state.product);
  c.theta -= (e.clientX - drag3d.x) * .008;
  c.phi = Math.max(.25, Math.min(1.75, c.phi - (e.clientY - drag3d.y) * .006));
  drag3d = { x: e.clientX, y: e.clientY }; needs3D = true;
});
view3d.addEventListener('pointerup', () => drag3d = null);
view3d.addEventListener('wheel', e => {
  e.preventDefault();
  const c = camOf(state.product);
  c.dist = Math.max(2.5, Math.min(18, c.dist * (e.deltaY < 0 ? .93 : 1.07))); needs3D = true;
}, { passive: false });
view3d.addEventListener('dblclick', e => {
  const r = view3d.getBoundingClientRect(), ray = new THREE.Raycaster();
  ray.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -(e.clientY - r.top) / r.height * 2 + 1 }, camera);
  const m = model(state.product);
  if (editKey() === CARD_KEY) { const h = ray.intersectObject(m.card, true)[0]; if (h && h.uv) { const t = tf(); t.x = h.uv.x - .5; t.y = .5 - h.uv.y; syncUI(); artChanged(); } return; }
  const hit = ray.intersectObject(m.printable, true)[0];
  if (hit && m.custom) {
    const t = tf(); m.fromHit(hit.point, t);
    syncUI(); artChanged(); return;
  }
  if (!hit || !hit.uv) return;
  const { canvas } = m.tex, a = m.area, t = tf();
  t.x = (hit.uv.x * canvas.width - (a.x + a.w / 2)) / a.w;
  t.y = ((1 - hit.uv.y) * canvas.height - (a.y + a.h / 2)) / a.h;
  syncUI(); artChanged();
});

/* ---------- mouse no 2D ---------- */
let drag = null;
function canvasPt(e) {
  const r = view.getBoundingClientRect();
  return { x: (e.clientX - r.left) * view.width / r.width, y: (e.clientY - r.top) * view.height / r.height };
}
view.addEventListener('pointerdown', e => {
  view.setPointerCapture(e.pointerId);
  const p = canvasPt(e);
  drag = state.defining ? { def: true, x0: p.x, y0: p.y } : { x: p.x, y: p.y };
});
view.addEventListener('pointermove', e => {
  if (!drag) return;
  const p = canvasPt(e), tpl = getTpl(state.product);
  if (drag.def) {
    const W = view.width, H = view.height;
    tpl.rect = { x: Math.min(p.x, drag.x0) / W, y: Math.min(p.y, drag.y0) / H, w: Math.abs(p.x - drag.x0) / W, h: Math.abs(p.y - drag.y0) / H };
  } else {
    const a = tplArea(tpl), t = tf();
    t.x += (p.x - drag.x) / Math.max(1, a.w); t.y += (p.y - drag.y) / Math.max(1, a.h);
    drag.x = p.x; drag.y = p.y;
    $('#posX').value = Math.round(t.x * 100); $('#posY').value = Math.round(t.y * 100);
  }
  thumbsDirty = true; draw();
});
view.addEventListener('pointerup', () => { if (drag?.def) saveTpl(getTpl(state.product)); drag = null; });
view.addEventListener('wheel', e => {
  if (state.defining) return;
  e.preventDefault();
  const t = tf(); t.scale = Math.max(.05, Math.min(3, t.scale * (e.deltaY < 0 ? 1.05 : 1 / 1.05)));
  $('#scale').value = Math.round(t.scale * 100); artChanged();
}, { passive: false });

/* ---------- modelos com foto salvos (IndexedDB) ---------- */
let db = null;
function idb(mode, fn) {
  return new Promise((res, rej) => {
    if (!db) return res(null);
    const tx = db.transaction('templates', mode), r = fn(tx.objectStore('templates'));
    tx.oncomplete = () => res(r?.result); tx.onerror = () => rej(tx.error);
  });
}
async function openDB() {
  try {
    db = await new Promise((res, rej) => {
      const r = indexedDB.open('meu-mockup', 2);
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains('templates')) r.result.createObjectStore('templates', { keyPath: 'id' });
        if (!r.result.objectStoreNames.contains('models3d')) r.result.createObjectStore('models3d', { keyPath: 'id' });
      };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    for (const t of await idb('readonly', st => st.getAll()) || []) {
      try { t.img = await loadImage(t.blob); state.templates.push(t); } catch (e) {}
    }
  } catch (e) { db = null; }
}
function saveTpl(t) {
  const { img, ...rec } = t;
  idb('readwrite', st => st.put(rec)).catch(() => toast('Não deu para salvar o modelo neste navegador'));
}
$('#tplFile').onchange = async e => {
  const file = e.target.files[0]; e.target.value = '';
  if (!file) return;
  try {
    const img = await loadImage(file);
    const name = (prompt('Nome do modelo (ex.: Squeeze, Ecobag):', file.name.replace(/\.[^.]+$/, '')) || 'Meu modelo').slice(0, 30);
    const t = { id: 'tpl-' + Date.now(), name, blob: file, img, rect: { x: .3, y: .3, w: .4, h: .4 }, shape: 'rect', blend: 'multiply' };
    state.templates.push(t); saveTpl(t); thumbsDirty = true;
    location.hash = '#p=' + t.id;
    setTimeout(() => { state.defining = true; syncUI(); draw(); toast('Arraste sobre a foto para marcar onde a arte entra'); }, 0);
  } catch (err) { toast('Não consegui abrir essa foto'); }
};
$('#defArea').onclick = () => { state.defining = !state.defining; syncUI(); draw(); };
$('#tplShape').onchange = e => { const t = getTpl(state.product); t.shape = e.target.value; saveTpl(t); draw(); };
$('#tplBlend').onchange = e => { const t = getTpl(state.product); t.blend = e.target.value; saveTpl(t); draw(); };
$('#delTpl').onclick = () => {
  const t = getTpl(state.product); if (!t || !confirm(`Excluir o modelo "${t.name}"?`)) return;
  state.templates = state.templates.filter(x => x !== t);
  idb('readwrite', st => st.delete(t.id)).catch(() => {});
  delete thumbs[t.id]; location.hash = '';
};

/* ---------- exportar ---------- */
$('#dl').onclick = () => download(exportCanvas(state.product), `mockup-${fileName(state.product)}.png`);
$('#sheet').onclick = () => {
  const ids = [...new Set([state.product, ...Object.keys(state.tf)])].filter(id => PRODUCTS[id] || getTpl(id));
  const cell = 900, gap = 24, cols = Math.min(3, ids.length), rows = Math.ceil(ids.length / cols);
  const out = document.createElement('canvas');
  out.width = cols * cell + (cols + 1) * gap; out.height = rows * cell + (rows + 1) * gap;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, out.width, out.height);
  ids.forEach((id, i) => {
    const c = exportCanvas(id, 1200);
    const k = Math.min(cell / c.width, cell / c.height), w = c.width * k, h = c.height * k;
    ctx.drawImage(c, gap + (i % cols) * (cell + gap) + (cell - w) / 2, gap + Math.floor(i / cols) * (cell + gap) + (cell - h) / 2, w, h);
  });
  draw();
  download(out, 'mockup-prancha.png');
  toast(`Prancha com ${ids.length} produto(s) que você abriu`);
};
/* ---------- vídeo: escolher duração, velocidade e movimento ---------- */
const VSPEEDS = [['15', 'Bem lenta'], ['25', 'Lenta'], ['40', 'Normal'], ['70', 'Rápida']];
state.video = (() => { try { return { secs: 10, speed: 25, mode: 'spin', loop: true, ...JSON.parse(localStorage.getItem('meu-mockup-video') || '{}') }; } catch (e) { return { secs: 10, speed: 25, mode: 'spin', loop: true }; } })();
const ease = k => .5 - .5 * Math.cos(Math.PI * k);                 // começa e termina suave
function videoPlan() {
  const v = state.video, T = v.secs;
  if (v.mode === 'swing') {
    const amp = 40, period = Math.max(2, 4 * amp / v.speed);
    return { T, info: `Balança ±${amp}° · ${(T / period).toFixed(1).replace('.', ',')} vai-e-volta`,
      angle: t => amp * Math.min(1, t / .8) * Math.min(1, (T - t) / .8) * Math.sin(TAU * t / period) * Math.PI / 180 };
  }
  let total = v.speed * T;
  if (v.loop) total = Math.max(1, Math.round(total / 360)) * 360;
  const voltas = total / 360;
  return { T, info: `${voltas.toFixed(voltas % 1 ? 1 : 0).replace('.', ',')} volta${voltas === 1 ? '' : 's'} em ${T} s`,
    angle: t => total * ease(t / T) * Math.PI / 180 };
}
function renderVideoModal() {
  const v = state.video, box = $('#vBody'); box.innerHTML = '';
  const save = () => { try { localStorage.setItem('meu-mockup-video', JSON.stringify(v)); } catch (e) {} renderVideoModal(); };
  const lab = t => box.append(ui('div', 'mlabel', t));
  lab('Duração'); box.append(segRow([5, 10, 15, 20, 30].map(n => [n, n + ' s']), v.secs, x => { v.secs = x; save(); }));
  lab('Velocidade'); box.append(segRow(VSPEEDS, String(v.speed), x => { v.speed = +x; save(); }));
  lab('Movimento'); box.append(segRow([['spin', 'Girar 360°'], ['swing', 'Balançar (mostra a frente)']], v.mode, x => { v.mode = x; save(); }));
  if (v.mode === 'spin') {
    const c = ui('label', 'check', `<input type="checkbox" ${v.loop ? 'checked' : ''}> Ajustar para voltas completas (vídeo em loop perfeito)`);
    c.querySelector('input').onchange = e => { v.loop = e.target.checked; save(); }; box.append(c);
  }
  const [VW, VH] = exportDims(1280);
  box.append(ui('p', 'hint', `<svg class="i"><use href="#i-info"/></svg><span><b>${videoPlan().info}</b> · formato ${state.format} (${VW}×${VH})</span>`));
}
let previewing = null;
function stopPreview() { if (previewing) { camOf(previewing.id).theta = previewing.theta0; previewing = null; needs3D = true; $('#vPreview').innerHTML = '<svg class="i"><use href="#i-rotate"/></svg>Pré-visualizar'; } }
$('#vPreview').onclick = () => {
  if (previewing) return stopPreview();
  const id = state.product, plan = videoPlan(), theta0 = camOf(id).theta, t0 = performance.now();
  previewing = { id, theta0 };
  $('#vPreview').textContent = 'Parar prévia';
  const step = now => {
    if (!previewing) return;
    const t = (now - t0) / 1000;
    if (t >= plan.T) return stopPreview();
    camOf(id).theta = theta0 + plan.angle(t); needs3D = true; requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
const openVideo = open => { $('#videoModal').classList.toggle('hidden', !open); if (open) renderVideoModal(); else stopPreview(); };
$('#video').onclick = () => openVideo(true);
$('#vClose').onclick = $('#vCancel').onclick = () => { if (!state.busy) openVideo(false); };
$('#videoModal').addEventListener('pointerdown', e => { if (e.target.id === 'videoModal' && !state.busy) openVideo(false); });
$('#vGo').onclick = async () => {
  stopPreview();
  if (!window.MediaRecorder) return toast('Este navegador não grava vídeo — use o Chrome');
  const mime = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
  if (!mime) return toast('Este navegador não grava vídeo — use o Chrome');
  const id = state.product, [VW, VH] = exportDims(1280), fps = 30, plan = videoPlan();
  const rec2d = document.createElement('canvas'); rec2d.width = VW; rec2d.height = VH;
  const ctx = rec2d.getContext('2d');
  const rec = new MediaRecorder(rec2d.captureStream(fps), { mimeType: mime, videoBitsPerSecond: 10e6 });
  const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  state.busy = true; ['#vGo', '#vPreview', '#vCancel', '#video'].forEach(q => $(q).disabled = true);
  const wrap = $('.wrap'); wrap.style.background = `url(${view3d.toDataURL()}) center/100% 100% no-repeat`; view3d.style.opacity = 0;   // tela congelada enquanto grava
  paintTexture(id); renderer.setSize(VW, VH, false);
  const c = camOf(id), theta0 = c.theta;
  const frame = () => { setup3D(id, VW / VH); renderer.render(scene, camera); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, VW, VH); ctx.drawImage(view3d, 0, 0); addWatermark(ctx, VW, VH); };
  frame(); rec.start();
  await new Promise(res => {
    const t0 = performance.now();
    const step = now => {
      const t = Math.min(plan.T, (now - t0) / 1000);
      c.theta = theta0 + plan.angle(t); frame();
      $('#vGo').textContent = `Gravando… ${Math.round(t / plan.T * 100)}%`;
      if (t < plan.T) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });
  await new Promise(res => { rec.onstop = res; rec.stop(); });
  c.theta = theta0; resize3D(); view3d.style.opacity = ''; wrap.style.background = '';
  state.busy = false; ['#vGo', '#vPreview', '#vCancel', '#video'].forEach(q => $(q).disabled = false);
  $('#vGo').innerHTML = '<svg class="i"><use href="#i-film"/></svg>Gerar vídeo';
  needs3D = dirtyTex = true; openVideo(false);
  saveBlob(new Blob(chunks, { type: mime.split(';')[0] }), `mockup-${fileName(id)}.${mime.includes('mp4') ? 'mp4' : 'webm'}`);
  toast('Vídeo pronto!');
};

$('#glbFile').onchange = async e => {
  const f = e.target.files[0], id = e.target.dataset.pid; e.target.value = '';
  if (!f || !id) return;
  await importModel(id, f); renderOptions(); draw();
};

$('#layerSeg').querySelectorAll('button').forEach(b => b.onclick = () => { state.layer = b.dataset.l; syncUI(); });
$('#extraFile').onchange = async e => {
  const f = e.target.files[0], key = e.target.dataset.key; e.target.value = ''; if (!f) return;
  try { state[key] = await loadImage(f); if (key === 'cardArt') { cardStamp++; delete state.tf[CARD_KEY]; state.layer = 'card'; syncUI(); } thumbsDirty = true; draw(); renderOptions(); toast('Arte do cartão aplicada'); }
  catch (er) { toast('Não consegui abrir essa imagem'); }
};
/* ---------- menu embaixo / na lateral ---------- */
function openTab(tab) {
  const open = tab && !(document.body.classList.contains('dock-open') && state.dockTab === tab);
  state.dockTab = open ? tab : null;
  document.body.classList.toggle('dock-open', open);
  document.querySelectorAll('aside .panel').forEach(p => p.classList.toggle('tab-on', p.dataset.tab === state.dockTab));
  document.querySelectorAll('#tabs .btn').forEach(b => b.classList.toggle('on', b.dataset.tab === state.dockTab));
  if (open) $('aside').scrollTop = 0;
}
function setDock(on) {
  document.body.classList.toggle('dock', on);
  openTab(null);
  $('#dockLbl').textContent = on ? 'Menu lateral' : 'Menu embaixo';
  $('#dockBtn use').setAttribute('href', on ? '#i-side' : '#i-dock');
  try { localStorage.setItem('meu-mockup-dock', on ? '1' : '0'); } catch (e) {}
  setTimeout(resize3D, 0);
}
document.querySelectorAll('#tabs .btn').forEach(b => b.onclick = () => openTab(b.dataset.tab));
$('#dockBtn').onclick = () => setDock(!document.body.classList.contains('dock'));
[view3d, view].forEach(c => c.addEventListener('pointerdown', () => { if (document.body.classList.contains('dock-open')) openTab(null); }));
try { setDock(localStorage.getItem('meu-mockup-dock') === '1'); } catch (e) {}

/* ================= início ================= */
markScene('all'); loop(); route();
openDB().then(async () => {
  await loadCustomModels();
  Object.keys(state.custom3d).forEach(resetModel);
  if (state.templates.length || Object.keys(state.custom3d).length) { thumbsDirty = true; route(); }
});

/* ---------- tema claro / escuro ---------- */
$('#themeBtn').onclick = () => {
  const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('mm-theme', t); } catch (e) {}
  if (typeof window.aeRedraw === 'function') window.aeRedraw();
};
