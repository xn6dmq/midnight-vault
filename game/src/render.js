// The painter for MIDNIGHT VAULT: one canvas, flat shapes and glow. The look
// is a dark vault floor at night — deep blue carpet, stone walls with gold
// trim, loot that glows, vision cones in warm red and amber, and the getaway
// van waiting by the kerb. Screens: title, play, paused, busted, floor
// cleared and the final getaway.

import { ALARM, ARENA, CAMERA, FIELD, GUARD, HUD_HEIGHT, LOOT, THIEF } from './config.js';
import { FLOORS } from './floors.js';
import { makeRng } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_FINAL = 'final';

const INK = '#e8e6df';
const DIM = '#9aa3b2';
const GOLD = '#d4a017';
const WALL_FILL = '#3a3f4d';
const WALL_TOP = '#565d70';

/** Draw the whole frame for `screen` over the world's state. */
export function render(ctx, world, screen, opts) {
  const s = world.state;
  ctx.clearRect(0, 0, FIELD.width, FIELD.height);
  drawFloor(ctx, s);
  drawVan(ctx, s);
  drawLoot(ctx, s);
  drawLasers(ctx, s);
  drawCones(ctx, s);
  drawCameras(ctx, s);
  drawGuards(ctx, s);
  drawThief(ctx, s);
  drawHud(ctx, world, opts);
  if (s.seenFlash > 0 && screen === SCREEN_PLAY) {
    ctx.fillStyle = `rgba(220, 38, 38, ${0.10 * s.seenFlash})`;
    ctx.fillRect(0, HUD_HEIGHT, FIELD.width, FIELD.height - HUD_HEIGHT);
  }
  if (screen === SCREEN_TITLE) drawTitle(ctx, opts);
  if (screen === SCREEN_PAUSED) drawPanel(ctx, 'PAUSED', 'Take a breath. Press Space to slip back in.', INK);
  if (screen === SCREEN_BUSTED) {
    drawPanel(ctx, 'BUSTED', s.busted ?? 'The job is blown.', '#f87171', [
      `Banked this floor: $${s.banked}`,
      `Night's haul so far: $${world.totalBanked}`,
      'Press Enter to try the floor again.',
    ]);
  }
  if (screen === SCREEN_CLEAR) {
    drawPanel(ctx, 'FLOOR CLEARED', `${s.floor.name} — quota met.`, '#4ade80', [
      `Banked this floor: $${s.banked}`,
      `Night's haul so far: $${world.totalBanked}`,
      'Press Enter for the next floor.',
    ]);
  }
  if (screen === SCREEN_FINAL) {
    const grade = gradeNight(world.totalBanked);
    drawPanel(ctx, 'CLEAN GETAWAY', 'Every floor cleared. The van is gone before dawn.', '#4ade80', [
      `Total haul: $${world.totalBanked}`,
      `Grade for the night: ${grade}`,
      `Best haul: $${Math.max(opts.best, world.totalBanked)}`,
      'Press Enter to run it all again.',
    ]);
  }
}

/** Grade the night by the total haul, from D to S. */
function gradeNight(total) {
  if (total >= 6800) return 'S — Ghost';
  if (total >= 5900) return 'A — Professional';
  if (total >= 5000) return 'B — Smooth';
  if (total >= 4200) return 'C — Loud but rich';
  return 'D — Lucky';
}

/** The vault floor: dark carpet tiles with a faint checker and gold flecks. */
function drawFloor(ctx, s) {
  const rng = makeRng(1000 + s.floorIndex * 77);
  ctx.fillStyle = '#141a2e';
  ctx.fillRect(0, HUD_HEIGHT, FIELD.width, FIELD.height - HUD_HEIGHT);
  const tile = 62;
  for (let y = ARENA.y; y < ARENA.y + ARENA.height; y += tile) {
    for (let x = ARENA.x; x < ARENA.x + ARENA.width; x += tile) {
      const col = (Math.floor((x - ARENA.x) / tile) + Math.floor((y - ARENA.y) / tile)) % 2;
      ctx.fillStyle = col ? '#171d33' : '#12172a';
      ctx.fillRect(x, y, tile, tile);
    }
  }
  // Gold flecks scattered across the carpet.
  ctx.fillStyle = 'rgba(212, 160, 23, 0.20)';
  for (let i = 0; i < 90; i++) {
    const x = ARENA.x + rng() * ARENA.width;
    const y = ARENA.y + rng() * ARENA.height;
    ctx.fillRect(x, y, 3, 3);
  }
  // Outer walls.
  ctx.fillStyle = WALL_FILL;
  ctx.fillRect(0, HUD_HEIGHT, FIELD.width, ARENA.y - HUD_HEIGHT);
  ctx.fillRect(0, ARENA.y, ARENA.x, ARENA.height);
  ctx.fillRect(ARENA.x + ARENA.width, ARENA.y, ARENA.x, ARENA.height);
  ctx.fillRect(0, ARENA.y + ARENA.height, FIELD.width, FIELD.height - ARENA.y - ARENA.height);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(ARENA.x, ARENA.y, ARENA.width, ARENA.height);
  // Inner walls: stone blocks with a lit top edge.
  for (const w of s.floor.walls) {
    ctx.fillStyle = WALL_FILL;
    ctx.fillRect(w.x, w.y, w.width, w.height);
    ctx.fillStyle = WALL_TOP;
    ctx.fillRect(w.x, w.y, w.width, 4);
    ctx.strokeStyle = 'rgba(212, 160, 23, 0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.width - 1, w.height - 1);
  }
}

