import { SCORING } from '../config.js';

export function calcularScore(respuestas, reglas = SCORING) {
  return Object.entries(reglas.puntos).reduce((total, [pregunta, tabla]) => {
    const valor = respuestas[pregunta];
    const puntos = Object.prototype.hasOwnProperty.call(tabla, valor) ? tabla[valor] : 0;
    return total + puntos;
  }, 0);
}

export function resolverTier(score, reglas = SCORING, respuestas = {}) {
  // Un segmento puede clasificar por regla (ej. capital + momento) en vez de
  // por umbral de puntos; el score se sigue calculando para el reporte.
  if (typeof reglas.clasificar === 'function') return reglas.clasificar(respuestas, score);

  const encontrado = reglas.umbrales.find(({ min }) => score >= min);
  return encontrado ? encontrado.tier : reglas.tierSinCalificar;
}

export function calificar(respuestas, reglas = SCORING) {
  const score = calcularScore(respuestas, reglas);
  return { score, tier: resolverTier(score, reglas, respuestas) };
}

export function sinCalificar(reglas = SCORING) {
  return { score: 0, tier: reglas.tierSinCalificar };
}
