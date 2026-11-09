/* =========================================================================
   Meu Mockup — catálogo de produtos 3D
   Cada produto: nome, categoria, cores, e build() que devolve:
     { group, printable, tex, area, ground, cam, wrap?, apply(c, tg)?, paintExtra(ctx, W, H, c, tg)? }
   area = região da estampa (pixels da textura) usada pelo "Encaixar"
   ========================================================================= */
const PAL = {
  geral: ['#ffffff', '#111111', '#c92a2a', '#1971c2', '#2f9e44', '#f08c00', '#e64980', '#7048e8', '#fcc419'],
  tecido: ['#ffffff', '#151515', '#9a9a9a', '#1f2a44', '#c92a2a', '#1971c2', '#2f9e44', '#fcc419', '#f3d9b1', '#f8c8dc', '#a5d8ff'],
  madeira: ['#c8a27a', '#a0754d', '#6b4a2f', '#e9d8bd', '#ffffff', '#111111'],
  metal: ['#ffffff', '#c0c0c0', '#111111', '#c92a2a', '#1971c2', '#2f9e44', '#e64980', '#fcc419'],
};
const CATEGORIES = [
  ['Vestuário', ['camiseta', 'body', 'bone', 'chinelo', 'mascara']],
  ['Canecas e bebidas', ['caneca', 'xicara', 'chopp', 'garrafa']],
  ['Decoração', ['azulejo', 'relogio', 'almofada']],
  ['Brindes e acessórios', ['botton', 'bottonCartao', 'chaveiro', 'almochaveiro', 'mousepad']],
];
const PRODUCTS = {};
function defProduct(id, d) { PRODUCTS[id] = { id, scale: 1, colors: [], toggles: [], ...d }; }

/* ------------------------------------------------------------------ canecas */
function buildMugLike(o) {
  const g = new THREE.Group();
  const avgR = (o.rt + o.rb) / 2, T = makeTex(2048, Math.round(2048 * o.h / (TAU * avgR)));
  const outer = glossy({ map: T.tex }), inner = glossy({ side: THREE.DoubleSide }), base = std({ roughness: .7 });
  // u = 0 fica na alça (+X): a emenda da estampa fica escondida na alça, como na sublimação real
  const body = new THREE.Mesh(new THREE.CylinderGeometry(o.rt, o.rb, o.h, 160, 1, true, Math.PI / 2, TAU), outer);
  g.add(body);
  const ib = o.baseH || .1;
  const inn = new THREE.Mesh(new THREE.CylinderGeometry(o.rt * o.inner, o.rb * o.inner * .97, o.h - ib, 160, 1, true), inner);
  inn.position.y = ib / 2; g.add(inn);
  const ibot = new THREE.Mesh(new THREE.CircleGeometry(o.rb * o.inner * .97, 96), inner);
  ibot.rotation.x = -Math.PI / 2; ibot.position.y = -o.h / 2 + ib; g.add(ibot);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(o.rt * (1 + o.inner) / 2, o.rt * (1 - o.inner) / 2, 20, 160), inner);
  rim.rotation.x = Math.PI / 2; rim.position.y = o.h / 2; g.add(rim);
  const bot = new THREE.Mesh(new THREE.CircleGeometry(o.rb, 96), base);
  bot.rotation.x = Math.PI / 2; bot.position.y = -o.h / 2; g.add(bot);
  const foot = new THREE.Mesh(new THREE.TorusGeometry(o.rb - .025, .025, 12, 160), base);
  foot.rotation.x = Math.PI / 2; foot.position.y = -o.h / 2 + .025; g.add(foot);
  const handle = tube(o.handle.map(([x, y]) => [x, y, 0]), o.hr, inner, false, 140);
  handle.scale.z = .72; g.add(handle);
  const H = T.canvas.height;
  g.rotation.y = Math.PI / 2;            // centro da estampa (oposto à alça) de frente para a câmera
  const gap = Math.round(2048 * 30 / 360 / 2);   // 30° livres na região da alça
  return {
    group: g, printable: body, tex: T, clip: true, label: 'Área de impressão: volta inteira (as pontas encontram a alça)',
    area: { x: gap, y: Math.round(H * (o.top ?? .08)), w: 2048 - gap * 2, h: Math.round(H * (o.band ?? .84)) },
    apply(c) { inner.color.set(c.inner); base.color.set(c.body); },
  };
}
defProduct('caneca', {
  name: 'Caneca', desc: 'Cerâmica 325 ml', scale: .85,
  colors: [{ key: 'body', label: 'Cor da caneca', pal: PAL.geral, def: '#ffffff' }, { key: 'inner', label: 'Interior e alça', pal: PAL.geral, def: '#ffffff' }],
  build() {
    const m = buildMugLike({ rt: 1, rb: 1, h: 2.3, inner: .93, hr: .1,
      handle: [[.955, .66], [1.3, .7], [1.58, .48], [1.66, .02], [1.55, -.38], [1.25, -.57], [.955, -.56]] });
    return { ...m, ground: -1.15, cam: { theta: 1.0, phi: 1.42, dist: 8 } };
  },
});
defProduct('chopp', {
  name: 'Caneca de chopp', desc: 'Polímero 500 ml', scale: .8,
  colors: [{ key: 'body', label: 'Cor da caneca', pal: PAL.geral, def: '#ffffff' }, { key: 'inner', label: 'Interior e alça', pal: PAL.geral, def: '#ffffff' }],
  build() {
    const m = buildMugLike({ rt: .95, rb: .84, h: 2.8, inner: .9, hr: .14, baseH: .4, top: .07, band: .76,
      handle: [[.92, 1.0], [1.35, 1.05], [1.64, .78], [1.7, -.3], [1.54, -.78], [1.15, -.88], [.88, -.85]] });
    return { ...m, ground: -1.4, cam: { theta: 1.0, phi: 1.4, dist: 9.2 } };
  },
});
defProduct('xicara', {
  name: 'Xícara com pires', desc: 'Porcelana 180 ml', scale: 1.05,
  colors: [{ key: 'body', label: 'Cor da xícara', pal: PAL.geral, def: '#ffffff' }, { key: 'inner', label: 'Interior e alça', pal: PAL.geral, def: '#ffffff' },
    { key: 'saucer', label: 'Pires', pal: PAL.geral, def: '=body' }],
  build() {
    const g = new THREE.Group(), y1 = 1.12;
    const T = makeTex(2048, Math.round(2048 * y1 / (TAU * .7)));
    const outer = glossy({ map: T.tex, side: THREE.DoubleSide }), inner = glossy({ side: THREE.DoubleSide }), sauc = glossy({ side: THREE.DoubleSide });
    const cup = new THREE.Mesh(lathe([[0, 0], [.42, 0], [.46, .02], [.5, .08], [.56, .25], [.66, .55], [.76, .85], [.82, 1.05], [.84, y1]], 0, y1, 160, Math.PI / 2), outer);
    g.add(cup);
    g.add(new THREE.Mesh(lathe([[0, .1], [.4, .1], [.48, .2], [.6, .5], [.72, .85], [.79, 1.1]], 0, y1), inner));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.815, .026, 14, 140), inner);
    rim.rotation.x = Math.PI / 2; rim.position.y = y1; g.add(rim);
    const h = tube([[.77, .88, 0], [1.02, .93, 0], [1.13, .72, 0], [1.02, .47, 0], [.63, .42, 0]], .046, inner);
    h.scale.z = .7; g.add(h);
    const s = new THREE.Mesh(lathe([[0, -.07], [.55, -.07], [.6, -.04], [.62, 0], [1.1, .06], [1.35, .14], [1.42, .17], [1.45, .16], [1.43, .13], [1.1, .02], [.65, -.04]], -1, 1), sauc);
    g.add(s);
    g.position.y = -.35; g.rotation.y = Math.PI / 2;
    const H = T.canvas.height;
    const gap = Math.round(2048 * 40 / 360 / 2);
    return { group: g, printable: cup, tex: T, clip: true, label: 'Área de impressão: volta inteira (as pontas encontram a alça)', area: { x: gap, y: Math.round(H * .12), w: 2048 - gap * 2, h: Math.round(H * .72) },
      ground: -.42, cam: { theta: 1.0, phi: 1.2, dist: 6.6 },
      apply(c) { inner.color.set(c.inner); sauc.color.set(c.saucer); } };
  },
});
defProduct('garrafa', {
  name: 'Garrafinha 500 ml', desc: 'Squeeze de alumínio', scale: .9,
  colors: [{ key: 'body', label: 'Cor da garrafa', pal: PAL.metal, def: '#ffffff' }, { key: 'cap', label: 'Tampa', pal: PAL.metal, def: '#111111' }],
  build() {
    const g = new THREE.Group(), y1 = 3.1;
    const T = makeTex(2048, Math.round(2048 * y1 / (TAU * .63)));
    const bodyMat = new THREE.MeshPhysicalMaterial({ map: T.tex, metalness: .25, roughness: .3, clearcoat: .6, clearcoatRoughness: .2, side: THREE.DoubleSide });
    const capMat = std({ roughness: .45 });
    const body = new THREE.Mesh(lathe([[0, 0], [.56, 0], [.61, .03], [.63, .12], [.63, 2.3], [.61, 2.5], [.5, 2.75], [.36, 2.92], [.31, 2.98], [.31, y1]], 0, y1), bodyMat);
    g.add(body);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.35, .36, .42, 64), capMat);
    cap.position.y = y1 + .13; g.add(cap);
    for (let i = 0; i < 24; i++) {          // ranhuras da tampa
      const r = new THREE.Mesh(new THREE.BoxGeometry(.03, .34, .03), capMat), a = i / 24 * TAU;
      r.position.set(Math.sin(a) * .36, y1 + .13, Math.cos(a) * .36); r.rotation.y = a; g.add(r);
    }
    const top = new THREE.Mesh(new THREE.CylinderGeometry(.2, .26, .14, 48), capMat);
    top.position.y = y1 + .41; g.add(top);
    const loop = new THREE.Mesh(new THREE.TorusGeometry(.17, .05, 16, 48), capMat);
    loop.position.y = y1 + .6; g.add(loop);
    g.position.y = -1.75;
    const H = T.canvas.height;
    return { group: g, printable: body, tex: T, clip: true, label: 'Área de impressão: volta inteira (as pontas se encontram atrás)',
      area: { x: 0, y: Math.round(H * (y1 - 2.25) / y1), w: 2048, h: Math.round(H * 1.95 / y1) },
      ground: -1.75, cam: { theta: .2, phi: 1.42, dist: 9.6 }, apply(c) { capMat.color.set(c.cap); } };
  },
});

