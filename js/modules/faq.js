export function initFaq() {
  const items = Array.from(document.querySelectorAll('[data-faq-item]'));
  if (!items.length) return;

  items.forEach((item) => {
    const boton = item.querySelector('[data-faq-toggle]');
    const panel = item.querySelector('[data-faq-panel]');
    if (!boton || !panel) return;

    boton.setAttribute('aria-expanded', 'false');
    panel.hidden = true;

    boton.addEventListener('click', () => {
      const abierto = boton.getAttribute('aria-expanded') === 'true';
      boton.setAttribute('aria-expanded', String(!abierto));
      panel.hidden = abierto;
    });
  });
}
