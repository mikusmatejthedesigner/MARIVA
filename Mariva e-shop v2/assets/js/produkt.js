/* Detail produktu (produkt.html?id=…): obrázek, cena, pro koho se hodí, poptávka přímo na stránce, podobné produkty. */
(function () {
  'use strict';
  const M = window.Mariva;
  const id = new URLSearchParams(location.search).get('id');
  const p = M.produkt(id);
  if (!p) { location.replace('produkty.html'); return; }
  if (p.odkaz) { location.replace(p.odkaz); return; }
  const $ = (s) => document.querySelector(s);

  document.title = `${p.nazev} | Tiskárna MARIVA`;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.content = `${p.nazev}: ${p.perex} Nezávazná poptávka, hotovo do 3 až 5 týdnů.`;
  $('[data-drobek]').textContent = p.nazev;
  $('[data-nazev]').textContent = p.nazev;
  $('[data-perex]').textContent = p.perex;
  $('[data-popis]').textContent = p.popis || p.perex;
  $('[data-stitek]').outerHTML = p.stitek ? `<span class="stitek stitek--zluta">${M.esc(p.stitek)}</span>` : '';
  const obraz = $('[data-obraz]');
  obraz.classList.add('dlazdice--' + p.pozadi);
  obraz.innerHTML = M.obrazHtml(p);
  $('[data-cena]').innerHTML = p.cena
    ? `<strong>od ${M.kc(p.cena)}</strong><span>za kus s potiskem, vč. DPH</span>`
    : '<strong>Cena na poptávku</strong><span>podle počtu kusů a potisku, nabídku vám pošleme</span>';
  $('[data-hodi-se]').innerHTML = (p.hodiSe || []).map((h) => `<li>${M.esc(h)}</li>`).join('');

  const f = $('[data-poptavka]');
  f.produkt.value = p.kratce;
  f.popis.placeholder = p.kategorie === 'skola' ? 'Škola, třída, rok, text na šerpu, barva…' : 'Text nebo logo, barvy, velikosti, rozpis jmen…';
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!M.overit(f)) return;
    const tl = f.querySelector('[type="submit"]');
    tl.disabled = true;
    tl.textContent = 'Odesílám…';
    try {
      const r = await M.odeslat('poptavka', M.hodnoty(f), [...f.motiv.files]);
      f.outerHTML = `<div class="potvrzeni"><h3>Děkujeme, poptávka je u nás</h3><p>Ozveme se vám s cenou a návrhem na e-mail nebo telefon, který jste uvedli.</p>${r.zkusebni ? '<p class="potvrzeni__zk">Zkušební režim: web neběží na hostingu, nic se neodeslalo.</p>' : ''}</div>`;
    } catch (err) {
      tl.disabled = false;
      tl.textContent = 'Odeslat nezávaznou poptávku';
      M.ukazChybu(f, 'Poptávku se nepodařilo odeslat. Zkuste to prosím znovu, nebo napište na info@tiskarnamariva.cz.');
    }
  });

  const podobne = M.S.produkty
    .filter((q) => q.id !== p.id && q.skupiny.some((s) => p.skupiny.indexOf(s) >= 0))
    .sort((a, b) => (b.id === 'tricko') - (a.id === 'tricko'))
    .slice(0, 4);
  $('[data-podobne]').innerHTML = podobne.map(M.karta).join('');
  M.vykresliRendery();
})();