/* ------------------------------------------------------------------ botton */
defProduct('botton', {
  name: 'Botton', desc: 'Com verso e alfinete',
  colors: [{ key: 'body', label: 'Cor de fundo', pal: PAL.geral, def: '#ffffff' }],
  toggles: [{ key: 'back', label: 'Mostrar verso', def: true }],
  build() {
    const T = makeTex(2048, 2048);
    const face = glossy({ map: T.tex, roughness: .12, clearcoatRoughness: .03, side: THREE.DoubleSide });
    const backMat = std({ color: 0xf4f4f4, roughness: .45 }), pin = metal({ roughness: .22 });
    const one = () => {
      const g0 = new THREE.Group();
      const prof = [[.9, -.06], [.95, -.056], [.983, -.042], [.998, -.018], [.998, .008], [.988, .028], [.965, .043], [.92, .054], [.75, .066], [.45, .074], [0, .077]]
        .map(([x, y]) => new THREE.Vector2(x, y));
      const geo = new THREE.LatheGeometry(prof, 180);
      geo.rotateX(Math.PI / 2);
      const p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 2 + .5, p.getY(i) / 2 + .5);
      g0.add(new THREE.Mesh(geo, face));
      const back = new THREE.Mesh(new THREE.CircleGeometry(.9, 96), backMat);
      back.rotation.y = Math.PI; back.position.z = -.06; g0.add(back);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(.84, .03, 12, 120), backMat); rim.position.z = -.065; g0.add(rim);
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, 1.12, 12), pin);
      bar.rotation.z = Math.PI / 2; bar.position.set(0, .06, -.1); g0.add(bar);
      const coil = new THREE.Mesh(new THREE.TorusGeometry(.04, .013, 10, 24), pin);
      coil.rotation.y = Math.PI / 2; coil.position.set(-.6, .06, -.09); g0.add(coil);
      const clasp = new THREE.Mesh(new THREE.CylinderGeometry(.032, .032, .13, 16), pin);
      clasp.rotation.z = Math.PI / 2; clasp.position.set(.58, .06, -.095); g0.add(clasp);
      return g0;
    };
    const g = new THREE.Group(), front = one(), back = one();
    front.position.set(.72, 0, 0);
    back.rotation.y = Math.PI + .12; back.position.set(-.98, -.3, -1.1); back.scale.setScalar(.75);
    g.add(front, back); g.scale.setScalar(1.1);
    return { group: g, printable: front.children[0], tex: T, area: { x: 124, y: 124, w: 1800, h: 1800 },
      ground: -1.16, cam: { theta: 0, phi: 1.5, dist: 8.6 }, apply(c, tg) { back.visible = tg.back; } };
  },
});

