import {
  CheckpointDef,
  CoinDef,
  Difficulty,
  InteractSwitchDef,
  LevelDef,
  ObstacleDef,
  PlatformDef,
  WorldId,
} from '../types/game';
import { getWorldById } from '../data/worlds';
import {
  Box3D,
  boxesOverlap3D,
  distanceXZ,
  getObstacleSweptBox,
  getPlatformSweptBox,
} from './spatialBounds';

export type ProcSegmentKind =
  | 'strides'
  | 'zigzag'
  | 'crouch_bridge'
  | 'moving_lateral'
  | 'moving_vertical'
  | 'moving_forward'
  | 'vanishing'
  | 'spiral_climb'
  | 'sweeper'
  | 'pendulum'
  | 'bounce'
  | 'narrow'
  | 'gate_switch'
  | 'timed_curved_bridge'
  | 'timed_gauntlet_bridge'
  | 'timed_moving_bridge'
  | 'timed_vanish_bridge'
  | 'moving_block_gauntlet'
  | 'moving_wall_bridge'
  | 'crusher_corridor'
  | 'laser_patrol'
  | 'ice_slide'
  | 'split_fork'
  | 'cascade_drop'
  | 'secret_branch';

export type StartPadStyle = 'compact' | 'runway' | 'wide_plaza' | 'stepped' | 'l_launch';

interface DifficultyProfile {
  segmentCount: number;
  gapMin: number;
  gapMax: number;
  stepMax: number;
  widthScale: number;
  speedScale: number;
  stayTime: number;
  turnProbability: number;
  bridgeWidthScale: number;
  bridgeLengthScale: number;
}

const DIFF_PROFILES: Record<Difficulty, DifficultyProfile> = {
  Iniciante: {
    segmentCount: 5,
    gapMin: 2.1,
    gapMax: 2.9,
    stepMax: 0.9,
    widthScale: 1.12,
    speedScale: 0.78,
    stayTime: 1.65,
    turnProbability: 0.3,
    bridgeWidthScale: 1.08,
    bridgeLengthScale: 0.88,
  },
  Fácil: {
    segmentCount: 5,
    gapMin: 2.45,
    gapMax: 3.35,
    stepMax: 1.2,
    widthScale: 1.0,
    speedScale: 0.92,
    stayTime: 1.4,
    turnProbability: 0.38,
    bridgeWidthScale: 0.98,
    bridgeLengthScale: 0.96,
  },
  Intermediário: {
    segmentCount: 6,
    gapMin: 2.85,
    gapMax: 4.0,
    stepMax: 1.5,
    widthScale: 0.92,
    speedScale: 1.08,
    stayTime: 1.18,
    turnProbability: 0.45,
    bridgeWidthScale: 0.9,
    bridgeLengthScale: 1.06,
  },
  Difícil: {
    segmentCount: 7,
    gapMin: 3.25,
    gapMax: 4.6,
    stepMax: 1.8,
    widthScale: 0.84,
    speedScale: 1.24,
    stayTime: 0.98,
    turnProbability: 0.52,
    bridgeWidthScale: 0.82,
    bridgeLengthScale: 1.15,
  },
  Extremo: {
    segmentCount: 8,
    gapMin: 3.6,
    gapMax: 5.15,
    stepMax: 2.05,
    widthScale: 0.78,
    speedScale: 1.42,
    stayTime: 0.84,
    turnProbability: 0.6,
    bridgeWidthScale: 0.75,
    bridgeLengthScale: 1.24,
  },
};

const BRIDGE_SEGMENTS: ProcSegmentKind[] = [
  'gate_switch',
  'timed_curved_bridge',
  'timed_gauntlet_bridge',
  'timed_moving_bridge',
  'timed_vanish_bridge',
];

const LETHAL_SEGMENTS: ProcSegmentKind[] = [
  'sweeper',
  'pendulum',
  'moving_block_gauntlet',
  'moving_wall_bridge',
  'crusher_corridor',
  'laser_patrol',
];

const WORLD_SEGMENT_WEIGHTS: Record<WorldId, ProcSegmentKind[]> = {
  urban: [
    'strides',
    'crouch_bridge',
    'moving_lateral',
    'narrow',
    'spiral_climb',
    'sweeper',
    'moving_block_gauntlet',
    'moving_wall_bridge',
    'timed_curved_bridge',
    'timed_gauntlet_bridge',
    'gate_switch',
    'split_fork',
    'bounce',
    'cascade_drop',
    'secret_branch',
  ],
  forest: [
    'strides',
    'bounce',
    'zigzag',
    'narrow',
    'pendulum',
    'vanishing',
    'spiral_climb',
    'timed_vanish_bridge',
    'timed_curved_bridge',
    'moving_block_gauntlet',
    'gate_switch',
    'split_fork',
    'cascade_drop',
    'secret_branch',
  ],
  volcanic: [
    'strides',
    'moving_lateral',
    'moving_forward',
    'bounce',
    'vanishing',
    'sweeper',
    'pendulum',
    'crusher_corridor',
    'moving_wall_bridge',
    'timed_vanish_bridge',
    'timed_gauntlet_bridge',
    'spiral_climb',
    'split_fork',
    'secret_branch',
  ],
  frozen: [
    'ice_slide',
    'strides',
    'zigzag',
    'vanishing',
    'moving_vertical',
    'narrow',
    'pendulum',
    'moving_block_gauntlet',
    'timed_moving_bridge',
    'timed_curved_bridge',
    'gate_switch',
    'split_fork',
    'cascade_drop',
    'secret_branch',
  ],
  cyberpunk: [
    'crouch_bridge',
    'moving_lateral',
    'moving_forward',
    'sweeper',
    'laser_patrol',
    'moving_wall_bridge',
    'crusher_corridor',
    'timed_gauntlet_bridge',
    'timed_moving_bridge',
    'bounce',
    'vanishing',
    'narrow',
    'split_fork',
    'spiral_climb',
    'secret_branch',
  ],
  desert: [
    'strides',
    'zigzag',
    'crouch_bridge',
    'pendulum',
    'crusher_corridor',
    'moving_block_gauntlet',
    'vanishing',
    'spiral_climb',
    'narrow',
    'timed_curved_bridge',
    'gate_switch',
    'split_fork',
    'cascade_drop',
    'secret_branch',
  ],
  space: [
    'strides',
    'bounce',
    'moving_lateral',
    'moving_forward',
    'moving_vertical',
    'vanishing',
    'sweeper',
    'laser_patrol',
    'timed_moving_bridge',
    'timed_gauntlet_bridge',
    'narrow',
    'split_fork',
    'spiral_climb',
    'secret_branch',
  ],
  medieval: [
    'strides',
    'narrow',
    'crouch_bridge',
    'sweeper',
    'pendulum',
    'crusher_corridor',
    'moving_wall_bridge',
    'spiral_climb',
    'vanishing',
    'timed_curved_bridge',
    'timed_vanish_bridge',
    'gate_switch',
    'split_fork',
    'cascade_drop',
    'secret_branch',
  ],
};

interface RunSignature {
  levelId: string;
  seed: number;
  startStyle: StartPadStyle;
  segments: ProcSegmentKind[];
  turns: number[];
}

const RECENT_RUNS: RunSignature[] = [];
const MAX_HISTORY = 14;

export function clearProceduralHistory(): void {
  RECENT_RUNS.length = 0;
}

