import { TOUR_360_URL } from '../config.js';
import { getRecaptchaToken, loadRecaptchaScript } from './recaptcha.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORAGE_KEY = 'arcadia_tour_360_unlocked';

async function verifyAndSaveLead(email) {
  const token = await getRecaptchaToken('tour_360');

  const response = await fetch('/api/save-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, token, source: 'vistazo-tour-360' }),
  });

  if (!response.ok) return false;

  const data = await response.json();
  return data.success === true;
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
  const status = document.getElementById('tour-gate-status');
  const submitButton = form.querySelector('.form__submit');

  loadRecaptchaScript().catch(() => {});

  if (localStorage.getItem(STORAGE_KEY) === 'true') {
    unlockTour(form, status, 'Ya verificamos tu email.');
    return;
  }

  emailInput.addEventListener('blur', () => {
    const value = emailInput.value.trim();
    const valid = !value || EMAIL_PATTERN.test(value);
    emailInput.setAttribute('aria-invalid', valid ? 'false' : 'true');
    emailError.textContent = valid ? '' : 'Ingresá un email válido';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    if (!email || !EMAIL_PATTERN.test(email)) {
      emailInput.setAttribute('aria-invalid', 'true');
      emailError.textContent = 'Ingresá un email válido';
      return;
    }

    submitButton.disabled = true;
    status.textContent = 'Verificando...';

    try {
      const saved = await verifyAndSaveLead(email);

      if (!saved) {
        status.textContent = 'No pudimos verificar tu email. Probá de nuevo.';
        return;
      }

      localStorage.setItem(STORAGE_KEY, 'true');
      unlockTour(form, status, '¡Gracias! Ya podés acceder al tour 360° y al brochure.', { openNow: true });
    } catch (error) {
      status.textContent = 'Hubo un problema al procesar tu solicitud. Probá de nuevo.';
    } finally {
      submitButton.disabled = false;
    }
  });
}
