/* =========================================================================
   Meu Mockup — compartilhar o 3D com o cliente
   Link curto (#c=<gist>): os dados ficam num Gist secreto do GitHub da loja.
   Link longo (#ver=...): tudo dentro do endereço (sem configurar nada).
   O cliente abre em "modo cliente": só visualiza e gira o produto.
   ========================================================================= */
const b64u = {
  enc: str => btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))),
};
function compressImage(img, max) {
  const [w0, h0] = [img.naturalWidth || img.width, img.naturalHeight || img.height], k = Math.min(1, max / Math.max(w0, h0));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w0 * k)); c.height = Math.max(1, Math.round(h0 * k));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  let url = c.toDataURL('image/webp', .82);
  if (!url.startsWith('data:image/webp')) url = c.toDataURL('image/png');   // navegador sem WebP: PNG (mantém transparência)
  return url;
}
function sharePayload(withArt, artMax = 640, cardMax = 560) {
  const id = state.product;
  const d = { c: state.colors[id] || {}, g: state.toggles[id] || {}, t: tf(id), k: state.tf[CARD_KEY], v: state.cam[id], s: state.so, f: state.format, w: state.watermark };
  const out = { ver: id, d: b64u.enc(JSON.stringify(d)) };
  if (withArt && state.art) out.a = compressImage(state.art, artMax);
  if (withArt && id === 'bottonCartao' && state.cardArt) out.ca = compressImage(state.cardArt, cardMax);
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
  const p = sharePayload(withArt, 1024, 900), body = JSON.stringify(p);
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
const isOnline = () => /^https?:$/.test(location.protocol) && !/^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname);

/* ---------- janela "Compartilhar" ---------- */
let shareJob = 0;
function renderShare() {
  const box = $('#shBody'), withArt = $('#shArt') ? $('#shArt').checked : true, job = ++shareJob;
  box.innerHTML = '';
  if (!isOnline()) {
    box.innerHTML = `<div class="warn"><b>Abra o app pelo endereço publicado para compartilhar.</b>
      Agora ele está abrindo direto do seu computador, e o cliente não consegue acessar esse endereço.
      Use <a href="https://abelvial.github.io/mockups-3d/" target="_blank" rel="noopener">abelvial.github.io/mockups-3d</a>.</div>`;
  }
  box.append(ui('label', 'check', `<input type="checkbox" id="shArt" ${withArt ? 'checked' : ''}> Enviar junto a minha arte atual`));
  $('#shArt').onchange = renderShare;
  const row = ui('div', 'linkrow', `<input type="text" readonly value="Gerando link…"><button class="btn pri sm" id="shCopy" disabled><svg class="i"><use href="#i-check"/></svg>Copiar link</button>`);
  const inp = row.querySelector('input'); box.append(row);
  const btns = ui('div', 'seg', ''); btns.style.gridTemplateColumns = '1fr 1fr';
  btns.innerHTML = `<a class="btn sm" id="shWa" target="_blank" rel="noopener"><svg class="i"><use href="#i-film"/></svg>Enviar no WhatsApp</a><a class="btn sm" id="shOpen" target="_blank" rel="noopener"><svg class="i"><use href="#i-arrow"/></svg>Ver como o cliente</a>`;
  box.append(btns);
  const info = ui('p', 'hint', ''); box.append(info);
  const setup = ui('div', 'tokbox', ''); box.append(setup);
  const show = (link, msg) => {
    if (job !== shareJob) return;
    inp.value = link; $('#shCopy').disabled = false; $('#shOpen').href = link;
    const nome = PRODUCTS[state.product]?.name?.toLowerCase() || 'produto';
    $('#shWa').href = 'https://wa.me/?text=' + encodeURIComponent(`Olá! Veja como vai ficar sua ${nome} em 3D — dá para girar e ver de todos os lados: ${link}`);
    info.innerHTML = `<svg class="i"><use href="#i-info"/></svg><span>${msg}</span>`;
    $('#shCopy').onclick = async () => { try { await navigator.clipboard.writeText(link); } catch (e) { inp.select(); document.execCommand('copy'); } toast('Link copiado!'); };
  };
  const tokenForm = (err) => {
    setup.innerHTML = `<b>Ativar links curtos (grátis, uma vez só)</b>
      <ol class="steps2"><li>Abra <a href="https://github.com/settings/tokens/new?scopes=gist&description=Meu%20Mockup%20-%20links%20curtos" target="_blank" rel="noopener">esta página do GitHub</a> (já vem com a opção <code>gist</code> marcada).</li>
      <li>Em <i>Expiration</i> escolha <b>No expiration</b> e clique em <b>Generate token</b>.</li>
      <li>Copie o código (começa com <code>ghp_</code>) e cole aqui:</li></ol>
      ${err ? `<div class="warn" style="margin-bottom:8px">${err}</div>` : ''}
      <div class="linkrow" style="margin:0"><input type="text" id="tokIn" placeholder="ghp_..." autocomplete="off"><button class="btn sm" id="tokSave">Salvar</button></div>
      <p class="hint"><svg class="i"><use href="#i-info"/></svg><span>O código fica guardado só neste navegador. Ele só consegue criar notas (gists) secretas — não acessa seus repositórios.</span></p>`;
    $('#tokSave').onclick = () => { const v = $('#tokIn').value.trim(); if (!v) return; try { localStorage.setItem(TOKEN_KEY, v); } catch (e) {} renderShare(); };
  };
  const long = shareLink(withArt);
  if (!getToken()) { show(long, `Link longo (${Math.round(long.length / 1024)} KB). Ative os links curtos abaixo para um link pequeno e bonito.`); tokenForm(); return; }
  shortLink(withArt).then(link => {
    show(link, 'Link curto pronto. O cliente só visualiza o produto em 3D — não consegue editar nada.');
    setup.innerHTML = `<button class="btn ghost sm" id="tokOff">Desativar links curtos neste navegador</button>`;
    $('#tokOff').onclick = () => { try { localStorage.removeItem(TOKEN_KEY); } catch (e) {} renderShare(); };
  }).catch(e => {
    show(long, `Não consegui gerar o link curto agora — usando o link longo (${Math.round(long.length / 1024)} KB).`);
    if (e.message === 'token') { try { localStorage.removeItem(TOKEN_KEY); } catch (er) {} tokenForm('O código salvo não funcionou (expirou ou foi apagado). Gere outro.'); }
  });
}
$('#share').onclick = () => { $('#shareModal').classList.remove('hidden'); renderShare(); };
$('#shClose').onclick = () => $('#shareModal').classList.add('hidden');
$('#shareModal').addEventListener('pointerdown', e => { if (e.target.id === 'shareModal') $('#shareModal').classList.add('hidden'); });

/* ---------- modo cliente ---------- */
state.client = false;
async function openClientLink() {
  let p = new URLSearchParams(location.hash.slice(1));
  if (p.get('c')) {
    $('#clientLoading').classList.remove('hidden');
    try { p = await fetchShared(p.get('c')); }
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
  $('#clientName').textContent = PRODUCTS[id].name;
  state.product = id; document.body.classList.add('editing');
  syncUI(); draw(); resize3D();
  $('#clientLoading').classList.add('hidden'); document.documentElement.classList.remove('cl-boot');
  return true;
}
