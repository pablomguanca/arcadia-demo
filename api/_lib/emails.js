import { escapeHtml } from './format.js';

/**
 * Plantillas de los dos mails que dispara el formulario de contacto:
 * el aviso interno para Arcadia y la confirmación para el interesado.
 *
 * HTML de mail: tablas y estilos inline a propósito. Gmail y Outlook
 * descartan buena parte del CSS moderno, así que nada de flex ni grid.
 */

const COLOR = {
  olive: '#3C4A3A',
  oliveDark: '#2C3729',
  gold: '#C9A961',
  sage: '#8FAF87',
  cream: '#F6F4EF',
  white: '#FFFFFF',
  ink: '#1A1A1A',
  muted: '#6B6B6B',
  border: '#E3DED2',
};

const SERIF = "'Playfair Display',Georgia,'Times New Roman',Times,serif";
const SANS = "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif";

const SITE_URL = 'https://arcadiaartresidence.com.ar';
// El mail necesita URL absoluta: los clientes de correo no resuelven rutas relativas
// ni admiten data: URIs (Gmail las descarta).
const LOGO_URL = `${SITE_URL}/assets/img/logo/logo-arcadia-email.png`;
const WHATSAPP_URL = 'https://wa.me/541130459267';

export function leadNotificationEmail({ nombre, origenLabel, fecha, filas }) {
  const celdas = filas
    .map(
      ({ label, value }) =>
        '<tr>' +
        `<td style="padding:8px 16px 8px 0;border-bottom:1px solid ${COLOR.border};color:${COLOR.muted};` +
        `vertical-align:top;white-space:nowrap;font-family:${SANS};font-size:14px">${escapeHtml(label)}</td>` +
        `<td style="padding:8px 0;border-bottom:1px solid ${COLOR.border};color:${COLOR.ink};` +
        `font-family:${SANS};font-size:14px">${escapeHtml(value).replace(/\n/g, '<br>')}</td>` +
        '</tr>'
    )
    .join('');

  const html =
    `<div style="font-family:${SANS};font-size:15px;color:${COLOR.ink};max-width:620px">` +
    `<h2 style="font-family:${SERIF};font-size:20px;font-weight:normal;color:${COLOR.olive};margin:0 0 6px">` +
    `Consulta nueva desde ${escapeHtml(origenLabel)}</h2>` +
    `<p style="margin:0 0 20px;font-size:13px;color:${COLOR.muted}">${escapeHtml(fecha)}</p>` +
    '<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%">' +
    celdas +
    '</table>' +
    `<p style="margin:22px 0 0;font-size:13px;color:${COLOR.muted}">` +
    'Respondiendo este mail le escribís directamente a la persona. ' +
    'El contacto quedó guardado en la lista de Brevo.</p>' +
    '</div>';

  const textContent = [
    `Consulta nueva desde ${origenLabel} — ${fecha}`,
    '',
    ...filas.map(({ label, value }) => `${label}: ${value}`),
  ].join('\n');

  return {
    subject: `Nueva consulta de ${nombre} — ${origenLabel}`,
    html,
    text: textContent,
  };
}

/** Aviso interno cuando alguien desbloquea el tour 360° dejando su email. */
export function tourAccessEmail({ email, origenLabel, fecha }) {
  const safeEmail = escapeHtml(email);

  const filas = [
    ['Email', `<a href="mailto:${safeEmail}" style="color:${COLOR.olive}">${safeEmail}</a>`],
    ['Origen', escapeHtml(origenLabel)],
    ['Fecha', escapeHtml(fecha)],
  ];

  const html =
    `<div style="font-family:${SANS};font-size:15px;color:${COLOR.ink};max-width:620px">` +
    `<h2 style="font-family:${SERIF};font-size:20px;font-weight:normal;color:${COLOR.olive};margin:0 0 18px">` +
    'Alguien desbloqueó el tour 360°</h2>' +
    '<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%">' +
    filas
      .map(
        ([label, value]) =>
          '<tr>' +
          `<td style="padding:8px 16px 8px 0;border-bottom:1px solid ${COLOR.border};color:${COLOR.muted};` +
          `white-space:nowrap;font-size:14px">${label}</td>` +
          `<td style="padding:8px 0;border-bottom:1px solid ${COLOR.border};font-size:14px">${value}</td>` +
          '</tr>'
      )
      .join('') +
    '</table>' +
    `<p style="margin:22px 0 0;font-size:13px;color:${COLOR.muted}">` +
    'El contacto también quedó guardado en la lista de Brevo.</p>' +
    '</div>';

  return {
    subject: `Nuevo acceso al tour 360° — ${email}`,
    html,
    text: [`Alguien desbloqueó el tour 360°`, '', `Email: ${email}`, `Origen: ${origenLabel}`, `Fecha: ${fecha}`].join('\n'),
  };
}

