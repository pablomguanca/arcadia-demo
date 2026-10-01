/**
 * Entrada de la landing de inversores (/inversores).
 *
 * Bundle propio: no comparte nada con js/main.js salvo el módulo de reCAPTCHA.
 * La landing no tiene menú, ni carrusel, ni galería, y cargar todo eso para
 * nada es plata tirada en tráfico pago.
 */

import { initReveal } from './modules/reveal.js';
import { initStickyCta } from './modules/sticky-cta.js';
import { initLeadFlow } from './modules/lead-flow.js';
import { track, trackMeta } from './modules/tracking.js';
import { INVERSORES_FORM } from './config.js';

/** Un solo listener delegado para todos los CTA, presentes y futuros. */
function initCtaTracking() {
  document.addEventListener('click', (event) => {
    const cta = event.target.closest('[data-track]');
    if (!cta) return;

    const evento = cta.dataset.track;
    track(evento, { location: cta.dataset.trackLabel || '', link_text: cta.textContent.trim() });

    if (evento === 'cta_investment_click') {
      trackMeta('CTAInversion', { location: cta.dataset.trackLabel || '' }, true);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  initStickyCta();
  initLeadFlow(INVERSORES_FORM);
  initCtaTracking();

  track('landing_view', { landing: 'inversores' });
});
