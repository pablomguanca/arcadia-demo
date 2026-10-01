/**
 * Aparición de secciones al scrollear y dibujado de la trayectoria del
 * "salto de la rana".
 *
 * El estado inicial (oculto) lo habilita la clase `js-reveal` que el propio HTML
 * pone en <html> antes de pintar: si este módulo no llega a correr, nada queda
 * escondido. Todo el trabajo lo hace IntersectionObserver, así que no hay
 * listeners de scroll compitiendo con el hilo principal.
 */

const REVEAL_OPTIONS = { rootMargin: '0px 0px -12% 0px', threshold: 0.12 };

function showAll(items) {
  items.forEach((el) => el.classList.add('is-visible'));
}

export function initReveal() {
  const items = Array.from(document.querySelectorAll('[data-reveal]'));
  const track = document.querySelector('[data-timeline]');

  if (!('IntersectionObserver' in window)) {
    showAll(items);
    if (track) track.classList.add('is-drawn');
    return;
  }

  if (items.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, REVEAL_OPTIONS);

    items.forEach((el) => observer.observe(el));
  }

  // La línea se dibuja con su propia observación: arranca cuando la sección ya
  // está bien entrada en pantalla, no apenas asoma.
  if (track) {
    const drawObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-drawn');
        drawObserver.unobserve(entry.target);
      });
    }, { threshold: 0.25 });

    drawObserver.observe(track);
  }
}
