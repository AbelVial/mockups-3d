/* =========================================================================
   Meu Mockup — editor 2D da arte (posicionar com o mouse)
   Mostra a área de impressão com a arte e uma caixa de transformação:
   arrastar = mover · quadradinhos = tamanho · alça de cima = girar.
   ========================================================================= */
(() => {
  const card = $('#artEditor'), cv = $('#aeCanvas'), ctx = cv.getContext('2d');
  const HS = 9, ROT_OFF = 28, MARGIN = 54;
  let geo = null, drag = null, lastKey = '', lastDecal = 0;

  // retângulo de trabalho (mesma matemática usada para pintar a arte no produto)
  function rect() {
    const id = state.product; if (!id) return null;
    if (editKey() === CARD_KEY) { const A = cardArea(); return { AW: A.w, AH: A.h, bg: '#ffffff', label: 'Cartão 7 × 10 cm', img: cardImage(), surf: { x: 0, y: 0, w: A.w, h: A.h } }; }
    if (is3D(id)) {
      const m = model(id), c = colorsOf(id);
      if (m.custom) return { AW: m.area.w * 2, AH: m.area.h * 2, bg: c.body, wrap: false };
      // superfície inteira do produto (a textura), nas mesmas unidades da área
      const T = m.tex.canvas, surf = { x: -m.area.x, y: -m.area.y, w: T.width, h: T.height };
      return { AW: m.area.w, AH: m.area.h, bg: c.body, label: m.clip ? 'Área sugerida · a arte pode cobrir o produto todo' : m.label, surf, fitSurf: !!(m.clip || m.wrap) };
    }
    const a = tplArea(getTpl(id)); return { AW: Math.max(1, a.w), AH: Math.max(1, a.h), bg: '#ffffff' };
  }
  function layout() {
    const r = rect(); if (!r) return null;
    const cw = cv.clientWidth, ch = cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
    const F = r.fitSurf ? r.surf : { x: 0, y: 0, w: r.AW, h: r.AH };
    const k = Math.min((cw - MARGIN * 2) / F.w, (ch - MARGIN * 2) / F.h);
    const ox = (cw - F.w * k) / 2 - F.x * k, oy = (ch - F.h * k) / 2 - F.y * k;
    const t = tf(), [aw, ah] = artSize(r.img || currentArt()), s = Math.min(r.AW / aw, r.AH / ah) * t.scale;
    return { ...r, k, ox, oy, dpr, cw, ch, t,
      cx: ox + (r.AW / 2 + t.x * r.AW) * k, cy: oy + (r.AH / 2 + t.y * r.AH) * k,
      w: aw * s * k, h: ah * s * k, rot: t.rot * Math.PI / 180 };
  }
  function draw() {
    geo = layout(); if (!geo) return;
    const g = geo, a = g.img || currentArt();
    ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
    ctx.clearRect(0, 0, g.cw, g.ch);
    // fundo quadriculado suave
    const css = getComputedStyle(document.documentElement), cvar = (n, d) => css.getPropertyValue(n).trim() || d;
    ctx.fillStyle = cvar('--ae-bg', '#f1f5f9'); ctx.fillRect(0, 0, g.cw, g.ch);
    ctx.fillStyle = cvar('--ae-check', '#e8edf3');
    for (let x = 0; x < g.cw; x += 16) for (let y = (x / 16 % 2) * 16; y < g.ch; y += 32) ctx.fillRect(x, y, 16, 16);
    // área de impressão
    const ax = g.ox, ay = g.oy, aW = g.AW * g.k, aH = g.AH * g.k;
    // superfície do produto: a arte só some onde o produto acaba (fora dele aparece apagada)
    const S = g.surf ? { x: ax + g.surf.x * g.k, y: ay + g.surf.y * g.k, w: g.surf.w * g.k, h: g.surf.h * g.k } : { x: -1e4, y: -1e4, w: 3e4, h: 3e4 };
    ctx.fillStyle = g.bg; ctx.fillRect(S.x, S.y, S.w, S.h);
    const art = () => { ctx.save(); ctx.translate(g.cx, g.cy); ctx.rotate(g.rot); ctx.drawImage(a, -g.w / 2, -g.h / 2, g.w, g.h); ctx.restore(); };
    const wraps = g.fitSurf ? [-S.w, 0, S.w] : [0];
    ctx.globalAlpha = .3; art(); ctx.globalAlpha = 1;
    ctx.save(); ctx.beginPath(); ctx.rect(S.x, S.y, S.w, S.h); ctx.clip(); wraps.forEach(dx => { ctx.save(); ctx.translate(dx, 0); art(); ctx.restore(); }); ctx.restore();
    if (g.surf) { ctx.save(); ctx.strokeStyle = cvar('--line-2', '#cbd5e1'); ctx.lineWidth = 1; ctx.strokeRect(S.x + .5, S.y + .5, S.w - 1, S.h - 1); ctx.restore(); }
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.strokeRect(ax + .5, ay + .5, aW - 1, aH - 1); ctx.restore();
    ctx.fillStyle = cvar('--muted', '#64748b'); ctx.font = '500 11px Inter,system-ui,sans-serif';
    ctx.fillText(g.label || 'Área de impressão', ax, ay - 8);
    // caixa de transformação
    ctx.save(); ctx.translate(g.cx, g.cy); ctx.rotate(g.rot);
    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1.5; ctx.strokeRect(-g.w / 2, -g.h / 2, g.w, g.h);
    ctx.beginPath(); ctx.moveTo(0, -g.h / 2); ctx.lineTo(0, -g.h / 2 - ROT_OFF); ctx.stroke();
    handles().forEach(([hx, hy, kind]) => {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1.2;
      if (kind === 'rot') { ctx.beginPath(); ctx.arc(hx, hy, 6.5, 0, TAU); ctx.fill(); ctx.stroke(); }
      else { ctx.fillRect(hx - HS / 2, hy - HS / 2, HS, HS); ctx.strokeRect(hx - HS / 2, hy - HS / 2, HS, HS); }
    });
    ctx.restore();
    $('#aeInfo').textContent = `Tamanho ${Math.round(g.t.scale * 100)}% · Rotação ${Math.round(g.t.rot)}°`;
  }
  function handles() {
    const w = geo.w / 2, h = geo.h / 2;
    return [[-w, -h, 'nw'], [0, -h, 'n'], [w, -h, 'ne'], [w, 0, 'e'], [w, h, 'se'], [0, h, 's'], [-w, h, 'sw'], [-w, 0, 'w'], [0, -h - ROT_OFF, 'rot']];
  }
  function local(p) {        // ponto da tela -> coordenadas da arte (sem rotação)
    const dx = p.x - geo.cx, dy = p.y - geo.cy, c = Math.cos(-geo.rot), s = Math.sin(-geo.rot);
    return { x: dx * c - dy * s, y: dx * s + dy * c };
  }
  function hit(p) {
    const l = local(p);
    for (const [hx, hy, kind] of handles()) if (Math.abs(l.x - hx) <= HS && Math.abs(l.y - hy) <= HS) return kind;
    if (Math.abs(l.x) <= geo.w / 2 && Math.abs(l.y) <= geo.h / 2) return 'move';
    return null;
  }
  const CURSORS = { move: 'move', rot: 'grab', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize' };
  const pt = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function commit(final) {
    const t = tf();
    $('#scale').value = Math.round(t.scale * 100); $('#posX').value = Math.round(t.x * 100);
    $('#posY').value = Math.round(t.y * 100); $('#rot').value = Math.round(t.rot);
    syncOutputs(); thumbsDirty = true;
    // modelos importados recalculam a estampa — limita a frequência enquanto arrasta
    const now = performance.now(), heavy = is3D(state.product) && model(state.product).custom;
    if (final || !heavy || now - lastDecal > 140) { lastDecal = now; window.draw(); }
    draw();
  }

  cv.addEventListener('pointerdown', e => {
    if (!geo) return;
    const p = pt(e), kind = hit(p); if (!kind) return;
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    const t = tf();
    drag = { kind, p0: p, t0: { ...t }, d0: Math.hypot(p.x - geo.cx, p.y - geo.cy) || 1, a0: Math.atan2(p.y - geo.cy, p.x - geo.cx), k: geo.k, AW: geo.AW, AH: geo.AH };
    if (kind === 'rot') cv.style.cursor = 'grabbing';
  });
  cv.addEventListener('pointermove', e => {
    if (!geo) return;
    const p = pt(e);
    if (!drag) { const k = hit(p); cv.style.cursor = k ? CURSORS[k] : 'default'; return; }
    const t = tf(), d = drag;
    if (d.kind === 'move') {
      t.x = d.t0.x + (p.x - d.p0.x) / (d.k * d.AW); t.y = d.t0.y + (p.y - d.p0.y) / (d.k * d.AH);
      if (e.shiftKey) { if (Math.abs(t.x) < .02) t.x = 0; if (Math.abs(t.y) < .02) t.y = 0; }
    } else if (d.kind === 'rot') {
      let r = d.t0.rot + (Math.atan2(p.y - geo.cy, p.x - geo.cx) - d.a0) * 180 / Math.PI;
      r = ((r + 180) % 360 + 360) % 360 - 180;
      if (e.shiftKey) r = Math.round(r / 15) * 15;
      t.rot = r;
    } else {
      t.scale = Math.max(.05, Math.min(3, d.t0.scale * Math.hypot(p.x - geo.cx, p.y - geo.cy) / d.d0));
    }
    commit(false);
  });
  const end = () => { if (drag) { drag = null; commit(true); } };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('wheel', e => {
    e.preventDefault(); const t = tf();
    t.scale = Math.max(.05, Math.min(3, t.scale * (e.deltaY < 0 ? 1.05 : 1 / 1.05))); commit(true);
  }, { passive: false });
  cv.addEventListener('dblclick', () => { const t = tf(); t.x = t.y = 0; commit(true); });
  cv.tabIndex = 0;
  cv.addEventListener('keydown', e => {
    const t = tf(), st = e.shiftKey ? .05 : .005, map = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] };
    if (!map[e.key]) return; e.preventDefault(); t.x += map[e.key][0]; t.y += map[e.key][1]; commit(true);
  });

  // abrir / fechar
  const setOpen = open => {
    card.classList.toggle('hidden', !open); $('#aeToggle').classList.toggle('on', open); $('#aeBtn').classList.toggle('on', open);
    try { localStorage.setItem('meu-mockup-ae', open ? '1' : '0'); } catch (e) {}
    lastKey = '';
  };
  $('#aeToggle').onclick = $('#aeBtn').onclick = () => setOpen(card.classList.contains('hidden'));
  $('#aeClose').onclick = () => setOpen(false);
  let saved = '1'; try { saved = localStorage.getItem('meu-mockup-ae') ?? '1'; } catch (e) {}
  setOpen(saved === '1');

  // redesenha quando algo muda (barras, cor, arte, produto, tamanho)
  (function watch() {
    requestAnimationFrame(watch);
    if (card.classList.contains('hidden') || !state.product || !document.body.classList.contains('editing')) return;
    const id = state.product, t = tf(id);
    const key = [id, state.layer, cardStamp, t.x, t.y, t.scale, t.rot, artStamp, state.art ? 1 : 0, is3D(id) ? colorsOf(id).body : '', cv.clientWidth, cv.clientHeight, !!(is3D(id) && model(id).custom)].join('|');
    if (key !== lastKey && !drag) { lastKey = key; draw(); }
  })();
  window.aeRedraw = () => { if (!card.classList.contains("hidden")) draw(); };
})();