export function welcomeEmail({ nombre }) {
  const parrafos = [
    'Recibimos tus datos y ya estamos leyendo tu consulta.',
    'En breve nos vamos a comunicar con vos para responderte y, si querés, coordinar una visita a la obra.',
    'Mientras tanto, si surge algo urgente podés escribirnos por WhatsApp.',
  ];

  const parrafoHtml = (txt) =>
    `<p style="margin:0 0 14px;font-family:${SANS};font-size:15px;line-height:1.75;color:${COLOR.ink}">` +
    `${escapeHtml(txt)}</p>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Recibimos tu consulta</title>
<!--[if mso]>
<style>.serif-brand { font-family: Georgia,'Times New Roman',Times,serif !important; }</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${COLOR.cream}">

<!-- Vista previa en la bandeja de entrada, no se ve en el cuerpo del mail. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
  Recibimos tu consulta. Nos comunicamos con vos a la brevedad.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLOR.cream}">
  <tr>
    <td align="center" style="padding:32px 12px">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
            style="width:100%;max-width:600px;background-color:${COLOR.white};border:1px solid ${COLOR.border}">

        <tr>
          <td align="center" style="background-color:${COLOR.olive};padding:34px 32px">
            <img src="${LOGO_URL}" width="260" height="78" alt="Arcadia Art Residence"
                 style="display:block;border:0;width:260px;max-width:100%;height:auto;font-family:${SERIF};font-size:20px;letter-spacing:1px;color:${COLOR.white}">
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:0">
            <div style="height:3px;background-color:${COLOR.gold};font-size:0;line-height:0">&nbsp;</div>
          </td>
        </tr>

        <tr>
          <td style="padding:34px 32px 0">
            <h1 class="serif-brand" style="margin:0 0 18px;font-family:${SERIF};font-size:26px;line-height:1.35;font-weight:normal;color:${COLOR.oliveDark}">
              Hola ${escapeHtml(nombre)},<br>gracias por escribirnos.
            </h1>
            ${parrafos.map(parrafoHtml).join('')}
          </td>
        </tr>

        <tr>
          <td style="padding:12px 32px 0">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background-color:${COLOR.olive};padding:13px 26px">
                  <a href="${WHATSAPP_URL}" style="font-family:${SANS};font-size:14px;color:${COLOR.white};text-decoration:none;display:inline-block">
                    Escribirnos por WhatsApp
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:30px 32px 0">
            <div style="height:1px;background-color:${COLOR.border};font-size:0;line-height:0">&nbsp;</div>
          </td>
        </tr>

        <tr>
          <td style="padding:22px 32px 34px">
            <p class="serif-brand" style="margin:0 0 6px;font-family:${SERIF};font-size:17px;color:${COLOR.oliveDark}">Arcadia Art Residence</p>
            <p style="margin:0 0 4px;font-family:${SANS};font-size:13px;line-height:1.6;color:${COLOR.muted}">
              Av. Congreso 3163, Coghlan, CABA
            </p>
            <p style="margin:0 0 12px;font-family:${SANS};font-size:13px;line-height:1.6;color:${COLOR.muted}">
              +54 11 3045-9267
            </p>
            <a href="${SITE_URL}" style="font-family:${SANS};font-size:13px;color:${COLOR.olive};text-decoration:none">arcadiaartresidence.com.ar</a>
          </td>
        </tr>

      </table>

      <p style="margin:18px 0 0;font-family:${SANS};font-size:11px;line-height:1.6;color:#8A8578">
        Recibís este mail porque completaste el formulario de contacto en nuestro sitio.<br>
        Si preferís no recibir novedades, respondé este mail y te damos de baja.
      </p>

    </td>
  </tr>
</table>

</body>
</html>`;

  const textContent = [
    `Hola ${nombre}, gracias por escribirnos.`,
    ...parrafos,
    `WhatsApp: ${WHATSAPP_URL}`,
    '',
    'Arcadia Art Residence',
    'Av. Congreso 3163, Coghlan, CABA — +54 11 3045-9267',
    SITE_URL,
  ].join('\n\n');

  return {
    subject: 'Recibimos tu consulta — Arcadia Art Residence',
    html,
    text: textContent,
  };
}
