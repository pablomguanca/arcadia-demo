import { SCORING } from '../config.js';

export function calcularScore(respuestas, reglas = SCORING) {
  return Object.entries(reglas.puntos).reduce((total, [pregunta, tabla]) => {
    const valor = respuestas[pregunta];
    const puntos = Object.prototype.hasOwnProperty.call(tabla, valor) ? tabla[valor] : 0;
    return total + puntos;
  }, 0);
}

export function resolverTier(score, reglas = SCORING) {
  const encontrado = reglas.umbrales.find(({ min }) => score >= min);
  return encontrado ? encontrado.tier : reglas.tierSinCalificar;
}

export function calificar(respuestas, reglas = SCORING) {
  const score = calcularScore(respuestas, reglas);
  return { score, tier: resolverTier(score, reglas) };
}

export function sinCalificar(reglas = SCORING) {
  return { score: 0, tier: reglas.tierSinCalificar };
}
