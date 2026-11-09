/* =========================================================================
   Meu Mockup — compartilhar o 3D com o cliente
   O link leva tudo no próprio endereço (#ver=...): produto, cores, cena,
   posição e (opcional) a arte comprimida. Não precisa de servidor/banco.
   O cliente abre em "modo cliente": gira, envia a própria arte e baixa.
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
function shareLink(withArt) {
  const id = state.product;
  const data = { c: state.colors[id] || {}, g: state.toggles[id] || {}, t: tf(id), k: state.tf[CARD_KEY], v: state.cam[id], s: state.so, f: state.format, w: state.watermark };
  let h = '#ver=' + encodeURIComponent(id) + '&d=' + b64u.enc(JSON.stringify(data));
  if (withArt && state.art) h += '&a=' + encodeURIComponent(compressImage(state.art, 640));
  if (withArt && id === 'bottonCartao' && state.cardArt) h += '&ca=' + encodeURIComponent(compressImage(state.cardArt, 560));
  return location.href.split('#')[0] + h;
}
const isOnline = () => /^https?:$/.test(location.protocol) && !/^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname);

/* ---------- janela "Compartilhar" ---------- */
function renderShare() {
  const box = $('#shBody'), withArt = $('#shArt') ? $('#shArt').checked : true;
  box.innerHTML = '';
  if (!isOnline()) {
    box.innerHTML = `<div class="warn"><b>Antes, publique o app na internet (grátis, uma vez só).</b>
      O app está abrindo direto do seu computador, então o cliente não consegue acessar esse endereço.</div>
      <ol class="steps2">
        <li>Acesse <a href="https://app.netlify.com/drop" target="_blank" rel="noopener">app.netlify.com/drop</a> e crie uma conta grátis.</li>
        <li>Arraste a pasta <code>mockups</code> inteira para a página.</li>
        <li>Abra o endereço que o Netlify gerar (ex.: <code>meumockup.netlify.app</code>) e use o app por ele.</li>
        <li>Lá, este botão gera o link para o cliente.</li>
      </ol>
      <p class="hint"><svg class="i"><use href="#i-info"/></svg><span>Depois de publicado, nada sai do seu controle: o link leva a arte dentro dele, sem guardar em servidor.</span></p>`;
  }
  const opt = ui('label', 'check', `<input type="checkbox" id="shArt" ${withArt ? 'checked' : ''}> Enviar junto a minha arte atual (o cliente vê exatamente o que você montou)`);
  box.append(opt);
  const link = shareLink(withArt), kb = Math.round(link.length / 1024);
  const row = ui('div', 'linkrow', `<input type="text" readonly value="${link.replace(/"/g, '&quot;')}"><button class="btn pri sm" id="shCopy"><svg class="i"><use href="#i-check"/></svg>Copiar link</button>`);
  box.append(row);
  const btns = ui('div', 'seg', '');
  btns.style.gridTemplateColumns = '1fr 1fr';
  btns.innerHTML = `<a class="btn sm" id="shWa" target="_blank" rel="noopener"><svg class="i"><use href="#i-film"/></svg>Enviar no WhatsApp</a><a class="btn sm" id="shOpen" target="_blank" rel="noopener"><svg class="i"><use href="#i-arrow"/></svg>Testar como cliente</a>`;
  box.append(btns);
  $('#shOpen').href = link;
  $('#shWa').href = 'https://wa.me/?text=' + encodeURIComponent('Veja seu produto em 3D e teste sua arte: ' + link);
  box.append(ui('p', 'hint', `<svg class="i"><use href="#i-info"/></svg><span>Tamanho do link: ${kb} KB. ${kb > 60 ? '<b>Link grande</b> — se o WhatsApp cortar, desmarque “enviar minha arte” (o cliente envia a dele).' : 'Cabe tranquilo no WhatsApp.'}</span>`));
  $('#shArt').onchange = renderShare;
  $('#shCopy').onclick = async () => {
    const inp = row.querySelector('input');
    try { await navigator.clipboard.writeText(link); } catch (e) { inp.select(); document.execCommand('copy'); }
    toast('Link copiado!');
  };
}
$('#share').onclick = () => { $('#shareModal').classList.remove('hidden'); renderShare(); };
$('#shClose').onclick = () => $('#shareModal').classList.add('hidden');
$('#shareModal').addEventListener('pointerdown', e => { if (e.target.id === 'shareModal') $('#shareModal').classList.add('hidden'); });

/* ---------- modo cliente ---------- */
state.client = false;
async function openClientLink() {
  const p = new URLSearchParams(location.hash.slice(1)), id = p.get('ver');
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
  return true;
}
