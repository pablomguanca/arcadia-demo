const STORAGE_KEY = 'arcadia_attr';

const PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];

function leerGuardado() {
  try {
    const crudo = window.sessionStorage.getItem(STORAGE_KEY);
    return crudo ? JSON.parse(crudo) : {};
  } catch (error) {
    return {};
  }
}

function guardar(datos) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
  } catch (error) {
    return;
  }
}

function leerUrl() {
  const busqueda = new URLSearchParams(window.location.search);
  return PARAMS.reduce((acc, clave) => {
    const valor = busqueda.get(clave);
    if (valor) acc[clave] = valor.slice(0, 200);
    return acc;
  }, {});
}

export function capturarAtribucion() {
  const guardado = leerGuardado();
  const actual = leerUrl();
  const combinado = { ...guardado, ...actual };

  if (Object.keys(actual).length) guardar(combinado);

  return combinado;
}

export function datosDeAtribucion() {
  const base = PARAMS.reduce((acc, clave) => {
    acc[clave] = '';
    return acc;
  }, {});

  return {
    ...base,
    ...capturarAtribucion(),
    pagina: window.location.pathname,
    fecha_iso: new Date().toISOString(),
  };
}
