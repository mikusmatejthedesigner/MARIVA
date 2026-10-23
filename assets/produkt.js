/* Detail produktu: výběr varianty (jen existující kombinace, cena, adresa ?variant=), živý náhled trička v barvě s nápisem,
   pole pro nápis a obrázek (Uploadcare), počet, celková cena, lepicí lišta na mobilu a přidání do košíku přes AJAX. */
(function () {
  'use strict';
  const M = window.Mariva;
  const $ = (s, r) => (r || document).querySelector(s);
  const f = $('[data-produkt-form]');
  const platno = $('[data-nahled-tricka]');
  const lista = $('[data-sticky]');
  const hodnoty = JSON.parse(($('[data-varianty]') || {}).textContent || '[]');
  const param = new URLSearchParams(location.search);

  /* ---------- galerie ---------- */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-galerie] [data-media]');
    if (!b) return;
    const img = $('[data-galerie-hlavni]');
    const nahled = b.dataset.media === 'nahled';
    if (platno) platno.hidden = !nahled;
    const popis = $('.galerie__popis');
    if (popis) popis.hidden = !nahled;
    if (img) {
      img.hidden = nahled;
      if (!nahled) { img.removeAttribute('srcset'); img.src = b.dataset.velky; }
    }
    document.querySelectorAll('[data-galerie] [data-media]').forEach((x) => x.setAttribute('aria-current', String(x === b)));
  });

  /* ---------- lepicí lišta (mobil): ukáže se, když hlavní tlačítko odjede z obrazovky ---------- */
  if (lista && 'IntersectionObserver' in window) {
    const cil = $('[data-pridat]') || $('#poptavka');
    if (cil) {
      new IntersectionObserver(([z]) => { lista.hidden = z.isIntersecting || z.boundingClientRect.top > 0; }, {threshold: 0}).observe(cil);
    }
  }
  if (!f) return;

  const tl = $('[data-pridat]', f);
  const chyba = $('[data-chyba]', f);
  const ks = f.elements.quantity;
  const vstupId = $('[data-varianta]', f);
  const napis = $('[data-napis]', f);
  const obrazek = $('[data-obrazek]', f);
  const poznamka = f.elements['properties[Poznámka k potisku]'];
  const skupiny = [...f.querySelectorAll('[data-skupina]')];
  const textTl = tl.textContent.trim();
  const N = M.N.moznosti || {};
  const skupinaPodle = (nazev) => skupiny.find((g) => g.dataset.nazev === String(nazev || '').toLowerCase());

  /* ---------- varianty ---------- */
  const vybrano = () => skupiny.map((g) => (g.querySelector('input:checked') || {}).value);
  const existuje = (i, h, sel) => hodnoty.some((v) => v.options[i] === h && sel.slice(0, i).every((s, j) => v.options[j] === s));
  function srovnat(od) {
    const sel = vybrano();
    skupiny.forEach((g, i) => {
      const vstupy = [...g.querySelectorAll('input')];
      if (i > od) {
        const ted = vstupy.find((x) => x.checked);
        if (!ted || !existuje(i, ted.value, sel)) {
          const prvni = vstupy.find((x) => existuje(i, x.value, sel));
          if (prvni) { prvni.checked = true; sel[i] = prvni.value; }
        }
      }
      vstupy.forEach((x) => { x.disabled = !existuje(i, x.value, sel); });
      const h = $('[data-moznost-hodnota]', g);
      if (h) h.textContent = sel[i] || '';
    });
    return sel;
  }
  const varianta = () => {
    const sel = vybrano();
    return hodnoty.find((v) => v.options.every((o, i) => o === sel[i])) || (skupiny.length ? null : hodnoty[0]);
  };
  const pocet = () => Math.max(1, Math.min(999, parseInt(ks.value, 10) || 1));
  function obnov() {
    const v = varianta();
    tl.disabled = !v || !v.available;
    tl.textContent = !v ? 'Tahle kombinace není k dispozici' : v.available ? textTl : 'Vyprodáno';
    if (!v) return;
    vstupId.value = v.id;
    const c = $('.detail__cena [data-cena]');
    if (c) c.textContent = M.cena(v.price);
    const p = $('.detail__cena [data-cena-puvodni]');
    if (p) p.hidden = !(v.compare_at_price > v.price);
    const celkem = M.cena(v.price * pocet());
    document.querySelectorAll('[data-celkem], [data-celkem-lista]').forEach((el) => { el.textContent = celkem; });
    const u = new URL(location.href);
    u.searchParams.set('variant', v.id);
    history.replaceState(null, '', u);
    if (!platno && v.featured_media) { const b = $(`[data-media="${v.featured_media.id}"]`); if (b) b.click(); }
  }

  /* ---------- barvy, náhled trička ---------- */
  document.querySelectorAll('[data-barva-nazev]').forEach((s) => s.style.setProperty('--b', M.barvaHex(s.dataset.barvaNazev)));
  let scena = null;
  let vrstva = null;
  let cekani = 0;
  let token = 0;
  const pohledy = {};
  const zalom = (t) => (t.indexOf('\n') < 0 && t.length > 9 && t.indexOf(' ') > 0 ? t.replace(/ (?=\S+$)/, '\n') : t);
  async function prekresli() {
    if (!platno || !window.Potisk) return;
    const profil = (window.MARIVA_PROFILY || {})[platno.dataset.profil];
    if (!profil) return;
    const moje = ++token;
    const sel = vybrano();
    const g = (n) => { const s = skupinaPodle(n); return s ? sel[skupiny.indexOf(s)] : null; };
    const hex = M.barvaHex(g(N.barva));
    const strih = String(g(N.strih) || '').toLowerCase();
    const typ = profil.typy.find((t) => t.nazev.toLowerCase() === strih) || profil.typy[0];
    const klic = typ.id;
    if (!pohledy[klic]) pohledy[klic] = Potisk.nactiPohled(profil, typ.id, profil.pohledy[0].id, '');
    const text = (napis && napis.value.trim()) || platno.dataset.vzor || '';
    const zdroj = await Potisk.vykresliNapis({text: zalom(text), pismo: 'bezpatkove', tucne: true, barva: Potisk.svetlost(hex) < 0.35 ? '#FFFFFF' : '#1B1424'});
    const data = await pohledy[klic];
    if (moje !== token) return;
    if (!scena) scena = new Potisk.Scena(platno, {okraj: 0.03});
    if (!vrstva) { vrstva = Potisk.novaVrstva('text', zdroj, {u: 0.5, v: 0.24, s: 0.92}); scena.vrstvy.push(vrstva); }
    else { vrstva.zdroj = zdroj; vrstva.pomer = zdroj.height / zdroj.width; vrstva.s = 0.92; }
    scena.nastav(data, hex);
  }
  const naplanuj = () => { clearTimeout(cekani); cekani = setTimeout(() => prekresli().catch(() => {}), 80); };

  /* ---------- události ---------- */
  f.addEventListener('change', (e) => {
    const i = e.target.matches('[data-moznost]') ? +e.target.dataset.moznost : -1;
    if (i < 0) return;
    srovnat(i);
    obnov();
    naplanuj();
  });
  if (napis) napis.addEventListener('input', naplanuj);
  f.querySelectorAll('[data-krok]').forEach((b) => b.addEventListener('click', () => { ks.value = pocet() + +b.dataset.krok; ks.value = pocet(); obnov(); }));
  ks.addEventListener('change', () => { ks.value = pocet(); obnov(); });
  const pridatLista = $('[data-pridat-lista]');
  if (pridatLista) pridatLista.addEventListener('click', () => f.requestSubmit());

  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    chyba.hidden = true;
    const v = varianta();
    if (!v || !v.available) return;
    const vlastnosti = {};
    const text = napis ? napis.value.trim() : '';
    const pozn = poznamka ? poznamka.value.trim() : '';
    const soubor = obrazek && obrazek.files[0];
    if (napis && !text && !pozn && !soubor) {
      chyba.textContent = M.N.texty ? M.N.texty.potiskChybi : 'Napište nápis, přiložte obrázek, nebo nám v poznámce napište, co má být na tričku.';
      chyba.hidden = false;
      napis.focus();
      return;
    }
    if (text) vlastnosti['Nápis'] = text;
    if (pozn) vlastnosti['Poznámka k potisku'] = pozn;
    tl.disabled = true;
    try {
      if (soubor) {
        try { vlastnosti['Obrázek'] = await M.nahratSoubor(soubor); }
        catch (err) { chyba.textContent = 'Obrázek se nepodařilo nahrát. Zkuste to znovu, nebo ho pošlete e-mailem.'; chyba.hidden = false; return; }
      }
      if (scena && M.lzeNahravat()) {
        try { vlastnosti._nahled = await M.nahratSoubor(M.dataUrlNaSoubor(scena.export(480, '#EBE5DB'), 'nahled.png'), 'nahled.png'); } catch (err) { /* náhled v košíku není nutný */ }
      }
      await M.kosik.pridat([{id: v.id, quantity: pocet(), properties: vlastnosti}]);
      M.kosik.poPridani();
    } catch (err) {
      chyba.textContent = err.message;
      chyba.hidden = false;
    } finally {
      tl.disabled = false;
    }
  });

  /* ---------- předvyplnění z úvodní stránky (?napis=…&barva=…) a start ---------- */
  if (napis && param.get('napis')) napis.value = param.get('napis').slice(0, 120);
  const barvaSk = skupinaPodle(N.barva);
  if (barvaSk && param.get('barva')) {
    const x = [...barvaSk.querySelectorAll('input')].find((i) => i.value.toLowerCase() === param.get('barva').toLowerCase());
    if (x) x.checked = true;
  }
  srovnat(-1);
  obnov();
  if (platno && window.Potisk) {
    Promise.all([document.fonts.load('800 40px "Archivo"', 'MATURANTI ŘŽÁ').catch(() => null)]).then(() => prekresli()).catch(() => {});
    document.fonts.addEventListener('loadingdone', naplanuj);
  }
})();