/* ------------------------------------------------------------------ botton com cartão */
state.cardArt = null; let cardStamp = 0;
state.layer = 'btn';                  // no botton com cartão: 'btn' = arte do botton, 'card' = arte do cartão
const CARD_KEY = 'bottonCartao#card';
let cardPlaceholder = null;
function cardImage() {
  if (state.cardArt) return state.cardArt;
  if (!cardPlaceholder) { cardPlaceholder = document.createElement('canvas'); cardPlaceholder.width = 1024; cardPlaceholder.height = Math.round(1024 * CARD.H / CARD.W); paintCardPlaceholder(cardPlaceholder.getContext('2d'), cardPlaceholder.width, cardPlaceholder.height); }
  return cardPlaceholder;
}
const cardArea = () => ({ x: 0, y: 0, w: 1024, h: Math.round(1024 * CARD.H / CARD.W) });
function cardTf() {          // começa preenchendo o cartão todo
  if (!state.tf[CARD_KEY]) {
    const a = cardImage(), A = cardArea(), [aw, ah] = artSize(a);
    state.tf[CARD_KEY] = { scale: Math.max(A.w / aw, A.h / ah) / Math.min(A.w / aw, A.h / ah), x: 0, y: 0, rot: 0 };
  }
  return state.tf[CARD_KEY];
}
function drawImg(ctx, img, area, t) {
  const [aw, ah] = artSize(img), s = Math.min(area.w / aw, area.h / ah) * t.scale;
  ctx.save(); ctx.translate(area.x + area.w / 2 + t.x * area.w, area.y + area.h / 2 + t.y * area.h);
  ctx.rotate(t.rot * Math.PI / 180); ctx.drawImage(img, -aw * s / 2, -ah * s / 2, aw * s, ah * s); ctx.restore();
}
function paintCardPlaceholder(x, W, H) {
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#eaf2fb'); g.addColorStop(1, '#cfe0f3'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = '#1d4ed8'; x.fillRect(0, H * .86, W, H * .14);
  x.fillStyle = '#0f2a5c'; x.textAlign = 'center'; x.font = `800 ${W * .11}px system-ui,sans-serif`; x.fillText('SEU CARTÃO', W / 2, H * .15);
  x.font = `500 ${W * .05}px system-ui,sans-serif`; x.fillStyle = '#334155'; x.fillText('Envie a arte do cartão no painel “Cores”', W / 2, H * .22);
  x.setLineDash([W * .02, W * .015]); x.strokeStyle = 'rgba(15,42,92,.35)'; x.lineWidth = W * .006;
  x.beginPath(); x.arc(W / 2, H * CARD.btnY, W * CARD.btnR, 0, TAU); x.stroke(); x.setLineDash([]);
  x.fillStyle = '#fff'; x.font = `600 ${W * .045}px system-ui,sans-serif`; x.fillText('@minhaloja', W / 2, H * .94);
}
// medidas: cartão 7 x 10 cm, botton 4,4 cm (proporções reais)
const CARD = { W: 3.5, H: 5, btnY: .45, btnR: .314 };
defProduct('bottonCartao', {
  name: 'Botton com cartão', desc: 'Cartela de apresentação',
  colors: [{ key: 'body', label: 'Cor de fundo do botton', pal: PAL.geral, def: '#ffffff' }],
  uploads: [{ key: 'cardArt', label: 'Arte do cartão (7 x 10 cm)', hint: 'Deixe um espaço no centro para o botton — o círculo tracejado mostra onde ele fica.' }],
  build() {
    const { W, H, btnY, btnR } = CARD;
    const T = makeTex(2048, 2048), C = makeTex(1024, Math.round(1024 * H / W));
    const face = glossy({ map: T.tex, roughness: .12, clearcoatRoughness: .03, side: THREE.DoubleSide });
    const paper = new THREE.MeshPhysicalMaterial({ map: C.tex, roughness: .55, clearcoat: .25, clearcoatRoughness: .4 });
    const edge = std({ color: 0xf3f3f1, roughness: .8 });
    const card = slab(roundedRect(W, H, .16), .03, .006, paper, edge);
    const g = new THREE.Group(), stand = new THREE.Group();
    stand.add(card);
    // botton preso no cartão
    const prof = [[.9, -.06], [.95, -.056], [.983, -.042], [.998, -.018], [.998, .008], [.988, .028], [.965, .043], [.92, .054], [.75, .066], [.45, .074], [0, .077]].map(([a, b]) => new THREE.Vector2(a, b));
    const geo = new THREE.LatheGeometry(prof, 180); geo.rotateX(Math.PI / 2);
    const pp = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pp.count; i++) uv.setXY(i, pp.getX(i) / 2 + .5, pp.getY(i) / 2 + .5);
    const btn = new THREE.Mesh(geo, face), R = btnR * W;
    btn.scale.setScalar(R); btn.position.set(0, H / 2 - btnY * H, .04 + .06 * R);
    stand.add(btn);
    stand.rotation.x = -.1;                     // levemente inclinado, como apoiado
    stand.position.y = H / 2 * Math.cos(.1);
    g.add(stand); g.position.y = -H / 2;
    let painted = '';
    return { group: g, printable: btn, card, tex: T, area: { x: 124, y: 124, w: 1800, h: 1800 },
      ground: -H / 2 - .02, cam: { theta: .35, phi: 1.42, dist: 14 },
      apply() {
        const t = cardTf(), key = [cardStamp, t.x, t.y, t.scale, t.rot].join('|');
        if (painted === key) return;
        const x = C.ctx, cw = C.canvas.width, ch = C.canvas.height;
        x.fillStyle = '#ffffff'; x.fillRect(0, 0, cw, ch);
        drawImg(x, cardImage(), { x: 0, y: 0, w: cw, h: ch }, t);
        C.tex.needsUpdate = true; painted = key;
      } };
  },
});

