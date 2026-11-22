// The simulation of MIDNIGHT VAULT: the thief, the patrols, the cameras, the
// lasers and the one alarm meter they all feed. No drawing happens here —
// render.js paints whatever this module's state says. The world advances in
// fixed steps and reports what happened as event flags.

import { ALARM, ARENA, CAMERA, GUARD, LOOT, STEP, THIEF } from './config.js';
import { FLOORS } from './floors.js';

export const EVENT_PICKUP = 1;
export const EVENT_BANK = 2;
export const EVENT_ZAP = 4;
export const EVENT_DENIED = 8;
export const EVENT_CLEAR = 16;
export const EVENT_BUSTED = 32;
export const EVENT_SPOTTED = 64;

const TAU = Math.PI * 2;

function clampAngle(a) {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}

/** Shortest distance from point (px,py) to the segment (x1,y1)-(x2,y2). */
export function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** True when the segment (x1,y1)-(x2,y2) touches rectangle r. */
function segmentHitsRect(x1, y1, x2, y2, r) {
  if (x1 >= r.x && x1 <= r.x + r.width && y1 >= r.y && y1 <= r.y + r.height) return true;
  if (x2 >= r.x && x2 <= r.x + r.width && y2 >= r.y && y2 <= r.y + r.height) return true;
  const edges = [
    [r.x, r.y, r.x + r.width, r.y],
    [r.x + r.width, r.y, r.x + r.width, r.y + r.height],
    [r.x + r.width, r.y + r.height, r.x, r.y + r.height],
    [r.x, r.y + r.height, r.x, r.y],
  ];
  for (const [ax, ay, bx, by] of edges) {
    const d = (x2 - x1) * (by - ay) - (y2 - y1) * (bx - ax);
    if (d === 0) continue;
    const t = ((ax - x1) * (by - ay) - (ay - y1) * (bx - ax)) / d;
    const u = ((ax - x1) * (y2 - y1) - (ay - y1) * (x2 - x1)) / d;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true;
  }
  return false;
}

/** True when a circle of radius `rad` at (x,y) overlaps rectangle r. */
function circleHitsRect(x, y, rad, r) {
  const cx = Math.max(r.x, Math.min(x, r.x + r.width));
  const cy = Math.max(r.y, Math.min(y, r.y + r.height));
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy < rad * rad;
}

/** Can a watcher at (ox,oy) see (tx,ty)? Walls block the line of sight. */
function hasLineOfSight(ox, oy, tx, ty, walls) {
  for (const w of walls) {
    if (segmentHitsRect(ox, oy, tx, ty, w)) return false;
  }
  return true;
}

export class World {
  constructor() {
    this.state = null;
    this.totalBanked = 0;
    this.resetRun();
  }

  /** Start a fresh night: floor 1, empty sack, clean alarm. */
  resetRun() {
    this.totalBanked = 0;
    this.loadFloor(0);
  }

  /** Build the live state for floor `index` from its layout. */
  loadFloor(index) {
    const def = FLOORS[index];
    this.state = {
      floorIndex: index,
      floor: def,
      timeLeft: def.time,
      time: 0,
      player: {
        x: def.playerStart.x,
        y: def.playerStart.y,
        angle: 0,
        moving: false,
      },
      loot: def.loot.map(([x, y, kind, value]) => ({
        x, y, kind, value,
        weight: LOOT[kind].weight,
        taken: false,
        bob: Math.random() * TAU,
      })),
      guards: def.guards.map((g) => ({
        speed: g.speed,
        path: g.path,
        leg: 0,
        x: g.path[0][0],
        y: g.path[0][1],
        angle: 0,
        chasing: false,
      })),
      cameras: def.cameras.map((c) => ({ ...c })),
      lasers: def.lasers.map((l) => ({ ...l, lastTrip: -99 })),
      carried: [],
      carriedValue: 0,
      carriedWeight: 0,
      banked: 0,
      bankProgress: 0,
      alarm: 0,
      unseenFor: 99,
      seenNow: false,
      seenFlash: 0,
      busted: null,
      cleared: false,
      lastPickupKind: null,
    };
  }

