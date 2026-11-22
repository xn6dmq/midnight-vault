// Keyboard input: WASD or arrow keys to move, Space to pause the job for a
// breather, Enter to start / advance screens. Movement is a unit vector plus
// a "just pressed" edge for the action keys.

const MOVE_KEYS = {
  KeyW: { x: 0, y: -1 },
  ArrowUp: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  ArrowLeft: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    window.addEventListener('keydown', (e) => {
      if (e.code in MOVE_KEYS || e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyP') {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => {
      this.down.clear();
      this.pressed.clear();
    });
  }

  /** Current movement direction, normalised, or {x:0,y:0} when idle. */
  move() {
    let x = 0;
    let y = 0;
    for (const code of this.down) {
      const d = MOVE_KEYS[code];
      if (d) {
        x += d.x;
        y += d.y;
      }
    }
    if (x === 0 && y === 0) return { x: 0, y: 0 };
    const len = Math.hypot(x, y);
    return { x: x / len, y: y / len };
  }

  /** True once for the frame in which the key went down. */
  wasPressed(code) {
    return this.pressed.has(code);
  }

  /** Clear the edge set; called once per frame after the game has read it. */
  endFrame() {
    this.pressed.clear();
  }
}
