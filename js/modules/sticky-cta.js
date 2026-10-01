/**
 * Barra fija de CTA en mobile.
 *
 * Aparece recién cuando el hero salió de pantalla —antes es ruido, el CTA del
 * hero todavía está a la vista— y se esconde cuando la sección de destino entra
 * en viewport, para no taparla justo en el momento de completarla.
 *
 * Los selectores entran por parámetro porque cada landing tiene su hero y su
 * destino; los valores por defecto son los de /inversores.
 */

export function initStickyCta({ hero: heroSelector = '.inv-hero', target: targetSelector = '#analizar' } = {}) {
  const bar = document.querySelector('[data-sticky-cta]');
  const hero = document.querySelector(heroSelector);
  // Cuando el destino vive dentro del propio hero —como el formulario de
  // /compradores— no hay segundo observador: alcanza con el del hero.
  const target = targetSelector ? document.querySelector(targetSelector) : null;

  if (!bar || !hero || !('IntersectionObserver' in window)) return;

  let heroVisible = true;
  let targetVisible = false;

  const sync = () => {
    bar.dataset.visible = String(!heroVisible && !targetVisible);
  };

  const heroObserver = new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    sync();
  }, { threshold: 0 });

  heroObserver.observe(hero);

  if (target) {
    const targetObserver = new IntersectionObserver(([entry]) => {
      targetVisible = entry.isIntersecting;
      sync();
    }, { threshold: 0 });

    targetObserver.observe(target);
  }
}