/* ------------------------------------------------------------------ camiseta */
defProduct('camiseta', {
  name: 'Camiseta', desc: 'Malha / poliéster', fabric: true,
  colors: [{ key: 'body', label: 'Cor da camiseta', pal: PAL.tecido, def: '#ffffff' }, { key: 'trim', label: 'Gola e punhos', pal: PAL.tecido, def: '=body' }],
  build() {
    const SY0 = -1.75, SY1 = 1.15, SHN = 160;
    const SA = [[-1.75, .9], [-1.1, .87], [-.4, .86], [.2, .93], [.55, .95]];
    const SB = [[-1.75, .52], [-.4, .5], [.2, .57], [.55, .52]];
    const SC0 = TAU * Math.sqrt((.93 * .93 + .57 * .57) / 2), SPPU = 2048 / SC0;
    const T = makeTex(2048, Math.round((SY1 - SY0) * SPPU));
    const mat = fabric({ map: T.tex }), plain = fabric(), inside = fabric({ roughness: 1, side: THREE.BackSide }), trim = fabric({ roughness: .85 });
    const g = new THREE.Group();
    const neckY = th => 1.05 - .085 * Math.sin(th);
    const wrinkle = (th, y) => 1 + .012 * Math.sin(th * 7 + y * 2.3) * Math.max(0, Math.min(1, (.2 - y) / .8)) + .008 * Math.sin(th * 11 - y * 5);
    const rings = [], uvs = [], centers = [];
    const ringAt = (fn, yc) => {
      const pts = [];
      for (let i = 0; i <= SHN; i++) pts.push(fn(Math.PI / 2 + Math.PI - i / SHN * TAU));
      const s = [0]; for (let i = 1; i <= SHN; i++) s.push(s[i - 1] + pts[i].distanceTo(pts[i - 1]));
      const mid = s[SHN / 2];
      rings.push(pts); centers.push(new THREE.Vector3(0, yc, 0));
      uvs.push(pts.map((p, i) => [.5 + (s[i] - mid) / SC0, (p.y - SY0) / (SY1 - SY0)]));
    };
    for (let j = 0; j <= 80; j++) {
      const y = lerp(SY0, .55, j / 80), a = interp(SA, y), b = interp(SB, y);
      ringAt(th => { const w = wrinkle(th, y); return new THREE.Vector3(a * Math.cos(th) * w, y, b * Math.sin(th) * w); }, y);
    }
    const a1 = interp(SA, .55), b1 = interp(SB, .55);
    for (let j = 1; j <= 36; j++) {
      const t = j / 36, ex = 1 - Math.cos(t * Math.PI / 2), ey = Math.sin(t * Math.PI / 2);
      ringAt(th => { const w = 1 + (wrinkle(th, .55) - 1) * (1 - ex); return new THREE.Vector3(lerp(a1, .36, ex) * Math.cos(th) * w, lerp(.55, neckY(th), ey), lerp(b1, .32, ex) * Math.sin(th) * w + .03 * ex); }, lerp(.55, 1.05, ey));
    }
    const bodyGeo = ringMesh(rings, uvs, centers), body = new THREE.Mesh(bodyGeo, mat);
    g.add(body, new THREE.Mesh(bodyGeo, inside));
    for (const sx of [-1, 1]) {
      const P0 = new THREE.Vector3(sx * .55, .42, .01), D = new THREE.Vector3(sx * .62, -.78, 0).normalize();
      const N1 = new THREE.Vector3(0, 0, 1), N2 = new THREE.Vector3().crossVectors(D, N1).normalize();
      const L = 1.05, sr = [], sc = [];
      for (let j = 0; j <= 30; j++) {
        const t = j / 30, c = P0.clone().addScaledVector(D, t * L), r = lerp(.36, .28, t), ring = [];
        for (let i = 0; i <= 64; i++) {
          const th = i / 64 * TAU, w = 1 + .02 * Math.sin(th * 5 + t * 4) * t;
          ring.push(c.clone().addScaledVector(N2, Math.cos(th) * r * w).addScaledVector(N1, Math.sin(th) * r * .82 * w));
        }
        sr.push(ring); sc.push(c);
      }
      const sg = ringMesh(sr, null, sc);
      g.add(new THREE.Mesh(sg, plain), new THREE.Mesh(sg, inside));
      const end = P0.clone().addScaledVector(D, L), cuff = [];
      for (let i = 0; i < 64; i++) { const th = i / 64 * TAU; cuff.push(end.clone().addScaledVector(N2, Math.cos(th) * .28).addScaledVector(N1, Math.sin(th) * .28 * .82)); }
      g.add(tube(cuff, .022, trim, true, 96));
    }
    g.add(tube(rings[rings.length - 1].slice(0, SHN), .034, trim, true, 160));
    g.add(tube(rings[0].slice(0, SHN), .014, plain, true, 160));
    g.position.y = .3;
    return { group: g, printable: body, tex: T,
      area: { x: 1024 - .62 * SPPU, y: (SY1 - .8) * SPPU, w: 1.24 * SPPU, h: 1.5 * SPPU },
      ground: -1.5, cam: { theta: .3, phi: 1.42, dist: 8.4 },
      apply(c) { plain.color.set(c.body); inside.color.set(shadeHex(c.body, -.3)); trim.color.set(c.trim); } };
  },
});

