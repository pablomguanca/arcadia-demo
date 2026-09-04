/**
 * Alta de contactos en Brevo. Brevo acá NO envía nada: solo guarda la lista de
 * suscriptores. Los envíos salen por Resend (ver _lib/resend.js).
 *
 * Como no envía, esta cuenta no necesita verificación de dominio ni registros DNS.
 *
 * Variables de entorno:
 *   BREVO_API_KEY  (opcional) Sin ella no se guarda a nadie, pero el formulario sigue andando.
 *   BREVO_LIST_ID  (opcional) ID numérico de la lista donde caen los leads.
 */

const CONTACTS_ENDPOINT = 'https://api.brevo.com/v3/contacts';

async function postContact(body) {
  const response = await fetch(CONTACTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (response.ok || response.status === 204) return { ok: true };

  const data = await response.json().catch(() => ({}));

  // El contacto ya existía: el mail igual está en la lista, así que lo damos por bueno.
  if (data.code === 'duplicate_parameter') return { ok: true };

  return { ok: false, code: data.code, message: data.message };
}

/**
 * Da de alta o actualiza el contacto en la lista configurada.
 *
 * Si Brevo rechaza los atributos —normalmente porque alguno todavía no está
 * creado en la cuenta— reintenta con el email solo. Perder los atributos es
 * molesto; perder el lead, no lo queremos.
 */
export async function upsertContact({ email, attributes }) {
  if (!process.env.BREVO_API_KEY) {
    console.warn('[brevo] Falta BREVO_API_KEY: no se guardó el contacto', email);
    return false;
  }

  const listId = Number(process.env.BREVO_LIST_ID);
  const base = {
    email,
    listIds: listId ? [listId] : undefined,
    updateEnabled: true,
  };

  const first = await postContact({ ...base, attributes });
  if (first.ok) return true;

  if (attributes) {
    console.warn('[brevo] Atributos rechazados, reintento solo con el email:', first.code, first.message);
    const retry = await postContact(base);
    if (retry.ok) return true;
  }

  console.error('[brevo] No se pudo guardar el contacto:', first.code, first.message);
  return false;
}
