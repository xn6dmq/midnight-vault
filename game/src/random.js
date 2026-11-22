// A tiny deterministic RNG (mulberry32) so a floor's ambience — the scatter of
// floor tiles, the glint on a gem — looks the same every run for a given seed.

export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick `count` distinct integers in [0, n) using the given rng. */
export function pickSome(rng, n, count) {
  const pool = Array.from({ length: n }, (_, i) => i);
  const out = [];
  while (out.length < count && pool.length > 0) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return out;
}
