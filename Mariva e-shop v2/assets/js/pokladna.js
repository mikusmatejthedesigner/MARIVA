/* Pokladna: kontakt, doručení, platba (dobírka jen při zaslání, hotově jen při odběru), souhrn, odeslání. */
(function () {
  'use strict';
  const M = window.Mariva;
  const f = document.querySelector('[data-objednavka]');
  const $ = (s) => document.querySelector(s);

  function souhrn() {
    const pol = M.kosik.polozky();
    if (!pol.length) {
      document.querySelector('[data-pokladna]').innerHTML = `
        <div class="box" style="grid-column:1/-1;text-align:center;padding:48px 20px">
          <h1 style="margin-bottom:12px">Košík je prázdný</h1>
          <p class="tlumene" style="margin-bottom:20px">Navrhněte si tričko a vraťte se sem.</p>
          <a class="tl tl--magenta tl--velke" href="konfigurator.html">Navrhnout tričko</a>
        </div>`;
      return false;
    }
    $('[data-souhrn]').innerHTML = pol.map((p) => M.polozkaHtml(p, false)).join('');
    $('[data-mezisoucet]').textContent = M.kc(M.kosik.celkem());
    $('[data-celkem]').textContent = M.kc(M.kosik.celkem()) + (f && f.doruceni.value !== 'Osobní odběr ve Všechovicích' ? ' + doprava' : '');
    return true;
  }
  if (!souhrn()) return;
  window.addEventListener('storage', souhrn);
  document.addEventListener('close', souhrn, true); // po úpravě košíku v panelu

  const firma = $('[data-firma]');
  f.querySelector('[data-na-firmu]').addEventListener('change', (e) => {
    firma.hidden = !e.target.checked;
    f.organizace.required = e.target.checked;
    f.ico.required = e.target.checked;
  });

  function doruceni() {
    const zaslani = f.doruceni.value === 'Zaslání na adresu';
    $('[data-adresa]').hidden = !zaslani;
    ['ulice', 'mesto', 'psc'].forEach((n) => { f[n].required = zaslani; });
    const hotove = f.querySelector('[name="platba"][value="Hotově při odběru"]');
    const dobirka = f.querySelector('[name="platba"][value="Dobírkou"]');
    hotove.disabled = zaslani;
    dobirka.disabled = !zaslani;
    if (f.platba.value === '' || (zaslani && hotove.checked) || (!zaslani && dobirka.checked)) {
      (zaslani ? dobirka : hotove).checked = true;
    }
    $('[data-doprava]').textContent = zaslani ? 'potvrdíme' : 'zdarma';
    souhrn();
  }
  f.querySelectorAll('[name="doruceni"]').forEach((r) => r.addEventListener('change', doruceni));
  doruceni();

  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!M.overit(f)) return;
    const tl = f.querySelector('[data-odeslat]');
    tl.disabled = true;
    tl.textContent = 'Odesílám objednávku…';
    try {
      const h = M.hodnoty(f);
      const pol = M.kosik.polozky();
      const data = {
        email: h.email, jmeno: h.jmeno, telefon: h.telefon, organizace: h.organizace || '', ico: h.ico || '', dic: h.dic || '',
        doruceni: h.doruceni, adresa: h.doruceni === 'Zaslání na adresu' ? `${h.ulice}, ${h.psc} ${h.mesto}` : '',
        platba: h.platba, termin: h.termin || '', poznamka: h.poznamka || '',
        polozky: pol.map(M.popisPolozky).join('\n'), celkem: M.kc(M.kosik.celkem()),
      };
      const prilohy = [];
      for (const p of pol) {
        for (const v of p.potisk) {
          if (!v.soubor) continue;
          const b = await M.soubory.nacti(v.soubor.id);
          if (b) prilohy.push(new File([b], v.soubor.nazev, {type: b.type}));
        }
        const n = M.dataUrlNaSoubor(p.nahled, `nahled-${p.id}.jpg`);
        if (n) prilohy.push(n);
      }
      const r = await M.odeslat('objednavka', data, prilohy);
      try {
        sessionStorage.setItem('mariva-objednavka', JSON.stringify({
          jmeno: h.jmeno.split(' ')[0], email: h.email, doruceni: h.doruceni, platba: h.platba, celkem: data.celkem,
          polozky: pol.map((p) => ({nazev: p.nazev, typ: p.typ, barva: p.barva, velikost: p.velikost, ks: p.ks, nahled: p.nahled})),
          zkusebni: r.zkusebni, datum: Date.now(),
        }));
      } catch (er) { /* bez souhrnu na poděkování */ }
      M.kosik.vyprazdni();
      location.href = 'dekujeme.html';
    } catch (err) {
      tl.disabled = false;
      tl.textContent = 'Odeslat objednávku';
      M.ukazChybu(f, 'Objednávku se nepodařilo odeslat. Zkuste to prosím znovu, nebo nám zavolejte na 581 622 009.');
    }
  });
})();
