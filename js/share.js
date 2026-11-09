/* =========================================================================
   Meu Mockup — compartilhar o 3D com o cliente
   Link com prévia (s/<id>.html): página no GitHub Pages com foto/título para o WhatsApp.
   Link curto (#c=<gist>): os dados ficam num Gist secreto do GitHub da loja.
   Link longo (#ver=...): tudo dentro do endereço (sem configurar nada).
   O cliente abre em "modo cliente": só visualiza e gira o produto.
   ========================================================================= */
const b64u = {
  enc: str => btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))),
};
function compressImage(img, max, q = .82) {
  const [w0, h0] = [img.naturalWidth || img.width, img.naturalHeight || img.height], k = Math.min(1, max / Math.max(w0, h0));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w0 * k)); c.height = Math.max(1, Math.round(h0 * k));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  let url = c.toDataURL('image/webp', q);
  if (!url.startsWith('data:image/webp')) url = c.toDataURL('image/png');   // navegador sem WebP: PNG (mantém transparência)
  return url;
}
function sharePayload(withArt, artMax = 640, cardMax = 560, q = .82) {
  const id = state.product;
  const d = { c: state.colors[id] || {}, g: state.toggles[id] || {}, t: tf(id), k: state.tf[CARD_KEY], v: state.cam[id], s: state.so, f: state.format, w: state.watermark };
  const out = { ver: id, d: b64u.enc(JSON.stringify(d)) };
  if (withArt && state.art) out.a = compressImage(state.art, artMax, q);
  if (withArt && id === 'bottonCartao' && state.cardArt) out.ca = compressImage(state.cardArt, cardMax, q);
  return out;
}
const baseUrl = () => location.href.split('#')[0];
function shareLink(withArt) {
  const p = sharePayload(withArt);
  let h = '#ver=' + encodeURIComponent(p.ver) + '&d=' + p.d;
  if (p.a) h += '&a=' + encodeURIComponent(p.a);
  if (p.ca) h += '&ca=' + encodeURIComponent(p.ca);
  return baseUrl() + h;
}

/* ---------- link curto: os dados ficam num Gist secreto na conta GitHub da loja ---------- */
const TOKEN_KEY = 'meu-mockup-gist-token';
const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } };
const shortCache = {};
async function shortLink(withArt) {
  const p = sharePayload(withArt, 2048, 1600, .95), body = JSON.stringify(p);
  const key = withArt + '|' + body.length + '|' + body.slice(0, 200) + body.slice(-200);
  if (shortCache[key]) return shortCache[key];
  const r = await fetch('https://api.github.com/gists', {
    method: 'POST', headers: { Authorization: 'token ' + getToken(), Accept: 'application/vnd.github+json' },
    body: JSON.stringify({ public: false, description: 'Meu Mockup — ' + (PRODUCTS[p.ver]?.name || p.ver), files: { 'mockup.json': { content: body } } }),
  });
  if (r.status === 401) throw new Error('token');
  if (!r.ok) throw new Error('http ' + r.status);
  const g = await r.json();
  return (shortCache[key] = baseUrl() + '#c=' + g.id);
}
async function fetchShared(id) {
  const r = await fetch('https://api.github.com/gists/' + encodeURIComponent(id));
  if (!r.ok) throw new Error('http ' + r.status);
  const f = (await r.json()).files['mockup.json'];
  const txt = f.truncated ? await (await fetch(f.raw_url)).text() : f.content;
  const p = JSON.parse(txt);
  return { get: k => p[k] ?? null };
}
/* ---------- link com prévia: página própria no GitHub Pages (s/<id>.html) ----------
   O WhatsApp lê a imagem/título dessa página (og:image). Os dados ficam em s/<id>.json. */