  /** Advance one fixed step. `move` is a normalised {x,y} direction. Returns events. */
  step(dt, move) {
    const s = this.state;
    if (!s || s.busted || s.cleared) return 0;
    let events = 0;
    s.time += dt;
    s.timeLeft -= dt;

    this.moveThief(s, dt, move);
    this.moveGuards(s, dt);
    events |= this.checkLoot(s);
    events |= this.checkBanking(s, dt);
    events |= this.checkLasers(s);
    const seen = this.checkVision(s, dt);
    if (seen && !s.seenNow) events |= EVENT_SPOTTED;
    s.seenNow = seen;
    if (seen) {
      s.unseenFor = 0;
    } else {
      s.unseenFor += dt;
      if (s.unseenFor > ALARM.decayDelay) {
        s.alarm = Math.max(0, s.alarm - ALARM.decayPerSecond * dt);
      }
    }
    if (s.seenFlash > 0) s.seenFlash = Math.max(0, s.seenFlash - dt * 2.5);

    if (s.alarm >= ALARM.max) {
      s.busted = 'The alarm hit full — security locked the floor down.';
      return events | EVENT_BUSTED;
    }
    if (s.timeLeft <= 0) {
      s.timeLeft = 0;
      s.busted = 'Out of time — the vault sealed itself at dawn.';
      return events | EVENT_BUSTED;
    }
    if (s.banked >= s.floor.quota) {
      s.cleared = true;
      this.totalBanked += s.banked;
      return events | EVENT_CLEAR;
    }
    return events;
  }

  /** Move the thief, sliding along walls; heavier sacks mean slower feet. */
  moveThief(s, dt, move) {
    const p = s.player;
    p.moving = move.x !== 0 || move.y !== 0;
    const slow = Math.max(
      THIEF.minSpeedFactor,
      1 - s.carriedWeight * THIEF.slowPerWeight,
    );
    const speed = THIEF.speed * slow;
    if (p.moving) p.angle = Math.atan2(move.y, move.x);
    const nx = p.x + move.x * speed * dt;
    const ny = p.y + move.y * speed * dt;
    if (!this.hitsWall(s, nx, p.y)) p.x = nx;
    if (!this.hitsWall(s, p.x, ny)) p.y = ny;
    p.x = Math.max(ARENA.x + THIEF.radius, Math.min(ARENA.x + ARENA.width - THIEF.radius, p.x));
    p.y = Math.max(ARENA.y + THIEF.radius, Math.min(ARENA.y + ARENA.height - THIEF.radius, p.y));
  }

  hitsWall(s, x, y) {
    for (const w of s.floor.walls) {
      if (circleHitsRect(x, y, THIEF.radius, w)) return true;
    }
    return false;
  }

  /** Walk each guard along its waypoint loop, turning smoothly to face the way. */
  moveGuards(s, dt) {
    const hurry = 1 + s.alarm * ALARM.hurryPerAlarm;
    for (const g of s.guards) {
      const target = g.path[(g.leg + 1) % g.path.length];
      const dx = target[0] - g.x;
      const dy = target[1] - g.y;
      const dist = Math.hypot(dx, dy);
      const want = Math.atan2(dy, dx);
      const diff = clampAngle(want - g.angle);
      const turn = Math.max(-GUARD.turnRate * dt, Math.min(GUARD.turnRate * dt, diff));
      g.angle += turn;
      if (dist < 4) {
        g.leg = (g.leg + 1) % g.path.length;
        continue;
      }
      const stepLen = Math.min(dist, g.speed * hurry * dt);
      g.x += (dx / dist) * stepLen;
      g.y += (dy / dist) * stepLen;
    }
  }

