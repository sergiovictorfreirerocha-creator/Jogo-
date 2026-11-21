import * as THREE from 'three';
import { LevelDef, WorldDef } from '../types/game';
import { Box3D, boxesOverlapXZ, computeLevelExclusionZones } from './spatialBounds';

export interface WorldSceneryHandle {
  group: THREE.Group;
  update: (dt: number, elapsed: number, playerPos: THREE.Vector3) => void;
  dispose: () => void;
}

function makeSceneryBox(cx: number, cz: number, halfW: number, halfD: number): Box3D {
  return {
    minX: cx - halfW,
    maxX: cx + halfW,
    minY: -100,
    maxY: 200,
    minZ: cz - halfD,
    maxZ: cz + halfD,
  };
}

function isClearOfZones(
  cx: number,
  cz: number,
  halfW: number,
  halfD: number,
  courseZones: Box3D[],
  placedScenery: Box3D[]
): boolean {
  const candidate = makeSceneryBox(cx, cz, halfW, halfD);
  for (let i = 0; i < courseZones.length; i++) {
    if (boxesOverlapXZ(candidate, courseZones[i])) return false;
  }
  for (let i = 0; i < placedScenery.length; i++) {
    if (boxesOverlapXZ(candidate, placedScenery[i])) return false;
  }
  return true;
}

function resolveClearSceneryPosition(
  baseX: number,
  baseZ: number,
  halfW: number,
  halfD: number,
  sideHint: number,
  courseZones: Box3D[],
  placedScenery: Box3D[]
): { x: number; z: number } {
  if (isClearOfZones(baseX, baseZ, halfW, halfD, courseZones, placedScenery)) {
    placedScenery.push(makeSceneryBox(baseX, baseZ, halfW + 1.0, halfD + 1.0));
    return { x: baseX, z: baseZ };
  }

  // Push outward away from the track along sideHint first, then diagonal and radial rings
  const outwardSteps = [10, 20, 30, 42, 56, 72, 90, 110];
  for (const step of outwardSteps) {
    const cx = baseX + sideHint * step;
    if (isClearOfZones(cx, baseZ, halfW, halfD, courseZones, placedScenery)) {
      placedScenery.push(makeSceneryBox(cx, baseZ, halfW + 1.0, halfD + 1.0));
      return { x: cx, z: baseZ };
    }
    const oppositeX = baseX - sideHint * (step + 24);
    if (isClearOfZones(oppositeX, baseZ, halfW, halfD, courseZones, placedScenery)) {
      placedScenery.push(makeSceneryBox(oppositeX, baseZ, halfW + 1.0, halfD + 1.0));
      return { x: oppositeX, z: baseZ };
    }
  }

  for (const radius of [22, 36, 52, 70, 92]) {
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2;
      const cx = baseX + Math.cos(ang) * radius;
      const cz = baseZ + Math.sin(ang) * radius;
      if (isClearOfZones(cx, cz, halfW, halfD, courseZones, placedScenery)) {
        placedScenery.push(makeSceneryBox(cx, cz, halfW + 1.0, halfD + 1.0));
        return { x: cx, z: cz };
      }
    }
  }

  // Fallback far outside track bounds
  const safeX = sideHint * 115 + baseX * 0.25;
  placedScenery.push(makeSceneryBox(safeX, baseZ, halfW + 1.0, halfD + 1.0));
  return { x: safeX, z: baseZ };
}

