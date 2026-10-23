/* Detail produktu: výběr varianty (cena, dostupnost, obrázek, adresa ?variant=), počet a přidání do košíku přes AJAX. */
(function () {
  'use strict';
  const M = window.Mariva;
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-media]');
    if (!b) return;
    const img = document.querySelector('[data-galerie-hlavni]');
    if (img) { img.removeAttribute('srcset'); img.src = b.dataset.velky; }
    document.querySelectorAll('[data-media]').forEach((x) => x.setAttribute('aria-current', String(x === b)));
  });

  const f = document.querySelector('[data-produkt-form]');
  if (!f) return;
  const varianty = JSON.parse(document.querySelector('[data-varianty]').textContent);
  const vstup = f.querySelector('[data-varianta]');
  const tl = f.querySelector('[data-pridat]');
  const chyba = f.querySelector('[data-chyba]');
  const ks = f.querySelector('[name="quantity"]');
  const textTl = tl.textContent;

  function zmena() {
    const vybrane = [...f.querySelectorAll('[data-moznost]:checked')].map((r) => r.value);
    f.querySelectorAll('fieldset').forEach((fs) => {
      const r = fs.querySelector('[data-moznost]:checked');
      const h = fs.querySelector('[data-moznost-hodnota]');
      if (r && h) h.textContent = r.value;
    });
    const v = varianty.find((x) => x.options.every((o, i) => o === vybrane[i]));
    tl.disabled = !v || !v.available;
    tl.textContent = !v ? 'Tahle kombinace není k dispozici' : v.available ? textTl : 'Vyprodáno';
    if (!v) return;
    vstup.value = v.id;
    const c = document.querySelector('.detail__cena [data-cena]');
    if (c) c.textContent = M.cena(v.price);
    const p = document.querySelector('.detail__cena [data-cena-puvodni]');
    if (p) p.hidden = !(v.compare_at_price > v.price);
    const u = new URL(location.href);
    u.searchParams.set('variant', v.id);
    history.replaceState(null, '', u);
    if (v.featured_media) {
      const b = document.querySelector(`[data-media="${v.featured_media.id}"]`);
      if (b) b.click();
    }
  }
  f.addEventListener('change', (e) => { if (e.target.matches('[data-moznost]')) zmena(); });
  f.querySelectorAll('[data-krok]').forEach((b) => b.addEventListener('click', () => {
    ks.value = Math.max(1, Math.min(999, (parseInt(ks.value, 10) || 1) + +b.dataset.krok));
  }));
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    chyba.hidden = true;
    tl.disabled = true;
    try {
      await M.kosik.pridat([{id: +vstup.value, quantity: Math.max(1, parseInt(ks.value, 10) || 1)}]);
      M.kosik.poPridani();
    } catch (err) {
      chyba.textContent = err.message;
      chyba.hidden = false;
    }
    tl.disabled = false;
  });

})();
