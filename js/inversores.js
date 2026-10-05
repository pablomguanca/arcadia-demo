/**
 * Entrada de la landing de inversores (/inversores).
 *
 * Bundle propio: no comparte nada con js/main.js. La landing no tiene menú,
 * carrusel ni galería, y cargar todo eso es plata tirada en tráfico pago.
 */

import { initReveal } from './modules/reveal.js';
import { initStickyCta } from './modules/sticky-cta.js';
import { initFaq } from './modules/faq.js';
import { initLeadFlow } from './modules/lead-flow.js';
import { capturarAtribucion } from './modules/attribution.js';
import { aplicarPoliticaDePrivacidad, irAlFormulario } from './modules/landing-ui.js';
import { track, pushDataLayer, trackMeta } from './modules/tracking.js';
import { INVERSORES_FORM, DOSSIER_URL } from './config.js';

/** Sin URL cargada el botón del dossier no existe; con URL, apunta a ella. */
function aplicarDossier() {
  document.querySelectorAll('[data-dossier]').forEach((enlace) => {
    if (!DOSSIER_URL) {
      enlace.remove();
      return;
    }

    enlace.href = DOSSIER_URL;
  });
}

function initInteracciones(flujo) {
  document.addEventListener('click', (event) => {
    const horizonte = event.target.closest('[data-horizonte]');
    if (horizonte) {
      const valor = horizonte.dataset.horizonte;
      if (flujo) flujo.preseleccionar('horizonte', valor);
      trackMeta('ViewContent', { segmento: INVERSORES_FORM.segmento, horizonte: valor });
      track('horizonte_cta_click', { horizonte: valor });
      irAlFormulario(INVERSORES_FORM.formId);
      return;
    }

    const scroll = event.target.closest('[data-scroll-form]');
    if (scroll) {
      event.preventDefault();
      track('cta_form_click', { location: scroll.dataset.trackLabel || '' });
      irAlFormulario(INVERSORES_FORM.formId);
      return;
    }

    const whatsapp = event.target.closest('[data-whatsapp]');
    if (whatsapp) {
      const location = whatsapp.dataset.trackLabel || '';
      trackMeta('ContactWhatsApp', { location, segmento: INVERSORES_FORM.segmento });
      track('contact_whatsapp', { location });
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  capturarAtribucion();
  aplicarPoliticaDePrivacidad();
  aplicarDossier();
  initReveal();
  initStickyCta({ hero: '.cmp-hero', target: '' });
  initFaq();

  const flujo = initLeadFlow(INVERSORES_FORM);
  initInteracciones(flujo);

  pushDataLayer('page_view', { landing: 'inversores' });
  track('landing_view', { landing: 'inversores' });
});
