/* Úvod: nápis, který zákazník právě píše, se hned kreslí na tričko. Barvy z nastavení sekce (názvy z Nastavení motivu > Konfigurátor). */
(function () {
  'use strict';
  const M = window.Mariva;
  document.querySelectorAll('[data-uvod]').forEach((sekce) => {
    const platno = sekce.querySelector('[data-uvod-platno]');
    const form = sekce.querySelector('[data-uvod-navrh]');
    const volby = sekce.querySelector('[data-uvod-barvy]');
    const profil = (window.MARIVA_PROFILY || {})[platno.dataset.profil] || Object.values(window.MARIVA_PROFILY || {})[0];
    if (!profil || !window.Potisk || !form) return;
    const vstup = form.napis;
    const VYCHOZI = platno.dataset.vychozi || 'MATURANTI 2027';
    const barvy = String(volby.dataset.barvy || 'Bílá').split(',').map((n) => n.trim()).filter(Boolean).map((n) => ({nazev: n, hex: M.barvaHex(n)}));
    let barva = barvy[0];
    let napis = null;
    let cekani = 0;
    const scena = new Potisk.Scena(platno, {okraj: 0.03});
    const text = () => (vstup.value.trim() || VYCHOZI).toUpperCase();

    async function prekresli() {
      const t = text();
      const zdroj = await Potisk.vykresliNapis({text: t.length > 9 && t.indexOf(' ') > 0 ? t.replace(/ (?=\S+$)/, '\n') : t, pismo: 'bezpatkove', tucne: true, barva: Potisk.svetlost(barva.hex) < 0.35 ? '#FFFFFF' : '#1B1424'});
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
      <label class="barva" title="${M.esc(b.nazev)}">
        <input type="radio" name="barva" value="${M.esc(b.nazev)}"${i === 0 ? ' checked' : ''}>
        <span style="--b:${b.hex}"></span><span class="skryte">${M.esc(b.nazev)}</span>
      </label>`).join(''));
    volby.addEventListener('change', (e) => { barva = barvy.find((b) => b.nazev === e.target.value) || barva; prekresli(); });
    vstup.addEventListener('input', () => { clearTimeout(cekani); cekani = setTimeout(prekresli, 60); });
    form.querySelectorAll('[data-tip]').forEach((b) => b.addEventListener('click', () => { vstup.value = b.dataset.tip; prekresli(); vstup.focus(); }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = new URL(form.action, location.href);
      u.searchParams.set('napis', text());
      u.searchParams.set('barva', barva.nazev);
      location.href = u.toString();
    });

    Promise.all([
      Potisk.nactiPohled(profil, profil.typy[0].id, profil.pohledy[0].id, ''),
      document.fonts.load('800 40px "Archivo"', 'MATURANTI ŘŽÁ').catch(() => null),
    ]).then(async ([data]) => {
      scena.nastav(data, barva.hex);
      await prekresli();
    }).catch(() => {});
  });
})();
