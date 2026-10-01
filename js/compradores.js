import { initReveal } from './modules/reveal.js';
import { initStickyCta } from './modules/sticky-cta.js';
import { initFaq } from './modules/faq.js';
import { initLeadFlow } from './modules/lead-flow.js';
import { capturarAtribucion } from './modules/attribution.js';
import { track, pushDataLayer, trackMeta } from './modules/tracking.js';
import { COMPRADORES_FORM, PRIVACY_URL, TIPOLOGIA_LABELS } from './config.js';

function aplicarPoliticaDePrivacidad() {
  document.querySelectorAll('[data-privacy-link]').forEach((enlace) => {
    if (PRIVACY_URL) {
      enlace.href = PRIVACY_URL;
      enlace.target = '_blank';
      enlace.rel = 'noopener';
      return;
    }

    const texto = document.createElement('span');
    texto.className = enlace.className;
    texto.textContent = enlace.textContent;
    enlace.replaceWith(texto);
  });
}

function irAlFormulario() {
  const form = document.getElementById(COMPRADORES_FORM.formId);
  if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function initInteracciones(flujo) {
  document.addEventListener('click', (event) => {
    const tipologia = event.target.closest('[data-tipologia-cta]');
    if (tipologia) {
      const valor = tipologia.dataset.tipologiaCta;
      if (flujo) flujo.preseleccionar('tipologia', valor);
      trackMeta('ViewContent', { content_name: TIPOLOGIA_LABELS[valor] || valor, segmento: 'comprador' });
      track('tipologia_cta_click', { tipologia: valor });
      irAlFormulario();
      return;
    }

    const scroll = event.target.closest('[data-scroll-form]');
    if (scroll) {
      event.preventDefault();
      track('cta_form_click', { location: scroll.dataset.trackLabel || '' });
      irAlFormulario();
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
