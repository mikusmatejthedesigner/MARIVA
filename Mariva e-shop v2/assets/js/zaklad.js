/* Společné pro celý web MARIVA: termíny a sezóna, karty produktů, košík (localStorage + soubory potisku v IndexedDB),
   uložené návrhy, poptávka, odeslání (Netlify Forms, na localhostu jen zkušební režim), hlavička. */
(function () {
  'use strict';

  const S = window.MARIVA_SORTIMENT || {produkty: [], skupiny: []};
  const K = window.MARIVA_KATALOG || {};
  const KLIC = 'mariva-kosik-v2';
  const KLIC_NAVRHY = 'mariva-navrhy-v1';
  const kc = (n) => new Intl.NumberFormat('cs-CZ').format(n) + ' Kč';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const uloz = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const nacti = (k, z) => { try { return JSON.parse(localStorage.getItem(k)) || z; } catch (e) { return z; } };

  /* ---------- termín dodání a sezóna ---------- */
  const MESICE = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
  const DODANI = {od: 21, do: 35}; // 3 až 5 týdnů
  function termin(odData) {
    const d = odData ? new Date(odData) : new Date();
    const a = new Date(d); a.setDate(a.getDate() + DODANI.od);
    const b = new Date(d); b.setDate(b.getDate() + DODANI.do);
    const text = a.getMonth() === b.getMonth()
      ? `mezi ${a.getDate()}. a ${b.getDate()}. ${MESICE[b.getMonth()]}`
      : `mezi ${a.getDate()}. ${MESICE[a.getMonth()]} a ${b.getDate()}. ${MESICE[b.getMonth()]}`;
    return {od: a, do: b, text, kratce: `${a.getDate()}. ${a.getMonth() + 1}. až ${b.getDate()}. ${b.getMonth() + 1}.`};
  }
  function sezona(d) {
    const m = (d || new Date()).getMonth() + 1;
    if (m >= 9 || m === 1) return {
      lista: 'Blíží se stužkovací plesy. Šerpy a stužky pro třídu objednejte s předstihem.',
      nadpis: 'Stužkovák se blíží. Šerpy máte v suchu.',
      text: 'Šerpy, stužky, trička i mikiny pro celou třídu z jedné tiskárny. Pošlete nám název třídy, rok maturity a seznam jmen a my se vám ozveme s nabídkou.',
      polozky: ['Šerpy se jménem pro každého', 'Atlasové stužky s názvem školy a rokem', 'Trička a mikiny s rokem maturity', 'Placky a drobnosti pro celou třídu'],
      produkt: 'Šerpy', pro: 'maturanti', obrazky: ['serpa', 'stuzky', 'placka'],
    };
    if (m >= 2 && m <= 6) return {
      lista: 'Poslední zvonění, maturity a rozloučení se školkou. Trička pro třídu objednejte včas.',
      nadpis: 'Poslední zvonění. Ať je na co vzpomínat.',
      text: 'Trička a mikiny pro celou třídu, dětské šerpy pro předškoláky a placky na rozloučenou. Pošlete nám seznam jmen a my se vám ozveme s nabídkou.',
      polozky: ['Trička a mikiny pro třídu', 'Dětské šerpy na rozloučení se školkou', 'Placky a polštářky na památku', 'Jména na záda i na rukáv'],
      produkt: 'Trička', pro: 'maturanti', obrazky: ['serpa', 'placka', 'polstarek'],
    };
    return {
      lista: 'Tábory, turnaje a firemní akce. Trička pro celou partu do 3 až 5 týdnů.',
      nadpis: 'Léto s vlastním tričkem.',
      text: 'Trička pro tábor, turnaj nebo firemní den. Vaky a kšiltovky k tomu. Napište, kolik vás je, a my se ozveme s nabídkou.',
      polozky: ['Trička pro tábor a oddíl', 'Kšiltovky a sportovní vaky', 'Trička s logem na firemní akci', 'Dárky s fotkou z léta'],
      produkt: 'Trička', pro: 'sport', obrazky: ['vak', 'ksiltovka', 'rucnik'],
    };
  }

  /* ---------- karty produktů a živé náhledy ---------- */
  const produkt = (id) => S.produkty.find((p) => p.id === id);
  function cenaHtml(p) {
    return p.cena ? `<strong>od ${kc(p.cena)}</strong><small>s potiskem, vč. DPH</small>` : '<strong>Na poptávku</strong><small>pošleme vám nabídku</small>';
  }
  function obrazHtml(p, trida) {
    if (p.obraz && p.obraz.render) {
      return `<canvas data-render="${p.obraz.render}" data-barva="${p.obraz.barva}" data-napis="${esc(p.obraz.napis)}" role="img" aria-label="${esc(p.nazev)}"></canvas>`;
    }
    return `<img src="${p.obraz}" alt="${esc(p.nazev)}" width="600" height="600" loading="lazy"${trida ? ` class="${trida}"` : ''}>`;
  }
  const odkaz = (p) => p.odkaz || `produkt.html?id=${p.id}`;
  function karta(p) {
    const tricko = p.id === 'tricko';
    return `
      <li class="karta">
        <div class="karta__media">
          <a class="karta__obraz dlazdice--${p.pozadi}" href="${odkaz(p)}" tabindex="-1" aria-hidden="true">${obrazHtml(p)}</a>
          ${p.stitek ? `<span class="stitek${tricko ? '' : ' stitek--zluta'}">${esc(p.stitek)}</span>` : ''}
          ${tricko ? `<div class="karta__barvy" data-karta-barvy aria-label="Vyzkoušet barvu">${['cervena', 'zluta', 'kralovska', 'cerna', 'bila'].map((b, i) => {
            const barva = (K.tricko && K.tricko.barvy.find((x) => x.id === b)) || {hex: '#fff', nazev: b};
            return `<button type="button" style="--b:${barva.hex}" data-barva="${b}" aria-label="${esc(barva.nazev)}" aria-pressed="${i === 0}"></button>`;
          }).join('')}</div>` : ''}
        </div>
        <div class="karta__text">
          <h3><a href="${odkaz(p)}">${esc(p.nazev)}</a></h3>
          <p>${esc(p.perex)}</p>
          <div class="karta__cena">
            <div>${cenaHtml(p)}</div>
            ${tricko ? `<a class="tl tl--magenta" href="${odkaz(p)}">Navrhnout</a>` : `<button type="button" class="tl" data-poptat="${esc(p.kratce)}">Poptat</button>`}
          </div>
        </div>
      </li>`;
  }

  /* Živé vykreslení trička a mikiny s potiskem (stejné jádro jako konfigurátor). */
  const sceny = new WeakMap();
  async function vykresliRender(c) {
    if (!window.Potisk || !K[c.dataset.render]) return;
    const pr = K[c.dataset.render];
    let sc = sceny.get(c);
    if (!sc) {
      sc = {scena: new Potisk.Scena(c, {okraj: c.closest('.detail__obraz') ? 0.12 : 0.1}), napis: null};
      sceny.set(c, sc);
      const data = await Potisk.nactiPohled(pr, pr.typy[0].id, pr.pohledy[0].id, '');
      sc.data = data;
    }
    const barva = pr.barvy.find((b) => b.id === c.dataset.barva) || pr.barvy[0];
    const tmava = Potisk.svetlost(barva.hex) < 0.35;
    const zdroj = await Potisk.vykresliNapis({text: c.dataset.napis || '', pismo: 'bezpatkove', tucne: true, barva: tmava ? '#ffffff' : '#1B1424'});
    if (!sc.napis) {
      sc.napis = Potisk.novaVrstva('text', zdroj, {u: 0.5, v: 0.2, s: c.dataset.render === 'mikina' ? 0.9 : 0.66});
      sc.scena.vrstvy.push(sc.napis);
    } else {
      sc.napis.zdroj = zdroj;
      sc.napis.pomer = zdroj.height / zdroj.width;
    }
    sc.scena.nastav(sc.data, barva.hex);
  }
  function vykresliRendery(koren) {
    (koren || document).querySelectorAll('canvas[data-render]').forEach((c) => {
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((z) => { if (z[0].isIntersecting) { io.disconnect(); vykresliRender(c); } }, {rootMargin: '200px'});
        io.observe(c);
      } else vykresliRender(c);
    });
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-karta-barvy] button');
    if (!b) return;
    e.preventDefault();
    const k = b.closest('.karta');
    k.querySelectorAll('[data-karta-barvy] button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const c = k.querySelector('canvas[data-render]');
    c.dataset.barva = b.dataset.barva;
    vykresliRender(c);
    k.querySelectorAll('a[href^="konfigurator.html"]').forEach((a) => { a.href = `konfigurator.html?barva=${b.dataset.barva}`; });
  });

  /* ---------- soubory potisku (IndexedDB) ---------- */
  const db = new Promise((ok) => {
    try {
      const r = indexedDB.open('mariva', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('soubory');
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ok(null);
    } catch (e) { ok(null); }
  });
  async function ulozka(rezim, fn) {
    const d = await db;
    if (!d) return null;
    return new Promise((ok) => {
      try {
        const t = d.transaction('soubory', rezim);
        const r = fn(t.objectStore('soubory'));
        t.oncomplete = () => ok(r && r.result);
        t.onerror = () => ok(null);
      } catch (e) { ok(null); }
    });
  }
  const soubory = {
    uloz: (id, blob) => ulozka('readwrite', (s) => s.put(blob, id)),
    nacti: (id) => ulozka('readonly', (s) => s.get(id)),
    smaz: (id) => ulozka('readwrite', (s) => s.delete(id)),
  };

  /* ---------- košík ---------- */
  let polozky = nacti(KLIC, []);
  function ulozKosik() {
    if (!uloz(KLIC, polozky)) uloz(KLIC, polozky.map((p) => Object.assign({}, p, {nahled: null})));
    obnovPocet();
  }
  const kosik = {
    polozky: () => polozky,
    pocet: () => polozky.reduce((s, p) => s + p.ks, 0),
    celkem: () => polozky.reduce((s, p) => s + p.ks * p.cena, 0),
    async pridej(p, souboryPotisku) {
      p.id = 'p' + Date.now().toString(36);
      for (let i = 0; i < (souboryPotisku || []).length; i++) {
        const f = souboryPotisku[i];
        const sid = p.id + '-' + i;
        await soubory.uloz(sid, f);
        p.potisk[f.vrstva].soubor = {id: sid, nazev: f.name};
      }
      polozky.push(p);
      ulozKosik();
      return p;
    },
    zmenKs(id, ks) {
      const p = polozky.find((q) => q.id === id);
      if (p) p.ks = Math.max(1, Math.min(999, ks | 0));
      ulozKosik();
    },
    odeber(id) {
      const p = polozky.find((q) => q.id === id);
      if (p) p.potisk.forEach((v) => v.soubor && soubory.smaz(v.soubor.id));
      polozky = polozky.filter((q) => q.id !== id);
      ulozKosik();
    },
    vyprazdni() {
      polozky.forEach((p) => p.potisk.forEach((v) => v.soubor && soubory.smaz(v.soubor.id)));
      polozky = [];
      ulozKosik();
    },
  };
  window.addEventListener('storage', (e) => { if (e.key === KLIC) { polozky = nacti(KLIC, []); obnovPocet(); } });

  function popisPotisku(v) {
    if (v.druh === 'text') return `nápis „${v.text.replace(/\n/g, ' / ')}“ (${v.pismo}${v.tucne ? ', tučně' : ''}, ${v.barva}), ${v.cm}`;
    return `obrázek ${v.soubor ? v.soubor.nazev : v.nazev}, ${v.cm}${v.bezPozadi ? ', bez pozadí' : ''}`;
  }
  function popisPolozky(p, i) {
    return `${i + 1}) ${p.nazev}: ${p.typ}, ${p.barva}, velikost ${p.velikost}, ${p.ks} ks × ${kc(p.cena)}\n   potisk (${p.pohled}): ` + p.potisk.map(popisPotisku).join('; ');
  }
  function polozkaHtml(p, upravy) {
    return `
      <li class="kosik-polozka" data-id="${p.id}">
        <div class="kosik-polozka__nahled">${p.nahled ? `<img src="${p.nahled}" alt="">` : ''}</div>
        <div class="kosik-polozka__info">
          <strong>${esc(p.nazev)}</strong>
          <span>${esc(p.typ)}, ${esc(p.barva)}, ${esc(p.velikost)}</span>
          <span class="tlumene">${p.potisk.map((v) => esc(v.druh === 'text' ? '„' + v.text.replace(/\n/g, ' ') + '“' : (v.soubor ? v.soubor.nazev : v.nazev))).join(', ')}</span>
          ${upravy ? `
          <div class="kosik-polozka__radek">
            <div class="pocitadlo pocitadlo--male">
              <button type="button" data-ks="-1" aria-label="Ubrat kus">−</button>
              <input type="number" min="1" max="999" value="${p.ks}" aria-label="Počet kusů">
              <button type="button" data-ks="1" aria-label="Přidat kus">+</button>
            </div>
            <span class="kosik-polozka__cena">${kc(p.ks * p.cena)}</span>
          </div>
          <button type="button" class="odkaz" data-odebrat>Odebrat</button>` : `
          <div class="kosik-polozka__radek"><span>${p.ks} ks</span><span class="kosik-polozka__cena">${kc(p.ks * p.cena)}</span></div>`}
        </div>
      </li>`;
  }

  /* ---------- odeslání ---------- */
  const zkusebni = () => location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(location.hostname);
  async function odeslat(formular, pole, prilohy) {
    if (zkusebni()) {
      console.info('Zkušební režim, neodesláno:', formular, pole, prilohy);
      await new Promise((r) => setTimeout(r, 500));
      return {zkusebni: true};
    }
    const fd = new FormData();
    fd.append('form-name', formular);
    Object.keys(pole).forEach((k) => fd.append(k, pole[k]));
    (prilohy || []).slice(0, 5).forEach((f, i) => fd.append('soubor' + (i + 1), f, f.name));
    const r = await fetch('/', {method: 'POST', body: fd});
    if (!r.ok) throw new Error('Odeslání se nepovedlo (' + r.status + ')');
    return {zkusebni: false};
  }
  function dataUrlNaSoubor(url, nazev) {
    if (!url) return null;
    const [hlava, data] = url.split(',');
    const typ = hlava.match(/:(.*?);/)[1];
    const bin = atob(data);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new File([u8], nazev, {type: typ});
  }

  /* ---------- uložené návrhy (rozpracované, na příště) ---------- */
  const navrhy = {
    seznam: () => nacti(KLIC_NAVRHY, []),
    async uloz(n, obrazky) {
      const vse = navrhy.seznam().filter((x) => x.id !== n.id);
      for (const [i, f] of (obrazky || []).entries()) {
        const sid = `navrh-${n.id}-${i}`;
        await soubory.uloz(sid, f.soubor);
        n.vrstvy[f.vrstva].souborId = sid;
      }
      vse.unshift(n);
      vse.slice(6).forEach((x) => x.vrstvy.forEach((v) => v.souborId && soubory.smaz(v.souborId)));
      uloz(KLIC_NAVRHY, vse.slice(0, 6));
    },
    najdi: (id) => navrhy.seznam().find((x) => x.id === id),
  };

  /* ---------- oznámení ---------- */
  function oznam(text, akce) {
    let el = document.querySelector('.oznameni');
    if (!el) {
      el = document.createElement('div');
      el.className = 'oznameni';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.innerHTML = `<span>${esc(text)}</span>` + (akce ? `<button type="button">${esc(akce.text)}</button>` : '');
    if (akce) el.querySelector('button').onclick = () => { el.classList.remove('je-videt'); akce.fn(); };
    el.classList.add('je-videt');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('je-videt'), 6000);
  }

  /* ---------- formulářové prvky ---------- */
  const pole = (nazev, popis, typ, povinne, extra) => `
    <label class="pole">
      <span class="pole__popis">${popis}${povinne ? '' : ' <em>nepovinné</em>'}</span>
      ${typ === 'textarea'
        ? `<textarea name="${nazev}" rows="3"${povinne ? ' required' : ''}${extra || ''}></textarea>`
        : `<input name="${nazev}" type="${typ}"${povinne ? ' required' : ''}${extra || ''}>`}
    </label>`;
  const souhlas = `
    <label class="souhlas"><input type="checkbox" name="souhlas" required>
      <span>Souhlasím se zpracováním kontaktních údajů pro vyřízení objednávky nebo poptávky.</span></label>
    <input type="text" name="bot-pole" class="skryte" tabindex="-1" autocomplete="off" aria-hidden="true">`;
  const potvrzeni = (nadpis, text, zk) => `
    <div class="potvrzeni">
      <h3>${nadpis}</h3>
      <p>${text}</p>
      ${zk ? '<p class="potvrzeni__zk">Zkušební režim: web neběží na hostingu, nic se neodeslalo.</p>' : ''}
      <button type="button" class="tl tl--inkoust" data-zavrit>Zavřít</button>
    </div>`;
  const hodnoty = (form) => {
    const o = {};
    new FormData(form).forEach((v, k) => { if (typeof v === 'string' && k !== 'bot-pole' && k !== 'souhlas') o[k] = v.trim(); });
    return o;
  };
  function overit(f) {
    const neplatne = [...f.querySelectorAll('input, textarea, select')].find((el) => !el.checkValidity());
    if (neplatne) {
      ukazChybu(f, neplatne.type === 'checkbox' ? 'Potvrďte prosím souhlas se zpracováním údajů.' : neplatne.type === 'email' && neplatne.value ? 'Zkontrolujte prosím e-mail.' : 'Vyplňte prosím povinné údaje.');
      neplatne.focus();
      return false;
    }
    return true;
  }
  function ukazChybu(f, text) {
    const ch = f.querySelector('.chyba');
    ch.textContent = text;
    ch.hidden = false;
  }
  function zavritKlikemVedle(dlg) {
    dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-zavrit]')) dlg.close(); });
  }

  /* ---------- košík: panel ---------- */
  let panel;
  function vytvorPanel() {
    panel = document.createElement('dialog');
    panel.className = 'panel';
    panel.setAttribute('aria-labelledby', 'kosik-nadpis');
    panel.innerHTML = `
      <div class="panel__hlava"><h2 id="kosik-nadpis">Košík</h2><button type="button" class="zavrit" data-zavrit aria-label="Zavřít košík"></button></div>
      <div class="panel__telo"></div>
      <div class="panel__pata"></div>`;
    document.body.appendChild(panel);
    zavritKlikemVedle(panel);
  }
  function vykresliKosik() {
    const telo = panel.querySelector('.panel__telo');
    const pata = panel.querySelector('.panel__pata');
    if (!polozky.length) {
      telo.innerHTML = `
        <div class="kosik-prazdny">
          <p>Košík je zatím prázdný. Navrhněte si tričko, za pár minut ho tu máte.</p>
          <a class="tl tl--magenta" href="konfigurator.html">Navrhnout tričko</a>
        </div>`;
      pata.hidden = true;
      return;
    }
    pata.hidden = false;
    telo.innerHTML = `<ul class="kosik-seznam">${polozky.map((p) => polozkaHtml(p, true)).join('')}</ul>`;
    pata.innerHTML = `
      <div class="souhrn-radek"><span>Celkem s DPH</span><strong>${kc(kosik.celkem())}</strong></div>
      <div class="dodani"><svg aria-hidden="true"><use href="#i-kalendar"/></svg><span>Při objednávce dnes hotovo <strong>${termin().text}</strong></span></div>
      <a class="tl tl--magenta tl--velke tl--plna" href="pokladna.html">K pokladně</a>
      <button type="button" class="odkaz" data-zavrit style="justify-self:center">Pokračovat v nákupu</button>`;
    telo.querySelectorAll('.kosik-polozka').forEach((li) => {
      const id = li.dataset.id;
      const vstup = li.querySelector('input');
      li.querySelectorAll('[data-ks]').forEach((b) => b.addEventListener('click', () => { kosik.zmenKs(id, +vstup.value + +b.dataset.ks); vykresliKosik(); }));
      vstup.addEventListener('change', () => { kosik.zmenKs(id, +vstup.value); vykresliKosik(); });
      li.querySelector('[data-odebrat]').addEventListener('click', () => { kosik.odeber(id); vykresliKosik(); });
    });
  }
  function otevritKosik() {
    if (!panel) vytvorPanel();
    vykresliKosik();
    panel.showModal();
  }

  /* ---------- poptávka ---------- */
  let okno;
  function poptat(moznosti) {
    const m = moznosti || {};
    if (!okno) {
      okno = document.createElement('dialog');
      okno.className = 'okno';
      okno.setAttribute('aria-labelledby', 'poptavka-nadpis');
      document.body.appendChild(okno);
      zavritKlikemVedle(okno);
    }
    const vybrany = m.produkt || 'Trička';
    const nazvy = S.produkty.map((p) => p.kratce).concat(['Jiný produkt']);
    okno.innerHTML = `
      <div class="okno__hlava">
        <h2 id="poptavka-nadpis">${m.nadpis || 'Poptávka'}</h2>
        <button type="button" class="zavrit" data-zavrit aria-label="Zavřít"></button>
      </div>
      <form class="formular" novalidate>
        <p class="tlumene">${m.uvod || 'Napište nám, co potřebujete. Pošleme vám cenu a návrh, poptávka je nezávazná.'}</p>
        ${m.nahled ? `<div class="poptavka-navrh"><img src="${m.nahled}" alt="Náhled návrhu"><div><strong>${esc(m.navrhNazev || 'Váš návrh')}</strong><span class="tlumene">${esc(m.navrhPopis || '')}</span></div></div>` : ''}
        <div class="formular__dva">
          <label class="pole">
            <span class="pole__popis">Produkt</span>
            <select name="produkt">${nazvy.map((n) => `<option${n === vybrany ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>
          </label>
          ${pole('mnozstvi', 'Přibližný počet kusů', 'number', true, ` min="1" inputmode="numeric" value="${m.mnozstvi || ''}"`)}
        </div>
        ${pole('popis', 'Co má být na potisku', 'textarea', false, ' placeholder="Text, barvy, velikosti, rozpis jmen…"')}
        <label class="pole">
          <span class="pole__popis">Motiv, logo nebo seznam jmen <em>nepovinné</em></span>
          <input type="file" name="motiv" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt">
        </label>
        ${pole('termin', 'Kdy potřebujete mít hotovo', 'date', false)}
        <div class="formular__dva">
          ${pole('jmeno', 'Jméno a příjmení', 'text', true, ' autocomplete="name"')}
          ${pole('organizace', 'Škola, spolek nebo firma', 'text', false, ' autocomplete="organization"')}
        </div>
        <div class="formular__dva">
          ${pole('email', 'E-mail', 'email', true, ' autocomplete="email"')}
          ${pole('telefon', 'Telefon', 'tel', false, ' autocomplete="tel"')}
        </div>
        ${souhlas}
        <p class="chyba" hidden></p>
        <button type="submit" class="tl tl--magenta tl--velke">Odeslat nezávaznou poptávku</button>
      </form>`;
    const f = okno.querySelector('form');
    if (m.popis) f.popis.value = m.popis;
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!overit(f)) return;
      const tl = f.querySelector('[type="submit"]');
      tl.disabled = true;
      tl.textContent = 'Odesílám…';
      try {
        const data = hodnoty(f);
        if (m.navrhPopis) data.navrh = m.navrhPopis;
        const prilohy = [...f.motiv.files].concat(m.prilohy || []);
        const n = dataUrlNaSoubor(m.nahled, 'nahled-navrhu.jpg');
        if (n) prilohy.push(n);
        const r = await odeslat('poptavka', data, prilohy);
        f.outerHTML = potvrzeni('Děkujeme, poptávka je u nás', 'Ozveme se vám s cenou a návrhem na e-mail nebo telefon, který jste uvedli.', r.zkusebni);
      } catch (err) {
        tl.disabled = false;
        tl.textContent = 'Odeslat nezávaznou poptávku';
        ukazChybu(f, 'Poptávku se nepodařilo odeslat. Zkuste to prosím znovu, nebo napište na info@tiskarnamariva.cz.');
      }
    });
    okno.showModal();
  }

  /* ---------- hlavička, lišta, termíny na stránce ---------- */
  function obnovPocet() {
    const n = kosik.pocet();
    document.querySelectorAll('[data-pocet]').forEach((el) => { el.textContent = n; el.hidden = n === 0; });
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-otevrit-kosik], [data-poptat], .menu-tlacitko');
    if (!t) return;
    if (t.matches('[data-otevrit-kosik]')) otevritKosik();
    else if (t.matches('[data-poptat]')) {
      e.preventDefault();
      poptat({produkt: t.dataset.poptat || undefined, popis: t.dataset.popis ? t.dataset.popis.replace(/\\n/g, '\n') : undefined});
    } else {
      const otevreno = t.getAttribute('aria-expanded') === 'true';
      t.setAttribute('aria-expanded', String(!otevreno));
      document.getElementById(t.getAttribute('aria-controls')).classList.toggle('je-otevrene', !otevreno);
    }
  });
  const hlavicka = document.querySelector('.hlavicka');
  const posun = () => hlavicka && hlavicka.classList.toggle('je-posunuta', window.scrollY > 8);
  window.addEventListener('scroll', posun, {passive: true});
  posun();
  // aktuální stránka v menu
  const tady = location.pathname.split('/').pop() + location.search;
  document.querySelectorAll('.menu a').forEach((a) => {
    const h = a.getAttribute('href');
    if (h === tady || (h === 'konfigurator.html' && tady.startsWith('konfigurator.html')) || (tady === 'produkty.html' && h === 'produkty.html')) a.setAttribute('aria-current', 'page');
  });
  const sez = sezona();
  document.querySelectorAll('[data-sezona]').forEach((el) => { el.textContent = sez.lista; });
  const t = termin();
  document.querySelectorAll('[data-termin]').forEach((el) => { el.textContent = t.text; });
  document.querySelectorAll('[data-termin-kratce]').forEach((el) => { el.textContent = `Při objednávce dnes ${t.text}`; });
  document.querySelectorAll('[data-termin-kdy]').forEach((el) => { el.textContent = t.kratce; });
  obnovPocet();

  window.Mariva = {kosik, soubory, navrhy, poptat, otevritKosik, oznam, kc, esc, termin, sezona, karta, produkt, obrazHtml, cenaHtml, vykresliRendery, odeslat, dataUrlNaSoubor, popisPolozky, polozkaHtml, overit, ukazChybu, hodnoty, S, K};
})();
