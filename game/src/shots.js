// The screenshot scenes behind ?shot=start|play|end. Each one is the real game,
// staged deterministically: the start scene idles the first floor under its
// title, the play scene drops into floor 2 mid-heist — loot already banked, the
// sack heavy, a camera cone sweeping toward the thief — and steps the true
// rules until the moment is live, and the end scene walks the thief into a
// patrol's cone until the alarm fills and the job is busted.

import { STEP } from './config.js';
import { SCREEN_BUSTED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const IDLE = { x: 0, y: 0 };

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it.
 */
export function stageShot(name, world) {
  if (name === 'play') return stagePlay(world);
  if (name === 'end') return stageEnd(world);
  world.resetRun();
  for (let i = 0; i < 3.5 / STEP; i += 1) world.step(STEP, IDLE);
  return SCREEN_TITLE;
}

/** Floor 2, mid-heist: $700 banked, a heavy sack, a camera cone closing in. */
function stagePlay(world) {
  world.resetRun();
  world.loadFloor(1);
  const s = world.state;
  // Three pieces are already in the van; the thief carries two gems and a bag.
  s.loot[0].taken = true; // gem in the lower-left room
  s.loot[1].taken = true; // bag in the top middle room
  s.loot[2].taken = true; // gold in the middle room
  const gemA = s.loot[4];
  const gemB = s.loot[7];
  const bag = s.loot[5];
  gemA.taken = true;
  gemB.taken = true;
  bag.taken = true;
  s.carried = [gemA, gemB, bag];
  s.carriedValue = gemA.value + gemB.value + bag.value;
  s.carriedWeight = gemA.weight + gemB.weight + bag.weight;
  s.banked = 700;
  world.totalBanked = 700;
  // Hugging the wall below the sweeping camera, watching the patrol cross.
  s.player.x = 850;
  s.player.y = 260;
  s.player.angle = -Math.PI / 2;
  // Step the real rules until a camera cone catches the thief and the alarm
  // has a bite, but the job is not yet blown: the held breath before the dash.
  for (let i = 0; i < 45 / STEP; i += 1) {
    world.step(STEP, IDLE);
    if (s.busted) break;
    if (s.seenNow && s.alarm >= 22) break;
  }
  return SCREEN_PLAY;
}

/** Floor 1, walked into the open: the alarm fills and the job is busted. */
function stageEnd(world) {
  world.resetRun();
  const s = world.state;
  s.player.x = 640;
  s.player.y = 170; // square in the teller-hall patrol's path
  for (let i = 0; i < 30 / STEP; i += 1) {
    world.step(STEP, IDLE);
    if (s.busted) break;
  }
  return SCREEN_BUSTED;
}
