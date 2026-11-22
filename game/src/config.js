// MIDNIGHT VAULT — tuning constants. The stage is a fixed 1280x720 canvas; the
// vault floor sits below a 64 px HUD bar. All speeds are pixels per second, all
// alarm numbers are points on a 0..100 meter.

export const FIELD = { width: 1280, height: 720 };
export const HUD_HEIGHT = 64;

// Playable rectangle inside the outer walls.
export const ARENA = { x: 20, y: 84, width: 1240, height: 616 };

export const STEP = 1 / 60;

// The thief: quick when empty-handed, slower the heavier the sack gets.
export const THIEF = {
  radius: 13,
  speed: 172,
  carryLimit: 10, // total weight the sack holds before it is full
  slowPerWeight: 0.07, // speed lost per unit of weight carried
  minSpeedFactor: 0.45, // even a full sack still lets the thief shuffle
  bankTime: 0.35, // seconds standing at the van to unload the sack
};

// A guard patrols a waypoint loop and looks where he walks. His cone is the
// thing to read before you move.
export const GUARD = {
  radius: 13,
  coneRange: 200,
  coneHalfAngle: 0.55, // about 31 degrees either side of facing
  turnRate: 3.6, // radians per second toward the next waypoint
  detectRate: 55, // alarm per second at point blank, less with distance
};

// A wall camera sweeps back and forth around its base angle.
export const CAMERA = {
  coneRange: 180,
  coneHalfAngle: 0.44,
  detectRate: 42,
};

// The alarm fills when anyone sees the thief, drains when nobody does.
// A laser trip is a loud spike; a full meter (or an empty clock) busts the job.
export const ALARM = {
  max: 100,
  decayPerSecond: 12,
  decayDelay: 0.8, // seconds unseen before the meter starts falling
  laserTrip: 55,
  hurryPerAlarm: 0.006, // guards speed up as the alarm climbs
};

// What the loot is worth and how much of the sack it takes.
export const LOOT = {
  bag: { label: 'cash bag', weight: 2, color: '#4ade80' },
  gem: { label: 'gem', weight: 1, color: '#67e8f9' },
  gold: { label: 'gold bars', weight: 3, color: '#facc15' },
};