/* ------------------------------------------------------------------ body infantil */
defProduct('body', {
  name: 'Body infantil', desc: 'Manga curta', fabric: true, scale: .9,
  colors: [{ key: 'body', label: 'Cor do body', pal: PAL.tecido, def: '#ffffff' }, { key: 'trim', label: 'Viés (acabamento)', pal: PAL.tecido, def: '=body' }],
  build() {
    // contorno (y para baixo); a gola da frente é mais funda que a das costas
    const outline = neckY => pathPts([['M', 405, 112], ['Q', 500, neckY, 595, 112], ['Q', 640, 118, 690, 140], ['L', 815, 240], ['Q', 800, 290, 765, 332], ['L', 668, 292],
      ['Q', 648, 450, 662, 600], ['Q', 672, 715, 628, 792], ['Q', 568, 806, 552, 884], ['Q', 500, 892, 448, 884], ['Q', 432, 806, 372, 792],
      ['Q', 328, 715, 338, 600], ['Q', 352, 450, 332, 292], ['L', 235, 332], ['Q', 200, 290, 185, 240], ['L', 310, 140], ['Q', 360, 118, 405, 112]]);
    const F = outline(232), B = outline(150);
    // volume do corpo do bebê (barriga e peito arredondados), some perto das costuras
    const belly = (x, y, sign) => { const dx = (x - 500) / 190, dy = (y - 500) / 330, r = dx * dx + dy * dy; return r < 1 ? (sign > 0 ? 95 : 70) * (1 - r) ** 1.4 : 0; };
    const opt = { puff: 1.25, scale: 1 / 300, fold: .35, extra: belly };
    const inf = inflate(F.pts, opt), infB = inflate(B.pts, opt);
    const T = texFor(inf);
    const mat = fabric({ map: T.tex }), back = fabric({ side: THREE.DoubleSide }), trim = fabric({ roughness: .85 });
    const g = new THREE.Group(), front = new THREE.Mesh(inf.front, mat);
    g.add(front, new THREE.Mesh(infB.back, back));
    // viés: gola (frente e costas), mangas e cavas das pernas
    const edge = (P, i, r = .024) => g.add(tube(P.parts[i].map(([x, y]) => inf.to3(x, y, .004)), r, trim, false, 48));
    edge(F, 0, .03); edge(B, 0, .026);
    [3, 14, 7, 8, 9].forEach(i => edge(F, i));
    // ombro "envelope": a frente passa por cima das costas
    for (const sx of [-1, 1]) g.add(tube([inf.to3(500 + sx * 95, 112, .01), inf.to3(500 + sx * 140, 122, .02), inf.to3(500 + sx * 175, 142, .01)], .012, trim, false, 16));
    for (const x of [470, 500, 530]) {
      const snap = new THREE.Mesh(new THREE.CylinderGeometry(.032, .032, .02, 24), metal());
      snap.rotation.x = Math.PI / 2; snap.position.copy(inf.to3(x, 866, .05)); g.add(snap);
    }
    g.rotation.x = -.04;
    return { group: g, printable: front, tex: T, area: inf.areaPx(T.canvas.width, { x: 385, y: 290, w: 230, h: 270 }),
      ground: -1.4, cam: { theta: .3, phi: 1.45, dist: 6.8 },
      apply(c) { back.color.set(shadeHex(c.body, -.05)); trim.color.set(c.trim); } };
  },
});

/* ------------------------------------------------------------------ boné */
defProduct('bone', {
  name: 'Boné', desc: 'Trucker / americano', scale: 1,
  colors: [{ key: 'body', label: 'Frente', pal: PAL.tecido, def: '#ffffff' }, { key: 'back', label: 'Tela (trás)', pal: PAL.tecido, def: '#151515' },
    { key: 'brim', label: 'Aba', pal: PAL.tecido, def: '#151515' }],
  build() {
    const g = new THREE.Group(), T = makeTex(2048, 1024);
    const frontMat = fabric({ map: T.tex, side: THREE.DoubleSide }), backMat = fabric({ side: THREE.DoubleSide }), brim = fabric({ side: THREE.DoubleSide }), brimUnder = fabric({ side: THREE.DoubleSide });
    const fg = new THREE.SphereGeometry(1, 96, 48, 0, Math.PI, 0, Math.PI / 2);
    const p = fg.attributes.position, uv = fg.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 2 + .5, p.getY(i));   // projeção de frente
    const crown = new THREE.Group();
    const front = new THREE.Mesh(fg, frontMat);
    crown.add(front, new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48, Math.PI, Math.PI, 0, Math.PI / 2), backMat));
    const btn = new THREE.Mesh(new THREE.SphereGeometry(.07, 24, 12), brim); btn.position.y = 1; crown.add(btn);
    for (const a of [Math.PI * 1.25, Math.PI * 1.5, Math.PI * 1.75]) {  // costuras (frente inteiriça)
      const pts = []; for (let k = 0; k <= 30; k++) { const th = k / 30 * Math.PI / 2; pts.push([-Math.cos(a) * Math.sin(th) * 1.004, Math.cos(th) * 1.004, Math.sin(a) * Math.sin(th) * 1.004]); }
      crown.add(tube(pts, .008, backMat, false, 40));
    }
    crown.scale.set(1, .82, 1.12); g.add(crown);
    // aba curvada
    const NI = 60, NJ = 16, L = .58, top = [], bot = [];
    const P = (i, j, off) => {
      const th = lerp(.16 * Math.PI, .84 * Math.PI, i / NI), t = j / NJ, w = Math.pow(Math.max(0, (Math.sin(th) - .48) / .52), .6);
      const bx = Math.cos(th), bz = Math.sin(th) * 1.12, len = Math.hypot(bx, bz * .8);
      return new THREE.Vector3(bx + bx / len * t * L * w, -.02 - t * .1 * w - .3 * t * w * Math.cos(th) ** 2 + off, bz + bz / len * t * L * w * .9);
    };
    for (let j = 0; j <= NJ; j++) { const rt = [], rb = []; for (let i = 0; i <= NI; i++) { rt.push(P(i, j, 0)); rb.push(P(i, j, -.03)); } top.push(rt); bot.push(rb); }
    const grid = rows => { const pos = [], idx = []; rows.forEach(r => r.forEach(v => pos.push(v.x, v.y, v.z)));
      for (let j = 0; j < NJ; j++) for (let i = 0; i < NI; i++) { const a = j * (NI + 1) + i; idx.push(a, a + NI + 1, a + 1, a + 1, a + NI + 1, a + NI + 2); }
      const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ge.setIndex(idx); ge.computeVertexNormals(); return ge; };
    g.add(new THREE.Mesh(grid(top), brim), new THREE.Mesh(grid(bot), brimUnder));
    const edge = []; for (let i = 0; i <= NI; i++) edge.push(P(i, NJ, -.015));
    g.add(tube(edge, .018, brim, false, 120));
    g.position.y = -.25;
    return { group: g, printable: front, tex: T, area: { x: (1 - .55) * 1024, y: (1 - .84) * 1024, w: 1.1 * 1024, h: .68 * 1024 },
      ground: -.42, cam: { theta: .38, phi: 1.25, dist: 7.2 },
      apply(c) { backMat.color.set(c.back); brim.color.set(c.brim); brimUnder.color.set(shadeHex(c.brim, -.15)); } };
  },
});

