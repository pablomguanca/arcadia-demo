export const RECAPTCHA_SITE_KEY = '6LfJyYwtAAAAALhxsUboFbPAP17cpDgAzemoOyxs';
export const TOUR_360_URL = 'https://arcadia-congreso.com';

export const LEAD_ENDPOINT = '/api/contact';

export const WHATSAPP_NUMBER = '541130459267';

export const PRIVACY_URL = '/privacidad';

// Link al dossier de inversores. Vacío = el botón no se muestra.
export const DOSSIER_URL = '';

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
  max: 9,
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

export const CAPITAL_LABELS = {
  menos30: 'Menos de US$ 30.000',
  '30a50': 'Entre US$ 30.000 y US$ 50.000',
  '50a100': 'Entre US$ 50.000 y US$ 100.000',
  mas100: 'Más de US$ 100.000',
  hablarlo: 'Prefiero hablarlo',
};

export const HORIZONTE_LABELS = {
  corto: 'Corto plazo (~1 año)',
  mediano: 'Mediano plazo (hasta fin de obra)',
  largo: 'Largo plazo (reinvertir)',
  asesoramiento: 'Quiero asesoramiento',
};

export const FORMA_CAPITAL_LABELS = {
  dolares: 'Dólares',
  pesos: 'Pesos',
  activo: 'Un activo',
  mix: 'Una combinación',
};

export const EXPERIENCIA_LABELS = {
  frecuencia: 'Invierto con frecuencia',
  alguna: 'Invertí alguna vez',
  primera: 'Sería mi primera vez',
};

const CAPITAL_CALIFICANTE = ['30a50', '50a100', 'mas100'];

export const SCORING_INVERSORES = {
  // Horizonte, forma de capital y experiencia no puntúan: se guardan para el asesor.
  puntos: {
    capital: { menos30: 0, '30a50': 2, '50a100': 3, mas100: 3, hablarlo: 1 },
    cuando: { ya: 3, '1a3': 2, '3a6': 1, explorando: 0 },
  },
  max: 6,
  tierSinCalificar: 'sin_calificar',
  // HOT/WARM/NURTURE se mantienen con los nombres que ya usa el reporting.
  clasificar({ capital, cuando }) {
    const capitalOk = CAPITAL_CALIFICANTE.includes(capital);
    const calificante = capitalOk || capital === 'hablarlo';
    if (capitalOk && (cuando === 'ya' || cuando === '1a3')) return 'caliente';
    if (calificante && ['ya', '1a3', '3a6'].includes(cuando)) return 'tibio';
    return 'nutrir';
  },
};

export const INVERSORES_FORM = {
  formId: 'inv-lead-form',
  trackId: 'inversores',
  segmento: 'inversor',
  origen: 'inversores',
  perfil: 'invertir',
  metaContentName: 'Landing Inversores',
  whatsappUrl: `https://wa.me/${WHATSAPP_NUMBER}`,
  califica: true,
  scoring: SCORING_INVERSORES,
  mensajeWhatsapp: (nombre, etiquetas) =>
    [
      `Hola, soy ${nombre}.`,
      'Quiero información para invertir en Arcadia.',
      etiquetas.horizonte ? `Mi horizonte: ${etiquetas.horizonte}.` : '',
    ].filter(Boolean).join(' '),
  // La agenda de inversores se menciona solo si declaró capital desde US$ 30.000.
  beneficios: {
    agenda: ({ capital }) => CAPITAL_CALIFICANTE.includes(capital),
  },
  pasos: [
    { ...COMPRADORES_FORM.pasos[0], recaptcha: 'inversores_parcial' },
    {
      recaptcha: 'inversores',
      grupos: [
        { name: 'capital', labels: CAPITAL_LABELS, requerido: false },
        { name: 'horizonte', labels: HORIZONTE_LABELS, requerido: false },
        { name: 'cuando', labels: CUANDO_LABELS, requerido: false },
        { name: 'formaCapital', labels: FORMA_CAPITAL_LABELS, requerido: false },
        { name: 'experiencia', labels: EXPERIENCIA_LABELS, requerido: false },
      ],
      campos: [{ name: 'email', tipo: 'email', requerido: false }],
    },
  ],
};
