export const RECAPTCHA_SITE_KEY = '6LfJyYwtAAAAALhxsUboFbPAP17cpDgAzemoOyxs';
export const TOUR_360_URL = 'https://arcadia-congreso.com';

export const LEAD_ENDPOINT = '/api/contact';

export const WHATSAPP_NUMBER = '541130459267';

export const PRIVACY_URL = '';

export const TIPOLOGIA_LABELS = {
  '1amb': '1 ambiente',
  '2amb': '2 ambientes',
  '3amb': '3 ambientes',
  nose: 'Todavía no sé',
};

export const CUANDO_LABELS = {
  ya: 'Ya, lo antes posible',
  '1a3': 'En 1 a 3 meses',
  '3a6': 'En 3 a 6 meses',
  explorando: 'Estoy explorando',
};

export const ENTRADA_LABELS = {
  '30mas': 'Tengo el 30% o más',
  '15a30': 'Entre el 15% y el 30%',
  organizando: 'Todavía me estoy organizando',
  consultar: 'Prefiero consultarlo',
};

export const PAGO_LABELS = {
  contado: 'Contado',
  cuotas: 'Entrada + cuotas durante la obra',
  venta: 'Con la venta de otra propiedad',
  indefinido: 'Todavía no lo definí',
};

export const SCORING = {
  puntos: {
    cuando: { ya: 3, '1a3': 2, '3a6': 1, explorando: 0 },
    entrada: { '30mas': 3, '15a30': 2, organizando: 1, consultar: 1 },
    pago: { contado: 3, cuotas: 2, venta: 1, indefinido: 0 },
  },
  umbrales: [
    { tier: 'caliente', min: 7 },
    { tier: 'tibio', min: 4 },
    { tier: 'nutrir', min: 0 },
  ],
  tierSinCalificar: 'sin_calificar',
};

export const COMPRADORES_FORM = {
  formId: 'cmp-lead-form',
  trackId: 'compradores',
  segmento: 'comprador',
  origen: 'compradores',
  perfil: 'vivir',
  metaContentName: 'Landing Compradores',
  whatsappUrl: `https://wa.me/${WHATSAPP_NUMBER}`,
  califica: true,
  pasos: [
    {
      recaptcha: 'compradores_parcial',
      parcial: true,
      campos: [
        { name: 'nombre', mensaje: 'Escribí tu nombre para continuar' },
        { name: 'whatsapp', tipo: 'whatsapp', enviarComo: 'telefono' },
        { name: 'consentimiento', tipo: 'checkbox', mensaje: 'Necesitamos tu confirmación para poder contactarte' },
      ],
    },
    {
      recaptcha: 'compradores',
      grupos: [
        { name: 'tipologia', labels: TIPOLOGIA_LABELS, requerido: false },
        { name: 'cuando', labels: CUANDO_LABELS, requerido: false },
        { name: 'entrada', labels: ENTRADA_LABELS, requerido: false },
        { name: 'pago', labels: PAGO_LABELS, requerido: false },
      ],
      campos: [{ name: 'email', tipo: 'email', requerido: false }],
    },
  ],
};

export const INVERSORES_FORM = {
  formId: 'inv-lead-form',
  trackId: 'inversores',
  segmento: 'inversor',
  origen: 'inversores',
  perfil: 'invertir',
  metaContentName: 'Landing Inversores',
  whatsappUrl: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola, quiero analizar una inversión en Arcadia Art Residence.')}`,
  califica: false,
  pasos: [
    {
      recaptcha: 'inversores',
      grupos: [
        { name: 'interes', mensaje: 'Elegí una opción para continuar' },
        { name: 'plazo', mensaje: 'Elegí un plazo para continuar' },
        { name: 'experiencia', mensaje: 'Elegí una opción para continuar' },
      ],
    },
    {
      recaptcha: 'inversores',
      campos: [
        { name: 'nombre' },
        { name: 'telefono', tipo: 'tel' },
        { name: 'email', tipo: 'email' },
      ],
    },
  ],
};