const repoInfo = () => {
  if (window.__repo) return window.__repo;   // usado só nos testes
  const m = location.hostname.match(/^([^.]+)\.github\.io$/i), seg = location.pathname.split('/').filter(Boolean)[0];
  return m && seg && !seg.endsWith('.html') ? { owner: m[1], repo: seg, base: location.origin + '/' + seg + '/' } : null;
};
async function ghApi(path, opt = {}) {
  const r = await fetch('https://api.github.com' + path, { ...opt, headers: { Authorization: 'token ' + getToken(), Accept: 'application/vnd.github+json', ...(opt.body ? { 'Content-Type': 'application/json' } : {}) } });
  if (r.status === 401) throw new Error('token');
  if (r.status === 403 || r.status === 404) throw new Error('perm');
  if (!r.ok) throw new Error('http ' + r.status);
  return r.json();
}
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// foto de prévia: quadrada (o WhatsApp mostra maior) e enquadrada bem de perto no produto
function previewImage(S = 800) {
  const id = state.product, m = model(id), c = camOf(id), keep = { ...c };
  // distância para o produto ocupar ~85% da foto
  m.group.visible = true; m.group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(m.group), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  // esfera que envolve o produto inteiro (a câmera da foto quadrada usa 35°)
  const rad = size.length() / 2, fov = 35 * Math.PI / 180;
  Object.assign(c, { dist: Math.max(1.5, rad / Math.sin(fov / 2) * .95), tx: ctr.x, ty: ctr.y, tz: ctr.z });
  let c3; try { c3 = snap3D(id, S, S); } finally { Object.assign(c, keep); needs3D = true; }
  const o = document.createElement('canvas'); o.width = o.height = S;
  const x = o.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, S, S); x.drawImage(c3, 0, 0);
  addWatermark(x, S, S);
  return o.toDataURL('image/jpeg', .88);
}
function shareTexts() {
  const prod = PRODUCTS[state.product]?.name || 'produto', nome = ($('#shName')?.value || '').trim();
  const msg = ($('#shMsg')?.value || '').replace(/\{nome\}/g, nome ? ', ' + nome : '').replace(/\{produto\}/g, prod.toLowerCase()).trim();
  return { nome, prod, msg, title: nome ? `${nome}, seu mockup 3D: ${prod}` : `Seu mockup 3D: ${prod}`, desc: msg || 'Toque para ver e girar o produto em 3D.' };
}
async function publishPage(withArt) {
  const R = repoInfo(); if (!R) throw new Error('perm');
  const T = shareTexts(), id = Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 6);
  const payload = { ...sharePayload(withArt, 2048, 1600, .95), n: T.nome };
  const img = previewImage(), pageUrl = R.base + 's/' + id + '.html', back = '../#s=' + id;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(T.title)}</title><meta name="description" content="${esc(T.desc)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Meu Mockup"><meta property="og:title" content="${esc(T.title)}">
