import { TOUR_360_URL } from '../config.js';
import { getRecaptchaToken, primeRecaptcha } from './recaptcha.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORAGE_KEY = 'arcadia_tour_360_unlocked';

// Veredictos del envío. Solo RECHAZO le cierra la puerta al visitante: es el
// único caso en que el problema está de su lado y lo puede corregir.
const OK = 'ok';
const RECHAZO = 'rechazo';
const AVERIA = 'averia';

async function enviarLead(email, consentimiento) {
  let token = '';

  try {
    token = await getRecaptchaToken('tour_360');
  } catch (error) {
    // reCAPTCHA no cargó. Mandamos sin token y que decida el backend.
  }

  const response = await fetch('/api/save-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, consentimiento, source: 'vistazo-tour-360', token }),
  });

  if (response.status === 400 || response.status === 403) return RECHAZO;
  if (!response.ok) return AVERIA;

  const data = await response.json().catch(() => ({}));
  if (data.success !== true) return AVERIA;

  // El backend responde 200 con saved:false cuando no pudo guardar el mail pero
  // igual corresponde dejar entrar.
  return data.saved === false ? AVERIA : OK;
}

function unlockTour(form, status, message, { openNow } = {}) {
  form.hidden = true;
  status.textContent = message;

  const link = document.createElement('a');
  link.className = 'btn btn--primary';
  link.href = TOUR_360_URL;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = 'Explorá el tour 360° y el brochure completo';
  status.insertAdjacentElement('afterend', link);

  if (openNow) window.open(TOUR_360_URL, '_blank', 'noopener');
}

export function initTourGate() {
  const form = document.getElementById('tour-gate-form');
  if (!form) return;

  const emailInput = form.querySelector('#tour-email');
  const emailError = form.querySelector('#tour-email-error');
  const consentInput = form.querySelector('#tour-consentimiento');
  const consentError = form.querySelector('#tour-consentimiento-error');
  const status = document.getElementById('tour-gate-status');
  const submitButton = form.querySelector('.form__submit');

  if (localStorage.getItem(STORAGE_KEY) === 'true') {
    unlockTour(form, status, 'Ya verificamos tu email.');
    return;
  }

  primeRecaptcha(form);

  emailInput.addEventListener('blur', () => {
    const value = emailInput.value.trim();
    const valid = !value || EMAIL_PATTERN.test(value);
    emailInput.setAttribute('aria-invalid', valid ? 'false' : 'true');
    emailError.textContent = valid ? '' : 'Ingresá un email válido';
  });

  function validarConsentimiento() {
    if (!consentInput) return true;
    const ok = consentInput.checked;
    consentInput.setAttribute('aria-invalid', ok ? 'false' : 'true');
    consentError.textContent = ok ? '' : 'Necesitamos tu confirmación para enviarte el material';
    return ok;
  }

  if (consentInput) consentInput.addEventListener('change', validarConsentimiento);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const emailOk = Boolean(email) && EMAIL_PATTERN.test(email);
    if (!emailOk) {
      emailInput.setAttribute('aria-invalid', 'true');
      emailError.textContent = 'Ingresá un email válido';
    }

    const consentOk = validarConsentimiento();
    if (!emailOk || !consentOk) return;

    submitButton.disabled = true;
    status.textContent = 'Verificando...';

    let veredicto;

    try {
      veredicto = await enviarLead(email, true);
    } catch (error) {
      // El endpoint no respondió. Un reintento por si fue algo pasajero y, si
      // tampoco sale, entra igual: la falla es nuestra.
      try {
        veredicto = await enviarLead(email, true);
      } catch (segundoError) {
        veredicto = AVERIA;
      }
    }

    submitButton.disabled = false;

    if (veredicto === RECHAZO) {
      emailInput.setAttribute('aria-invalid', 'true');
      status.textContent = 'No pudimos verificar tu email. Revisalo y probá de nuevo.';
      return;
    }

    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Lead', {
        content_name: 'Tour 360',
        status: 'success',
      });
    }

    // Solo se recuerda el desbloqueo cuando el mail quedó realmente guardado. Si
    // hubo avería, la próxima visita vuelve a pedirlo: es otra oportunidad de
    // capturarlo, y esta vez la persona ya entró igual.
    if (veredicto === OK) localStorage.setItem(STORAGE_KEY, 'true');

    unlockTour(form, status, '¡Gracias! Ya podés acceder al tour 360° y al brochure.', { openNow: true });
  });
}
