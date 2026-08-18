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

export { loadRecaptchaScript, getRecaptchaToken };