<meta property="og:description" content="${esc(T.desc)}"><meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${R.base}s/${id}.jpg"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="800"><meta property="og:image:height" content="800">
<meta name="twitter:card" content="summary_large_image"><meta http-equiv="refresh" content="0;url=${back}">
<script>location.replace(${JSON.stringify(back)})</script></head>
<body style="font-family:system-ui,sans-serif;background:#f5f7fb;display:grid;place-items:center;height:100vh;margin:0"><a href="${back}">Abrir o mockup 3D</a></body></html>`;
  const o = R.owner, r = R.repo, info = await ghApi(`/repos/${o}/${r}`), br = info.default_branch;
  const ref = await ghApi(`/repos/${o}/${r}/git/ref/heads/${br}`), head = await ghApi(`/repos/${o}/${r}/git/commits/${ref.object.sha}`);
  const blob = await ghApi(`/repos/${o}/${r}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: img.split(',')[1], encoding: 'base64' }) });
  const tree = await ghApi(`/repos/${o}/${r}/git/trees`, { method: 'POST', body: JSON.stringify({ base_tree: head.tree.sha, tree: [
    { path: `s/${id}.json`, mode: '100644', type: 'blob', content: JSON.stringify(payload) },
    { path: `s/${id}.html`, mode: '100644', type: 'blob', content: html },
    { path: `s/${id}.jpg`, mode: '100644', type: 'blob', sha: blob.sha }] }) });
  const commit = await ghApi(`/repos/${o}/${r}/git/commits`, { method: 'POST', body: JSON.stringify({ message: `Compartilhamento ${id}: ${T.prod}${T.nome ? ' — ' + T.nome : ''}`, tree: tree.sha, parents: [ref.object.sha] }) });
  await ghApi(`/repos/${o}/${r}/git/refs/heads/${br}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });
  return { id, pageUrl, img };
}
async function waitOnline(url, onTick) {      // o GitHub Pages leva ~1 min para publicar
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(url + '?t=' + Date.now(), { method: 'HEAD', cache: 'no-store' }); if (r.ok) return true; } catch (e) {}
    onTick && onTick(i * 5); await new Promise(r => setTimeout(r, 5000));
  }
  return false;
}
async function fetchPage(id) {
  const r = await fetch(baseUrl().replace(/[^/]*$/, '') + 's/' + encodeURIComponent(id) + '.json', { cache: 'no-store' });
  if (!r.ok) throw new Error('http ' + r.status);
  const p = await r.json(); return { get: k => p[k] ?? null };
}
const isOnline = () => /^https?:$/.test(location.protocol) && !/^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname);

/* ---------- janela "Compartilhar" ---------- */
const MSG_KEY = 'meu-mockup-msg', MSG_DEF = 'Olá{nome}! Veja como vai ficar sua {produto} em 3D — dá para girar e ver de todos os lados:';
let shareJob = 0;
function renderShare() {
  const box = $('#shBody'), job = ++shareJob, R = repoInfo();
  const withArt = $('#shArt') ? $('#shArt').checked : true, nome = $('#shName')?.value || '';
  let msg = $('#shMsg')?.value; if (msg == null) { try { msg = localStorage.getItem(MSG_KEY) || MSG_DEF; } catch (e) { msg = MSG_DEF; } }
  box.innerHTML = '';
  if (!isOnline()) box.append(ui('div', 'warn', `<b>Abra o app pelo endereço publicado para compartilhar.</b>Agora ele está abrindo direto do seu computador. Use <a href="https://abelvial.github.io/mockups-3d/" target="_blank" rel="noopener">abelvial.github.io/mockups-3d</a>.`));
  if (!state.art) box.append(ui('div', 'warn', '<b>Você ainda não enviou uma arte.</b>O cliente vai ver o modelo “SUA ARTE AQUI”. Envie a arte no painel “Arte” antes de compartilhar.'));
  // prévia + textos
  const pv = ui('div', 'shprev', `<img id="shImg" alt=""><div><b id="shTitle"></b><span id="shDesc"></span><small>${R ? R.base.replace(/^https?:\/\//, '') : 'link do mockup'}</small></div>`);
  box.append(pv);
  box.append(ui('label', 'row', `<span>Cliente</span><input type="text" id="shName" placeholder="Nome do cliente (opcional)" value="${esc(nome)}">`));
  box.append(ui('label', 'msgrow', `<span>Mensagem</span><textarea id="shMsg" rows="3">${esc(msg)}</textarea><small>Use {nome} e {produto} — são trocados automaticamente.</small>`));
  box.append(ui('label', 'check', `<input type="checkbox" id="shArt" ${withArt ? 'checked' : ''}> Enviar junto a minha arte atual`));
  const syncTexts = () => { const T = shareTexts(); $('#shTitle').textContent = T.title; $('#shDesc').textContent = T.desc; try { localStorage.setItem(MSG_KEY, $('#shMsg').value); } catch (e) {} };
  $('#shName').oninput = $('#shMsg').oninput = syncTexts; syncTexts();
  $('#shArt').onchange = renderShare;
  setTimeout(() => { if (job === shareJob) { try { $('#shImg').src = previewImage(); } catch (e) {} } }, 30);

  const go = ui('button', 'btn pri block', '<svg class="i"><use href="#i-arrow"/></svg>Gerar link para o cliente'); box.append(go);
  const res = ui('div', 'shres hidden', `<div class="linkrow"><input type="text" readonly id="shLink"><button class="btn pri sm" id="shCopy"><svg class="i"><use href="#i-check"/></svg>Copiar</button></div>
    <div class="seg" style="grid-template-columns:1fr 1fr"><a class="btn sm" id="shWa" target="_blank" rel="noopener"><svg class="i"><use href="#i-film"/></svg>Enviar no WhatsApp</a><a class="btn sm" id="shOpen" target="_blank" rel="noopener"><svg class="i"><use href="#i-arrow"/></svg>Ver como o cliente</a></div>`);
  box.append(res);
  const info = ui('p', 'hint', ''); box.append(info);
  const setup = ui('div', 'tokbox', ''); box.append(setup);
  const say = m => { if (job === shareJob) info.innerHTML = `<svg class="i"><use href="#i-info"/></svg><span>${m}</span>`; };
  const show = (link, m) => {
    if (job !== shareJob) return;
    res.classList.remove('hidden'); $('#shLink').value = link; $('#shOpen').href = link;
    const T = shareTexts();
    $('#shWa').href = 'https://wa.me/?text=' + encodeURIComponent((T.msg ? T.msg + '\n' : '') + link);
    $('#shCopy').onclick = async () => { try { await navigator.clipboard.writeText(link); } catch (e) { $('#shLink').select(); document.execCommand('copy'); } toast('Link copiado!'); };
    say(m); go.disabled = false; go.innerHTML = '<svg class="i"><use href="#i-rotate"/></svg>Gerar outro link';
  };
  const tokenForm = err => {
    setup.innerHTML = `<b>Ativar link com prévia (foto + título no WhatsApp)</b>
      <ol class="steps2"><li>Abra <a href="https://github.com/settings/tokens/new?scopes=public_repo,gist&description=Meu%20Mockup%20-%20links%20com%20previa" target="_blank" rel="noopener">esta página do GitHub</a> (já vem com <code>public_repo</code> e <code>gist</code> marcados).</li>
      <li>Em <i>Expiration</i> escolha <b>No expiration</b> e clique em <b>Generate token</b>.</li>
      <li>Copie o código (começa com <code>ghp_</code>) e cole aqui:</li></ol>
      ${err ? `<div class="warn" style="margin-bottom:8px">${err}</div>` : ''}
      <div class="linkrow" style="margin:0"><input type="text" id="tokIn" placeholder="ghp_..." autocomplete="off"><button class="btn sm" id="tokSave">Salvar</button></div>
      <p class="hint"><svg class="i"><use href="#i-info"/></svg><span>O código fica só neste navegador. Ele permite ao app publicar a página de cada compartilhamento no seu site do GitHub.</span></p>`;
    $('#tokSave').onclick = () => { const v = $('#tokIn').value.trim(); if (!v) return; try { localStorage.setItem(TOKEN_KEY, v); } catch (e) {} renderShare(); };
  };
  if (!getToken()) tokenForm();
  else { setup.innerHTML = `<button class="btn ghost sm" id="tokOff">Remover o código do GitHub deste navegador</button>`; $('#tokOff').onclick = () => { try { localStorage.removeItem(TOKEN_KEY); } catch (e) {} renderShare(); }; }

  go.onclick = async () => {
    go.disabled = true; go.textContent = 'Gerando…';
    const long = shareLink($('#shArt').checked);
    if (!getToken()) return show(long, `Link longo (${Math.round(long.length / 1024)} KB), sem prévia. Ative o link com prévia abaixo.`);
    try {
      go.textContent = 'Publicando a página…';
      const { pageUrl } = await publishPage($('#shArt').checked);
      const ok = await waitOnline(pageUrl, s => { if (job === shareJob) go.textContent = `Publicando no GitHub… ${s}s (leva ~1 min)`; });
      show(pageUrl, ok ? 'Pronto! Ao colar no WhatsApp aparece a foto do mockup com o título. O cliente só visualiza o 3D.'
        : 'Página enviada, mas o GitHub ainda está publicando. Aguarde mais um minuto antes de mandar o link.');
    } catch (e) {
      if (e.message === 'token') { try { localStorage.removeItem(TOKEN_KEY); } catch (er) {} tokenForm('O código salvo não funciona mais (expirou ou foi apagado). Gere outro.'); }
      if (e.message === 'perm') {
        go.disabled = false; go.innerHTML = '<svg class="i"><use href="#i-arrow"/></svg>Gerar link para o cliente';
        tokenForm('<b>Falta permissão para a foto de prévia.</b> O código salvo só cria links sem foto. Gere um código novo pelo link acima (já vem com <code>public_repo</code> marcado), cole e salve.');
        const alt = ui('button', 'btn sm block', 'Enviar mesmo assim, sem foto de prévia');
        alt.onclick = async () => { try { show(await shortLink($('#shArt').checked), 'Link curto <b>sem foto de prévia</b>.'); } catch (er) { show(long, 'Link longo, sem foto de prévia.'); } alt.remove(); };
        setup.prepend(alt); setup.scrollIntoView({ behavior: 'smooth', block: 'center' }); return;
      }
      show(long, `Não consegui publicar agora — usando o link longo (${Math.round(long.length / 1024)} KB).`);
    }
  };
}
$('#share').onclick = () => { $('#shareModal').classList.remove('hidden'); renderShare(); };
$('#shClose').onclick = () => $('#shareModal').classList.add('hidden');
$('#shareModal').addEventListener('pointerdown', e => { if (e.target.id === 'shareModal') $('#shareModal').classList.add('hidden'); });

/* ---------- modo cliente ---------- */
state.client = false;
async function openClientLink() {
  let p = new URLSearchParams(location.hash.slice(1));
  if (p.get('c') || p.get('s')) {
    $('#clientLoading').classList.remove('hidden');
    try { p = p.get('s') ? await fetchPage(p.get('s')) : await fetchShared(p.get('c')); }
    catch (e) { document.documentElement.classList.remove('cl-boot'); document.body.classList.add('client'); $('#clientLoading').innerHTML = '<b>Não foi possível abrir este mockup.</b><span>O link pode ter sido removido. Peça um novo à loja.</span>'; return true; }
  }
  const id = p.get('ver');
  if (!id || !PRODUCTS[id]) return false;
  state.client = true; document.body.classList.add('client');
  // nada que o cliente faça altera as preferências salvas deste navegador
  window.savePrefs = () => {}; window.saveScene = () => {};
  try {
    const d = JSON.parse(b64u.dec(p.get('d') || ''));
    state.colors[id] = d.c || {}; state.toggles[id] = d.g || {}; if (d.t) state.tf[id] = d.t; if (d.k) state.tf[CARD_KEY] = d.k; if (d.v) state.cam[id] = d.v;
    if (d.s) { state.so = { ...state.so, ...d.s, table: { ...state.so.table, ...(d.s.table || {}) }, shadow: { ...state.so.shadow, ...(d.s.shadow || {}) } }; markScene('all'); }
    if (d.f && FORMATS[d.f]) { state.format = d.f; $('#format').value = d.f; }
    state.watermark = d.w || ''; $('#wm').value = state.watermark;
  } catch (e) { console.warn('link inválido', e); }
  try {
    if (p.get('a')) { state.art = await loadImage(p.get('a')); artStamp++; }
    if (p.get('ca')) { state.cardArt = await loadImage(p.get('ca')); cardStamp++; }
  } catch (e) {}
  if (state.art) {
    document.querySelectorAll('.artThumb').forEach(i => { i.src = state.art.src; i.classList.remove('hidden'); });
    document.querySelectorAll('.artIco').forEach(i => i.classList.add('hidden'));
    document.querySelectorAll('.artTitle').forEach(s => s.textContent = 'Arte enviada pela loja');
    document.querySelectorAll('.artTxt').forEach(s => s.textContent = 'Clique para testar a sua arte');
  }
  $('#clientName').textContent = (p.get('n') ? p.get('n') + ' · ' : '') + PRODUCTS[id].name;
  state.product = id; document.body.classList.add('editing');
  syncUI(); draw(); resize3D();
  $('#clientLoading').classList.add('hidden'); document.documentElement.classList.remove('cl-boot');
  return true;
}