/* ------------------------------------------------------------------ chinelo */
defProduct('chinelo', {
  name: 'Chinelo', desc: 'Par, estampa na palmilha', scale: 1,
  colors: [{ key: 'body', label: 'Fundo da palmilha', pal: PAL.geral, def: '#ffffff' }, { key: 'sole', label: 'Solado', pal: PAL.geral, def: '#111111' },
    { key: 'strap', label: 'Tiras', pal: PAL.geral, def: '#111111' }],
  build() {
    const L = 2.6, Wd = t => interp([[0, .4], [.38, .33], [.72, .5], [1, .45]], t);
    const cxf = t => .1 * t * t, hw = t => Wd(t) * Math.sqrt(Math.max(0, Math.sin(Math.PI * t)));
    const outline = m => { const r = [], l = []; for (let i = 0; i <= 80; i++) { const t = i / 80; r.push(new THREE.Vector2(m * (cxf(t) + hw(t)), t * L)); l.push(new THREE.Vector2(m * (cxf(t) - hw(t) * .92), t * L)); } return r.concat(l.reverse()); };
    const xs = outline(1).map(v => v.x), sw = Math.max(...xs) - Math.min(...xs);
    const T = makeTex(1024, Math.round(1024 * L / sw)), TH = T.canvas.height;
    const face = new THREE.MeshPhysicalMaterial({ map: T.tex, roughness: .5, clearcoat: .3 }), sole = std({ roughness: .8 }), strap = std({ roughness: .5 });
    const g = new THREE.Group(); let printable;
    for (const m of [-1, 1]) {
      const pts = outline(m); if (m < 0) pts.reverse();
      const shape = new THREE.Shape(pts), mesh = slab(shape, .16, .02, face, sole);
      mesh.geometry.rotateX(-Math.PI / 2);
      const f = new THREE.Group(); f.add(mesh);
      const w = (x, t, h) => new THREE.Vector3(x, h, -t * L);
      const post = [m * cxf(.8), .8];
      for (const s of [1, -1]) {
        const t0 = .44, x0 = m * (cxf(t0) + s * hw(t0) * (s > 0 ? 1 : .92));
        f.add(tube([w(post[0], post[1], .19), w(lerp(post[0], x0, .45), lerp(post[1], t0, .45), .42), w(lerp(post[0], x0, .85), lerp(post[1], t0, .85), .36), w(x0, t0, .17)], .055, strap, false, 60));
      }
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .08, 20), strap); pin.position.copy(w(post[0], post[1], .21)); f.add(pin);
      f.position.set(m * .62, 0, L / 2); f.rotation.y = -m * .06;
      g.add(f); if (m > 0) printable = mesh;
    }
    return { group: g, printable, tex: T, area: { x: 40, y: TH * .04, w: 944, h: TH * .92 },
      ground: -.02, cam: { theta: 0, phi: .85, dist: 7.2 }, apply(c) { sole.color.set(c.sole); strap.color.set(c.strap); } };
  },
});

/* ------------------------------------------------------------------ máscara de dormir */
defProduct('mascara', {
  name: 'Máscara de dormir', desc: 'Cetim / microfibra', fabric: true,
  colors: [{ key: 'body', label: 'Cor da máscara', pal: PAL.tecido, def: '#ffffff' }, { key: 'trim', label: 'Viés', pal: PAL.tecido, def: '#151515' },
    { key: 'strap', label: 'Elástico', pal: PAL.tecido, def: '#151515' }],
  build() {
    const pts = [];
    for (let i = 0; i < 180; i++) {
      const a = i / 180 * TAU, c = Math.cos(a), s = Math.sin(a);
      const x = 550 * Math.sign(c) * Math.abs(c) ** .75; let y = -250 * Math.sign(s) * Math.abs(s) ** .85;
      if (y > 0 && Math.abs(x) < 170) y -= 150 * (1 - (x / 170) ** 2);
      pts.push([x + 600, y + 300]);
    }
    const inf = inflate(pts, { puff: .8, scale: 1 / 500 });
    const bend = geo => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - .32 * p.getX(i) ** 2); geo.computeVertexNormals(); };
    bend(inf.front); bend(inf.back);
    const T = texFor(inf);
    const mat = new THREE.MeshPhysicalMaterial({ map: T.tex, roughness: .55, sheen: 1, sheenRoughness: .4 }), back = fabric(), trim = fabric(), strap = fabric();
    const g = new THREE.Group(), front = new THREE.Mesh(inf.front, mat);
    g.add(front, new THREE.Mesh(inf.back, back));
    g.add(tube(pts.map(([x, y]) => { const v = inf.to3(x, y); v.z -= .32 * v.x * v.x; return v; }), .025, trim, true, 240));
    const st = tube([[-1.08, .05, -.37], [-1.18, .05, -.9], [-.75, .05, -1.45], [0, .05, -1.62], [.75, .05, -1.45], [1.18, .05, -.9], [1.08, .05, -.37]], .07, strap, false, 120);
    st.scale.y = .6; g.add(st);
    return { group: g, printable: front, tex: T, area: inf.areaPx(T.canvas.width, { x: 50, y: 50, w: 1100, h: 500 }),
      ground: -.65, cam: { theta: .3, phi: 1.3, dist: 6.4 },
      apply(c) { back.color.set(shadeHex(c.body, -.05)); trim.color.set(c.trim); strap.color.set(c.strap); } };
  },
});

