const SITEVERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const MIN_SCORE = 0.5;

/**
 * Valida un token de reCAPTCHA v3 y distingue dos cosas que no son lo mismo:
 *
 *   'human'       → pasó.
 *   'rejected'    → Google dice que no. Es culpa de quien envía (bot, o score
 *                   bajo), y quien llama debería cortarle el paso.
 *   'unavailable' → no pudimos verificar: falta el secret, Google no responde,
 *                   la red falló. Es culpa NUESTRA, y castigar al visitante por
 *                   una avería propia es peor que dejar pasar algún bot.
 *
 * La diferencia importa porque de ella depende si al visitante se le cierra la
 * puerta o no.
 */
export async function verifyHuman(token) {
  if (!process.env.RECAPTCHA_SECRET_KEY) {
    console.error('[recaptcha] Falta RECAPTCHA_SECRET_KEY: no se pudo verificar.');
    return 'unavailable';
  }

  // Sin token asumimos bot: es la firma típica de un envío automatizado.
  if (!token) return 'rejected';

  const params = new URLSearchParams({
    secret: process.env.RECAPTCHA_SECRET_KEY,
    response: token,
  });

  try {
    const googleResponse = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!googleResponse.ok) {
      console.error('[recaptcha] Google respondió', googleResponse.status);
      return 'unavailable';
    }

    const data = await googleResponse.json();
    return data.success && data.score >= MIN_SCORE ? 'human' : 'rejected';
  } catch (error) {
    console.error('[recaptcha] No se pudo consultar a Google:', error);
    return 'unavailable';
  }
}
