// Boot and the one loop for MIDNIGHT VAULT: input is read every frame, the
// world advances in fixed 1/60 s steps, and the renderer paints what is there.
// The game moves between six screens: title, play, paused, busted, floor
// cleared and the final getaway.
//
// ?shot=start|play|end stages a screenshot scene instead of running the loop,
// paints it and sets window.__shotReady for the capture tool.

import { FIELD, STEP } from './config.js';
import { FLOORS } from './floors.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import {
  World, EVENT_BANK, EVENT_BUSTED, EVENT_CLEAR, EVENT_DENIED, EVENT_PICKUP,
  EVENT_SPOTTED, EVENT_ZAP,
} from './world.js';
import {
  render, SCREEN_BUSTED, SCREEN_CLEAR, SCREEN_FINAL, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE,
} from './render.js';
import { stageShot } from './shots.js';

const BEST_KEY = 'midnight-vault-best';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const input = new Input();
const sound = new Sound();
const world = new World();

let best = 0;
try {
  best = Number(localStorage.getItem(BEST_KEY) ?? 0) || 0;
} catch {
  best = 0;
}

function fitCanvas() {
  // The backing store is the full 1280x720 stage; CSS scales it to the window.
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
  canvas.style.width = `${Math.floor(FIELD.width * scale)}px`;
  canvas.style.height = `${Math.floor(FIELD.height * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

if (shot) {
  const screen = stageShot(shot, world);
  render(ctx, world, screen, { best });
  requestAnimationFrame(() => {
    render(ctx, world, screen, { best });
    window.__shotReady = true;
  });
} else {
  runGame();
}

function runGame() {
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let lastTime = performance.now();
  let lastStepX = 0; // thief position at the last footstep sound
  let lastStepY = 0;

  function announce(text) {
    if (status) status.textContent = text;
  }

  function handleEvents(events) {
    const s = world.state;
    if (events & EVENT_PICKUP) sound.pickup(s.lastPickupKind);
    if (events & EVENT_BANK) sound.bank();
    if (events & EVENT_ZAP) sound.zap();
    if (events & EVENT_DENIED) sound.denied();
    if (events & EVENT_SPOTTED) sound.spotted();
    if (events & EVENT_CLEAR) {
      if (s.floorIndex === FLOORS.length - 1) {
        screen = SCREEN_FINAL;
        sound.success(true);
        if (world.totalBanked > best) {
          best = world.totalBanked;
          try {
            localStorage.setItem(BEST_KEY, String(best));
          } catch { /* private mode: the best haul is only remembered for the night */ }
        }
        announce(`Clean getaway. Total haul $${world.totalBanked}.`);
      } else {
        screen = SCREEN_CLEAR;
        sound.success(false);
        announce(`Floor cleared. Banked $${s.banked}.`);
      }
    }
    if (events & EVENT_BUSTED) {
      screen = SCREEN_BUSTED;
      sound.busted();
      announce(`Busted. ${s.busted}`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    let elapsed = (now - lastTime) / 1000;
    lastTime = now;
    if (elapsed > 0.25) elapsed = 0.25;

    if (screen === SCREEN_TITLE) {
      if (input.wasPressed('Enter') || input.wasPressed('Space')) {
        sound.unlock();
        world.resetRun();
        screen = SCREEN_PLAY;
        announce('Floor 1 — Teller Hall. Meet the quota and bank it at the van.');
      }
    } else if (screen === SCREEN_PLAY) {
      if (input.wasPressed('Space') || input.wasPressed('KeyP')) {
        screen = SCREEN_PAUSED;
      } else {
        accumulator += elapsed;
        while (accumulator >= STEP) {
          accumulator -= STEP;
          const events = world.step(STEP, input.move());
          handleEvents(events);
          if (world.state.busted || world.state.cleared) break;
        }
        // A soft footstep tick every 90 px of travel, so the thief feels present.
        const p = world.state.player;
        const travelled = Math.hypot(p.x - lastStepX, p.y - lastStepY);
        if (p.moving && travelled > 90) {
          lastStepX = p.x;
          lastStepY = p.y;
          sound.tone(180, 120, 0.05, 'sine');
        }
      }
    } else if (screen === SCREEN_PAUSED) {
      if (input.wasPressed('Space') || input.wasPressed('KeyP') || input.wasPressed('Enter')) {
        screen = SCREEN_PLAY;
        lastTime = performance.now();
      }
    } else if (screen === SCREEN_BUSTED) {
      if (input.wasPressed('Enter')) {
        world.loadFloor(world.state.floorIndex);
        screen = SCREEN_PLAY;
        announce('Try the floor again.');
      }
    } else if (screen === SCREEN_CLEAR) {
      if (input.wasPressed('Enter')) {
        world.loadFloor(world.state.floorIndex + 1);
        screen = SCREEN_PLAY;
        announce(`${world.state.floor.name}. Quota $${world.state.floor.quota}.`);
      }
    } else if (screen === SCREEN_FINAL) {
      if (input.wasPressed('Enter')) {
        world.resetRun();
        screen = SCREEN_TITLE;
      }
    }

    render(ctx, world, screen, { best });
    input.endFrame();
  }
  requestAnimationFrame(frame);
}
