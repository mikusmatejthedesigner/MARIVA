/* Konfigurátor potisku. Produkt z katalogu podle ?produkt= (výchozí tričko); další produkt stačí připravit
   skriptem priprav.py. Parametry: ?napis=…&barva=…&typ=… (z úvodní stránky), ?navrh=<id> (uložený návrh). */
(function () {
  'use strict';
  const M = window.Mariva;
  const {kc, esc} = M;
  const katalog = window.MARIVA_KATALOG || {};
  const param = new URLSearchParams(location.search);
  const produkt = katalog[param.get('produkt')] || katalog.tricko || Object.values(katalog)[0];
  const $ = (s, r) => (r || document).querySelector(s);
  const el = {
    platno: $('#scena'), obal: $('.platno-obal'), prazdne: $('[data-prazdne]'), oblastInfo: $('[data-oblast-info]'),
    ukazOblast: $('[data-ukaz-oblast]'), pohledy: $('[data-pohledy]'), nadpis: $('[data-nazev]'), drobek: $('[data-drobek]'), cenaKus: $('[data-cena-kus]'),
    typy: $('[data-typy]'), typPopis: $('[data-typ-popis]'), barvy: $('[data-barvy]'), barvaNazev: $('[data-barva-nazev]'),
    velikosti: $('[data-velikosti]'), soubor: $('[data-soubor]'), napis: $('[data-pridat-napis]'), vrstvy: $('[data-vrstvy]'),
    nastaveni: $('[data-nastaveni]'), ks: $('[data-ks]'), hromadne: $('[data-hromadne]'), celkem: $('[data-celkem]'), celkemMobil: $('[data-celkem-mobil]'),
    doKosiku: $('[data-do-kosiku]'), doKosikuMobil: $('[data-do-kosiku-mobil]'), poptat: $('[data-poptat-mnozstvi]'), chyba: $('[data-chyba]'),
    chybaVelikosti: $('[data-chyba-velikost]'), ulozit: $('[data-ulozit]'),
  };
  if (!produkt) { el.prazdne.textContent = 'Katalog produktů se nenačetl.'; return; }

  const stav = {
    typ: produkt.typy.find((t) => t.id === param.get('typ')) || produkt.typy[0],
    barva: produkt.barvy.find((b) => b.id === param.get('barva')) || produkt.barvy[0],
    velikost: null,
    ks: 1,
    pohled: produkt.pohledy[0].id,
    vrstvy: Object.fromEntries(produkt.pohledy.map((p) => [p.id, []])),
  };
  const cislo = (n) => (Math.round(n * 10) / 10).toLocaleString('cs-CZ');

  const scena = new Potisk.Scena(el.platno, {
    interaktivni: true,
    okraj: 0.06,
    priZmene: () => vykresliNastaveni(true),
    priVyberu: () => { vykresliVrstvy(); vykresliNastaveni(); },
  });

  async function nactiData() {
    el.obal.classList.add('nacita');
    try {
      const data = await Potisk.nactiPohled(produkt, stav.typ.id, stav.pohled, '');
      scena.vrstvy = stav.vrstvy[stav.pohled];
      scena.nastav(data, stav.barva.hex);
      el.oblastInfo.textContent = `Oblast potisku ${cislo(data.oblast.sirkaCm)} × ${cislo(data.oblast.vyskaCm)} cm`;
      vykresliNastaveni();
    } catch (e) {
      el.prazdne.hidden = false;
      el.prazdne.textContent = 'Náhled produktu se nenačetl. Zkuste stránku obnovit.';
    }
    el.obal.classList.remove('nacita');
  }

  /* ---------- volby produktu ---------- */
  el.nadpis.textContent = produkt.nazev;
  el.drobek.textContent = produkt.nazev;
  document.title = produkt.nazev + ' | Tiskárna MARIVA';

  el.typy.innerHTML = produkt.typy.map((t) => `
    <label class="segment">
      <input type="radio" name="typ" value="${t.id}"${t === stav.typ ? ' checked' : ''}>
      <span><strong>${esc(t.nazev)}</strong><em>${t.cena ? kc(t.cena) : 'na poptávku'}</em></span>
    </label>`).join('');
  el.typy.addEventListener('change', (e) => {
    stav.typ = produkt.typy.find((t) => t.id === e.target.value);
    if (stav.typ.velikosti.indexOf(stav.velikost) < 0) stav.velikost = null;
    vykresliTyp();
    nactiData();
  });

  el.barvy.innerHTML = produkt.barvy.map((b) => `
    <label class="barva" title="${esc(b.nazev)}">
      <input type="radio" name="barva" value="${b.id}"${b === stav.barva ? ' checked' : ''}>
      <span style="--b:${b.hex}"></span><span class="skryte">${esc(b.nazev)}</span>
    </label>`).join('');
  el.barvy.addEventListener('change', (e) => {
    stav.barva = produkt.barvy.find((b) => b.id === e.target.value);
    el.barvaNazev.textContent = stav.barva.nazev;
    scena.nastav(null, stav.barva.hex);
  });
  el.barvaNazev.textContent = stav.barva.nazev;

  function vykresliTyp() {
    el.typPopis.textContent = stav.typ.popis || '';
    el.cenaKus.textContent = stav.typ.cena ? kc(stav.typ.cena) : 'Na poptávku';
    el.velikosti.innerHTML = stav.typ.velikosti.map((v) => `
      <label class="velikost"><input type="radio" name="velikost" value="${esc(v)}"${v === stav.velikost ? ' checked' : ''}><span>${esc(v)}</span></label>`).join('');
    obnovCenu();
  }
  el.velikosti.addEventListener('change', (e) => { stav.velikost = e.target.value; skryjChybu(); el.chybaVelikosti.hidden = true; });

  if (produkt.pohledy.length > 1) {
    el.pohledy.hidden = false;
    el.pohledy.innerHTML = produkt.pohledy.map((p, i) => `<button type="button" data-pohled="${p.id}" aria-pressed="${i === 0}">${esc(p.nazev)}</button>`).join('');
    el.pohledy.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pohled]');
      if (!b) return;
      stav.pohled = b.dataset.pohled;
      el.pohledy.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      scena.vyber(null);
      nactiData();
    });
  }
  el.ukazOblast.addEventListener('change', () => { scena.ukazOblast = el.ukazOblast.checked; scena.vykresli(); });

  /* ---------- počet a cena ---------- */
  function obnovCenu() {
    el.ks.value = stav.ks;
    const celkem = stav.typ.cena ? kc(stav.ks * stav.typ.cena) : 'Na poptávku';
    el.celkem.textContent = celkem;
    el.celkemMobil.textContent = celkem;
    el.hromadne.hidden = stav.ks < (produkt.velkeMnozstviOd || 20);
  }
  document.querySelectorAll('[data-ks-krok]').forEach((b) => b.addEventListener('click', () => {
    stav.ks = Math.max(1, Math.min(999, stav.ks + +b.dataset.ksKrok));
    obnovCenu();
  }));
  el.ks.addEventListener('change', () => { stav.ks = Math.max(1, Math.min(999, parseInt(el.ks.value, 10) || 1)); obnovCenu(); });
  if (produkt.jenPoptavka) {
    [el.doKosiku, el.doKosikuMobil].forEach((b) => { b.hidden = true; });
    el.poptat.classList.add('tl--magenta', 'tl--velke');
  }

  /* ---------- vrstvy potisku ---------- */
  const MAX_PX = 3000;
  async function obrazekZeSouboru(soubor) {
    const img = await new Promise((ok, chyba) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = chyba;
      i.src = URL.createObjectURL(soubor);
    });
    const k = Math.min(1, MAX_PX / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return {img, c};
  }
  async function nahrat(soubor) {
    skryjChybu();
    if (!soubor) return;
    if (!/^image\//.test(soubor.type) && !/\.(jpe?g|png|webp|gif|heic|avif)$/i.test(soubor.name)) return ukazChybu('Nahrajte prosím obrázek (JPG, PNG nebo WebP).');
    if (soubor.size > 25 * 1024 * 1024) return ukazChybu('Obrázek je větší než 25 MB. Zmenšete ho prosím, nebo nám ho pošlete s poptávkou.');
    let o;
    try { o = await obrazekZeSouboru(soubor); } catch (e) { return ukazChybu('Tento obrázek prohlížeč neumí otevřít. Uložte ho prosím jako JPG nebo PNG.'); }
    pridejVrstvu(Potisk.novaVrstva('obrazek', o.c, {nazev: soubor.name, soubor, puvodni: o.c, nahledUrl: o.img.src, zdrojPx: o.img.naturalWidth, bezPozadi: false, s: 0.7, v: 0.4}));
  }
  async function novyNapis(text, data) {
    const tmava = Potisk.svetlost(stav.barva.hex) < 0.35;
    const n = Object.assign({text: text || 'Váš text', pismo: 'bezpatkove', tucne: true, barva: tmava ? '#ffffff' : '#1B1424'}, data || {});
    return Potisk.novaVrstva('text', await Potisk.vykresliNapis(n), Object.assign({s: 0.6, v: 0.25}, n));
  }
  async function pridejNapis() {
    skryjChybu();
    pridejVrstvu(await novyNapis());
    const t = el.nastaveni.querySelector('textarea');
    if (t) { t.focus(); t.select(); }
  }
  function pridejVrstvu(v, bezPosunu) {
    const ostatni = scena.vrstvy.slice();
    scena.pridej(v);
    if (!bezPosunu && ostatni.length && scena.data) { // pod stávající potisky, ať se nepřekrývají
      const o = scena.data.oblast;
      const pomerOblasti = (o.h * scena.data.vyska) / (o.w * scena.data.sirka);
      const vyska = (q) => (q.s * q.pomer) / pomerOblasti;
      const spodek = Math.max(...ostatni.map((q) => q.v + vyska(q) / 2)) + 0.04;
      if (spodek + vyska(v) > 1 && 1 - spodek > 0.12) v.s = ((1 - spodek) * pomerOblasti) / v.pomer;
      v.v = spodek + vyska(v) / 2;
      scena.omez(v);
      scena.vykresli();
    }
    vykresliVrstvy();
    vykresliNastaveni();
  }
  el.soubor.addEventListener('change', () => { nahrat(el.soubor.files[0]); el.soubor.value = ''; });
  el.napis.addEventListener('click', pridejNapis);

  ['dragenter', 'dragover'].forEach((t) => document.addEventListener(t, (e) => {
    if (e.dataTransfer && [...e.dataTransfer.types].indexOf('Files') >= 0) { e.preventDefault(); el.obal.classList.add('pretahovani'); }
  }));
  ['dragleave', 'drop'].forEach((t) => document.addEventListener(t, (e) => {
    if (t === 'dragleave' && e.relatedTarget) return;
    el.obal.classList.remove('pretahovani');
  }));
  document.addEventListener('drop', (e) => {
    if (!e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault();
    nahrat(e.dataTransfer.files[0]);
  });

  function vykresliVrstvy() {
    const vrstvy = scena.vrstvy;
    el.prazdne.hidden = vrstvy.length > 0;
    el.platno.classList.toggle('ma-vrstvy', vrstvy.length > 0);
    el.vrstvy.innerHTML = vrstvy.map((v) => `
      <li>
        <button type="button" class="vrstva${v.id === scena.vybrana ? ' je-vybrana' : ''}" data-vrstva="${v.id}">
          <span class="vrstva__nahled">${v.druh === 'obrazek' ? `<img src="${v.nahledUrl}" alt="">` : '<span>Aa</span>'}</span>
          <span class="vrstva__nazev">${esc(v.druh === 'obrazek' ? v.nazev : v.text.replace(/\n/g, ' ') || 'Nápis')}</span>
        </button>
      </li>`).join('');
  }
  el.vrstvy.addEventListener('click', (e) => {
    const b = e.target.closest('[data-vrstva]');
    if (!b) return;
    scena.vyber(b.dataset.vrstva);
    scena.vykresli();
  });

  function kvalita(v) {
    const cm = scena.rozmerCm(v).w;
    const dpi = Math.round(v.zdrojPx / (cm / 2.54));
    if (dpi >= 150) return {trida: 'dobra', text: `Kvalita tisku dobrá (${dpi} DPI)`};
    if (dpi >= 100) return {trida: 'stredni', text: `Kvalita tisku dostačující (${dpi} DPI)`};
    return {trida: 'nizka', text: `Nízké rozlišení (${dpi} DPI), potisk může být neostrý. Zmenšete ho, nebo nahrajte větší obrázek.`};
  }

  const BARVY_PISMA = [['#1B1424', 'Černá'], ['#ffffff', 'Bílá'], ['#E4007C', 'Magenta'], ['#b1232c', 'Červená'], ['#1f2840', 'Námořní modrá'], ['#FFD200', 'Žlutá']];

  /* Nastavení vybrané vrstvy. jenHodnoty = při tažení jen obnovit čísla (ne celé HTML, ztratil by se fokus). */
  function vykresliNastaveni(jenHodnoty) {
    const v = scena.vrstvy.find((q) => q.id === scena.vybrana);
    if (!v || !scena.data) { el.nastaveni.hidden = true; el.nastaveni.innerHTML = ''; return; }
    const rozmer = scena.rozmerCm(v);
    const popisRozmeru = `${cislo(rozmer.w)} × ${cislo(rozmer.h)} cm`;
    if (jenHodnoty && el.nastaveni.dataset.vrstva === v.id) {
      el.nastaveni.querySelector('[data-rozmer]').textContent = popisRozmeru;
      el.nastaveni.querySelector('[data-velikost-vrstvy]').value = Math.round(v.s * 100);
      const q = el.nastaveni.querySelector('[data-kvalita]');
      if (q && v.druh === 'obrazek') { const k = kvalita(v); q.className = 'kvalita kvalita--' + k.trida; q.textContent = k.text; }
      return;
    }
    el.nastaveni.dataset.vrstva = v.id;
    el.nastaveni.hidden = false;
    const k = v.druh === 'obrazek' ? kvalita(v) : null;
    el.nastaveni.innerHTML = `
      ${v.druh === 'text' ? `
        <label class="pole"><span class="pole__popis">Text nápisu</span><textarea rows="2" data-text>${esc(v.text)}</textarea></label>
        <div class="pole"><span class="pole__popis">Písmo</span>
          <div class="segmenty segmenty--mala">${Object.keys(Potisk.PISMA).map((id) => `
            <label class="segment"><input type="radio" name="pismo" value="${id}"${v.pismo === id ? ' checked' : ''}>
              <span style="font-family:${Potisk.PISMA[id].rodina.replace(/"/g, "'")}">${Potisk.PISMA[id].nazev}</span></label>`).join('')}
          </div>
        </div>
        <label class="zaskrtnuti"><input type="checkbox" data-tucne${v.tucne ? ' checked' : ''}> Tučně</label>
        <div class="pole"><span class="pole__popis">Barva písma</span>
          <div class="barvy barvy--mala">${BARVY_PISMA.map(([hex, nazev]) => `
            <label class="barva" title="${nazev}"><input type="radio" name="barva-pisma" value="${hex}"${v.barva.toLowerCase() === hex.toLowerCase() ? ' checked' : ''}><span style="--b:${hex}"></span><span class="skryte">${nazev}</span></label>`).join('')}
            <label class="barva barva--vlastni" title="Vlastní barva"><input type="color" value="${v.barva}" data-vlastni-barva><span class="skryte">Vlastní barva</span></label>
          </div>
        </div>` : `
        <p class="kvalita kvalita--${k.trida}" data-kvalita>${k.text}</p>
        <label class="zaskrtnuti"><input type="checkbox" data-bez-pozadi${v.bezPozadi ? ' checked' : ''}> Odstranit jednobarevné pozadí obrázku</label>`}
      <label class="pole">
        <span class="pole__popis">Velikost <span data-rozmer>${popisRozmeru}</span></span>
        <input type="range" min="5" max="100" step="1" value="${Math.round(v.s * 100)}" data-velikost-vrstvy>
      </label>
      <div class="nastaveni-akce">
        <button type="button" class="odkaz" data-na-stred>Na střed</button>
        <button type="button" class="odkaz" data-odebrat-vrstvu>Odebrat</button>
      </div>`;
    const n = el.nastaveni;
    n.querySelector('[data-velikost-vrstvy]').addEventListener('input', (e) => {
      v.s = e.target.value / 100;
      scena.omez(v);
      scena.vykresli();
      vykresliNastaveni(true);
    });
    n.querySelector('[data-na-stred]').addEventListener('click', () => { v.u = 0.5; scena.omez(v); scena.vykresli(); });
    n.querySelector('[data-odebrat-vrstvu]').addEventListener('click', () => { scena.odeber(v.id); vykresliVrstvy(); vykresliNastaveni(); });
    if (v.druh === 'text') {
      const prekresli = async () => {
        v.zdroj = await Potisk.vykresliNapis(v);
        v.pomer = v.zdroj.height / v.zdroj.width;
        scena.omez(v);
        scena.vykresli();
        vykresliVrstvy();
        vykresliNastaveni(true);
      };
      n.querySelector('[data-text]').addEventListener('input', (e) => { v.text = e.target.value; prekresli(); });
      n.querySelectorAll('[name="pismo"]').forEach((r) => r.addEventListener('change', () => { v.pismo = r.value; prekresli(); }));
      n.querySelector('[data-tucne]').addEventListener('change', (e) => { v.tucne = e.target.checked; prekresli(); });
      n.querySelectorAll('[name="barva-pisma"]').forEach((r) => r.addEventListener('change', () => { v.barva = r.value; n.querySelector('[data-vlastni-barva]').value = r.value; prekresli(); }));
      n.querySelector('[data-vlastni-barva]').addEventListener('input', (e) => {
        v.barva = e.target.value;
        n.querySelectorAll('[name="barva-pisma"]').forEach((r) => { r.checked = false; });
        prekresli();
      });
    } else {
      n.querySelector('[data-bez-pozadi]').addEventListener('change', (e) => {
        v.bezPozadi = e.target.checked;
        v.zdroj = v.bezPozadi ? Potisk.odstranPozadi(v.puvodni) : v.puvodni;
        scena.vykresli();
      });
    }
  }

  /* ---------- košík, poptávka, uložení ---------- */
  function popisVrstvy(v) {
    const r = scena.rozmerCm(v);
    const cm = `${cislo(r.w)} × ${cislo(r.h)} cm`;
    if (v.druh === 'text') return {druh: 'text', text: v.text, pismo: Potisk.PISMA[v.pismo].nazev.toLowerCase(), tucne: v.tucne, barva: v.barva, cm};
    return {druh: 'obrazek', nazev: v.nazev, cm, bezPozadi: v.bezPozadi};
  }
  function souboryPotisku(vrstvy) {
    const f = [];
    vrstvy.forEach((v, i) => { if (v.druh === 'obrazek') { v.soubor.vrstva = i; f.push(v.soubor); } });
    return f;
  }
  const nazevNavrhu = () => `${produkt.kratce || produkt.nazev}: ${stav.typ.nazev}, ${stav.barva.nazev}`;
  function ciste() { scena.vyber(null); scena.vykresli(); }

  async function doKosiku() {
    skryjChybu();
    const vrstvy = scena.vrstvy;
    if (!vrstvy.length) {
      ukazChybu('Nahrajte obrázek nebo přidejte nápis.');
      el.napis.scrollIntoView({behavior: 'smooth', block: 'center'});
      return;
    }
    if (!stav.velikost) {
      ukazChybu('Vyberte prosím velikost.');
      el.chybaVelikosti.hidden = false;
      el.velikosti.scrollIntoView({behavior: 'smooth', block: 'center'});
      return;
    }
    ciste();
    const polozka = {
      produkt: produkt.id, nazev: produkt.kratce || produkt.nazev, typ: stav.typ.nazev, barva: stav.barva.nazev,
      velikost: stav.velikost, ks: stav.ks, cena: stav.typ.cena,
      pohled: produkt.pohledy.find((p) => p.id === stav.pohled).nazev.toLowerCase(),
      nahled: scena.export(480, '#EBE5DB'), potisk: vrstvy.map(popisVrstvy),
    };
    [el.doKosiku, el.doKosikuMobil].forEach((b) => { b.disabled = true; });
    await M.kosik.pridej(polozka, souboryPotisku(vrstvy));
    [el.doKosiku, el.doKosikuMobil].forEach((b) => { b.disabled = false; });
    M.oznam(`Přidáno do košíku: ${polozka.nazev}, ${polozka.velikost}, ${polozka.ks} ks`, {text: 'K pokladně', fn: () => { location.href = 'pokladna.html'; }});
  }
  el.doKosiku.addEventListener('click', doKosiku);
  el.doKosikuMobil.addEventListener('click', doKosiku);

  el.poptat.addEventListener('click', () => {
    skryjChybu();
    ciste();
    const vs = produkt.pohledy.flatMap((p) => stav.vrstvy[p.id]);
    const popis = vs.length
      ? vs.map((v) => { const d = popisVrstvy(v); return d.druh === 'text' ? `nápis „${d.text.replace(/\n/g, ' / ')}“ ${d.cm}` : `obrázek ${d.nazev} ${d.cm}`; }).join('; ')
      : 'zatím bez potisku';
    M.poptat({
      nadpis: 'Poptávka většího množství',
      produkt: produkt.id === 'mikina' ? 'Mikiny' : 'Trička',
      uvod: 'Pošleme vám cenu pro zadané množství. Váš návrh i náhled se k poptávce přiloží automaticky.',
      nahled: scena.export(480, '#EBE5DB'),
      navrhNazev: nazevNavrhu(),
      navrhPopis: `${nazevNavrhu()}; potisk: ${popis}`,
      mnozstvi: Math.max(stav.ks, produkt.velkeMnozstviOd || 20),
      popis: 'Rozpis velikostí: ',
      prilohy: souboryPotisku(scena.vrstvy),
    });
  });

  el.ulozit.addEventListener('click', async () => {
    if (!scena.vrstvy.length) return ukazChybu('Nejdřív nahrajte obrázek nebo přidejte nápis, pak půjde návrh uložit.');
    ciste();
    const id = param.get('navrh') || 'n' + Date.now().toString(36);
    const vrstvy = scena.vrstvy.map((v) => v.druh === 'text'
      ? {druh: 'text', text: v.text, pismo: v.pismo, tucne: v.tucne, barva: v.barva, u: v.u, v: v.v, s: v.s}
      : {druh: 'obrazek', nazev: v.nazev, bezPozadi: v.bezPozadi, u: v.u, v: v.v, s: v.s});
    const obrazky = scena.vrstvy.map((v, i) => v.druh === 'obrazek' ? {vrstva: i, soubor: v.soubor} : null).filter(Boolean);
    await M.navrhy.uloz({id, produkt: produkt.id, nazev: nazevNavrhu(), typ: stav.typ.id, barva: stav.barva.id, velikost: stav.velikost, nahled: scena.export(240, '#EBE5DB'), vrstvy, datum: Date.now()}, obrazky);
    const u = new URL(location.href);
    u.searchParams.set('navrh', id);
    history.replaceState(null, '', u);
    M.oznam('Návrh je uložený. Najdete ho i na úvodní stránce.');
  });

  /* Obnovení uloženého návrhu nebo nápisu z úvodní stránky. */
  async function obnov() {
    const n = param.get('navrh') && M.navrhy.najdi(param.get('navrh'));
    if (n) {
      stav.velikost = n.velikost;
      vykresliTyp();
      for (const v of n.vrstvy) {
        if (v.druh === 'text') {
          pridejVrstvu(await novyNapis(v.text, v), true);
        } else if (v.souborId) {
          const blob = await M.soubory.nacti(v.souborId);
          if (!blob) continue;
          const soubor = new File([blob], v.nazev, {type: blob.type});
          const o = await obrazekZeSouboru(soubor);
          const vr = Potisk.novaVrstva('obrazek', v.bezPozadi ? Potisk.odstranPozadi(o.c) : o.c, {nazev: v.nazev, soubor, puvodni: o.c, nahledUrl: o.img.src, zdrojPx: o.img.naturalWidth, bezPozadi: v.bezPozadi, u: v.u, v: v.v, s: v.s});
          pridejVrstvu(vr, true);
        }
      }
      scena.vyber(null);
      scena.vykresli();
      vykresliVrstvy();
      vykresliNastaveni();
    } else if (param.get('napis')) {
      const t = param.get('napis').slice(0, 60);
      pridejVrstvu(await novyNapis(t.length > 9 && t.indexOf(' ') > 0 ? t.replace(/ (?=\S+$)/, '\n') : t, {s: 0.92, v: 0.24}), true);
      scena.vyber(null);
      scena.vykresli();
    }
  }

  function ukazChybu(text) { el.chyba.textContent = text; el.chyba.hidden = false; }
  function skryjChybu() { el.chyba.hidden = true; }

  // písma nápisů načíst předem (i s diakritikou), po načtení nápisy překreslit
  const VZOREK = 'Aa ÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ áčďéěíňóřšťúůýž';
  Object.keys(Potisk.PISMA).forEach((id) => [400, 700].forEach((w) => document.fonts.load(`${w} 40px ${Potisk.PISMA[id].rodina}`, VZOREK).catch(() => {})));
  document.fonts.addEventListener('loadingdone', async () => {
    const napisy = produkt.pohledy.flatMap((p) => stav.vrstvy[p.id]).filter((v) => v.druh === 'text');
    for (const v of napisy) {
      v.zdroj = await Potisk.vykresliNapis(v);
      v.pomer = v.zdroj.height / v.zdroj.width;
      scena.omez(v);
    }
    if (napisy.length) scena.vykresli();
  });

  vykresliTyp();
  vykresliVrstvy();
  nactiData().then(obnov);
})();
