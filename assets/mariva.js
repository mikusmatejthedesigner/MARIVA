/* MARIVA, společný skript motivu: košík přes AJAX API Shopify a Section Rendering API (panel cart-drawer),
   ceny ve formátu obchodu, termín dodání, sezónní lišta, uložené návrhy (localStorage + IndexedDB),
   nahrávání souborů na Uploadcare (Shopify neumí soubor u položky košíku) a živé náhledy triček na kartách. */
(function () {
  'use strict';
  const N = window.MarivaNastaveni || {};
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const uloz = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const nacti = (k, z) => { try { return JSON.parse(localStorage.getItem(k)) || z; } catch (e) { return z; } };

  /* ---------- ceny ve formátu obchodu (shop.money_format) ---------- */
  function cena(centy) {
    const castka = (des, tisice, oddelovac) => {
      const [cele, zbytek] = (centy / 100).toFixed(des).split('.');
      const s = cele.replace(/\B(?=(\d{3})+(?!\d))/g, tisice) + (zbytek ? oddelovac + zbytek : '');
      return s.replace(/[.,]00$/, '');
    };
    const typy = {
      amount: () => castka(2, ',', '.'),
      amount_no_decimals: () => castka(0, ',', '.'),
      amount_with_comma_separator: () => castka(2, '.', ','),
      amount_no_decimals_with_comma_separator: () => castka(0, '.', ','),
      amount_with_space_separator: () => castka(2, ' ', ','),
      amount_no_decimals_with_space_separator: () => castka(0, ' ', ','),
      amount_with_apostrophe_separator: () => castka(2, "'", '.'),
    };
    const format = N.formatCeny || '{{amount_no_decimals_with_space_separator}} Kč';
    return format.replace(/\{\{\s*(\w+)\s*\}\}/, (m, t) => (typy[t] || typy.amount)()).replace(/<[^>]+>/g, '');
  }

  /* ---------- barvy látky z nastavení („Název: #hex“ na řádek) ---------- */
  const klicBarvy = (s) => String(s || '').trim().toLowerCase();
  const BARVY = {};
  String(N.barvy || '').split(/\n/).forEach((r) => {
    const m = r.match(/^\s*(.+?)\s*:\s*(#[0-9a-f]{3,8})\s*$/i);
    if (m) BARVY[klicBarvy(m[1])] = m[2];
  });
  const barvaHex = (nazev) => BARVY[klicBarvy(nazev)] || '#D9D9D9';

  /* ---------- termín dodání a sezóna ---------- */
  const MESICE = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
  function termin() {
    const a = new Date(); a.setDate(a.getDate() + (+N.dodaniOd || 21));
    const b = new Date(); b.setDate(b.getDate() + (+N.dodaniDo || 35));
    const text = a.getMonth() === b.getMonth()
      ? `mezi ${a.getDate()}. a ${b.getDate()}. ${MESICE[b.getMonth()]}`
      : `mezi ${a.getDate()}. ${MESICE[a.getMonth()]} a ${b.getDate()}. ${MESICE[b.getMonth()]}`;
    return {od: a, do: b, text, kratce: `${a.getDate()}. ${a.getMonth() + 1}. až ${b.getDate()}. ${b.getMonth() + 1}.`};
  }
  const vMesici = (seznam) => String(seznam || '').split(/[,\s]+/).map(Number).indexOf(new Date().getMonth() + 1) >= 0;
  function doplnTerminy(koren) {
    const t = termin();
    (koren || document).querySelectorAll('[data-termin]').forEach((el) => { el.textContent = t.text; });
    (koren || document).querySelectorAll('[data-termin-kdy]').forEach((el) => { el.textContent = t.kratce; });
  }

  /* ---------- soubory (IndexedDB) a uložené návrhy ---------- */
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
  const KLIC_NAVRHY = 'mariva-navrhy-v1';
  const KLIC_NAHLEDY = 'mariva-nahledy-v1';
  const navrhy = {
    seznam: () => nacti(KLIC_NAVRHY, []),
    najdi: (id) => navrhy.seznam().find((x) => x.id === id),
    async uloz(n, obrazky) {
      const vse = navrhy.seznam().filter((x) => x.id !== n.id);
      for (const f of obrazky || []) {
        const sid = `navrh-${n.id}-${f.vrstva}`;
        await soubory.uloz(sid, f.soubor);
        n.vrstvy[f.vrstva].souborId = sid;
      }
      vse.unshift(n);
      vse.slice(6).forEach((x) => x.vrstvy.forEach((v) => v.souborId && soubory.smaz(v.souborId)));
      uloz(KLIC_NAVRHY, vse.slice(0, 6));
    },
  };
  // náhledy návrhů v košíku (když není Uploadcare, ukáže se náhled uložený v prohlížeči)
  const nahledy = {
    uloz(id, dataUrl) {
      if (!id || !dataUrl) return;
      const n = nacti(KLIC_NAHLEDY, {});
      n[id] = dataUrl;
      const klice = Object.keys(n);
      klice.slice(0, Math.max(0, klice.length - 20)).forEach((k) => delete n[k]);
      if (!uloz(KLIC_NAHLEDY, n)) uloz(KLIC_NAHLEDY, {[id]: dataUrl});
    },
    doplnit(koren) {
      const n = nacti(KLIC_NAHLEDY, {});
      (koren || document).querySelectorAll('[data-navrh]').forEach((el) => {
        const id = el.dataset.navrh;
        if (!id || !n[id]) return;
        const img = el.querySelector('img');
        if (img && img.getAttribute('src') && !img.dataset.produktovy && /ucarecd|ucarecdn|uploadcare/.test(img.src)) return;
        el.innerHTML = `<img src="${n[id]}" alt="">`;
      });
    },
  };

  /* ---------- nahrávání souborů (Uploadcare) ---------- */
  const lzeNahravat = () => !!(N.uploadcare && N.uploadcare.klic);
  async function nahratSoubor(soubor, nazev) {
    if (!lzeNahravat()) return null;
    const fd = new FormData();
    fd.append('UPLOADCARE_PUB_KEY', N.uploadcare.klic);
    fd.append('UPLOADCARE_STORE', 'auto');
    fd.append('file', soubor, nazev || soubor.name || 'soubor');
    const r = await fetch('https://upload.uploadcare.com/base/', {method: 'POST', body: fd});
    if (!r.ok) throw new Error('Nahrání se nepovedlo (' + r.status + ')');
    const d = await r.json();
    const cdn = String(N.uploadcare.cdn || 'https://ucarecdn.com').replace(/\/$/, '');
    const jmeno = encodeURIComponent((nazev || soubor.name || 'soubor').replace(/[^\w.\-]+/g, '-'));
    return `${cdn}/${d.file}/${jmeno}`;
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

  /* ---------- košík ---------- */
  const SEKCE_KOSIKU = 'cart-drawer';
  const panel = () => document.querySelector('[data-kosik-panel]');
  function prekresliPanel(sekce) {
    const html = sekce && sekce[SEKCE_KOSIKU];
    const p = panel();
    if (!html || !p) return;
    const novy = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-kosik-vnitrek]');
    const stary = p.querySelector('[data-kosik-vnitrek]');
    if (novy && stary) stary.replaceWith(novy);
    doplnTerminy(p);
    nahledy.doplnit(p);
  }
  function obnovPocet(pocet) {
    document.querySelectorAll('[data-pocet]').forEach((el) => { el.textContent = pocet; el.hidden = !pocet; });
  }
  async function api(url, telo) {
    const r = await fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json', Accept: 'application/json'}, body: JSON.stringify(telo)});
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.description || d.message || 'Košík se nepodařilo upravit.');
    return d;
  }
  const kosik = {
    async pridat(polozky) {
      const d = await api(N.kosikPridat + '.js', {items: polozky, sections: SEKCE_KOSIKU, sections_url: location.pathname});
      prekresliPanel(d.sections);
      const stav = await fetch(N.kosik + '.js', {headers: {Accept: 'application/json'}}).then((r) => r.json()).catch(() => null);
      if (stav) obnovPocet(stav.item_count);
      return d;
    },
    async zmenit(radek, ks) {
      const d = await api(N.kosikZmenit + '.js', {line: radek, quantity: Math.max(0, ks | 0), sections: SEKCE_KOSIKU, sections_url: location.pathname});
      prekresliPanel(d.sections);
      obnovPocet(d.item_count);
      return d;
    },
    otevrit() {
      const p = panel();
      if (!p) { location.href = N.kosik; return; }
      doplnTerminy(p);
      nahledy.doplnit(p);
      if (!p.open) p.showModal();
    },
    poPridani() {
      if (N.kosikTyp === 'stranka') location.href = N.kosik;
      else kosik.otevrit();
    },
  };
  document.addEventListener('click', (e) => {
    const p = panel();
    const otevrit = e.target.closest('[data-otevrit-kosik]');
    if (otevrit && p) { e.preventDefault(); kosik.otevrit(); return; }
    const dlg = e.target.closest('dialog');
    if (dlg && (e.target === dlg || e.target.closest('[data-zavrit]'))) { dlg.close(); return; }
    if (!p || !p.contains(e.target)) return;
    const li = e.target.closest('[data-radek]');
    if (!li) return;
    const radek = +li.dataset.radek;
    const pole = li.querySelector('[data-ks-pole]');
    const krok = e.target.closest('[data-ks]');
    if (krok) kosik.zmenit(radek, +pole.value + +krok.dataset.ks).catch((err) => oznam(err.message));
    if (e.target.closest('[data-odebrat]')) kosik.zmenit(radek, 0).catch((err) => oznam(err.message));
  });
  document.addEventListener('change', (e) => {
    const pole = e.target.closest('[data-kosik-panel] [data-ks-pole]');
    if (pole) kosik.zmenit(+pole.closest('[data-radek]').dataset.radek, +pole.value).catch((err) => oznam(err.message));
  });

  /* ---------- živé náhledy triček na kartách produktů ---------- */
  const sceny = new WeakMap();
  async function vykresliKartu(c) {
    const profil = (window.MARIVA_PROFILY || {})[c.dataset.render];
    if (!window.Potisk || !profil) return;
    let sc = sceny.get(c);
    if (!sc) {
      sc = {scena: new Potisk.Scena(c, {okraj: 0.1}), napis: null};
      sceny.set(c, sc);
      sc.data = await Potisk.nactiPohled(profil, profil.typy[0].id, profil.pohledy[0].id, '');
    }
    const hex = barvaHex(c.dataset.barva);
    const zdroj = await Potisk.vykresliNapis({text: (c.dataset.napis || '').replace(/\\n/g, '\n'), pismo: 'bezpatkove', tucne: true, barva: Potisk.svetlost(hex) < 0.35 ? '#ffffff' : '#1B1424'});
    if (!sc.napis) {
      sc.napis = Potisk.novaVrstva('text', zdroj, {u: 0.5, v: 0.2, s: 0.66});
      sc.scena.vrstvy.push(sc.napis);
    } else {
      sc.napis.zdroj = zdroj;
      sc.napis.pomer = zdroj.height / zdroj.width;
    }
    sc.scena.nastav(sc.data, hex);
    c.hidden = false;
    const obr = c.parentElement.querySelector('img');
    if (obr) obr.hidden = true;
  }
  function vykresliKarty(koren) {
    (koren || document).querySelectorAll('canvas[data-render]').forEach((c) => {
      const karta = c.closest('.karta');
      const barvy = karta && karta.querySelector('[data-karta-barvy]');
      if (barvy) {
        barvy.querySelectorAll('button').forEach((b) => b.style.setProperty('--b', barvaHex(b.dataset.barva)));
        barvy.hidden = false;
        if (!c.dataset.barva) c.dataset.barva = barvy.querySelector('button').dataset.barva;
      }
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((z) => { if (z[0].isIntersecting) { io.disconnect(); vykresliKartu(c).catch(() => {}); } }, {rootMargin: '200px'});
        io.observe(c);
      } else vykresliKartu(c).catch(() => {});
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
    vykresliKartu(c).catch(() => {});
    const barvaParam = `barva=${encodeURIComponent(b.dataset.barva)}`;
    k.querySelectorAll('a[href]').forEach((a) => { a.href = a.href.replace(/([?&])barva=[^&#]*/, '').replace(/[?&]$/, '') + (a.href.indexOf('?') >= 0 ? '&' : '?') + barvaParam; });
  });

  /* ---------- poptávka (kontaktní formulář Shopify) ----------
     Soubory se před odesláním nahrají na Uploadcare a do poptávky jdou jako odkazy. */
  document.addEventListener('submit', async (e) => {
    const f = e.target.closest('form[data-poptavka]');
    if (!f || f.dataset.odesila === '1') return;
    const vstup = f.querySelector('[data-poptavka-vstup]');
    const pripojene = f._prilohy || [];
    const vybrane = vstup ? [...vstup.files] : [];
    if (!vybrane.length && !pripojene.length) return;
    e.preventDefault();
    const tl = f.querySelector('[type="submit"]');
    const chyba = f.querySelector('[data-poptavka-chyba]');
    tl.disabled = true;
    try {
      const odkazy = [];
      for (const s of pripojene.concat(vybrane)) odkazy.push(await nahratSoubor(s, s.name));
      const pole = f.querySelector('[data-poptavka-soubory]');
      if (pole) pole.value = odkazy.filter(Boolean).join('\n');
      if (vstup) vstup.value = '';
      f.dataset.odesila = '1';
      f.requestSubmit ? f.requestSubmit() : f.submit();
    } catch (err) {
      tl.disabled = false;
      if (chyba) { chyba.textContent = `Soubory se nepodařilo nahrát. Odešlete poptávku bez nich a pošlete je e-mailem na ${N.email || 'náš e-mail'}.`; chyba.hidden = false; }
      if (vstup) vstup.value = '';
      f._prilohy = [];
    }
  });

  /* ---------- sezónní nabídka: blok podle měsíce, v editoru vybraný blok ---------- */
  function vyberSezonu(koren) {
    (koren || document).querySelectorAll('[data-sezona-sekce]').forEach((s) => {
      const bloky = [...s.querySelectorAll('[data-sezona-blok]')];
      const aktivni = bloky.find((b) => vMesici(b.dataset.sezonaBlok)) || bloky[0];
      bloky.forEach((b) => { b.hidden = b !== aktivni; });
    });
  }
  document.addEventListener('shopify:block:select', (e) => {
    const b = e.target.closest('[data-sezona-blok]');
    if (!b) return;
    b.parentElement.querySelectorAll('[data-sezona-blok]').forEach((x) => { x.hidden = x !== b; });
  });
  document.addEventListener('shopify:section:load', (e) => { vyberSezonu(e.target); doplnTerminy(e.target); vykresliKarty(e.target); });

  /* ---------- hlavička, lišta, dialogy ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('.menu-tlacitko');
    if (!t) return;
    const otevreno = t.getAttribute('aria-expanded') === 'true';
    t.setAttribute('aria-expanded', String(!otevreno));
    document.getElementById(t.getAttribute('aria-controls')).classList.toggle('je-otevrene', !otevreno);
  });
  function init() {
    const hlavicka = document.querySelector('[data-hlavicka]');
    const posun = () => hlavicka && hlavicka.classList.toggle('je-posunuta', window.scrollY > 8);
    window.addEventListener('scroll', posun, {passive: true});
    posun();
    const sez = [...document.querySelectorAll('template[data-sezona-lista]')].find((t) => vMesici(t.dataset.sezonaLista));
    const lista = document.querySelector('[data-lista-text]');
    if (sez && lista) lista.innerHTML = sez.innerHTML;
    vyberSezonu();
    doplnTerminy();
    nahledy.doplnit();
    vykresliKarty();
    if (/[?&]contact_posted=true/.test(location.search)) { // po odeslání poptávky ukázat potvrzení
      const d = document.querySelector('dialog[data-poptavka-dialog]');
      if (d && d.querySelector('.potvrzeni') && !d.open) d.showModal();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.Mariva = {N, cena, esc, barvaHex, termin, vMesici, doplnTerminy, soubory, navrhy, nahledy, lzeNahravat, nahratSoubor, dataUrlNaSoubor, oznam, kosik, vykresliKarty};
})();