export function buildWorldScenery(
  world: WorldDef,
  enableParticles: boolean,
  level?: LevelDef
): WorldSceneryHandle {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    mats.push(m);
    return m;
  };

  // Exclusion zones covering every platform, tower, and moving obstacle trajectory with 6.5m safety buffer
  const courseZones: Box3D[] = level
    ? computeLevelExclusionZones(level, 6.5)
    : [makeSceneryBox(0, -10, 14, 24)];
  const placedScenery: Box3D[] = [];

  // Gradient sky dome
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 4;
  skyCanvas.height = 128;
  const sCtx = skyCanvas.getContext('2d')!;
  const sGrad = sCtx.createLinearGradient(0, 0, 0, 128);
  sGrad.addColorStop(0, world.skyTop);
  sGrad.addColorStop(0.62, world.skyBottom);
  sGrad.addColorStop(1, world.skyBottom);
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, 4, 128);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const skyGeo = trackGeo(new THREE.SphereGeometry(280, 24, 16));
  const skyMat = trackMat(
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
  );
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  group.add(skyDome);

  // Far horizon floor / sea / abyss plane (far below playfield so falls trigger cleanly)
  const floorGeo = trackGeo(new THREE.PlaneGeometry(620, 620));
  floorGeo.rotateX(-Math.PI / 2);
  let floorColor = 0x1e293b;
  let floorEmissive = 0x000000;
  let floorEmissiveInt = 0;

  if (world.id === 'urban') floorColor = 0x1e293b;
  if (world.id === 'forest') floorColor = 0x14532d;
  if (world.id === 'volcanic') {
    floorColor = 0x7c2d12;
    floorEmissive = 0xff4500;
    floorEmissiveInt = 0.85;
  }
  if (world.id === 'frozen') floorColor = 0xbae6fd;
  if (world.id === 'cyberpunk') {
    floorColor = 0x090418;
    floorEmissive = 0x4c1d95;
    floorEmissiveInt = 0.35;
  }
  if (world.id === 'desert') floorColor = 0xd97706;
  if (world.id === 'space') floorColor = 0x020617;
  if (world.id === 'medieval') floorColor = 0x334155;

  const floorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: floorColor,
      emissive: floorEmissive,
      emissiveIntensity: floorEmissiveInt,
      roughness: 0.9,
      metalness: 0.05,
    })
  );
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.position.set(0, -34, -60);
  floorMesh.receiveShadow = false;
  if (world.id !== 'space') {
    group.add(floorMesh);
  }

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const animatedProps: Array<{ obj: THREE.Object3D; speed: number; radius?: number }> = [];

  // Compute approximate track centerline shift in Z for long levels so towers flank the whole course
  const maxCourseZ = level
    ? level.platforms.reduce((minZ, p) => Math.min(minZ, p.z), -160)
    : -160;
  const zSpan = Math.max(190, Math.abs(maxCourseZ) + 45);

  switch (world.id) {
    case 'urban': {
      // Skyscrapers flanking both sides using InstancedMesh (guaranteed clear of platforms & obstacles)
      const count = 48;
      const bGeo = trackGeo(new THREE.BoxGeometry(1, 1, 1));
      const bMat = trackMat(
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.25 })
      );
      const buildings = new THREE.InstancedMesh(bGeo, bMat, count);
      for (let i = 0; i < count; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const baseX = side * (24 + ((i * 17) % 52));
        const baseZ = 25 - (i / count) * zSpan;
        const h = 24 + ((i * 13) % 46);
        const w = 8 + ((i * 7) % 9);
        const pos = resolveClearSceneryPosition(
          baseX,
          baseZ,
          w / 2,
          w / 2,
          side,
          courseZones,
          placedScenery
        );
        dummy.position.set(pos.x, -34 + h / 2, pos.z);
        dummy.scale.set(w, h, w);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        buildings.setMatrixAt(i, dummy.matrix);
        color.setHSL(0.58, 0.15, 0.22 + (i % 5) * 0.05);
        buildings.setColorAt(i, color);
      }
      buildings.instanceMatrix.needsUpdate = true;
      if (buildings.instanceColor) buildings.instanceColor.needsUpdate = true;
      buildings.computeBoundingSphere();
      group.add(buildings);
      break;
    }

    case 'forest': {
      // Giant multi-part trees (Instanced trunks + Instanced canopies)
      const count = 44;
      const trunkGeo = trackGeo(new THREE.CylinderGeometry(1.1, 1.8, 1, 8));
      const trunkMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x5c2c0e, roughness: 0.9 }));
      const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);

      const leafGeo = trackGeo(new THREE.ConeGeometry(1, 1, 7));
      const leafMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.85 }));
      const leaves = new THREE.InstancedMesh(leafGeo, leafMat, count);

      for (let i = 0; i < count; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const baseX = side * (22 + ((i * 19) % 50));
        const baseZ = 20 - (i / count) * zSpan;
        const h = 20 + ((i * 11) % 24);
        const canopyRadius = 6.5 + (i % 4);
        const pos = resolveClearSceneryPosition(
          baseX,
          baseZ,
          canopyRadius,
          canopyRadius,
          side,
          courseZones,
          placedScenery
        );
        dummy.position.set(pos.x, -34 + h / 2, pos.z);
        dummy.scale.set(1.2, h, 1.2);
        dummy.updateMatrix();
        trunks.setMatrixAt(i, dummy.matrix);

        dummy.position.set(pos.x, -34 + h + 4, pos.z);
        dummy.scale.set(canopyRadius, 14, canopyRadius);
        dummy.updateMatrix();
        leaves.setMatrixAt(i, dummy.matrix);
        color.setHSL(0.36 + (i % 4) * 0.02, 0.55, 0.24 + (i % 3) * 0.06);
        leaves.setColorAt(i, color);
      }
      trunks.instanceMatrix.needsUpdate = true;
      leaves.instanceMatrix.needsUpdate = true;
      if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
      trunks.computeBoundingSphere();
      leaves.computeBoundingSphere();
      group.add(trunks, leaves);
      break;
    }

    case 'volcanic': {
      // Background Volcanoes
      const vGeo = trackGeo(new THREE.ConeGeometry(18, 34, 9, 1, true));
      const vMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.92 }));
      const ringGeo = trackGeo(new THREE.CylinderGeometry(4.2, 4.2, 1.2, 12));
      const glowMat = trackMat(
        new THREE.MeshStandardMaterial({ color: 0xff4500, emissive: 0xff5500, emissiveIntensity: 1.5 })
      );
      for (let i = 0; i < 6; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const baseX = side * (42 + (i % 3) * 14);
        const baseZ = -10 - i * (zSpan / 6);
        const pos = resolveClearSceneryPosition(
          baseX,
          baseZ,
          18,
          18,
          side,
          courseZones,
          placedScenery
        );
        const vg = new THREE.Group();
        const cone = new THREE.Mesh(vGeo, vMat);
        const crater = new THREE.Mesh(ringGeo, glowMat);
        crater.position.y = 14;
        vg.add(cone, crater);
        vg.position.set(pos.x, -18, pos.z);
        group.add(vg);
      }
      break;
    }

    case 'frozen': {
      // Ice mountains / crystal peaks
      const count = 40;
      const peakGeo = trackGeo(new THREE.ConeGeometry(1, 1, 5));
      const peakMat = trackMat(
        new THREE.MeshStandardMaterial({ color: 0xbae6fd, roughness: 0.25, metalness: 0.1 })
      );
      const peaks = new THREE.InstancedMesh(peakGeo, peakMat, count);
      for (let i = 0; i < count; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const baseX = side * (24 + ((i * 15) % 58));
        const baseZ = 20 - (i / count) * zSpan;
        const h = 25 + ((i * 17) % 35);
        const radius = 9 + (i % 5) * 2;
        const pos = resolveClearSceneryPosition(
          baseX,
          baseZ,
          radius,
          radius,
          side,
          courseZones,
          placedScenery
        );
        dummy.position.set(pos.x, -34 + h / 2, pos.z);
        dummy.scale.set(radius, h, radius);
        dummy.rotation.y = i * 0.7;
        dummy.updateMatrix();
        peaks.setMatrixAt(i, dummy.matrix);
        color.setHSL(0.55, 0.65, 0.72 + (i % 4) * 0.05);
        peaks.setColorAt(i, color);
      }
      peaks.instanceMatrix.needsUpdate = true;
      if (peaks.instanceColor) peaks.instanceColor.needsUpdate = true;
      peaks.computeBoundingSphere();
      group.add(peaks);
      break;
    }

    case 'cyberpunk': {
      // Neon-lit megatowers with glowing cyan/magenta bands
      const count = 40;
      const tGeo = trackGeo(new THREE.BoxGeometry(1, 1, 1));
      const tMat = trackMat(
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.75 })
      );
      const towers = new THREE.InstancedMesh(tGeo, tMat, count);
      const bandGeo = trackGeo(new THREE.BoxGeometry(1.04, 0.06, 1.04));
      const bandMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x22d3ee,
          emissive: 0xec4899,
          emissiveIntensity: 1.4,
        })
      );
      const bands = new THREE.InstancedMesh(bandGeo, bandMat, count);
      for (let i = 0; i < count; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const baseX = side * (25 + ((i * 19) % 52));
        const baseZ = 25 - (i / count) * zSpan;
        const h = 32 + ((i * 13) % 45);
        const w = 7 + (i % 5) * 1.5;
        const pos = resolveClearSceneryPosition(
          baseX,
          baseZ,
          w / 2,
          w / 2,
          side,
          courseZones,
          placedScenery
        );
        dummy.position.set(pos.x, -34 + h / 2, pos.z);
        dummy.scale.set(w, h, w);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        towers.setMatrixAt(i, dummy.matrix);

        dummy.position.set(pos.x, -34 + h * 0.85, pos.z);
        dummy.scale.set(w, 12, w);
        dummy.updateMatrix();
        bands.setMatrixAt(i, dummy.matrix);
      }
      towers.instanceMatrix.needsUpdate = true;
      bands.instanceMatrix.needsUpdate = true;
      towers.computeBoundingSphere();
      bands.computeBoundingSphere();
      group.add(towers, bands);
      break;
    }

    case 'desert': {
      // Pyramids & sandstone obelisks kept strictly outside course clearance zones
      const pyrGeo = trackGeo(new THREE.ConeGeometry(16, 22, 4));
      const pyrMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.88 }));
      for (let i = 0; i < 6; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const baseX = side * (44 + (i % 3) * 14);
        const baseZ = -15 - i * (zSpan / 6);
        const pos = resolveClearSceneryPosition(
          baseX,
          baseZ,
          16,
          16,
          side,
          courseZones,
          placedScenery
        );
        const pyr = new THREE.Mesh(pyrGeo, pyrMat);
        pyr.position.set(pos.x, -23, pos.z);
        pyr.rotation.y = Math.PI / 4;
        group.add(pyr);
      }
      const obGeo = trackGeo(new THREE.CylinderGeometry(0.9, 1.5, 18, 4));
      const obMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.75 }));
      for (let i = 0; i < 12; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const baseX = side * 24;
        const baseZ = 5 - i * (zSpan / 12);
        const pos = resolveClearSceneryPosition(
          baseX,
          baseZ,
          2.5,
          2.5,
          side,
          courseZones,
          placedScenery
        );
        const ob = new THREE.Mesh(obGeo, obMat);
        ob.position.set(pos.x, -18, pos.z);
        group.add(ob);
      }
      break;
    }

    case 'space': {
      // Starfield + Giant Ringed Planet + Moon (planet/moon kept clear of playable zones)
      const starCount = 450;
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const r = 135 + (i % 45);
        const theta = (i * 2.39996) % (Math.PI * 2);
        const phi = Math.acos(1 - 2 * ((i + 0.5) / starCount));
        starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starPos[i * 3 + 1] = r * Math.cos(phi);
        starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 50;
      }
      const starGeo = trackGeo(new THREE.BufferGeometry());
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
      const starMat = trackMat(new THREE.PointsMaterial({ color: 0xf8fafc, size: 0.9, fog: false }));
      group.add(new THREE.Points(starGeo, starMat));

      const planetPos = resolveClearSceneryPosition(-68, -110, 42, 42, -1, courseZones, placedScenery);
      const planetGroup = new THREE.Group();
      const pGeo = trackGeo(new THREE.SphereGeometry(22, 28, 24));
      const pMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.55 }));
      const planet = new THREE.Mesh(pGeo, pMat);
      const ringGeo = trackGeo(new THREE.RingGeometry(28, 40, 48));
      ringGeo.rotateX(Math.PI / 2.6);
      const ringMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x7dd3fc,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.55,
        })
      );
      planetGroup.add(planet, new THREE.Mesh(ringGeo, ringMat));
      planetGroup.position.set(planetPos.x, 30, planetPos.z);
      group.add(planetGroup);
      animatedProps.push({ obj: planetGroup, speed: 0.08 });

      const moonPos = resolveClearSceneryPosition(70, -90, 14, 14, 1, courseZones, placedScenery);
      const moon = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(10, 20, 18)),
        trackMat(new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.7 }))
      );
      moon.position.set(moonPos.x, 18, moonPos.z);
      group.add(moon);
      animatedProps.push({ obj: moon, speed: 0.14 });
      break;
    }

    case 'medieval': {
      // Castle stone towers with conical roofs kept safely away from platforms & obstacles
      const towerGeo = trackGeo(new THREE.CylinderGeometry(3.8, 4.2, 28, 12));
      const towerMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 }));
      const roofGeo = trackGeo(new THREE.ConeGeometry(4.6, 8, 12));
      const roofMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.65 }));
      for (let i = 0; i < 12; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const baseX = side * (26 + (i % 3) * 8);
        const baseZ = 10 - i * (zSpan / 12);
        const pos = resolveClearSceneryPosition(
          baseX,
          baseZ,
          5.2,
          5.2,
          side,
          courseZones,
          placedScenery
        );
        const tg = new THREE.Group();
        const body = new THREE.Mesh(towerGeo, towerMat);
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 18;
        tg.add(body, roof);
        tg.position.set(pos.x, -16, pos.z);
        group.add(tg);
      }
      break;
    }
  }

  // Atmospheric floating particles
  let particles: THREE.Points | null = null;
  let particlePos: Float32Array | null = null;
  const pCount = enableParticles ? 180 : 0;

  if (pCount > 0) {
    particlePos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 55;
      particlePos[i * 3 + 1] = Math.random() * 26 - 4;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 55;
    }
    const pGeo = trackGeo(new THREE.BufferGeometry());
    pGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const pColor =
      world.id === 'volcanic'
        ? 0xff7700
        : world.id === 'frozen'
          ? 0xffffff
          : world.id === 'cyberpunk'
            ? 0x22d3ee
            : world.id === 'forest'
              ? 0xa3e635
              : 0xfef08a;
    const pMat = trackMat(
      new THREE.PointsMaterial({
        color: pColor,
        size: world.id === 'frozen' ? 0.22 : 0.16,
        transparent: true,
        opacity: 0.78,
      })
    );
    particles = new THREE.Points(pGeo, pMat);
    group.add(particles);
  }

  const update = (dt: number, elapsed: number, playerPos: THREE.Vector3) => {
    skyDome.position.copy(playerPos);
    animatedProps.forEach((p) => {
      p.obj.rotation.y = elapsed * p.speed;
    });

    if (particles && particlePos) {
      particles.position.set(playerPos.x, playerPos.y, playerPos.z);
      const isRising = world.id === 'volcanic' || world.id === 'cyberpunk';
      for (let i = 0; i < pCount; i++) {
        const yIdx = i * 3 + 1;
        particlePos[yIdx] += (isRising ? 2.2 : -1.6) * dt;
        if (particlePos[yIdx] > 22) particlePos[yIdx] = -6;
        if (particlePos[yIdx] < -6) particlePos[yIdx] = 22;
      }
      particles.geometry.attributes.position.needsUpdate = true;
    }
  };

  const dispose = () => {
    skyTex.dispose();
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
  };

  return { group, update, dispose };
}
