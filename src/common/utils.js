
export function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

// Generate array with integer sequence from 0 tolength-1
export function sequence(length) {
    return Array.apply(null, {length: length}).map(Function.call, Number);
}

export function randInt(min, max) {
  return Math.trunc(Math.random() * (max - min) + min);
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clamp(x, min, max) {
  return Math.min(Math.max(x, min), max);
}

export function parseIntArray(intsStr) {
  return intsStr.split(',').map(x => parseInt(x));
}

export function parseFloatArray(floatsStr) {
  return floatsStr.split(',').map(x => parseFloat(x));
}

// shuffle in place and return array
export function shuffle(array) {
  for (let i = 0; i < array.length - 1; i++) {
    const pickIndex = randInt(i, array.length);
    const ref = array[i];
    array[i] = array[pickIndex];
    array[pickIndex] = ref;
  }
  return array;
}

export const RADIANS = Math.PI / 180;
export const DEGREES = 180 / Math.PI;
