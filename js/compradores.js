import { initReveal } from './modules/reveal.js';
import { initStickyCta } from './modules/sticky-cta.js';
import { initFaq } from './modules/faq.js';
import { initLeadFlow } from './modules/lead-flow.js';
import { capturarAtribucion } from './modules/attribution.js';
import { track, pushDataLayer, trackMeta } from './modules/tracking.js';
import { aplicarPoliticaDePrivacidad, irAlFormulario } from './modules/landing-ui.js';
import { COMPRADORES_FORM, TIPOLOGIA_LABELS } from './config.js';

function initInteracciones(flujo) {
  document.addEventListener('click', (event) => {
    const tipologia = event.target.closest('[data-tipologia-cta]');
    if (tipologia) {
      const valor = tipologia.dataset.tipologiaCta;
      if (flujo) flujo.preseleccionar('tipologia', valor);
      trackMeta('ViewContent', { content_name: TIPOLOGIA_LABELS[valor] || valor, segmento: 'comprador' });
      track('tipologia_cta_click', { tipologia: valor });
      irAlFormulario(COMPRADORES_FORM.formId);
      return;
    }

    const scroll = event.target.closest('[data-scroll-form]');
    if (scroll) {
      event.preventDefault();
      track('cta_form_click', { location: scroll.dataset.trackLabel || '' });
      irAlFormulario(COMPRADORES_FORM.formId);
      return;
    }

    const whatsapp = event.target.closest('[data-whatsapp]');
    if (whatsapp) {
      trackMeta('ContactWhatsApp', { location: whatsapp.dataset.trackLabel || '' });
      track('contact_whatsapp', { location: whatsapp.dataset.trackLabel || '' });
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  capturarAtribucion();
  aplicarPoliticaDePrivacidad();
  initReveal();
  initStickyCta({ hero: '.cmp-hero', target: '' });
  initFaq();

  const flujo = initLeadFlow(COMPRADORES_FORM);
  initInteracciones(flujo);

  pushDataLayer('page_view', { landing: 'compradores' });
  track('landing_view', { landing: 'compradores' });
});