/** The getaway van, parked inside the floor with its doors open to the night. */
function drawVan(ctx, s) {
  const v = s.floor.van;
  ctx.save();
  ctx.fillStyle = '#1f2937';
  roundRect(ctx, v.x, v.y, v.width, v.height, 10);
  ctx.fill();
  ctx.fillStyle = '#374151';
  roundRect(ctx, v.x + 8, v.y + 8, v.width - 16, v.height - 34, 6);
  ctx.fill();
  // Headlights and the open rear doors.
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(v.x + v.width - 12, v.y + 16, 4, 0, Math.PI * 2);
  ctx.arc(v.x + v.width - 12, v.y + v.height - 26, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3;
  ctx.strokeRect(v.x + 2, v.y + 2, v.width - 4, v.height - 4);
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GETAWAY VAN', v.x + v.width / 2, v.y + v.height - 8);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Loot that is still on the floor, glowing so it reads at a glance. */
function drawLoot(ctx, s) {
  for (const item of s.loot) {
    if (item.taken) continue;
    const bob = Math.sin(s.time * 2.4 + item.bob) * 2;
    const y = item.y + bob;
    const color = LOOT[item.kind].color;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    if (item.kind === 'bag') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(item.x, y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#052e16';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', item.x, y + 1);
    } else if (item.kind === 'gem') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(item.x, y - 14);
      ctx.lineTo(item.x + 11, y);
      ctx.lineTo(item.x, y + 14);
      ctx.lineTo(item.x - 11, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(item.x, y - 8);
      ctx.lineTo(item.x + 5, y);
      ctx.lineTo(item.x, y + 2);
      ctx.lineTo(item.x - 5, y);
      ctx.closePath();
      ctx.fill();
    } else {
      // Gold bars: three stacked ingots.
      ctx.fillStyle = color;
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(item.x - 12 + i * 3, y + 6 - i * 7, 20, 6);
      }
      ctx.strokeStyle = '#a16207';
      ctx.lineWidth = 1;
      ctx.strokeRect(item.x - 12, y - 8, 20, 20);
    }
    ctx.restore();
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`$${item.value}`, item.x, y + 26);
  }
}

/** Laser tripwires: bright red while live, dim and dashed while recharging. */
function drawLasers(ctx, s) {
  for (const l of s.lasers) {
    const cycle = (s.time + l.phase) % l.period;
    const live = cycle < l.period * l.duty;
    ctx.save();
    ctx.strokeStyle = live ? '#ef4444' : 'rgba(239, 68, 68, 0.25)';
    ctx.lineWidth = live ? 3 : 1.5;
    ctx.setLineDash(live ? [] : [6, 6]);
    if (live) {
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
    }
    ctx.beginPath();
    ctx.moveTo(l.x1, l.y1);
    ctx.lineTo(l.x2, l.y2);
    ctx.stroke();
    ctx.setLineDash([]);
    // Emitters at both ends.
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(l.x1 - 4, l.y1 - 4, 8, 8);
    ctx.fillRect(l.x2 - 4, l.y2 - 4, 8, 8);
    ctx.restore();
  }
}

/** Vision cones: translucent wedges, red for guards, amber for cameras. */
function drawCones(ctx, s) {
  for (const g of s.guards) {
    drawCone(ctx, g.x, g.y, g.angle, GUARD.coneRange, GUARD.coneHalfAngle, g.chasing ? 'rgba(239,68,68,0.34)' : 'rgba(239,68,68,0.20)');
  }
  for (const c of s.cameras) {
    drawCone(ctx, c.x, c.y, c.angle ?? c.base, CAMERA.coneRange, CAMERA.coneHalfAngle, 'rgba(245,158,11,0.20)');
  }
}

