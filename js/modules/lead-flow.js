import { getRecaptchaToken, primeRecaptcha } from './recaptcha.js';
import { track, trackMeta } from './tracking.js';
import { datosDeAtribucion } from './attribution.js';
import { calificar, sinCalificar } from './scoring.js';
import { LEAD_ENDPOINT } from '../config.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[\d\s()+-]{6,}$/;

const MENSAJES = {
  requerido: 'Este campo es obligatorio',
  email: 'Revisá el email: parece incompleto',
  tel: 'Ingresá un número válido',
  whatsapp: 'Escribí un WhatsApp válido, con característica',
  grupo: 'Elegí una opción para continuar',
  revisar: 'Revisá los campos marcados antes de continuar.',
  enviando: 'Enviando tus datos...',
};

export function normalizarWhatsapp(valor) {
  let digitos = String(valor || '').replace(/\D/g, '');
  if (!digitos) return '';

  if (digitos.startsWith('00')) digitos = digitos.slice(2);
  if (digitos.startsWith('54')) digitos = digitos.slice(2);
  if (digitos.startsWith('0')) digitos = digitos.slice(1);
  if (digitos.startsWith('9') && digitos.length > 10) digitos = digitos.slice(1);
  if (digitos.length === 12 && digitos.slice(2, 4) === '15') {
    digitos = digitos.slice(0, 2) + digitos.slice(4);
  }
  if (digitos.length === 10 && digitos.startsWith('15')) {
    digitos = `11${digitos.slice(2)}`;
  }

  return `549${digitos}`;
}

export function whatsappValido(valor) {
  const digitos = String(valor || '').replace(/\D/g, '');
  return digitos.length >= 8 && digitos.length <= 15;
}

function setError(form, name, mensaje) {
  const slot = form.querySelector(`[data-error-for="${name}"]`);
  if (slot) slot.textContent = mensaje;

  const control = form.elements[name];
  if (control && typeof control.setAttribute === 'function') {
    control.setAttribute('aria-invalid', mensaje ? 'true' : 'false');
  }

  return !mensaje;
}

function valorCampo(form, name) {
  const control = form.elements[name];
  return control ? String(control.value || '').trim() : '';
}

function valorGrupo(form, name) {
  const grupo = form.elements[name];
  return grupo ? String(grupo.value || '') : '';
}

function validarCampo(form, campo) {
  const { name, tipo = 'texto', requerido = true } = campo;
  const control = form.elements[name];
  if (!control) return true;

  if (tipo === 'checkbox') {
    return setError(form, name, control.checked ? '' : campo.mensaje || MENSAJES.requerido);
  }

  const valor = valorCampo(form, name);

  if (!valor) {
    return setError(form, name, requerido ? campo.mensaje || MENSAJES.requerido : '');
  }

  if (tipo === 'email' && !EMAIL_PATTERN.test(valor)) return setError(form, name, MENSAJES.email);
  if (tipo === 'tel' && !PHONE_PATTERN.test(valor)) return setError(form, name, MENSAJES.tel);
  if (tipo === 'whatsapp' && !whatsappValido(valor)) return setError(form, name, MENSAJES.whatsapp);

  return setError(form, name, '');
}

function validarGrupo(form, grupo) {
  if (grupo.requerido === false) return true;
  const valor = valorGrupo(form, grupo.name);
  return setError(form, grupo.name, valor ? '' : grupo.mensaje || MENSAJES.grupo);
}

/** Token crudo de cada pregunta: es lo que consume el scoring. */
function tokensDe(form, grupos) {
  return grupos.reduce((acc, { name }) => {
    acc[name] = valorGrupo(form, name);
    return acc;
  }, {});
}

/**
 * Texto legible de cada respuesta, que es lo que viaja al aviso interno.
 * Cuando el grupo declara `labels`, el value del radio es un token corto y la
 * etiqueta sale del diccionario; si no, el value ya es el texto final.
 */
function etiquetasDe(form, grupos) {
  return grupos.reduce((acc, { name, labels }) => {
    const valor = valorGrupo(form, name);
    acc[name] = labels ? labels[valor] || '' : valor;
    return acc;
  }, {});
}

/** Arrastra la campaña de origen al aviso interno cuando el anuncio la trae. */
function mensajeCampana() {
  const atribucion = datosDeAtribucion();
  const partes = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']
    .map((clave) => (atribucion[clave] ? `${clave.replace('utm_', '')}: ${atribucion[clave]}` : null))
    .filter(Boolean);

  return partes.length ? `Campaña — ${partes.join(' · ')}` : '';
}

