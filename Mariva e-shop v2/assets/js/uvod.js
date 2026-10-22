/* Úvodní stránka: tričko s nápisem, který zákazník právě píše (vlastní návrh hned na první obrazovce),
   produkty ze sortimentu, sezónní nabídka a rozpracovaný návrh. */
(function () {
  'use strict';
  const M = window.Mariva;
  const tricko = M.K.tricko;

  /* ---------- tričko v úvodu ---------- */
  const platno = document.querySelector('#uvod-tricko');
  const form = document.querySelector('[data-uvod-navrh]');
  const vstup = form && form.napis;
  const volby = document.querySelector('[data-uvod-barvy]');
  const VYCHOZI = 'MATURANTI 2027';
  if (tricko && platno && window.Potisk) {
    const scena = new Potisk.Scena(platno, {okraj: 0.03});
    const barvy = ['bila', 'zluta', 'cerna', 'namornicka', 'kralovska'].map((id) => tricko.barvy.find((b) => b.id === id)).filter(Boolean);
    let barva = barvy[0];
    let napis = null;
    let cekani = 0;

    const text = () => (vstup.value.trim() || VYCHOZI).toUpperCase();
    async function prekresli() {
      const tmava = Potisk.svetlost(barva.hex) < 0.35;
      const t = text();
      const zdroj = await Potisk.vykresliNapis({text: t.length > 9 && t.indexOf(' ') > 0 ? t.replace(/ (?=\S+$)/, '\n') : t, pismo: 'bezpatkove', tucne: true, barva: tmava ? '#FFFFFF' : '#1B1424'});
      if (!napis) {
        napis = Potisk.novaVrstva('text', zdroj, {u: 0.5, v: 0.24, s: 0.92});
        scena.vrstvy.push(napis);
      } else {
        napis.zdroj = zdroj;
        napis.pomer = zdroj.height / zdroj.width;
        napis.s = 0.92;
      }
      scena.nastav(null, barva.hex);
    }

    volby.insertAdjacentHTML('beforeend', barvy.map((b, i) => `
      <label class="barva" title="${b.nazev}">
        <input type="radio" name="uvod-barva" value="${b.id}"${i === 0 ? ' checked' : ''}>
        <span style="--b:${b.hex}"></span><span class="skryte">${b.nazev}</span>
      </label>`).join(''));
    volby.addEventListener('change', (e) => { barva = barvy.find((b) => b.id === e.target.value); prekresli(); });
    vstup.addEventListener('input', () => { clearTimeout(cekani); cekani = setTimeout(prekresli, 60); });
    form.querySelectorAll('[data-tip]').forEach((b) => b.addEventListener('click', () => { vstup.value = b.dataset.tip; prekresli(); vstup.focus(); }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      location.href = `konfigurator.html?napis=${encodeURIComponent(text())}&barva=${barva.id}`;
    });

    Promise.all([
      Potisk.nactiPohled(tricko, tricko.typy[0].id, tricko.pohledy[0].id, ''),
      document.fonts.load('800 40px "Archivo"', 'MATURANTI ŘŽÁ').catch(() => null),
    ]).then(async ([data]) => {
      scena.nastav(data, barva.hex);
      await prekresli();
    });
  }

  /* ---------- produkty ---------- */
  document.querySelectorAll('[data-produkty]').forEach((ul) => {
    const ids = ul.dataset.produkty.split(',');
    ul.innerHTML = ids.map(M.produkt).filter(Boolean).map(M.karta).join('');
  });
  M.vykresliRendery();

  /* ---------- sezóna ---------- */
  const s = M.sezona();
  const set = (sel, fn) => { const el = document.querySelector(sel); if (el) fn(el); };
  set('[data-sezona-nadpis]', (el) => { el.textContent = s.nadpis; });
  set('[data-sezona-text]', (el) => { el.textContent = s.text; });
  set('[data-sezona-polozky]', (el) => { el.innerHTML = s.polozky.map((p) => `<li>${M.esc(p)}</li>`).join(''); });
  set('[data-sezona-obrazky]', (el) => { el.innerHTML = s.obrazky.map((o) => `<img src="assets/img/produkty/${o}.svg" alt="">`).join(''); });
  set('[data-sezona-poptat]', (el) => { el.dataset.poptat = s.produkt; });
  set('[data-sezona-odkaz]', (el) => {
    el.href = `produkty.html?pro=${s.pro}`;
    const sk = M.S.skupiny.find((x) => x.id === s.pro);
    if (sk) el.textContent = `Vše pro ${sk.kratce === 'Maturanti' ? 'maturanty' : sk.nazev.toLowerCase()}`;
  });

  /* ---------- rozpracovaný návrh ---------- */
  const navrh = M.navrhy.seznam()[0];
  const pruh = document.querySelector('[data-moje-navrhy]');
  if (navrh && pruh) {
    pruh.innerHTML = `
      ${navrh.nahled ? `<img src="${navrh.nahled}" alt="">` : ''}
      <div><strong>Váš uložený návrh čeká</strong><span class="tlumene">${M.esc(navrh.nazev)}</span></div>
      <a class="tl tl--magenta tl--male" href="konfigurator.html?navrh=${navrh.id}">Pokračovat</a>`;
    pruh.hidden = false;
  }
})();