export function createRandomSeed(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return (arr[0] ^ (Date.now() & 0xffffffff)) >>> 0;
  }
  return ((Math.random() * 0xffffffff) ^ Date.now()) >>> 0;
}

function makePrng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isTooSimilarToRecent(
  levelId: string,
  startStyle: StartPadStyle,
  segments: ProcSegmentKind[],
  turns: number[]
): boolean {
  const recentWindow = RECENT_RUNS.slice(-7);
  for (let r = recentWindow.length - 1; r >= 0; r--) {
    const prev = recentWindow[r];
    const isSameLevel = prev.levelId === levelId;
    const isMostRecent = r === recentWindow.length - 1;

    if (prev.segments.length === segments.length) {
      let samePos = 0;
      for (let i = 0; i < segments.length; i++) {
        if (prev.segments[i] === segments[i]) samePos++;
      }
      if (samePos === segments.length) return true;
      if ((isMostRecent || isSameLevel) && samePos / segments.length > 0.45) return true;
    }

    if (
      (isMostRecent || isSameLevel) &&
      prev.startStyle === startStyle &&
      prev.segments[0] === segments[0] &&
      prev.turns[0] === turns[0]
    ) {
      return true;
    }
  }
  return false;
}

function recordRunSignature(sig: RunSignature): void {
  RECENT_RUNS.push(sig);
  if (RECENT_RUNS.length > MAX_HISTORY) {
    RECENT_RUNS.shift();
  }
}

// Heading enum: -1 = Left (-X), 0 = North (-Z), +1 = Right (+X)
type HeadingDir = -1 | 0 | 1;

function headingToAxes(dir: HeadingDir): {
  fx: number;
  fz: number;
  rx: number;
  rz: number;
} {
  if (dir === -1) {
    return { fx: -1, fz: 0, rx: 0, rz: -1 };
  }
  if (dir === 1) {
    return { fx: 1, fz: 0, rx: 0, rz: 1 };
  }
  return { fx: 0, fz: -1, rx: 1, rz: 0 };
}

function orientSize(
  dir: HeadingDir,
  crossW: number,
  alongD: number
): { w: number; d: number } {
  return dir === 0 ? { w: crossW, d: alongD } : { w: alongD, d: crossW };
}

function validateCourseReachability(
  platforms: PlatformDef[],
  anchors: Array<{ x: number; y: number; z: number; fromBounce?: boolean }>,
  isSpace: boolean
): boolean {
  if (platforms.length < 5 || anchors.length < 3) return false;
  const maxGap = isSpace ? 8.4 : 6.6;
  const maxRise = isSpace ? 4.2 : 2.7;

  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i - 1];
    const b = anchors[i];
    const distXZ = Math.hypot(b.x - a.x, b.z - a.z);
    const dy = b.y - a.y;
    const allowedRise = a.fromBounce ? 5.6 : maxRise;
    const allowedGap = a.fromBounce ? 9.5 : maxGap;
    if (distXZ > allowedGap + 14.5) return false;
    if (dy > allowedRise) return false;
  }
  return true;
}

function validateCourseSpatialClearance(
  platforms: PlatformDef[],
  obstacles: ObstacleDef[]
): boolean {
  const towerCores = platforms.filter((p) => p.kind === 'climb' && p.h >= 3.5);
  const obsBoxes = obstacles.map((o) => getObstacleSweptBox(o, 0.2, 0.1));

  // Ensure no obstacle (across its full swept range) enters or clips any tower core
  for (let i = 0; i < obstacles.length; i++) {
    const oBox = obsBoxes[i];
    for (const tower of towerCores) {
      const tBox = getPlatformSweptBox(tower, 0, 0);
      if (distanceXZ(oBox, tBox) < 2.2) return false;
      if (boxesOverlap3D(oBox, tBox)) return false;
    }
    // Ensure no two obstacles have overlapping swept trajectories
    for (let j = i + 1; j < obstacles.length; j++) {
      if (boxesOverlap3D(oBox, obsBoxes[j])) return false;
    }
  }
  return true;
}

const START_STYLES: StartPadStyle[] = ['compact', 'runway', 'wide_plaza', 'stepped', 'l_launch'];

export function generateProceduralLevel(baseLevel: LevelDef, forcedSeed?: number): LevelDef {
  const world = getWorldById(baseLevel.worldId);
  const profile = DIFF_PROFILES[baseLevel.difficulty];
  const isSpace = world.id === 'space';
  const gapMult = isSpace ? 1.14 : 1.0;

  let chosenLevel: LevelDef | null = null;
  let chosenSig: RunSignature | null = null;

  const maxAttempts = forcedSeed !== undefined ? 1 : 28;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seed = forcedSeed !== undefined ? forcedSeed : createRandomSeed();
    const rng = makePrng(seed);

    const startStyle = START_STYLES[Math.floor(rng() * START_STYLES.length)];
    const pool = [...WORLD_SEGMENT_WEIGHTS[baseLevel.worldId]];

    if (baseLevel.difficulty === 'Iniciante') {
      pool.push('strides', 'zigzag', 'bounce');
    } else if (baseLevel.difficulty === 'Difícil' || baseLevel.difficulty === 'Extremo') {
      pool.push(
        'moving_block_gauntlet',
        'moving_wall_bridge',
        'crusher_corridor',
        'timed_curved_bridge',
        'timed_vanish_bridge',
        'split_fork'
      );
    }

    const segments: ProcSegmentKind[] = [];
    const turns: number[] = [];

    for (let s = 0; s < profile.segmentCount; s++) {
      let candidate = pool[Math.floor(rng() * pool.length)];
      let guard = 0;
      while (segments.length > 0 && candidate === segments[segments.length - 1] && guard < 10) {
        candidate = pool[Math.floor(rng() * pool.length)];
        guard++;
      }
      if (
        baseLevel.difficulty === 'Iniciante' &&
        s === 0 &&
        (candidate === 'vanishing' || candidate === 'crusher_corridor' || candidate === 'timed_vanish_bridge')
      ) {
        candidate = 'strides';
      }
      segments.push(candidate);
      turns.push(rng() < profile.turnProbability ? (rng() > 0.5 ? 1 : -1) : 0);
    }

    // Guarantee at least 1 temporary timed bridge & at least 1 lethal moving obstacle per map
    const hasBridge = segments.some((s) => BRIDGE_SEGMENTS.includes(s));
    if (!hasBridge) {
      const bridgePick = BRIDGE_SEGMENTS[Math.floor(rng() * BRIDGE_SEGMENTS.length)];
      const idx = Math.max(1, Math.floor(segments.length * 0.55));
      segments[idx] = bridgePick;
    }

    const hasLethal = segments.some((s) => LETHAL_SEGMENTS.includes(s));
    if (!hasLethal) {
      const lethalPick = LETHAL_SEGMENTS[Math.floor(rng() * LETHAL_SEGMENTS.length)];
      const idx = Math.min(segments.length - 1, Math.max(0, Math.floor(segments.length * 0.25)));
      if (!BRIDGE_SEGMENTS.includes(segments[idx])) {
        segments[idx] = lethalPick;
      } else {
        segments[0] = lethalPick;
      }
    }

    if (
      forcedSeed === undefined &&
      attempt < maxAttempts - 3 &&
      isTooSimilarToRecent(baseLevel.id, startStyle, segments, turns)
    ) {
      continue;
    }

    const built = assembleProceduralCourse(
      baseLevel,
      seed,
      rng,
      startStyle,
      segments,
      turns,
      profile,
      gapMult,
      isSpace
    );
    if (built) {
      chosenLevel = built.level;
      chosenSig = { levelId: baseLevel.id, seed, startStyle, segments, turns };
      if (forcedSeed !== undefined || !isTooSimilarToRecent(baseLevel.id, startStyle, segments, turns)) {
        break;
      }
    }
  }

  if (chosenSig) {
    recordRunSignature(chosenSig);
  }

  return chosenLevel || baseLevel;
}

