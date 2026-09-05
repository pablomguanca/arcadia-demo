import { RECAPTCHA_SITE_KEY } from '../config.js';

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

async function getRecaptchaToken(action) {
  await loadRecaptchaScript();
  return window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
}

// reCAPTCHA v3 arrastra ~350 KB de JS de Google mas un iframe. Cargarlo apenas
// abre la pagina castiga el render de todo el mundo para servir a los pocos que
// completan el formulario. Se precarga con el primer contacto con el form: para
// cuando llegue el submit ya esta listo, y quien solo pasa de largo nunca lo baja.
function primeRecaptcha(form) {
  const warmUp = () => loadRecaptchaScript().catch(() => {});

  form.addEventListener('focusin', warmUp, { once: true });
  form.addEventListener('pointerdown', warmUp, { once: true });
}

export { loadRecaptchaScript, getRecaptchaToken, primeRecaptcha };
