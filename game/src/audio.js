// Every sound in MIDNIGHT VAULT is synthesised live with WebAudio: short
// oscillator envelopes, no audio files, nothing fetched. The context is created
// on the first user gesture so the browser's autoplay rules stay happy.

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
  }

  /** Create (or resume) the audio context; call from a key or click handler. */
  unlock() {
    try {
      if (!this.ctx) {
        const Ctx = window.AudioContext ?? window.webkitAudioContext;
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.16;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  /** One short tone: frequency slide from `from` to `to` over `seconds`. */
  tone(from, to, seconds, type = 'sine', when = 0) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, from), t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + seconds);
    gain.gain.setValueAtTime(0.9, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.02);
  }

  /** A loot grab: a bright two-note chirp, higher for lighter loot. */
  pickup(kind) {
    const base = kind === 'gem' ? 880 : kind === 'gold' ? 660 : 740;
    this.tone(base, base * 1.5, 0.09, 'triangle');
    this.tone(base * 1.5, base * 2, 0.12, 'triangle', 0.07);
  }

  /** Banking at the van: a little coin arpeggio. */
  bank() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.12, 'square', i * 0.06));
  }

  /** Tripping a laser: a harsh buzzing zap. */
  zap() {
    this.tone(220, 60, 0.28, 'sawtooth');
    this.tone(110, 45, 0.28, 'square', 0.02);
  }

  /** Trying to grab with a full sack: a dull thud. */
  denied() {
    this.tone(140, 70, 0.16, 'sine');
  }

  /** The alarm spotted the thief: a rising two-tone siren blip. */
  spotted() {
    this.tone(620, 920, 0.14, 'square');
    this.tone(920, 620, 0.14, 'square', 0.14);
  }

  /** Busted: a low falling siren. */
  busted() {
    this.tone(440, 90, 0.9, 'sawtooth');
    this.tone(330, 70, 0.9, 'triangle', 0.1);
  }

  /** Floor cleared (or the whole getaway): a rising major arpeggio. */
  success(final) {
    const notes = final ? [523, 659, 784, 1047, 1319] : [523, 659, 784];
    notes.forEach((f, i) => this.tone(f, f, 0.16, 'triangle', i * 0.08));
  }
}