function assembleProceduralCourse(
  baseLevel: LevelDef,
  seed: number,
  rng: () => number,
  startStyle: StartPadStyle,
  segments: ProcSegmentKind[],
  turns: number[],
  profile: DifficultyProfile,
  gapMult: number,
  isSpace: boolean
): { level: LevelDef } | null {
  const id = `${baseLevel.id}-r${seed.toString(16)}`;
  const platforms: PlatformDef[] = [];
  const obstacles: ObstacleDef[] = [];
  const coins: CoinDef[] = [];
  const checkpoints: CheckpointDef[] = [];
  const switches: InteractSwitchDef[] = [];
  const waypoints: Array<{ x: number; y: number; z: number }> = [];
  const reachAnchors: Array<{ x: number; y: number; z: number; fromBounce?: boolean }> = [];

  let pIdx = 0;
  let oIdx = 0;
  let cIdx = 0;
  let cpIdx = 0;
  let swIdx = 0;
  let bgIdx = 0;

  const randRange = (min: number, max: number) => min + rng() * (max - min);
  const nextGap = (extra = 0) =>
    Math.max(1.75, (randRange(profile.gapMin, profile.gapMax) + extra) * gapMult);
  const nextStep = (scale = 1) =>
    Math.round(randRange(-0.25, profile.stepMax) * scale * 10) / 10;

  const addCoin = (x: number, y: number, z: number, value = 5, isSecret = false) => {
    coins.push({
      id: `${id}-c${cIdx++}`,
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      z: Math.round(z * 100) / 100,
      value,
      isSecret,
    });
  };

  let heading: HeadingDir = 0; // starts facing -Z
  let edgeX = 0;
  let edgeY = 0;
  let edgeZ = -2.4;
  let minY = 0;

  // Varied Starting Platform Architecture (no more uniform 6.6x6.6 square every time!)
  if (startStyle === 'runway') {
    const sw = 3.8;
    const sd = 8.4;
    platforms.push({
      id: `${id}-p${pIdx++}`,
      x: 0,
      y: -0.45,
      z: -1.8,
      w: sw,
      h: 0.9,
      d: sd,
      kind: 'bridge',
    });
    edgeZ = -1.8 - sd / 2;
    addCoin(0, 1.05, -4.5, 5);
  } else if (startStyle === 'wide_plaza') {
    const sw = 7.4;
    const sd = 4.4;
    platforms.push({
      id: `${id}-p${pIdx++}`,
      x: 0,
      y: -0.5,
      z: 0,
      w: sw,
      h: 1.0,
      d: sd,
      kind: 'normal',
    });
    edgeZ = -sd / 2;
  } else if (startStyle === 'stepped') {
    platforms.push({
      id: `${id}-p${pIdx++}`,
      x: 0,
      y: -0.45,
      z: 0,
      w: 4.4,
      h: 0.9,
      d: 4.2,
      kind: 'normal',
    });
    platforms.push({
      id: `${id}-p${pIdx++}`,
      x: 0,
      y: 0.35,
      z: -4.4,
      w: 3.4,
      h: 0.8,
      d: 3.8,
      kind: 'normal',
    });
    edgeY = 0.75;
    edgeZ = -6.3;
    addCoin(0, 1.85, -4.4, 5);
  } else if (startStyle === 'l_launch') {
    const side = rng() > 0.5 ? 1 : -1;
    platforms.push({
      id: `${id}-p${pIdx++}`,
      x: 0,
      y: -0.45,
      z: 0,
      w: 4.2,
      h: 0.9,
      d: 4.2,
      kind: 'normal',
    });
    platforms.push({
      id: `${id}-p${pIdx++}`,
      x: side * 3.4,
      y: -0.25,
      z: -2.4,
      w: 3.6,
      h: 0.9,
      d: 4.0,
      kind: 'normal',
    });
    edgeX = side * 3.4;
    edgeY = 0.2;
    edgeZ = -4.4;
    addCoin(side * 3.4, 1.3, -2.4, 5);
  } else {
    // compact
    const sw = 4.6;
    const sd = 4.6;
    platforms.push({
      id: `${id}-p${pIdx++}`,
      x: 0,
      y: -0.5,
      z: 0,
      w: sw,
      h: 1.0,
      d: sd,
      kind: 'normal',
    });
    edgeZ = -sd / 2;
  }

  waypoints.push({ x: 0, y: 0, z: 0 });
  reachAnchors.push({ x: edgeX, y: edgeY, z: edgeZ });

  const towerBoxes: Box3D[] = [];
  const obsSweptBoxes: Box3D[] = [];

  const isObstacleSpotValid = (candidate: ObstacleDef, hostPlatformId?: string): boolean => {
    const box = getObstacleSweptBox(candidate, 0.3, 0.1);
    // Must maintain >= 2.5m horizontal clearance from all towers
    for (const tb of towerBoxes) {
      if (distanceXZ(box, tb) < 2.5 || boxesOverlap3D(box, tb)) return false;
    }
    // Must not overlap swept bounds of any existing obstacle
    for (const ob of obsSweptBoxes) {
      if (boxesOverlap3D(box, ob)) return false;
    }
    // Must not penetrate non-host platforms (e.g. spiral ledges or side decks)
    for (const p of platforms) {
      if (p.id === hostPlatformId) continue;
      const pBox = getPlatformSweptBox(p, 0.15, 0.05);
      if (boxesOverlap3D(box, pBox)) return false;
    }
    return true;
  };

  const tryAddObstacle = (candidate: ObstacleDef, hostPlatformId?: string): boolean => {
    const { fx, fz } = headingToAxes(heading);
    const shiftSteps = [0, 1.1, -1.1, 2.1, -2.1, 3.0, -3.0];
    for (const shift of shiftSteps) {
      const shifted: ObstacleDef = {
        ...candidate,
        x: candidate.x + fx * shift,
        z: candidate.z + fz * shift,
      };
      if (isObstacleSpotValid(shifted, hostPlatformId)) {
        obstacles.push(shifted);
        obsSweptBoxes.push(getObstacleSweptBox(shifted, 0.4, 0.15));
        return true;
      }
    }
    // Retry with tighter movement range if range caused neighbor overlap
    if (candidate.range && candidate.range > 1.2) {
      const tightened: ObstacleDef = {
        ...candidate,
        range: candidate.range * 0.72,
      };
      if (isObstacleSpotValid(tightened, hostPlatformId)) {
        obstacles.push(tightened);
        obsSweptBoxes.push(getObstacleSweptBox(tightened, 0.4, 0.15));
        return true;
      }
    }
    return false;
  };

  const placeForwardPad = (
    crossW: number,
    alongD: number,
    h: number,
    gap: number,
    dy: number,
    lateralShift: number,
    kind: PlatformDef['kind'],
    extra: Partial<PlatformDef> = {}
  ): { cx: number; topY: number; cz: number; plat: PlatformDef } => {
    const { fx, fz, rx, rz } = headingToAxes(heading);
    const { w, d } = orientSize(heading, crossW, alongD);
    edgeY += dy;
    const cx = edgeX + fx * (gap + alongD / 2) + rx * lateralShift;
    const cz = edgeZ + fz * (gap + alongD / 2) + rz * lateralShift;
    const plat: PlatformDef = {
      id: `${id}-p${pIdx++}`,
      x: cx,
      y: edgeY - h / 2,
      z: cz,
      w,
      h,
      d,
      kind,
      ...extra,
    };
    platforms.push(plat);
    edgeX = cx + fx * (alongD / 2);
    edgeZ = cz + fz * (alongD / 2);
    minY = Math.min(minY, edgeY);
    waypoints.push({ x: cx, y: edgeY, z: cz });
    reachAnchors.push({ x: cx, y: edgeY, z: cz, fromBounce: kind === 'bounce' });
    return { cx, topY: edgeY, cz, plat };
  };

  const applyTurn = (turnWish: number) => {
    if (turnWish === 0) return;
    const nextH = Math.max(-1, Math.min(1, heading + turnWish)) as HeadingDir;
    if (nextH === heading) return;

    const cornerSize = 4.2;
    const pad = placeForwardPad(cornerSize, cornerSize, 0.85, nextGap(-0.35), 0.2, 0, 'normal');
    addCoin(pad.cx, pad.topY + 1.15, pad.cz, 5);

    heading = nextH;
    const { fx, fz } = headingToAxes(heading);
    edgeX = pad.cx + fx * (cornerSize / 2);
    edgeZ = pad.cz + fz * (cornerSize / 2);
  };

  const addCheckpointPad = () => {
    const size = 4.4;
    const pad = placeForwardPad(size, size, 0.9, nextGap(-0.3), 0, 0, 'normal', {
      isCheckpointBase: true,
    });
    checkpoints.push({
      id: `${id}-cp${cpIdx}`,
      index: cpIdx + 1,
      x: pad.cx,
      y: pad.topY,
      z: pad.cz,
    });
    cpIdx++;
  };

  const checkpointIndices = new Set<number>();
  if (segments.length >= 3) checkpointIndices.add(Math.floor(segments.length / 2) - 1);
  if (segments.length >= 5) {
    checkpointIndices.add(1);
    checkpointIndices.add(segments.length - 2);
  }

  segments.forEach((seg, segIdx) => {
    if (segIdx > 0 && turns[segIdx] !== 0) {
      applyTurn(turns[segIdx]);
    }

    switch (seg) {
      case 'strides': {
        const count = 2 + Math.floor(rng() * 3);
        for (let i = 0; i < count; i++) {
          const w = Math.max(2.0, randRange(2.4, 3.8) * profile.widthScale);
          const d = randRange(2.8, 4.4);
          const lat = (rng() - 0.5) * 3.8;
          const pad = placeForwardPad(
            w,
            d,
            0.78,
            nextGap(),
            nextStep(0.75),
            lat,
            baseLevel.worldId === 'frozen' && rng() > 0.4 ? 'ice' : 'normal'
          );
          if (rng() > 0.25) addCoin(pad.cx, pad.topY + 1.15, pad.cz, 5);
        }
        break;
      }

      case 'zigzag': {
        const count = 3 + Math.floor(rng() * 2);
        const startSign = rng() > 0.5 ? 1 : -1;
        const amp = randRange(2.4, 3.6);
        for (let i = 0; i < count; i++) {
          const w = Math.max(2.0, randRange(2.4, 3.2) * profile.widthScale);
          const d = randRange(2.7, 3.5);
          const lat = startSign * (i % 2 === 0 ? amp : -amp);
          const pad = placeForwardPad(w, d, 0.8, nextGap(-0.35), nextStep(0.7), lat, 'normal');
          addCoin(pad.cx, pad.topY + 1.15, pad.cz, 5);
        }
        break;
      }

      case 'crouch_bridge': {
        const w = Math.max(2.8, randRange(3.2, 4.1) * profile.widthScale);
        const d = randRange(10.0, 14.0);
        const pad = placeForwardPad(w, d, 0.75, nextGap(-0.2), nextStep(0.45), 0, 'bridge');
        const { fx, fz } = headingToAxes(heading);
        const beamCount = rng() > 0.45 ? 2 : 3;
        for (let b = 0; b < beamCount; b++) {
          const t = ((b + 0.5) / beamCount - 0.5) * (d * 0.72);
          const bx = pad.cx + fx * t;
          const bz = pad.cz + fz * t;
          const beamSize = orientSize(heading, w + 0.4, 0.65);
          tryAddObstacle(
            {
              id: `${id}-o${oIdx++}`,
              x: bx,
              y: pad.topY + 1.98,
              z: bz,
              w: beamSize.w,
              h: 1.5,
              d: beamSize.d,
              kind: 'crouch_beam',
              lethal: false,
            },
            pad.plat.id
          );
          addCoin(bx, pad.topY + 0.65, bz, 8);
        }
        break;
      }

      case 'moving_lateral': {
        const count = 1 + (rng() > 0.4 ? 1 : 0);
        const moveAxis: 'x' | 'z' = heading === 0 ? 'x' : 'z';
        for (let i = 0; i < count; i++) {
          const w = Math.max(2.5, randRange(2.9, 3.7) * profile.widthScale);
          const d = randRange(3.1, 4.0);
          const pad = placeForwardPad(w, d, 0.7, nextGap(-0.2), nextStep(0.35), 0, 'moving', {
            moveAxis,
            moveRange: randRange(2.5, 3.8),
            moveSpeed: randRange(1.05, 1.55) * profile.speedScale,
            movePhase: rng() * Math.PI * 2,
          });
          addCoin(pad.cx, pad.topY + 1.25, pad.cz, 10);
        }
        break;
      }

      case 'moving_forward': {
        const moveAxis: 'x' | 'z' = heading === 0 ? 'z' : 'x';
        const range = randRange(2.3, 3.2);
        const w = Math.max(2.7, randRange(3.1, 3.9) * profile.widthScale);
        const d = randRange(3.4, 4.1);
        const gap = 2.0 + range;
        const pad = placeForwardPad(w, d, 0.7, gap, nextStep(0.3), 0, 'moving', {
          moveAxis,
          moveRange: range,
          moveSpeed: randRange(1.0, 1.45) * profile.speedScale,
          movePhase: rng() * Math.PI * 2,
        });
        addCoin(pad.cx, pad.topY + 1.25, pad.cz, 10);
        const { fx, fz } = headingToAxes(heading);
        edgeX += fx * (range * 0.6);
        edgeZ += fz * (range * 0.6);
        break;
      }

      case 'moving_vertical': {
        const lift = randRange(2.2, 3.4);
        const pad = placeForwardPad(3.4, 3.4, 0.7, nextGap(-0.3), lift * 0.5, 0, 'moving', {
          moveAxis: 'y',
          moveRange: lift * 0.5,
          moveSpeed: randRange(1.0, 1.45) * profile.speedScale,
          movePhase: rng() * Math.PI,
        });
        addCoin(pad.cx, pad.topY + lift * 0.5 + 1.15, pad.cz, 10);
        edgeY += lift * 0.5;
        const exitPad = placeForwardPad(3.8, 3.8, 0.8, 2.2, 0, 0, 'normal');
        addCoin(exitPad.cx, exitPad.topY + 1.1, exitPad.cz, 5);
        break;
      }

      case 'vanishing': {
        const count = 3 + Math.floor(rng() * 2);
        for (let i = 0; i < count; i++) {
          const lat = (i % 2 === 0 ? 1 : -1) * randRange(0.8, 1.9);
          const w = Math.max(2.2, randRange(2.5, 3.2) * profile.widthScale);
          const d = randRange(2.6, 3.2);
          const pad = placeForwardPad(w, d, 0.68, nextGap(-0.35), nextStep(0.55), lat, 'disappearing', {
            stayTime: profile.stayTime * randRange(0.9, 1.12),
            respawnTime: randRange(1.9, 2.3),
          });
          addCoin(pad.cx, pad.topY + 1.15, pad.cz, 10);
        }
        break;
      }

      case 'spiral_climb': {
        const { fx, fz, rx, rz } = headingToAxes(heading);
        const radius = randRange(3.1, 3.6);
        let centerDist = 5.8;
        let baseX = edgeX + fx * centerDist;
        let baseZ = edgeZ + fz * centerDist;

        // Verify tower footprint keeps >= 3.0m clear of any obstacle
        for (let shift = 0; shift <= 4; shift++) {
          const tx = edgeX + fx * (centerDist + shift * 1.4);
          const tz = edgeZ + fz * (centerDist + shift * 1.4);
          const candidateCore: PlatformDef = {
            id: 'probe',
            x: tx,
            y: edgeY + 3.0,
            z: tz,
            w: 2.4,
            h: 8.6,
            d: 2.4,
            kind: 'climb',
          };
          const tBox = getPlatformSweptBox(candidateCore, 0, 0);
          const hitsObs = obsSweptBoxes.some((ob) => distanceXZ(tBox, ob) < 3.0);
          if (!hitsObs) {
            centerDist += shift * 1.4;
            baseX = tx;
            baseZ = tz;
            break;
          }
        }

        const cwSign = rng() > 0.5 ? 1 : -1;
        const corePlat: PlatformDef = {
          id: `${id}-p${pIdx++}`,
          x: baseX,
          y: edgeY + 3.0,
          z: baseZ,
          w: 2.4,
          h: 8.6,
          d: 2.4,
          kind: 'climb',
        };
        platforms.push(corePlat);
        towerBoxes.push(getPlatformSweptBox(corePlat, 0, 0));

        const localAngles = [Math.PI * 0.92, Math.PI * 0.55, Math.PI * 0.18, -Math.PI * 0.08];
        for (let s = 0; s < localAngles.length; s++) {
          edgeY += randRange(1.25, 1.6);
          const a = localAngles[s];
          const along = Math.cos(a) * radius;
          const across = Math.sin(a) * radius * cwSign;
          const lx = baseX + fx * along + rx * across;
          const lz = baseZ + fz * along + rz * across;
          platforms.push({
            id: `${id}-p${pIdx++}`,
            x: lx,
            y: edgeY - 0.35,
            z: lz,
            w: 3.0,
            h: 0.7,
            d: 3.0,
            kind: 'climb',
          });
          addCoin(lx, edgeY + 1.1, lz, 8);
          waypoints.push({ x: lx, y: edgeY, z: lz });
          reachAnchors.push({ x: lx, y: edgeY, z: lz });
        }
        edgeX = baseX + fx * (radius + 1.55);
        edgeZ = baseZ + fz * (radius + 1.55);
        const topExit = placeForwardPad(3.8, 3.8, 0.8, 2.2, 0, 0, 'normal');
        addCoin(topExit.cx, topExit.topY + 1.15, topExit.cz, 5);
        break;
      }

      case 'sweeper': {
        const size = randRange(5.4, 6.4);
        const pad = placeForwardPad(size, size + 0.8, 0.8, nextGap(-0.2), nextStep(0.35), 0, 'normal');
        const dirSign = rng() > 0.5 ? 1 : -1;
        tryAddObstacle(
          {
            id: `${id}-o${oIdx++}`,
            x: pad.cx,
            y: pad.topY + 0.55,
            z: pad.cz,
            w: size - 0.4,
            h: 0.55,
            d: 0.55,
            kind: 'rotator',
            speed: dirSign * randRange(1.4, 1.95) * profile.speedScale,
            phase: rng() * Math.PI * 2,
            lethal: true,
          },
          pad.plat.id
        );
        addCoin(pad.cx - 1.5, pad.topY + 1.35, pad.cz, 10);
        addCoin(pad.cx + 1.5, pad.topY + 1.35, pad.cz, 10);
        break;
      }

      case 'pendulum': {
        const w = randRange(3.6, 4.4);
        const d = randRange(9.5, 13.0);
        const pad = placeForwardPad(w, d, 0.8, nextGap(-0.25), nextStep(0.3), 0, 'bridge');
        const count = rng() > 0.35 ? 2 : 3;
        const { fx, fz } = headingToAxes(heading);
        for (let p = 0; p < count; p++) {
          const offset = ((p + 0.5) / count - 0.5) * (d * 0.72);
          tryAddObstacle(
            {
              id: `${id}-o${oIdx++}`,
              x: pad.cx + fx * offset,
              y: pad.topY + 1.05,
              z: pad.cz + fz * offset,
              w: 1.25,
              h: 1.25,
              d: 1.25,
              kind: 'pendulum',
              speed: randRange(1.65, 2.2) * profile.speedScale,
              range: randRange(1.7, 2.3),
              axis: heading === 0 ? 'x' : 'z',
              phase: p * 1.6 + rng() * Math.PI,
              lethal: true,
            },
            pad.plat.id
          );
        }
        addCoin(pad.cx, pad.topY + 1.2, pad.cz, 12);
        break;
      }

      case 'moving_block_gauntlet': {
        const w = Math.max(3.1, randRange(3.4, 4.2) * profile.widthScale);
        const d = randRange(11.0, 15.0);
        const pad = placeForwardPad(w, d, 0.8, nextGap(-0.2), nextStep(0.3), 0, 'bridge');
        const { fx, fz } = headingToAxes(heading);
        const count = 2 + (rng() > 0.45 ? 1 : 0);
        const crossAxis: 'x' | 'z' = heading === 0 ? 'x' : 'z';
        for (let i = 0; i < count; i++) {
          const t = ((i + 0.5) / count - 0.5) * (d * 0.72);
          const bSize = orientSize(heading, 1.35, 1.35);
          tryAddObstacle(
            {
              id: `${id}-o${oIdx++}`,
              x: pad.cx + fx * t,
              y: pad.topY + 0.9,
              z: pad.cz + fz * t,
              w: bSize.w,
              h: 1.65,
              d: bSize.d,
              kind: 'moving_block',
              axis: crossAxis,
              range: w * 0.42,
              speed: randRange(1.7, 2.35) * profile.speedScale,
              phase: i * 1.9,
              lethal: true,
            },
            pad.plat.id
          );
          addCoin(pad.cx + fx * t, pad.topY + 1.85, pad.cz + fz * t, 10);
        }
        break;
      }

      case 'moving_wall_bridge': {
        const w = Math.max(3.4, randRange(3.8, 4.5) * profile.widthScale);
        const d = randRange(10.5, 14.0);
        const pad = placeForwardPad(w, d, 0.8, nextGap(-0.2), nextStep(0.25), 0, 'bridge');
        const { fx, fz } = headingToAxes(heading);
        const count = 2;
        const crossAxis: 'x' | 'z' = heading === 0 ? 'x' : 'z';
        for (let i = 0; i < count; i++) {
          const t = (i === 0 ? -0.26 : 0.26) * d;
          const wSize = orientSize(heading, w * 0.48, 0.7);
          tryAddObstacle(
            {
              id: `${id}-o${oIdx++}`,
              x: pad.cx + fx * t,
              y: pad.topY + 1.2,
              z: pad.cz + fz * t,
              w: wSize.w,
              h: 2.3,
              d: wSize.d,
              kind: 'moving_wall',
              axis: crossAxis,
              range: w * 0.44,
              speed: randRange(1.5, 2.05) * profile.speedScale,
              phase: i * Math.PI,
              lethal: true,
            },
            pad.plat.id
          );
        }
        addCoin(pad.cx, pad.topY + 1.25, pad.cz, 12);
        break;
      }

      case 'crusher_corridor': {
        const w = Math.max(3.2, randRange(3.5, 4.2) * profile.widthScale);
        const d = randRange(10.5, 13.5);
        const pad = placeForwardPad(w, d, 0.85, nextGap(-0.2), nextStep(0.25), 0, 'bridge');
        const { fx, fz } = headingToAxes(heading);
        const count = 2 + (rng() > 0.5 ? 1 : 0);
        for (let i = 0; i < count; i++) {
          const t = ((i + 0.5) / count - 0.5) * (d * 0.7);
          const cSize = orientSize(heading, w * 0.82, 2.0);
          tryAddObstacle(
            {
              id: `${id}-o${oIdx++}`,
              x: pad.cx + fx * t,
              y: pad.topY + 0.95,
              z: pad.cz + fz * t,
              w: cSize.w,
              h: 1.8,
              d: cSize.d,
              kind: 'crusher',
              range: 3.1,
              speed: randRange(1.0, 1.38) * profile.speedScale,
              phase: i * 1.45,
              lethal: true,
            },
            pad.plat.id
          );
          addCoin(pad.cx + fx * t, pad.topY + 0.9, pad.cz + fz * t, 12);
        }
        break;
      }

      case 'laser_patrol': {
        const w = Math.max(3.2, randRange(3.5, 4.2) * profile.widthScale);
        const d = randRange(10.0, 13.0);
        const pad = placeForwardPad(w, d, 0.8, nextGap(-0.2), nextStep(0.3), 0, 'bridge');
        const { fx, fz } = headingToAxes(heading);
        const count = 2;
        for (let i = 0; i < count; i++) {
          const t = (i === 0 ? -0.25 : 0.25) * d;
          const lSize = orientSize(heading, w + 0.4, 0.38);
          tryAddObstacle(
            {
              id: `${id}-o${oIdx++}`,
              x: pad.cx + fx * t,
              y: pad.topY + 1.35,
              z: pad.cz + fz * t,
              w: lSize.w,
              h: 0.35,
              d: lSize.d,
              kind: 'laser_bar',
              range: 0.95,
              speed: randRange(1.85, 2.5) * profile.speedScale,
              phase: i * Math.PI,
              lethal: true,
            },
            pad.plat.id
          );
          addCoin(pad.cx + fx * t, pad.topY + 1.0, pad.cz + fz * t, 10);
        }
        break;
      }

      case 'bounce': {
        const pad = placeForwardPad(3.4, 3.4, 0.7, nextGap(-0.25), 0, 0, 'bounce', {
          bounceForce: isSpace ? 15.5 : 19.8,
        });
        const { fx, fz } = headingToAxes(heading);
        addCoin(pad.cx + fx * 2.2, pad.topY + 3.0, pad.cz + fz * 2.2, 5);
        addCoin(pad.cx + fx * 4.2, pad.topY + 4.3, pad.cz + fz * 4.2, 10);
        const rise = randRange(2.8, 3.9);
        const land = placeForwardPad(4.2, 4.2, 0.85, 5.1, rise, 0, 'normal');
        addCoin(land.cx, land.topY + 1.15, land.cz, 5);
        break;
      }

      case 'narrow': {
        const count = 2;
        for (let i = 0; i < count; i++) {
          const w = Math.max(1.2, randRange(1.3, 1.7) * profile.widthScale);
          const d = randRange(5.2, 7.6);
          const lat = i === 0 ? 0 : (rng() > 0.5 ? 1 : -1) * randRange(1.3, 2.2);
          const pad = placeForwardPad(w, d, 0.7, nextGap(-0.4), nextStep(0.35), lat, 'narrow');
          addCoin(pad.cx, pad.topY + 1.05, pad.cz, 10);
        }
        break;
      }

      // Upgraded Longer & Harder Temporary Timed Bridges (6s duration, 4s cooldown)
      case 'gate_switch': {
        const deck = placeForwardPad(4.6, 4.4, 0.85, nextGap(-0.25), nextStep(0.3), 0, 'normal');
        const { fx, fz, rx, rz } = headingToAxes(heading);
        const side = rng() > 0.5 ? 1 : -1;
        const switchId = `${id}-sw${swIdx++}`;
        const groupId = `${id}-bg${bgIdx++}`;
        switches.push({
          id: switchId,
          x: deck.cx + rx * (1.45 * side),
          y: deck.topY,
          z: deck.cz + rz * (1.45 * side),
          label: 'Ativar Ponte',
        });
        const bridgeW = Math.max(1.9, 2.9 * profile.bridgeWidthScale);
        const bridgeLen = randRange(12.5, 16.5) * profile.bridgeLengthScale;
        const bridge = placeForwardPad(bridgeW, bridgeLen, 0.58, 1.6, 0, 0, 'gate_bridge', {
          switchId,
          bridgeGroupId: groupId,
          timedDuration: 6.0,
          cooldownDuration: 4.0,
        });
        // Add a lethal obstacle along the long bridge
        const obsSize = orientSize(heading, 1.2, 1.2);
        tryAddObstacle(
          {
            id: `${id}-o${oIdx++}`,
            x: bridge.cx + fx * 1.2,
            y: bridge.topY + 0.85,
            z: bridge.cz + fz * 1.2,
            w: obsSize.w,
            h: 1.5,
            d: obsSize.d,
            kind: 'moving_block',
            axis: heading === 0 ? 'x' : 'z',
            range: bridgeW * 0.42,
            speed: 1.75 * profile.speedScale,
            phase: rng() * Math.PI,
            lethal: true,
          },
          bridge.plat.id
        );
        addCoin(bridge.cx - fx * 3.0, bridge.topY + 1.15, bridge.cz - fz * 3.0, 10);
        addCoin(bridge.cx + fx * 3.0, bridge.topY + 1.15, bridge.cz + fz * 3.0, 15);
        break;
      }

      case 'timed_curved_bridge': {
        // L-shaped / curved multi-span temporary bridge (auto-triggered on entry OR switch!)
        const entryPad = placeForwardPad(4.2, 4.0, 0.85, nextGap(-0.25), nextStep(0.25), 0, 'normal');
        const groupId = `${id}-bg${bgIdx++}`;
        const switchId = `${id}-sw${swIdx++}`;
        switches.push({
          id: switchId,
          x: entryPad.cx,
          y: entryPad.topY,
          z: entryPad.cz,
          label: 'Ativar Ponte Curva',
        });
        const bridgeW = Math.max(1.85, 2.75 * profile.bridgeWidthScale);
        const span1Len = randRange(8.0, 10.5) * profile.bridgeLengthScale;
        const span1 = placeForwardPad(bridgeW, span1Len, 0.58, 1.4, 0, 0, 'gate_bridge', {
          switchId,
          bridgeGroupId: groupId,
          timedDuration: 6.0,
          cooldownDuration: 4.0,
          autoTrigger: true,
          triggerPos: { x: entryPad.cx, y: entryPad.topY, z: entryPad.cz },
        });
        addCoin(span1.cx, span1.topY + 1.1, span1.cz, 10);

        // Turn 90 deg at corner node within the same timed bridge group
        const turnDir = heading === 0 ? (rng() > 0.5 ? 1 : -1) : -heading;
        const corner = placeForwardPad(bridgeW + 0.9, bridgeW + 0.9, 0.58, 0.4, 0, 0, 'gate_bridge', {
          switchId,
          bridgeGroupId: groupId,
          timedDuration: 6.0,
          cooldownDuration: 4.0,
        });
        heading = Math.max(-1, Math.min(1, heading + turnDir)) as HeadingDir;
        const { fx, fz } = headingToAxes(heading);
        edgeX = corner.cx + fx * ((bridgeW + 0.9) / 2);
        edgeZ = corner.cz + fz * ((bridgeW + 0.9) / 2);

        const span2Len = randRange(8.0, 10.5) * profile.bridgeLengthScale;
        const span2 = placeForwardPad(bridgeW, span2Len, 0.58, 0.4, 0.25, 0, 'gate_bridge', {
          switchId,
          bridgeGroupId: groupId,
          timedDuration: 6.0,
          cooldownDuration: 4.0,
        });
        addCoin(span2.cx, span2.topY + 1.1, span2.cz, 15);
        break;
      }

      case 'timed_gauntlet_bridge': {
        // Long narrow temporary bridge guarded by sweeper + moving wall!
        const entry = placeForwardPad(4.2, 4.0, 0.85, nextGap(-0.25), nextStep(0.25), 0, 'normal');
        const groupId = `${id}-bg${bgIdx++}`;
        const switchId = `${id}-sw${swIdx++}`;
        switches.push({
          id: switchId,
          x: entry.cx,
          y: entry.topY,
          z: entry.cz,
          label: 'Ativar Ponte Armada',
        });
        const bridgeW = Math.max(2.1, 3.0 * profile.bridgeWidthScale);
        const bridgeLen = randRange(14.5, 19.0) * profile.bridgeLengthScale;
        const bridge = placeForwardPad(bridgeW, bridgeLen, 0.58, 1.5, 0, 0, 'gate_bridge', {
          switchId,
          bridgeGroupId: groupId,
          timedDuration: 6.0,
          cooldownDuration: 4.0,
          autoTrigger: true,
          triggerPos: { x: entry.cx, y: entry.topY, z: entry.cz },
        });
        const { fx, fz } = headingToAxes(heading);
        tryAddObstacle(
          {
            id: `${id}-o${oIdx++}`,
            x: bridge.cx - fx * (bridgeLen * 0.2),
            y: bridge.topY + 0.55,
            z: bridge.cz - fz * (bridgeLen * 0.2),
            w: bridgeW + 0.8,
            h: 0.45,
            d: 0.45,
            kind: 'rotator',
            speed: (rng() > 0.5 ? 1 : -1) * 1.75 * profile.speedScale,
            phase: rng() * Math.PI,
            lethal: true,
          },
          bridge.plat.id
        );
        const wallSize = orientSize(heading, bridgeW * 0.55, 0.65);
        tryAddObstacle(
          {
            id: `${id}-o${oIdx++}`,
            x: bridge.cx + fx * (bridgeLen * 0.22),
            y: bridge.topY + 1.05,
            z: bridge.cz + fz * (bridgeLen * 0.22),
            w: wallSize.w,
            h: 2.0,
            d: wallSize.d,
            kind: 'moving_wall',
            axis: heading === 0 ? 'x' : 'z',
            range: bridgeW * 0.44,
            speed: 1.7 * profile.speedScale,
            phase: rng() * Math.PI,
            lethal: true,
          },
          bridge.plat.id
        );
        addCoin(bridge.cx, bridge.topY + 1.25, bridge.cz, 18);
        break;
      }

      case 'timed_moving_bridge': {
        // Temporary entry span + oscillating moving bridge core + temporary exit span
        const entry = placeForwardPad(4.2, 3.8, 0.85, nextGap(-0.25), nextStep(0.25), 0, 'normal');
        const groupId = `${id}-bg${bgIdx++}`;
        const switchId = `${id}-sw${swIdx++}`;
        switches.push({
          id: switchId,
          x: entry.cx,
          y: entry.topY,
          z: entry.cz,
          label: 'Ativar Ponte Móvel',
        });
        const bridgeW = Math.max(2.0, 2.8 * profile.bridgeWidthScale);
        const s1 = placeForwardPad(bridgeW, 6.2, 0.58, 1.4, 0, 0, 'gate_bridge', {
          switchId,
          bridgeGroupId: groupId,
          timedDuration: 6.0,
          cooldownDuration: 4.0,
          autoTrigger: true,
          triggerPos: { x: entry.cx, y: entry.topY, z: entry.cz },
        });
        const ferry = placeForwardPad(bridgeW + 0.4, 4.4, 0.58, 1.8, 0.2, 0, 'gate_bridge', {
          switchId,
          bridgeGroupId: groupId,
          timedDuration: 6.0,
          cooldownDuration: 4.0,
          moveAxis: heading === 0 ? 'x' : 'z',
          moveRange: 1.8,
          moveSpeed: 1.35 * profile.speedScale,
          movePhase: 0,
        });
        const s2 = placeForwardPad(bridgeW, 6.2, 0.58, 1.8, 0.2, 0, 'gate_bridge', {
          switchId,
          bridgeGroupId: groupId,
          timedDuration: 6.0,
          cooldownDuration: 4.0,
        });
        addCoin(s1.cx, s1.topY + 1.1, s1.cz, 8);
        addCoin(ferry.cx, ferry.topY + 1.2, ferry.cz, 12);
        addCoin(s2.cx, s2.topY + 1.1, s2.cz, 10);
        break;
      }

      case 'timed_vanish_bridge': {
        // Temporary entry + sequential disappearing stones + temporary exit
        const entry = placeForwardPad(4.2, 3.8, 0.85, nextGap(-0.25), nextStep(0.25), 0, 'normal');
        const groupId = `${id}-bg${bgIdx++}`;
        const switchId = `${id}-sw${swIdx++}`;
        switches.push({
          id: switchId,
          x: entry.cx,
          y: entry.topY,
          z: entry.cz,
          label: 'Ativar Ponte Instável',
        });
        const bridgeW = Math.max(1.9, 2.7 * profile.bridgeWidthScale);
        const s1 = placeForwardPad(bridgeW, 5.8, 0.58, 1.4, 0, 0, 'gate_bridge', {
          switchId,
          bridgeGroupId: groupId,
          timedDuration: 6.0,
          cooldownDuration: 4.0,
          autoTrigger: true,
          triggerPos: { x: entry.cx, y: entry.topY, z: entry.cz },
        });
        addCoin(s1.cx, s1.topY + 1.1, s1.cz, 8);

        for (let i = 0; i < 2; i++) {
          const lat = (i === 0 ? 1 : -1) * 1.1;
          const v = placeForwardPad(bridgeW, 3.4, 0.58, 1.6, 0.2, lat, 'disappearing', {
            stayTime: profile.stayTime,
            respawnTime: 2.0,
          });
          addCoin(v.cx, v.topY + 1.1, v.cz, 10);
        }

        const s2 = placeForwardPad(bridgeW, 5.8, 0.58, 1.6, 0.2, 0, 'gate_bridge', {
          switchId,
          bridgeGroupId: groupId,
          timedDuration: 6.0,
          cooldownDuration: 4.0,
        });
        addCoin(s2.cx, s2.topY + 1.1, s2.cz, 12);
        break;
      }

      case 'ice_slide': {
        const w = randRange(3.4, 4.3);
        const d = randRange(8.0, 11.0);
        const pad = placeForwardPad(w, d, 0.8, nextGap(-0.25), nextStep(0.3), 0, 'ice');
        const { fx, fz, rx, rz } = headingToAxes(heading);
        addCoin(pad.cx - fx * 2 - rx * 0.8, pad.topY + 1.1, pad.cz - fz * 2 - rz * 0.8, 5);
        addCoin(pad.cx + fx * 2 + rx * 0.8, pad.topY + 1.1, pad.cz + fz * 2 + rz * 0.8, 5);
        break;
      }

      case 'split_fork': {
        const { fx, fz, rx, rz } = headingToAxes(heading);
        const originX = edgeX;
        const originY = edgeY;
        const originZ = edgeZ;
        const span = 14.5;

        const leftLat = -3.8;
        const l1x = originX + fx * 4.5 + rx * leftLat;
        const l1z = originZ + fz * 4.5 + rz * leftLat;
        const l1y = originY + 0.6;
        const l1Size = orientSize(heading, 1.8, 4.2);
        platforms.push({
          id: `${id}-p${pIdx++}`,
          x: l1x,
          y: l1y - 0.35,
          z: l1z,
          w: l1Size.w,
          h: 0.7,
          d: l1Size.d,
          kind: 'narrow',
        });
        addCoin(l1x, l1y + 1.1, l1z, 15, true);

        const l2x = originX + fx * 10.2 + rx * leftLat;
        const l2z = originZ + fz * 10.2 + rz * leftLat;
        const l2y = l1y + 0.5;
        const l2Size = orientSize(heading, 2.0, 3.8);
        platforms.push({
          id: `${id}-p${pIdx++}`,
          x: l2x,
          y: l2y - 0.35,
          z: l2z,
          w: l2Size.w,
          h: 0.7,
          d: l2Size.d,
          kind: 'normal',
        });
        addCoin(l2x, l2y + 1.1, l2z, 15, true);

        const rightLat = 3.8;
        const r1x = originX + fx * 4.8 + rx * rightLat;
        const r1z = originZ + fz * 4.8 + rz * rightLat;
        const r1Size = orientSize(heading, 3.2, 3.6);
        platforms.push({
          id: `${id}-p${pIdx++}`,
          x: r1x,
          y: originY - 0.35,
          z: r1z,
          w: r1Size.w,
          h: 0.7,
          d: r1Size.d,
          kind: 'moving',
          moveAxis: heading === 0 ? 'x' : 'z',
          moveRange: 1.6,
          moveSpeed: 1.15 * profile.speedScale,
          movePhase: 0,
        });
        addCoin(r1x, originY + 1.15, r1z, 8);

        const r2x = originX + fx * 10.2 + rx * rightLat;
        const r2z = originZ + fz * 10.2 + rz * rightLat;
        const r2Size = orientSize(heading, 3.2, 3.6);
        platforms.push({
          id: `${id}-p${pIdx++}`,
          x: r2x,
          y: originY + 0.3 - 0.35,
          z: r2z,
          w: r2Size.w,
          h: 0.7,
          d: r2Size.d,
          kind: 'normal',
        });
        addCoin(r2x, originY + 1.4, r2z, 8);

        edgeX = originX + fx * (span - 2.0);
        edgeZ = originZ + fz * (span - 2.0);
        edgeY = originY + 0.5;
        const mergePad = placeForwardPad(5.2, 4.4, 0.85, 2.2, 0.2, 0, 'normal');
        addCoin(mergePad.cx, mergePad.topY + 1.15, mergePad.cz, 5);
        break;
      }

      case 'cascade_drop': {
        const steps = 3;
        for (let i = 0; i < steps; i++) {
          const drop = -randRange(1.1, 1.9);
          const lat = (i % 2 === 0 ? 1 : -1) * randRange(1.4, 2.5);
          const pad = placeForwardPad(3.1, 3.3, 0.8, nextGap(0.3), drop, lat, 'normal');
          addCoin(pad.cx, pad.topY + 1.1, pad.cz, 8);
        }
        break;
      }

      case 'secret_branch': {
        const mainPad = placeForwardPad(3.8, 4.2, 0.8, nextGap(-0.2), 0, 0, 'normal');
        const { rx, rz } = headingToAxes(heading);
        const side = rng() > 0.5 ? 1 : -1;
        const sx = mainPad.cx + rx * (5.2 * side);
        const sz = mainPad.cz + rz * (5.2 * side);
        const sy = mainPad.topY + randRange(0.4, 1.0);
        platforms.push({
          id: `${id}-p${pIdx++}`,
          x: sx,
          y: sy - 0.35,
          z: sz,
          w: 2.8,
          h: 0.7,
          d: 2.8,
          kind: 'normal',
        });
        addCoin(sx, sy + 1.25, sz, 25, true);
        addCoin(sx + rx * (0.8 * side), sy + 1.25, sz + rz * (0.8 * side), 15, true);
        break;
      }
    }

    if (checkpointIndices.has(segIdx)) {
      addCheckpointPad();
    }
  });

  // Final Finish Platform
  const finPad = placeForwardPad(6.4, 6.4, 1.0, nextGap(-0.2), 0.3, 0, 'normal');
  const { fx, fz, rx, rz } = headingToAxes(heading);
  addCoin(finPad.cx - rx * 1.2, finPad.topY + 1.2, finPad.cz - rz * 1.2, 10);
  addCoin(finPad.cx + rx * 1.2, finPad.topY + 1.2, finPad.cz + rz * 1.2, 10);

  if (!validateCourseReachability(platforms, reachAnchors, isSpace)) {
    return null;
  }
  if (!validateCourseSpatialClearance(platforms, obstacles)) {
    return null;
  }

  return {
    level: {
      ...baseLevel,
      seed,
      fallLimitY: minY - 12,
      startPos: { x: 0, y: 0.2, z: 0 },
      finishPos: {
        x: finPad.cx + fx * 0.6,
        y: finPad.topY,
        z: finPad.cz + fz * 0.6,
      },
      platforms,
      obstacles,
      coins,
      checkpoints,
      switches,
      waypoints,
    },
  };
}