function drawCone(ctx, x, y, angle, range, half, fill) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - half, angle + half);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Wall cameras: a small dome with a sweeping lens. */
function drawCameras(ctx, s) {
  for (const c of s.cameras) {
    ctx.save();
    ctx.fillStyle = '#d1d5db';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** Guards: navy uniforms, a cap brim, and the direction they face. */
function drawGuards(ctx, s) {
  for (const g of s.guards) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = g.chasing ? '#7f1d1d' : '#1e3a5f';
    ctx.beginPath();
    ctx.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Cap brim points where the guard looks.
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(g.x + Math.cos(g.angle) * 10, g.y + Math.sin(g.angle) * 10);
    ctx.arc(g.x, g.y, 6, g.angle - 0.7, g.angle + 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(g.x, g.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** The thief: a hooded figure in dark violet, mask across the eyes, sack on the back. */
function drawThief(ctx, s) {
  const p = s.player;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#4c1d95';
  ctx.beginPath();
  ctx.arc(p.x, p.y, THIEF.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // The sack, swelling with the haul.
  if (s.carriedWeight > 0) {
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(p.x - Math.cos(p.angle) * 12, p.y - Math.sin(p.angle) * 12, 5 + s.carriedWeight * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Hood and mask: the eyes look where the thief moves.
  ctx.fillStyle = '#1e1b4b';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f8fafc';
  const ex = Math.cos(p.angle) * 4;
  const ey = Math.sin(p.angle) * 4;
  ctx.beginPath();
  ctx.arc(p.x + ex - 2.5, p.y + ey - 1, 1.8, 0, Math.PI * 2);
  ctx.arc(p.x + ex + 2.5, p.y + ey - 1, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The HUD bar: floor, quota, sack, alarm meter, clock and the night's haul. */
function drawHud(ctx, world, opts) {
  const s = world.state;
  ctx.fillStyle = '#0b0f1c';
  ctx.fillRect(0, 0, FIELD.width, HUD_HEIGHT);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, HUD_HEIGHT - 1);
  ctx.lineTo(FIELD.width, HUD_HEIGHT - 1);
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(s.floor.name, 24, 22);
  ctx.fillStyle = DIM;
  ctx.font = '13px sans-serif';
  ctx.fillText(`Floor ${s.floorIndex + 1} of ${FLOORS.length}  ·  Best haul $${opts.best}`, 24, 46);

  // Quota bar: banked vs the floor's quota.
  drawBar(ctx, 330, 14, 260, 16, s.banked / s.floor.quota, '#4ade80', `QUOTA $${s.banked} / $${s.floor.quota}`);

  // Sack: carried value and weight.
  ctx.fillStyle = INK;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`SACK $${s.carriedValue}`, 620, 22);
  ctx.fillStyle = s.carriedWeight >= THIEF.carryLimit ? '#f87171' : DIM;
  ctx.font = '13px sans-serif';
  ctx.fillText(`weight ${s.carriedWeight}/${THIEF.carryLimit}`, 620, 46);

  // Alarm meter: green to red as it climbs.
  const alarmFrac = s.alarm / ALARM.max;
  const alarmColor = alarmFrac > 0.66 ? '#ef4444' : alarmFrac > 0.33 ? '#f59e0b' : '#4ade80';
  drawBar(ctx, 800, 14, 200, 16, alarmFrac, alarmColor, `ALARM ${Math.round(s.alarm)}%`);
  if (s.seenNow) {
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('! SEEN !', 1012, 22);
  }

  // Clock and the night's total.
  const t = Math.max(0, Math.ceil(s.timeLeft));
  ctx.fillStyle = t <= 20 ? '#f87171' : INK;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, 1256, 22);
  ctx.fillStyle = DIM;
  ctx.font = '13px sans-serif';
  ctx.fillText(`HAUL $${world.totalBanked + s.banked}`, 1256, 46);
  ctx.textAlign = 'left';
}

function drawBar(ctx, x, y, w, h, frac, color, label) {
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  ctx.strokeStyle = 'rgba(232,230,223,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = INK;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y + h + 12);
}

/** The title screen: the game's name, the job, and how to run it. */
function drawTitle(ctx, opts) {
  ctx.fillStyle = 'rgba(5, 8, 18, 0.78)';
  ctx.fillRect(0, HUD_HEIGHT, FIELD.width, FIELD.height - HUD_HEIGHT);
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('MIDNIGHT VAULT', FIELD.width / 2, 250);
  ctx.fillStyle = INK;
  ctx.font = '22px sans-serif';
  ctx.fillText('A top-down heist in four floors', FIELD.width / 2, 300);
  ctx.fillStyle = DIM;
  ctx.font = '17px sans-serif';
  const lines = [
    'WASD or arrow keys — move the thief',
    'Grab loot until the floor quota is met — your sack holds only so much',
    'Bank the haul at the GETAWAY VAN, then clear the next floor',
    'Guards, cameras and lasers all feed the alarm meter. Fill it and you are busted.',
    '',
    'Press Enter to start the job',
  ];
  lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 350 + i * 28));
  if (opts.best > 0) {
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`Best haul: $${opts.best}`, FIELD.width / 2, 350 + lines.length * 28 + 6);
  }
  ctx.textAlign = 'left';
}

/** A centred overlay panel for pause / busted / clear / final screens. */
function drawPanel(ctx, title, subtitle, color, lines = []) {
  const w = 620;
  const h = 150 + lines.length * 28;
  const x = (FIELD.width - w) / 2;
  const y = (FIELD.height - h) / 2;
  ctx.fillStyle = 'rgba(5, 8, 18, 0.82)';
  ctx.fillRect(0, HUD_HEIGHT, FIELD.width, FIELD.height - HUD_HEIGHT);
  ctx.fillStyle = '#0b0f1c';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText(title, FIELD.width / 2, y + 58);
  ctx.fillStyle = INK;
  ctx.font = '18px sans-serif';
  ctx.fillText(subtitle, FIELD.width / 2, y + 96);
  ctx.fillStyle = DIM;
  ctx.font = '16px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, y + 128 + i * 28));
  ctx.textAlign = 'left';
}