  /** Grab loot the thief walks over, if the sack has room for it. */
  checkLoot(s) {
    const p = s.player;
    let events = 0;
    for (const item of s.loot) {
      if (item.taken) continue;
      if (Math.hypot(item.x - p.x, item.y - p.y) > THIEF.radius + 16) continue;
      if (s.carriedWeight + item.weight > THIEF.carryLimit) {
        if (!s.deniedAt || s.time - s.deniedAt > 0.6) {
          s.deniedAt = s.time;
          events |= EVENT_DENIED;
        }
        continue;
      }
      item.taken = true;
      s.carried.push(item);
      s.carriedValue += item.value;
      s.carriedWeight += item.weight;
      s.lastPickupKind = item.kind;
      events |= EVENT_PICKUP;
    }
    return events;
  }

  /** Standing at the van unloads the sack into the night's haul. */
  checkBanking(s, dt) {
    const v = s.floor.van;
    const p = s.player;
    const inside =
      p.x > v.x - 6 && p.x < v.x + v.width + 6 &&
      p.y > v.y - 6 && p.y < v.y + v.height + 6;
    if (!inside || s.carried.length === 0) {
      s.bankProgress = 0;
      return 0;
    }
    s.bankProgress += dt;
    if (s.bankProgress < THIEF.bankTime) return 0;
    s.bankProgress = 0;
    s.banked += s.carriedValue;
    s.carried = [];
    s.carriedValue = 0;
    s.carriedWeight = 0;
    return EVENT_BANK;
  }

  /** A live laser the thief crosses trips the alarm — once per blink cycle. */
  checkLasers(s) {
    let events = 0;
    const p = s.player;
    for (const l of s.lasers) {
      const cycle = (s.time + l.phase) % l.period;
      const live = cycle < l.period * l.duty;
      if (!live) continue;
      if (distanceToSegment(p.x, p.y, l.x1, l.y1, l.x2, l.y2) > THIEF.radius + 2) continue;
      if (s.time - l.lastTrip < 1.2) continue;
      l.lastTrip = s.time;
      s.alarm = Math.min(ALARM.max, s.alarm + ALARM.laserTrip);
      s.seenFlash = 1;
      events |= EVENT_ZAP;
    }
    return events;
  }

  /** Guards and cameras fill the alarm while the thief is inside a cone. */
  checkVision(s, dt) {
    const p = s.player;
    let seen = false;
    for (const g of s.guards) {
      if (this.inCone(s, g.x, g.y, g.angle, GUARD.coneRange, GUARD.coneHalfAngle)) {
        const d = Math.hypot(p.x - g.x, p.y - g.y);
        s.alarm = Math.min(ALARM.max, s.alarm + GUARD.detectRate * (1 - d / (GUARD.coneRange * 1.6)) * dt);
        g.chasing = true;
        seen = true;
      } else {
        g.chasing = false;
      }
    }
    for (const c of s.cameras) {
      const angle = c.base + Math.sin((s.time * TAU) / c.period + c.phase) * c.sweep;
      c.angle = angle;
      if (this.inCone(s, c.x, c.y, angle, CAMERA.coneRange, CAMERA.coneHalfAngle)) {
        const d = Math.hypot(p.x - c.x, p.y - c.y);
        s.alarm = Math.min(ALARM.max, s.alarm + CAMERA.detectRate * (1 - d / (CAMERA.coneRange * 1.6)) * dt);
        seen = true;
      }
    }
    if (seen) s.seenFlash = 1;
    return seen;
  }

  /** Is the thief inside a watcher's cone with a clear line of sight? */
  inCone(s, ox, oy, angle, range, halfAngle) {
    const p = s.player;
    const dx = p.x - ox;
    const dy = p.y - oy;
    const dist = Math.hypot(dx, dy);
    if (dist > range) return false;
    if (Math.abs(clampAngle(Math.atan2(dy, dx) - angle)) > halfAngle) return false;
    return hasLineOfSight(ox, oy, p.x, p.y, s.floor.walls);
  }
}
