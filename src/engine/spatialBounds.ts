import { LevelDef, ObstacleDef, PlatformDef } from '../types/game';

export interface Box3D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

/**
 * Computes the full 3D bounding box swept by a platform (including moving range).
 */
export function getPlatformSweptBox(p: PlatformDef, padXZ = 0, padY = 0): Box3D {
  const rx = p.kind === 'moving' || p.moveAxis === 'x' ? (p.moveAxis === 'x' ? p.moveRange ?? 0 : 0) : 0;
  const ry = p.kind === 'moving' || p.moveAxis === 'y' ? (p.moveAxis === 'y' ? p.moveRange ?? 0 : 0) : 0;
  const rz = p.kind === 'moving' || p.moveAxis === 'z' ? (p.moveAxis === 'z' ? p.moveRange ?? 0 : 0) : 0;

  return {
    minX: p.x - p.w / 2 - rx - padXZ,
    maxX: p.x + p.w / 2 + rx + padXZ,
    minY: p.y - p.h / 2 - ry - padY,
    maxY: p.y + p.h / 2 + ry + padY,
    minZ: p.z - p.d / 2 - rz - padXZ,
    maxZ: p.z + p.d / 2 + rz + padXZ,
  };
}

/**
 * Computes the full 3D bounding box swept by an obstacle over its entire animation cycle.
 */
export function getObstacleSweptBox(o: ObstacleDef, padXZ = 0, padY = 0): Box3D {
  let halfX = o.w / 2;
  let halfZ = o.d / 2;
  let minY = o.y - o.h / 2;
  let maxY = o.y + o.h / 2;

  if (o.kind === 'rotator') {
    const r = Math.max(o.w, o.d) / 2;
    halfX = r;
    halfZ = r;
  } else if (o.kind === 'pendulum' || o.kind === 'moving_block' || o.kind === 'moving_wall') {
    const range = o.range ?? 2.2;
    if (o.axis === 'z') {
      halfZ += range;
    } else {
      halfX += range;
    }
    if (o.kind === 'pendulum') {
      maxY += 0.65;
    }
  } else if (o.kind === 'crusher') {
    maxY += o.range ?? 3.2;
  } else if (o.kind === 'laser_bar' && (o.range ?? 0) > 0) {
    const range = o.range ?? 1.8;
    if (o.axis === 'x') {
      halfX += range;
    } else if (o.axis === 'z') {
      halfZ += range;
    } else {
      minY -= range;
      maxY += range;
    }
  }

  return {
    minX: o.x - halfX - padXZ,
    maxX: o.x + halfX + padXZ,
    minY: minY - padY,
    maxY: maxY + padY,
    minZ: o.z - halfZ - padXZ,
    maxZ: o.z + halfZ + padXZ,
  };
}

export function boxesOverlap3D(a: Box3D, b: Box3D): boolean {
  return (
    a.minX < b.maxX &&
    a.maxX > b.minX &&
    a.minY < b.maxY &&
    a.maxY > b.minY &&
    a.minZ < b.maxZ &&
    a.maxZ > b.minZ
  );
}

export function boxesOverlapXZ(a: Box3D, b: Box3D): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

export function distanceXZ(a: Box3D, b: Box3D): number {
  const dx = Math.max(0, a.minX - b.maxX, b.minX - a.maxX);
  const dz = Math.max(0, a.minZ - b.maxZ, b.minZ - a.maxZ);
  return Math.hypot(dx, dz);
}

/**
 * Builds world-space XZ exclusion boxes for all platforms, towers, and swept obstacle trajectories
 * so background scenery towers/structures never intersect playable geometry or obstacles.
 */
export function computeLevelExclusionZones(level: LevelDef, marginXZ = 5.5): Box3D[] {
  const zones: Box3D[] = [];
  for (const p of level.platforms) {
    zones.push(getPlatformSweptBox(p, marginXZ, 4));
  }
  for (const o of level.obstacles) {
    zones.push(getObstacleSweptBox(o, marginXZ, 4));
  }
  return zones;
}
