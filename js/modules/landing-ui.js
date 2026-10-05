import { PRIVACY_URL } from '../config.js';

/**
 * Enlaza la política de privacidad. Mientras `PRIVACY_URL` esté vacío no hay
 * a dónde apuntar, así que el enlace se degrada a texto plano en vez de dejar
 * un `href` roto.
 */
export function aplicarPoliticaDePrivacidad() {
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

export function irAlFormulario(formId) {
  const form = document.getElementById(formId);
  if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
