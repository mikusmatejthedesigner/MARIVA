/* Potisk: vykreslení produktu v barvě s potiskem (obrázky a nápisy) v oblasti potisku.
   Produkt popisuje katalog (produkty/katalog.js, vzniká skriptem technika/scripts/konfigurator/priprav.py):
   podklad = odstíny látky v šedé s průhledným okolím, linky = švy jako průhlednost, oblast = kam smí potisk (0–1).
   Barva se násobí podkladem, takže stejný kód funguje pro jakýkoli kus oblečení nebo předmět. */
(function () {
  'use strict';

  const obrazky = new Map();
  function nactiObrazek(src) {
    if (!obrazky.has(src)) {
      obrazky.set(src, new Promise((ok, chyba) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => ok(img);
        img.onerror = () => { obrazky.delete(src); chyba(new Error('Obrázek se nenačetl: ' + src)); };
        img.src = src;
      }));
    }
    return obrazky.get(src);
  }

  function svetlost(hex) {
    const n = parseInt(hex.slice(1), 16);
    const k = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
  }

  function platno(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }

  /* Data pohledu pro typ produktu: {podklad, linky, sirka, vyska, oblast, nazev} */
  async function nactiPohled(produkt, typId, pohledId, koren) {
    const typ = produkt.typy.find((t) => t.id === typId) || produkt.typy[0];
    const p = typ.pohledy[pohledId];
    if (!p) throw new Error('Produkt nemá pohled ' + pohledId);
    const z = produkt.zdroje[p.zdroj];
    const zaklad = (koren || '') + 'produkty/' + produkt.id + '/';
    const [podklad, linky] = await Promise.all([nactiObrazek(zaklad + z.soubor), nactiObrazek(zaklad + z.linky)]);
    return {podklad, linky, sirka: z.sirka, vyska: z.vyska, oblast: p.oblast, id: pohledId};
  }

  /* Vrstva potisku: obrázek nebo nápis. u, v = střed v oblasti (0–1), s = šířka jako podíl šířky oblasti. */
  let citac = 0;
  function novaVrstva(druh, zdroj, data) {
    return Object.assign({id: 'v' + Date.now().toString(36) + (citac++), druh, zdroj, pomer: zdroj.height / zdroj.width, u: 0.5, v: 0.3, s: 0.6}, data || {});
  }

  /* Nápis jako plátno (vysoké rozlišení, ostrý při zvětšení). */
  const PISMA = {
    bezpatkove: {nazev: 'Bezpatkové', rodina: '"Archivo", system-ui, sans-serif'},
    patkove: {nazev: 'Patkové', rodina: '"Source Serif 4", Georgia, serif'},
    uzke: {nazev: 'Úzké', rodina: '"Oswald", "Arial Narrow", sans-serif'},
  };
  async function vykresliNapis(n) {
    const pismo = PISMA[n.pismo] || PISMA.bezpatkove;
    const vaha = n.tucne ? 700 : 400;
    const vel = 240;
    const font = `${vaha} ${vel}px ${pismo.rodina}`;
    try {
      await document.fonts.load(font, n.text || 'A');
      if (!document.fonts.check(font, n.text || 'A')) await document.fonts.ready;
    } catch (e) { /* náhradní písmo */ }
    const radky = (n.text || '').split('\n').map((r) => r.trimEnd());
    const mereni = platno(1, 1).getContext('2d');
    mereni.font = font;
    const vyskaRadku = vel * 1.12;
    const sirka = Math.max(...radky.map((r) => mereni.measureText(r || ' ').width), vel * 0.5);
    const pad = vel * 0.08;
    const c = platno(sirka + pad * 2, vyskaRadku * radky.length + pad * 2);
    const x = c.getContext('2d');
    x.font = font;
    x.fillStyle = n.barva || '#111111';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    radky.forEach((r, i) => x.fillText(r, c.width / 2, pad + vyskaRadku * (i + 0.5)));
    return c;
  }

  /* Odstranění jednobarevného (obvykle bílého) pozadí: zaplavení od okrajů s tolerancí. */
  function odstranPozadi(zdroj, tolerance) {
    const tol = tolerance || 38;
    const c = platno(zdroj.width, zdroj.height);
    const x = c.getContext('2d', {willReadFrequently: true});
    x.drawImage(zdroj, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height);
    const px = d.data, W = c.width, H = c.height;
    const rohy = [0, W - 1, (H - 1) * W, H * W - 1].map((i) => [px[i * 4], px[i * 4 + 1], px[i * 4 + 2]]);
    const ref = [0, 1, 2].map((k) => rohy.reduce((s, r) => s + r[k], 0) / 4);
    const navstiveno = new Uint8Array(W * H);
    const fronta = new Int32Array(W * H);
    let a = 0, b = 0;
    const podobne = (i) => px[i * 4 + 3] > 0 && Math.max(Math.abs(px[i * 4] - ref[0]), Math.abs(px[i * 4 + 1] - ref[1]), Math.abs(px[i * 4 + 2] - ref[2])) <= tol;
    const pridej = (i) => { if (!navstiveno[i] && podobne(i)) { navstiveno[i] = 1; fronta[b++] = i; } };
    for (let xx = 0; xx < W; xx++) { pridej(xx); pridej((H - 1) * W + xx); }
    for (let yy = 0; yy < H; yy++) { pridej(yy * W); pridej(yy * W + W - 1); }
    while (a < b) {
      const i = fronta[a++], xx = i % W;
      if (xx > 0) pridej(i - 1);
      if (xx < W - 1) pridej(i + 1);
      if (i >= W) pridej(i - W);
      if (i < W * (H - 1)) pridej(i + W);
    }
    for (let i = 0; i < W * H; i++) {
      if (navstiveno[i]) px[i * 4 + 3] = 0;
      else if ((i % W > 0 && navstiveno[i - 1]) || (i % W < W - 1 && navstiveno[i + 1]) || (i >= W && navstiveno[i - W]) || (i < W * (H - 1) && navstiveno[i + W])) px[i * 4 + 3] = Math.round(px[i * 4 + 3] * 0.5);
    }
    x.putImageData(d, 0, 0);
    return c;
  }

  /* Scéna: plátno s produktem a vrstvami. */
  class Scena {
    constructor(canvas, nastaveni) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.n = Object.assign({interaktivni: false, okraj: 0.06, priZmene: null, priVyberu: null}, nastaveni || {});
      this.data = null;
      this.barva = '#ffffff';
      this.vrstvy = [];
      this.vybrana = null;
      this.ukazOblast = false;
      this.latka = null;
      this.akce = null;
      this.voditko = false;
      this._rozmer();
      if ('ResizeObserver' in window) new ResizeObserver(() => { this._rozmer(); this.vykresli(); }).observe(canvas);
      if (this.n.interaktivni) this._ovladani();
    }

    nastav(data, barva) {
      if (data) { this.data = data; this.latka = null; }
      if (barva && barva !== this.barva) { this.barva = barva; this.latka = null; }
      this.vrstvy.forEach((v) => this.omez(v));
      this.vykresli();
    }

    _rozmer() {
      const r = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
      if (w && h && (w !== this.canvas.width || h !== this.canvas.height)) {
        this.canvas.width = w;
        this.canvas.height = h;
        this.latka = null;
      }
      this.dpr = dpr;
    }

    /* Rozložení: produkt vepsaný do plátna, oblast potisku v px plátna. */
    rozlozeni(W, H) {
      const d = this.data;
      const k = Math.min(W * (1 - this.n.okraj * 2) / d.sirka, H * (1 - this.n.okraj * 2) / d.vyska);
      const g = {w: d.sirka * k, h: d.vyska * k};
      g.x = (W - g.w) / 2;
      g.y = (H - g.h) / 2;
      const o = d.oblast;
      const a = {x: g.x + o.x * g.w, y: g.y + o.y * g.h, w: o.w * g.w, h: o.h * g.h};
      return {g, a};
    }

    obdelnik(v, a) {
      const w = v.s * a.w, h = w * v.pomer;
      return {x: a.x + v.u * a.w - w / 2, y: a.y + v.v * a.h - h / 2, w, h};
    }

    /* Vrstva musí zůstat celá v oblasti potisku. */
    omez(v) {
      if (!this.data) return;
      const o = this.data.oblast;
      const pomerOblasti = (o.h * this.data.vyska) / (o.w * this.data.sirka);
      v.s = Math.max(0.05, Math.min(v.s, 1, pomerOblasti / v.pomer));
      const hv = (v.s * v.pomer) / pomerOblasti;
      v.u = Math.min(Math.max(v.u, v.s / 2), 1 - v.s / 2);
      v.v = Math.min(Math.max(v.v, hv / 2), 1 - hv / 2);
    }

    /* Skutečný rozměr potisku (měřítko px/cm je v oblasti v obou směrech stejné). */
    rozmerCm(v) {
      const w = v.s * this.data.oblast.sirkaCm;
      return {w, h: w * v.pomer};
    }

    _latka(g) {
      const w = Math.round(g.w), h = Math.round(g.h);
      if (this.latka && this.latka.width === w && this.latka.height === h) return this.latka;
      const c = platno(w, h);
      const x = c.getContext('2d');
      const d = this.data;
      x.fillStyle = this.barva;
      x.fillRect(0, 0, w, h);
      x.globalCompositeOperation = 'multiply';
      x.drawImage(d.podklad, 0, 0, w, h);
      // na tmavých barvách by linky zmizely: zesvětlit je
      const zesvetleni = Math.max(0, Math.min(1, (0.3 - svetlost(this.barva)) / 0.3)) * 0.42;
      if (zesvetleni > 0) {
        x.globalCompositeOperation = 'source-over';
        x.globalAlpha = zesvetleni;
        x.drawImage(d.linky, 0, 0, w, h);
        x.globalAlpha = 1;
      }
      x.globalCompositeOperation = 'destination-in';
      x.drawImage(d.podklad, 0, 0, w, h);
      this.latka = c;
      return c;
    }

    /* Potisk se stínováním látky (záhyby na fotkách), mimo oblast nic. */
    _tisk(W, H, g, a) {
      if (!this.vrstvy.length) return null;
      const t = platno(W, H);
      const x = t.getContext('2d');
      x.save();
      x.beginPath();
      x.rect(a.x, a.y, a.w, a.h);
      x.clip();
      x.imageSmoothingQuality = 'high';
      for (const v of this.vrstvy) {
        const r = this.obdelnik(v, a);
        x.drawImage(v.zdroj, r.x, r.y, r.w, r.h);
      }
      x.restore();
      const s = platno(W, H);
      const y = s.getContext('2d');
      y.drawImage(t, 0, 0);
      y.globalCompositeOperation = 'multiply';
      y.drawImage(this.data.podklad, g.x, g.y, g.w, g.h);
      y.globalCompositeOperation = 'destination-in';
      y.drawImage(t, 0, 0);
      return s;
    }

    vykresli() {
      const c = this.canvas, x = this.ctx;
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.clearRect(0, 0, c.width, c.height);
      if (!this.data || !c.width) return;
      const {g, a} = this.rozlozeni(c.width, c.height);
      x.drawImage(this._latka(g), g.x, g.y, g.w, g.h);
      const t = this._tisk(c.width, c.height, g, a);
      if (t) x.drawImage(t, 0, 0);
      if (!this.n.interaktivni) return;
      const d = this.dpr;
      const tmava = svetlost(this.barva) < 0.35;
      const barvaCar = tmava ? 'rgba(255,255,255,0.75)' : 'rgba(22,22,22,0.55)';
      if (this.ukazOblast || this.akce || !this.vrstvy.length) {
        x.save();
        x.setLineDash([6 * d, 5 * d]);
        x.lineWidth = 1 * d;
        x.strokeStyle = barvaCar;
        x.strokeRect(a.x + 0.5, a.y + 0.5, a.w - 1, a.h - 1);
        x.restore();
      }
      if (this.voditko) {
        x.save();
        x.strokeStyle = tmava ? 'rgba(255,255,255,0.6)' : 'rgba(22,22,22,0.35)';
        x.lineWidth = 1 * d;
        x.beginPath();
        x.moveTo(a.x + a.w / 2, a.y);
        x.lineTo(a.x + a.w / 2, a.y + a.h);
        x.stroke();
        x.restore();
      }
      const v = this.vrstvy.find((q) => q.id === this.vybrana);
      if (v) {
        const r = this.obdelnik(v, a);
        x.save();
        x.lineWidth = 1.5 * d;
        x.strokeStyle = tmava ? '#ffffff' : '#161616';
        x.strokeRect(r.x, r.y, r.w, r.h);
        const u = this._uchyt(r);
        x.fillStyle = '#ffffff';
        x.strokeStyle = '#161616';
        x.beginPath();
        x.arc(u.x, u.y, 7 * d, 0, Math.PI * 2);
        x.fill();
        x.stroke();
        x.restore();
      }
    }

    _uchyt(r) { return {x: r.x + r.w, y: r.y + r.h}; }

    _bod(e) {
      const r = this.canvas.getBoundingClientRect();
      return {x: (e.clientX - r.left) * this.dpr, y: (e.clientY - r.top) * this.dpr};
    }

    _ovladani() {
      const c = this.canvas;
      c.addEventListener('pointerdown', (e) => {
        if (!this.data) return;
        const p = this._bod(e);
        const {a} = this.rozlozeni(c.width, c.height);
        const vyb = this.vrstvy.find((q) => q.id === this.vybrana);
        if (vyb) {
          const u = this._uchyt(this.obdelnik(vyb, a));
          if (Math.hypot(p.x - u.x, p.y - u.y) < 16 * this.dpr) {
            this.akce = {druh: 'velikost', v: vyb, a, start: p, s0: vyb.s};
          }
        }
        if (!this.akce) {
          const hit = this.vrstvy.slice().reverse().find((q) => {
            const r = this.obdelnik(q, a);
            return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
          });
          if (hit) {
            this.vyber(hit.id);
            this.akce = {druh: 'posun', v: hit, a, start: p, u0: hit.u, v0: hit.v};
          } else {
            this.vyber(null);
          }
        }
        if (this.akce) {
          c.setPointerCapture(e.pointerId);
          e.preventDefault();
          this.vykresli();
        }
      });
      c.addEventListener('pointermove', (e) => {
        const p = this._bod(e);
        if (!this.akce) {
          if (!this.data) return;
          const {a} = this.rozlozeni(c.width, c.height);
          const vyb = this.vrstvy.find((q) => q.id === this.vybrana);
          let kurzor = '';
          if (vyb) {
            const u = this._uchyt(this.obdelnik(vyb, a));
            if (Math.hypot(p.x - u.x, p.y - u.y) < 16 * this.dpr) kurzor = 'nwse-resize';
          }
          if (!kurzor && this.vrstvy.some((q) => { const r = this.obdelnik(q, a); return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; })) kurzor = 'move';
          c.style.cursor = kurzor;
          return;
        }
        const ak = this.akce, v = ak.v, a = ak.a;
        if (ak.druh === 'posun') {
          v.u = ak.u0 + (p.x - ak.start.x) / a.w;
          v.v = ak.v0 + (p.y - ak.start.y) / a.h;
          this.voditko = Math.abs(v.u - 0.5) < 0.02;
          if (this.voditko) v.u = 0.5;
        } else {
          const r0 = {w: ak.s0 * a.w};
          const novaSirka = r0.w + (p.x - ak.start.x) * 2;
          v.s = novaSirka / a.w;
        }
        this.omez(v);
        this.vykresli();
        if (this.n.priZmene) this.n.priZmene(v);
      });
      const konec = () => {
        if (!this.akce) return;
        this.akce = null;
        this.voditko = false;
        this.vykresli();
        if (this.n.priZmene) this.n.priZmene(null);
      };
      c.addEventListener('pointerup', konec);
      c.addEventListener('pointercancel', konec);
      c.addEventListener('keydown', (e) => {
        const v = this.vrstvy.find((q) => q.id === this.vybrana);
        if (!v) return;
        const krok = e.shiftKey ? 0.05 : 0.01;
        const posun = {ArrowLeft: [-krok, 0], ArrowRight: [krok, 0], ArrowUp: [0, -krok], ArrowDown: [0, krok]}[e.key];
        if (posun) {
          v.u += posun[0];
          v.v += posun[1];
          this.omez(v);
          this.vykresli();
          if (this.n.priZmene) this.n.priZmene(v);
          e.preventDefault();
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          this.odeber(v.id);
          e.preventDefault();
        }
      });
    }

    pridej(v) {
      this.vrstvy.push(v);
      this.omez(v);
      this.vyber(v.id);
      this.vykresli();
    }

    odeber(id) {
      const i = this.vrstvy.findIndex((q) => q.id === id);
      if (i >= 0) this.vrstvy.splice(i, 1); // stejné pole, na které odkazuje konfigurátor
      if (this.vybrana === id) this.vyber(null);
      this.vykresli();
      if (this.n.priZmene) this.n.priZmene(null);
    }

    vyber(id) {
      this.vybrana = id;
      if (this.n.priVyberu) this.n.priVyberu(id);
    }

    /* Obrázek pro košík a poptávku (bez vodítek) na světlém pozadí. */
    export(sirka, pozadi) {
      if (!this.data) return null;
      const H = Math.round(sirka * 1.0);
      const c = platno(sirka, H);
      const x = c.getContext('2d');
      x.fillStyle = pozadi || '#e4e5e7';
      x.fillRect(0, 0, sirka, H);
      const puvodni = this.latka;
      this.latka = null;
      const {g, a} = this.rozlozeni(sirka, H);
      x.drawImage(this._latka(g), g.x, g.y, g.w, g.h);
      const t = this._tisk(sirka, H, g, a);
      if (t) x.drawImage(t, 0, 0);
      this.latka = puvodni;
      try { return c.toDataURL('image/jpeg', 0.86); } catch (e) { return null; } // otevřeno ze složky (file://)
    }
  }

  window.Potisk = {Scena, nactiPohled, nactiObrazek, novaVrstva, vykresliNapis, odstranPozadi, PISMA, svetlost};
})();
