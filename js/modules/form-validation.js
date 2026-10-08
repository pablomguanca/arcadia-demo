import { getRecaptchaToken, primeRecaptcha } from './recaptcha.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[\d\s()+-]{6,}$/;
const WHATSAPP_URL = 'https://wa.me/541130459267?text=Hola%2C%20quiero%20recibir%20m%C3%A1s%20informaci%C3%B3n%20sobre%20Arcadia%20Art%20Residence.';
const WHATSAPP_LINK = `<a class="form__status-link" href="${WHATSAPP_URL}" target="_blank" rel="noopener">WhatsApp</a>`;

function setFieldError(input, errorEl, message) {
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  if (errorEl) errorEl.textContent = message;
}

function validateField(input, errorEl) {
  if (input.type === 'checkbox') {
    const message = input.required && !input.checked ? 'Necesitamos tu confirmación para poder contactarte' : '';
    setFieldError(input, errorEl, message);
    return !message;
  }

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

function collectPayload(form, token) {
  const data = new FormData(form);

  return {
    nombre: data.get('nombre'),
    email: data.get('email'),
    telefono: data.get('telefono'),
    perfil: data.get('perfil'),
    mensaje: data.get('mensaje'),
    interes: data.get('interes'),
    origen: data.get('origen'),
    consentimiento: data.get('consentimiento') === 'on',
    website: data.get('website'),
    token,
  };
}

export function initFormValidation() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  applyLeadParams(form);
  primeRecaptcha(form);

  const status = document.getElementById('form-status');
  const fields = [
    { input: form.querySelector('#nombre'), error: form.querySelector('#nombre-error') },
    { input: form.querySelector('#email'), error: form.querySelector('#email-error') },
    { input: form.querySelector('#telefono'), error: form.querySelector('#telefono-error') },
    { input: form.querySelector('#consentimiento'), error: form.querySelector('#consentimiento-error') },
  ].filter(({ input }) => input);

  fields.forEach(({ input, error }) => {
    // La casilla se valida al cambiar: el blur la marcaría en rojo apenas pasás por ella con el tab.
    const evento = input.type === 'checkbox' ? 'change' : 'blur';
    input.addEventListener(evento, () => validateField(input, error));
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
      const token = await getRecaptchaToken('contact');

      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collectPayload(form, token)),
      });

      if (response.status === 403) {
        status.innerHTML = `No pudimos verificar tu consulta. Probá de nuevo o escribinos por ${WHATSAPP_LINK}.`;
        return;
      }

      if (response.status === 429) {
        status.innerHTML = `Ya recibimos varias consultas tuyas. Esperá unos minutos o escribinos por ${WHATSAPP_LINK}.`;
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success !== true) throw new Error('Submission failed');

      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Lead', {
          content_name: 'Formulario Web',
          status: 'success',
        });
      }

      status.textContent = 'Gracias, recibimos tu consulta. Te contactaremos a la brevedad.';
      form.reset();
    } catch (error) {
      status.innerHTML = `Hubo un problema al enviar tu consulta. Probá de nuevo o escribinos por ${WHATSAPP_LINK}.`;
    } finally {
      submitButton.disabled = false;
    }
  });
}