async function enviar(payload) {
  if (!LEAD_ENDPOINT) {
    console.info('[lead-flow] LEAD_ENDPOINT vacío, no se envió el lead:', payload);
    return { ok: true };
  }

  const respuesta = await fetch(LEAD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (respuesta.status === 403) return { ok: false, motivo: 'verificacion' };
  if (respuesta.status === 429) return { ok: false, motivo: 'repetido' };

  const datos = await respuesta.json().catch(() => ({}));
  return { ok: respuesta.ok && datos.success === true, motivo: 'error' };
}

const DEFAULTS = {
  formId: '',
  trackId: '',
  segmento: '',
  origen: '',
  perfil: '',
  metaContentName: '',
  whatsappUrl: 'https://wa.me/541130459267',
  califica: false,
  pasos: [],
};

export function initLeadFlow(options = {}) {
  const config = { ...DEFAULTS, ...options };
  const form = document.getElementById(config.formId);
  if (!form) return null;

  const pasos = config.pasos;
  const todosLosGrupos = pasos.flatMap((paso) => paso.grupos || []);
  const todosLosCampos = pasos.flatMap((paso) => paso.campos || []);

  const bloques = Array.from(form.querySelectorAll('[data-step]'));
  const estado = form.querySelector('[data-status]');
  const resultado = document.querySelector('[data-outcome-panel]');
  const botonAvanzar = form.querySelector('[data-next]');
  const botonVolver = form.querySelector('[data-back]');
  const botonEnviar = form.querySelector('[data-submit]');
  const botonOmitir = form.querySelector('[data-skip]');
  const enlaceWhatsapp = `<a href="${config.whatsappUrl}" target="_blank" rel="noopener">WhatsApp</a>`;

  primeRecaptcha(form);

  let iniciado = false;
  let parcialEnviado = false;

  const marcarInicio = () => {
    if (iniciado) return;
    iniciado = true;
    track('form_start', { form_id: config.trackId });
  };

  form.addEventListener('focusin', marcarInicio, { once: true });
  form.addEventListener('change', marcarInicio, { once: true });

  todosLosGrupos.forEach(({ name }) => {
    form.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
      input.addEventListener('change', () => setError(form, name, ''));
    });
  });

  todosLosCampos.forEach((campo) => {
    const control = form.elements[campo.name];
    if (!control || campo.tipo === 'checkbox') return;
    control.addEventListener('input', () => setError(form, campo.name, ''));
    control.addEventListener('blur', () => validarCampo(form, campo));
  });

  function mostrarPaso(numero) {
    bloques.forEach((bloque) => {
      bloque.hidden = bloque.dataset.step !== String(numero);
    });

    const contador = form.querySelector('[data-step-current]');
    if (contador) contador.textContent = String(numero);

    const barra = form.querySelector('[data-progress]');
    if (barra) barra.style.setProperty('--progress', `${(numero / pasos.length) * 100}%`);
  }

  function validarPaso(indice) {
    const paso = pasos[indice];
    const checks = [
      ...(paso.grupos || []).map((grupo) => validarGrupo(form, grupo)),
      ...(paso.campos || []).map((campo) => validarCampo(form, campo)),
    ];

    return checks.every(Boolean);
  }

  function enfocarPrimerError() {
    const invalido = form.querySelector('[data-step]:not([hidden]) [aria-invalid="true"]');
    if (invalido) {
      invalido.focus({ preventScroll: false });
      return;
    }

    const slot = form.querySelector('[data-step]:not([hidden]) [data-error-for]:not(:empty)');
    if (slot) slot.closest('fieldset, div')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function datosBase() {
    const payload = {
      segmento: config.segmento,
      origen: config.origen,
      perfil: config.perfil,
      website: valorCampo(form, 'website'),
      mensaje: mensajeCampana(),
      ...datosDeAtribucion(),
    };

    todosLosCampos.forEach((campo) => {
      const control = form.elements[campo.name];
      if (!control) return;

      if (campo.tipo === 'checkbox') {
        payload.consentimiento = control.checked;
        return;
      }

      const valor = valorCampo(form, campo.name);
      const destino = campo.enviarComo || campo.name;
      payload[destino] = campo.tipo === 'whatsapp' ? normalizarWhatsapp(valor) : valor;
    });

    return payload;
  }

  function mostrarResultado(nombre, tier, etiquetas) {
    if (!resultado) return;

    form.hidden = true;
    resultado.hidden = false;

    const activo = config.califica ? (tier === 'caliente' || tier === 'tibio' ? tier : 'nutrir') : 'unico';
    resultado.querySelectorAll('[data-outcome]').forEach((bloque) => {
      bloque.hidden = bloque.dataset.outcome !== activo;
    });

    resultado.querySelectorAll('[data-outcome-name]').forEach((slot) => {
      slot.textContent = nombre;
    });

    const partes = [
      `Hola, soy ${nombre}.`,
      etiquetas.tipologia ? `Me interesa un ${etiquetas.tipologia.toLowerCase()}.` : '',
      'Vengo de la web de Arcadia y quiero información.',
    ].filter(Boolean);
    const url = `${config.whatsappUrl.split('?')[0]}?text=${encodeURIComponent(partes.join(' '))}`;

    resultado.querySelectorAll('[data-outcome-whatsapp]').forEach((enlace) => {
      enlace.href = url;
    });

    resultado.setAttribute('tabindex', '-1');
    resultado.focus({ preventScroll: true });
    resultado.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function mostrarFalla(motivo) {
    if (!estado) return;

    if (motivo === 'verificacion') {
      estado.innerHTML = `No pudimos verificar tu solicitud. Probá de nuevo o escribinos por ${enlaceWhatsapp}.`;
      return;
    }

    if (motivo === 'repetido') {
      estado.innerHTML = `Ya recibimos varias solicitudes tuyas. Esperá unos minutos o escribinos por ${enlaceWhatsapp}.`;
      return;
    }

    estado.innerHTML = `Hubo un problema al enviar tus datos. Probá de nuevo o escribinos por ${enlaceWhatsapp}.`;
  }

  async function enviarParcial(paso) {
    const payload = { ...datosBase(), estado: 'parcial' };

    try {
      payload.token = await getRecaptchaToken(paso.recaptcha);
      parcialEnviado = (await enviar(payload)).ok;
    } catch (error) {
      parcialEnviado = false;
    }

    trackMeta('LeadParcial', { segmento: config.segmento });
  }

  async function finalizar(omitido) {
    const grupos = omitido ? [] : todosLosGrupos;
    const etiquetas = etiquetasDe(form, grupos);
    const { score, tier } = config.califica
      ? (omitido ? sinCalificar() : calificar(tokensDe(form, todosLosGrupos)))
      : { score: null, tier: null };

    const base = datosBase();
    const payload = { ...base, estado: 'completo', respuestas: etiquetas };
    if (config.califica) Object.assign(payload, { score, tier });

    if (estado) estado.textContent = MENSAJES.enviando;
    if (botonEnviar) botonEnviar.disabled = true;
    if (botonOmitir) botonOmitir.setAttribute('aria-disabled', 'true');

    let envio = { ok: false, motivo: 'error' };
    try {
      payload.token = await getRecaptchaToken(pasos[pasos.length - 1].recaptcha);
      envio = await enviar(payload);
    } catch (error) {
      envio = { ok: false, motivo: 'error' };
    }

    if (botonEnviar) botonEnviar.disabled = false;
    if (botonOmitir) botonOmitir.removeAttribute('aria-disabled');

    // Si el parcial ya entró, el lead está capturado y mentirle con un error
    // sería peor: lo único que se perdió es la calificación.
    if (!envio.ok && !parcialEnviado) {
      mostrarFalla(envio.motivo);
      return;
    }

    if (estado) estado.textContent = '';

    track('form_step_completed', { form_id: config.trackId, step: pasos.length });
    track('form_submit', { form_id: config.trackId, ...etiquetas, ...(config.califica ? { score, tier } : {}) });
    trackMeta('Lead', {
      content_name: config.metaContentName,
      segmento: config.segmento,
      ...(config.califica ? { score, tier } : { status: 'success' }),
    });

    if (config.califica && (tier === 'caliente' || tier === 'tibio')) {
      trackMeta('LeadCalificado', { tier, score, segmento: config.segmento });
    }

    mostrarResultado(base.nombre, tier, etiquetas);
  }

  if (botonAvanzar) {
    botonAvanzar.addEventListener('click', async () => {
      if (!validarPaso(0)) {
        enfocarPrimerError();
        return;
      }

      track('form_step_completed', {
        form_id: config.trackId,
        step: 1,
        ...etiquetasDe(form, pasos[0].grupos || []),
      });

      botonAvanzar.disabled = true;
      mostrarPaso(2);

      const titulo = form.querySelector('[data-step="2"] [data-step-title]');
      if (titulo) titulo.focus({ preventScroll: true });
      else form.querySelector('[data-step="2"] input')?.focus({ preventScroll: true });

      if (pasos[0].parcial) await enviarParcial(pasos[0]);
      botonAvanzar.disabled = false;
    });
  }

  if (botonVolver) {
    botonVolver.addEventListener('click', () => {
      mostrarPaso(1);
      if (estado) estado.textContent = '';
    });
  }

  if (botonOmitir) {
    botonOmitir.addEventListener('click', () => finalizar(true));
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!validarPaso(pasos.length - 1)) {
      if (estado) estado.textContent = MENSAJES.revisar;
      return;
    }

    finalizar(false);
  });

  mostrarPaso(1);

  return {
    preseleccionar(grupo, valor) {
      const opcion = form.querySelector(`input[name="${grupo}"][value="${valor}"]`);
      if (opcion) opcion.checked = true;
    },
  };
}
