/* Katalog: všechny produkty, filtr podle skupiny zákazníků (?pro=maturanti) a kategorie (?kategorie=darky). */
(function () {
  'use strict';
  const M = window.Mariva;
  const S = M.S;
  const parametry = new URLSearchParams(location.search);
  let pro = parametry.get('pro') || '';
  const filtry = document.querySelector('[data-filtry]');
  const seznam = document.querySelector('[data-katalog]');

  function vykresli() {
    const skupina = S.skupiny.find((s) => s.id === pro);
    const kat = parametry.get('kategorie');
    const vybrane = S.produkty.filter((p) => (!pro || p.skupiny.indexOf(pro) >= 0) && (!kat || p.kategorie === kat));
    filtry.innerHTML = `<button type="button" data-pro="" aria-pressed="${!pro}">Vše</button>`
      + S.skupiny.map((s) => `<button type="button" data-pro="${s.id}" aria-pressed="${s.id === pro}">${M.esc(s.kratce)}</button>`).join('')
      + `<span>${vybrane.length} ${vybrane.length === 1 ? 'produkt' : vybrane.length < 5 ? 'produkty' : 'produktů'}</span>`;
    seznam.innerHTML = vybrane.map(M.karta).join('');
    document.querySelector('[data-nadpis]').textContent = skupina ? skupina.nazev : 'Všechny produkty';
    document.querySelector('[data-drobek]').textContent = skupina ? skupina.nazev : 'Produkty';
    document.querySelector('[data-popis]').textContent = skupina ? skupina.popis + ' Tričko si navrhnete hned, u ostatního vám po poptávce pošleme cenu a návrh.' : 'Vyberte, co chcete potisknout. Tričko si navrhnete hned, u ostatního vám po poptávce pošleme cenu a návrh.';
    document.title = (skupina ? skupina.nazev + ': produkty s potiskem' : 'Produkty s potiskem') + ' | Tiskárna MARIVA';
    M.vykresliRendery(seznam);
  }
  filtry.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pro]');
    if (!b) return;
    pro = b.dataset.pro;
    const u = new URL(location.href);
    if (pro) u.searchParams.set('pro', pro); else u.searchParams.delete('pro');
    history.replaceState(null, '', u);
    vykresli();
  });
  vykresli();
})();