/* ------------------------------------------------------------------ almofadas */
function pillowPoly(w, h, bow) {
  const pts = [], edge = (ax, ay, bx, by, nx, ny) => { for (let i = 0; i < 40; i++) { const s = i / 40, o = bow * Math.sin(Math.PI * s); pts.push([lerp(ax, bx, s) + nx * o, lerp(ay, by, s) + ny * o]); } };
  edge(0, 0, w, 0, 0, 1); edge(w, 0, w, h, -1, 0); edge(w, h, 0, h, 0, -1); edge(0, h, 0, 0, 1, 0);
  return pts;
}
defProduct('almofada', {
  name: 'Almofada', desc: '40 x 40 cm', fabric: true,
  colors: [{ key: 'body', label: 'Cor da almofada', pal: PAL.tecido, def: '#ffffff' }, { key: 'trim', label: 'Viés', pal: PAL.tecido, def: '=body' }],
  build() {
    const pts = pillowPoly(1000, 1000, 45), inf = inflate(pts, { puff: 1.25, scale: 1 / 450, fold: .4 });
    const T = texFor(inf), mat = fabric({ map: T.tex }), back = fabric(), trim = fabric();
    const g = new THREE.Group(), front = new THREE.Mesh(inf.front, mat);
    g.add(front, new THREE.Mesh(inf.back, back), tube(pts.map(([x, y]) => inf.to3(x, y)), .022, trim, true, 240));
    g.rotation.x = -.12;
    return { group: g, printable: front, tex: T, area: inf.areaPx(T.canvas.width, { x: 0, y: 0, w: 1000, h: 1000 }),
      ground: -1.1, cam: { theta: .3, phi: 1.4, dist: 8.4 },
      apply(c) { back.color.set(shadeHex(c.body, -.04)); trim.color.set(c.trim); } };
  },
});
defProduct('almochaveiro', {
  name: 'Almochaveiro', desc: 'Mini almofada chaveiro', fabric: true,
  colors: [{ key: 'body', label: 'Cor', pal: PAL.tecido, def: '#ffffff' }, { key: 'trim', label: 'Viés e alça', pal: PAL.tecido, def: '=body' }],
  build() {
    const pts = pillowPoly(1000, 800, 30), inf = inflate(pts, { puff: 1.15, scale: 1 / 560 });
    const T = texFor(inf), mat = fabric({ map: T.tex }), back = fabric(), trim = fabric(), ring = metal();
    const g = new THREE.Group(), front = new THREE.Mesh(inf.front, mat);
    g.add(front, new THREE.Mesh(inf.back, back), tube(pts.map(([x, y]) => inf.to3(x, y)), .02, trim, true, 240));
    const topY = inf.to3(500, 0).y;
    const tab = tube([[0, topY - .05, 0], [-.06, topY + .2, 0], [0, topY + .32, 0], [.06, topY + .2, 0], [0, topY - .05, 0]], .035, trim, false, 40);
    tab.scale.z = .5; g.add(tab);
    const link = new THREE.Mesh(new THREE.TorusGeometry(.07, .016, 10, 30), ring); link.position.y = topY + .38; link.rotation.y = Math.PI / 2; g.add(link);
    const big = new THREE.Mesh(new THREE.TorusGeometry(.3, .03, 14, 64), ring); big.position.y = topY + .72; g.add(big);
    g.position.y = -.25; g.rotation.x = -.05;
    return { group: g, printable: front, tex: T, area: inf.areaPx(T.canvas.width, { x: 0, y: 0, w: 1000, h: 800 }),
      ground: -1.05, cam: { theta: .3, phi: 1.42, dist: 6.6 },
      apply(c) { back.color.set(shadeHex(c.body, -.04)); trim.color.set(c.trim); } };
  },
});

/* ------------------------------------------------------------------ chaveiro retangular */
defProduct('chaveiro', {
  name: 'Chaveiro retangular', desc: 'Polímero, frente e verso',
  colors: [{ key: 'body', label: 'Cor de fundo', pal: PAL.geral, def: '#ffffff' }],
  build() {
    const W = 1.15, H = 1.7, T = makeTex(1024, Math.round(1024 * H / W));
    const shape = roundedRect(W, H, .14), hole = new THREE.Path(); hole.absarc(0, H / 2 - .16, .075, 0, TAU, true); shape.holes.push(hole);
    const face = glossy({ map: T.tex, roughness: .15 }), side = glossy({ color: 0xffffff });
    const plate = slab(shape, .07, .015, face, side); plate.position.z = -.035;
    const g = new THREE.Group(); g.add(plate);
    const ring = metal(), r = new THREE.Mesh(new THREE.TorusGeometry(.3, .028, 16, 64), ring);
    r.rotation.y = Math.PI / 2; r.position.y = H / 2 - .16 + .28; g.add(r);
    const r2 = new THREE.Mesh(new THREE.TorusGeometry(.3, .028, 16, 64), ring);
    r2.rotation.y = Math.PI / 2 + .08; r2.position.set(.008, H / 2 - .16 + .28, 0); g.add(r2);  // argola dupla
    g.position.y = -.25; g.rotation.y = -.2;
    const ph = T.canvas.height;
    return { group: g, printable: plate, tex: T, area: { x: 40, y: Math.round(ph * .2), w: 944, h: Math.round(ph * .76) },
      ground: -1.12, cam: { theta: .15, phi: 1.45, dist: 6.4 } };
  },
});

/* ------------------------------------------------------------------ mousepad */
defProduct('mousepad', {
  name: 'Mousepad', desc: '23 x 19 cm',
  colors: [{ key: 'body', label: 'Cor de fundo', pal: PAL.geral, def: '#ffffff' }, { key: 'side', label: 'Borda / base', pal: PAL.geral, def: '#111111' }],
  build() {
    const W = 2.3, H = 1.9, T = makeTex(2048, Math.round(2048 * H / W));
    const face = fabric({ map: T.tex, roughness: .8 }), side = std({ roughness: .9 });
    const pad = slab(roundedRect(W, H, .14), .05, .015, face, side);
    pad.geometry.rotateX(-Math.PI / 2);
    const g = new THREE.Group(); g.add(pad);
    return { group: g, printable: pad, tex: T, area: { x: 0, y: 0, w: 2048, h: T.canvas.height },
      ground: -.02, cam: { theta: .25, phi: .82, dist: 6.6 }, apply(c) { side.color.set(c.side); } };
  },
});

