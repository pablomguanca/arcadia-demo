/**
 * Capa única de eventos de las landings de pauta.
 *
 * Manda el mismo evento a los dos lugares donde puede estar escuchando alguien:
 * gtag (GA4, que es lo que hoy está instalado) y dataLayer (por si mañana se
 * mete un contenedor de GTM sin tener que tocar el código de la página).
 *
 * Eventos previstos:
 *   page_view             carga de página (solo dataLayer, ver `pushDataLayer`)
 *   landing_view          la landing se cargó
 *   cta_system_click      clic en un CTA que explica el sistema (inversores)
 *   cta_investment_click  clic en un CTA que lleva a analizar la inversión
 *   cta_units_click       clic en un CTA que lleva al catálogo (compradores)
 *   unit_view             se abrió el detalle de una unidad
 *   unit_cta_click        clic en el CTA de una unidad
 *   buyer_profile_selected  se eligió un perfil en el asistente
 *   investor_redirect     el asistente derivó a /inversores
 *   form_start            primera interacción real con el formulario
 *   form_step_completed   se completó un paso del formulario
 *   form_submit           el lead se envió con éxito
 */

export function track(name, params = {}) {
  const payload = { ...params };

  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, payload);
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, ...payload });
  } catch (error) {
    // La medición nunca puede romper la página.
  }
}

/**
 * Empuja un evento solo al dataLayer, sin pasar por gtag.
 *
 * Es lo que corresponde para `page_view`: GA4 ya lo dispara solo con el
 * `gtag('config', ...)` del <head>, y repetirlo por gtag duplicaría la sesión.
 * En el dataLayer, en cambio, hace falta para que un futuro contenedor de GTM
 * tenga el disparador disponible.
 */
export function pushDataLayer(name, params = {}) {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, ...params });
  } catch (error) {
    // Idem.
  }
}

/** Eventos de Meta: solo los que sirven para optimizar campañas. */
export function trackMeta(event, params = {}, custom = false) {
  try {
    if (typeof window.fbq !== 'function') return;
    window.fbq(custom ? 'trackCustom' : 'track', event, params);
  } catch (error) {
    // Idem.
  }
}
