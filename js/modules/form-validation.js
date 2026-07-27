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

export function initFormValidation() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  applyLeadParams(form);

  const status = document.getElementById('form-status');
  const fields = [
    { input: form.querySelector('#nombre'), error: form.querySelector('#nombre-error') },
    { input: form.querySelector('#email'), error: form.querySelector('#email-error') },
    { input: form.querySelector('#telefono'), error: form.querySelector('#telefono-error') },
  ];

  fields.forEach(({ input, error }) => {
    input.addEventListener('blur', () => validateField(input, error));
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const isValid = fields
      .map(({ input, error }) => validateField(input, error))
      .every(Boolean);

    if (!isValid) {
      status.textContent = 'Revisá los campos marcados antes de continuar.';
      return;
    }

    status.textContent = 'Gracias, recibimos tu consulta. Te contactaremos a la brevedad.';
    form.reset();
  });
}
