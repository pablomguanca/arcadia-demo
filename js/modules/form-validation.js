import { RECAPTCHA_SITE_KEY } from '../config.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[\d\s()+-]{6,}$/;

function setFieldError(input, errorEl, message) {
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  if (errorEl) errorEl.textContent = message;
}

function validateField(input, errorEl) {
  const value = input.value.trim();

  if (input.hasAttribute('required') && !value) {
    setFieldError(input, errorEl, 'Este campo es obligatorio');
    return false;
  }

  if (input.type === 'email' && value && !EMAIL_PATTERN.test(value)) {
    setFieldError(input, errorEl, 'Ingresá un email válido');
    return false;
  }

  if (input.type === 'tel' && value && !PHONE_PATTERN.test(value)) {
    setFieldError(input, errorEl, 'Ingresá un teléfono válido');
    return false;
  }

  setFieldError(input, errorEl, '');
  return true;
}

function applyLeadParams(form) {
  const params = new URLSearchParams(window.location.search);
  const interes = params.get('interes');
  const perfil = params.get('perfil');

  if (interes) {
    const interesHidden = form.querySelector('#interes-hidden');
    if (interesHidden) interesHidden.value = interes;
  }

  if (perfil) {
    form.querySelectorAll('input[name="perfil"]').forEach((radio) => {
      radio.checked = radio.value === perfil;
    });
  }
}

function loadRecaptchaScript() {
  return new Promise((resolve, reject) => {
    if (window.grecaptcha) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.onload = () => window.grecaptcha.ready(resolve);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function getRecaptchaToken() {
  await loadRecaptchaScript();
  return window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'contact' });
}

async function verifyRecaptcha(token) {
  const response = await fetch('/api/verify-recaptcha', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) return false;

  const data = await response.json();
  return data.success === true;
}

export function initFormValidation() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  applyLeadParams(form);
  loadRecaptchaScript().catch(() => {});

  const status = document.getElementById('form-status');
  const fields = [
    { input: form.querySelector('#nombre'), error: form.querySelector('#nombre-error') },
    { input: form.querySelector('#email'), error: form.querySelector('#email-error') },
    { input: form.querySelector('#telefono'), error: form.querySelector('#telefono-error') },
  ];

  fields.forEach(({ input, error }) => {
    input.addEventListener('blur', () => validateField(input, error));
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const isValid = fields
      .map(({ input, error }) => validateField(input, error))
      .every(Boolean);

    if (!isValid) {
      status.textContent = 'Revisá los campos marcados antes de continuar.';
      return;
    }

    const submitButton = form.querySelector('.form__submit');
    submitButton.disabled = true;
    status.textContent = 'Enviando tu consulta...';

    try {
      const token = await getRecaptchaToken();
      const isHuman = await verifyRecaptcha(token);

      if (!isHuman) {
        status.textContent = 'No pudimos verificar tu consulta. Probá de nuevo o escribinos a contacto@arcadiaartresidence.com.ar.';
        return;
      }

      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) throw new Error('Submission failed');

      status.textContent = 'Gracias, recibimos tu consulta. Te contactaremos a la brevedad.';
      form.reset();
    } catch (error) {
      status.textContent = 'Hubo un problema al enviar tu consulta. Probá de nuevo o escribinos a contacto@arcadiaartresidence.com.ar.';
    } finally {
      submitButton.disabled = false;
    }
  });
}