/* ------------------------------------------------------------------ azulejo e relógio */
// peça reta entre dois pontos (ripa de madeira)
function beam(p0, p1, w, t, m) {
  const a = new THREE.Vector3(...p0), b = new THREE.Vector3(...p1), d = b.clone().sub(a), len = d.length();
  const g = new THREE.BoxGeometry(w, len, t, 1, 1, 1), mesh = new THREE.Mesh(g, m);
  mesh.position.copy(a).addScaledVector(d, .5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return mesh;
}
// azulejo de cerâmica em pé num cavalete de madeira (pernas em A, aparador na frente e perna de trás)
function buildTileOnStand(size, wood) {
  const T = makeTex(2048, 2048), th = .075, bev = .016;
  const face = glossy({ map: T.tex, roughness: .1, clearcoatRoughness: .04 }), side = glossy({ color: 0xffffff, roughness: .25 });
  const tile = slab(roundedRect(size - 2 * bev, size - 2 * bev, .03), th, bev, face, side);
  const backer = new THREE.Mesh(new THREE.PlaneGeometry(size * .985, size * .985), std({ color: 0xd9cdb8, roughness: .95 }));
  backer.rotation.y = Math.PI; backer.position.z = -bev - .001;
  const tg = new THREE.Group(); tg.add(tile, backer);
  const a = .23, ledgeY = .13, ld = .2;               // inclinação, altura e profundidade do aparador
  tg.position.set(0, ledgeY + .045 + size / 2, -th + .01);
  const lean = new THREE.Group(); lean.add(tg); lean.rotation.x = -a;
  // pernas da frente (em A), atrás do azulejo
  const zl = -th - bev - .035, H = size * 1.16 + ledgeY, lw = .075, lt = .05;
  lean.add(beam([-size * .5, 0, zl], [-.05, H, zl], lw, lt, wood), beam([size * .5, 0, zl], [.05, H, zl], lw, lt, wood));
  const cap = new THREE.Mesh(new THREE.BoxGeometry(.2, .1, lt), wood); cap.position.set(0, H - .04, zl); lean.add(cap);
  // aparador + borda da frente
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(size * 1.08, .045, ld), wood); ledge.position.set(0, ledgeY + .022, zl + lt / 2 + ld / 2 - .02); lean.add(ledge);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(size * 1.08, .085, .028), wood); lip.position.set(0, ledgeY + .06, ledge.position.z + ld / 2 - .014); lean.add(lip);
  // travessa de baixo
  const bar = new THREE.Mesh(new THREE.BoxGeometry(size * .9, .05, lt * .8), wood); bar.position.set(0, size * .55, zl - lt * .5); lean.add(bar);
  const g = new THREE.Group(); g.add(lean);
  // perna de trás: do topo até o chão
  lean.updateMatrixWorld(true);
  const top = new THREE.Vector3(0, H - .08, zl - lt / 2).applyMatrix4(lean.matrixWorld);
  const foot = [0, 0, top.z - top.y * .4];
  g.add(beam([top.x, top.y, top.z - .03], foot, lw, lt, wood));
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .16, 16), metal({ color: 0xb8b0a0 })); hinge.rotation.z = Math.PI / 2; hinge.position.copy(top); g.add(hinge);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { g, tile, lean, tg, T };
}
defProduct('azulejo', {
  name: 'Azulejo com suporte', desc: '15 x 15 cm',
  colors: [{ key: 'body', label: 'Cor de fundo', pal: PAL.geral, def: '#ffffff' }, { key: 'wood', label: 'Suporte', pal: PAL.madeira, def: '#c8a27a' }],
  build() {
    const wood = std({ roughness: .75 }), { g, tile, T } = buildTileOnStand(1.6, wood);
    g.position.y = -1;
    return { group: g, printable: tile, tex: T, area: { x: 0, y: 0, w: 2048, h: 2048 },
      ground: -1, cam: { theta: .45, phi: 1.36, dist: 7.6 }, apply(c) { wood.color.set(c.wood); } };
  },
});
defProduct('relogio', {
  name: 'Relógio de azulejo', desc: '20 x 20 cm com suporte',
  colors: [{ key: 'body', label: 'Cor de fundo', pal: PAL.geral, def: '#ffffff' }, { key: 'hands', label: 'Ponteiros e números', pal: PAL.geral, def: '#111111' },
    { key: 'wood', label: 'Suporte', pal: PAL.madeira, def: '#c8a27a' }],
  toggles: [{ key: 'numbers', label: 'Números do relógio', def: true }],
  build() {
    const wood = std({ roughness: .75 }), S = 2, { g, tile, tg, T } = buildTileOnStand(S, wood);
    const hm = std({ roughness: .4, metalness: .3 }), red = std({ color: 0xc92a2a });
    const z = .075 + .016, c = new THREE.Group(); c.position.set(0, 0, z); tg.add(c);
    // ponteiros com formato (afinam na ponta, com rabicho)
    const hand = (len, w, tail, ang, m, dz) => {
      const sh = new THREE.Shape(); sh.moveTo(-w * .6, -tail); sh.lineTo(-w / 2, 0); sh.lineTo(-w * .22, len * .92); sh.lineTo(0, len); sh.lineTo(w * .22, len * .92); sh.lineTo(w / 2, 0); sh.lineTo(w * .6, -tail); sh.lineTo(-w * .6, -tail);
      const h = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .01, bevelEnabled: true, bevelThickness: .003, bevelSize: .003, bevelSegments: 1 }), m);
      h.rotation.z = -ang; h.position.z = dz; h.castShadow = true; c.add(h);
    };
    hand(.5, .075, .1, (10 + 10 / 60) / 12 * TAU, hm, .012);
    hand(.74, .055, .12, 10 / 60 * TAU, hm, .03);
    hand(.82, .014, .2, 32 / 60 * TAU, red, .048);
    const capm = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .07, 28), hm); capm.rotation.x = Math.PI / 2; capm.position.z = .035; c.add(capm);
    const cap2 = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .08, 16), red); cap2.rotation.x = Math.PI / 2; cap2.position.z = .05; c.add(cap2);
    // máquina do relógio atrás do azulejo
    const mech = new THREE.Mesh(new THREE.BoxGeometry(.56, .56, .16), std({ color: 0x1b1b1b, roughness: .5 })); mech.position.z = -.016 - .08; tg.add(mech);
    g.position.y = -1.15;
    return { group: g, printable: tile, tex: T, area: { x: 0, y: 0, w: 2048, h: 2048 },
      ground: -1.15, cam: { theta: .45, phi: 1.36, dist: 8.8 },
      apply(cc) { wood.color.set(cc.wood); hm.color.set(cc.hands); },
      paintExtra(ctx, W, H, cc, tg) {
        if (!tg.numbers) return;
        ctx.save(); ctx.fillStyle = cc.hands; ctx.font = `700 ${W * .075}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let i = 1; i <= 12; i++) { const a = i / 12 * TAU; ctx.fillText(i, W / 2 + Math.sin(a) * W * .4, H / 2 - Math.cos(a) * H * .4); }
        ctx.restore();
      } };
  },
});
