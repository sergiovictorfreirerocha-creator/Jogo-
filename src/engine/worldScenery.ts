import * as THREE from 'three';
import { WorldDef } from '../types/game';

export interface WorldSceneryHandle {
  group: THREE.Group;
  update: (dt: number, elapsed: number, playerPos: THREE.Vector3) => void;
  dispose: () => void;
}

export function buildWorldScenery(
  world: WorldDef,
  enableParticles: boolean
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
  const floorGeo = trackGeo(new THREE.PlaneGeometry(520, 520));
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

  // Biome-specific 3D background scenery (keeps central parkour corridor x in [-16, 16] clear!)
  switch (world.id) {
    case 'urban': {
      // Skyscrapers flanking both sides using InstancedMesh
      const count = 48;
      const bGeo = trackGeo(new THREE.BoxGeometry(1, 1, 1));
      const bMat = trackMat(
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.25 })
      );
      const buildings = new THREE.InstancedMesh(bGeo, bMat, count);
      for (let i = 0; i < count; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const x = side * (22 + ((i * 17) % 55));
        const z = 25 - (i * 4.5);
        const h = 24 + ((i * 13) % 46);
        const w = 8 + ((i * 7) % 9);
        dummy.position.set(x, -34 + h / 2, z);
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
        const x = side * (18 + ((i * 19) % 52));
        const z = 20 - i * 4.6;
        const h = 20 + ((i * 11) % 24);
        dummy.position.set(x, -34 + h / 2, z);
        dummy.scale.set(1.2, h, 1.2);
        dummy.updateMatrix();
        trunks.setMatrixAt(i, dummy.matrix);

        dummy.position.set(x, -34 + h + 4, z);
        dummy.scale.set(6.5 + (i % 4), 14, 6.5 + (i % 4));
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
      // Background Volcanoes + floating obsidian shards
      const vGeo = trackGeo(new THREE.ConeGeometry(18, 34, 9, 1, true));
      const vMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.92 }));
      const ringGeo = trackGeo(new THREE.CylinderGeometry(4.2, 4.2, 1.2, 12));
      const glowMat = trackMat(
        new THREE.MeshStandardMaterial({ color: 0xff4500, emissive: 0xff5500, emissiveIntensity: 1.5 })
      );
      for (let i = 0; i < 6; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const vg = new THREE.Group();
        const cone = new THREE.Mesh(vGeo, vMat);
        const crater = new THREE.Mesh(ringGeo, glowMat);
        crater.position.y = 14;
        vg.add(cone, crater);
        vg.position.set(side * (38 + (i % 3) * 14), -18, -10 - i * 32);
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
        const x = side * (22 + ((i * 15) % 60));
        const z = 20 - i * 5.0;
        const h = 25 + ((i * 17) % 35);
        dummy.position.set(x, -34 + h / 2, z);
        dummy.scale.set(9 + (i % 5) * 2, h, 9 + (i % 5) * 2);
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
        const x = side * (22 + ((i * 19) % 55));
        const z = 25 - i * 5.2;
        const h = 32 + ((i * 13) % 45);
        const w = 7 + (i % 5) * 1.5;
        dummy.position.set(x, -34 + h / 2, z);
        dummy.scale.set(w, h, w);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        towers.setMatrixAt(i, dummy.matrix);

        dummy.position.set(x, -34 + h * 0.85, z);
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
      // Pyramids & sandstone obelisks
      const pyrGeo = trackGeo(new THREE.ConeGeometry(16, 22, 4));
      const pyrMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.88 }));
      for (let i = 0; i < 6; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const pyr = new THREE.Mesh(pyrGeo, pyrMat);
        pyr.position.set(side * (42 + (i % 3) * 14), -23, -15 - i * 35);
        pyr.rotation.y = Math.PI / 4;
        group.add(pyr);
      }
      const obGeo = trackGeo(new THREE.CylinderGeometry(0.9, 1.5, 18, 4));
      const obMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.75 }));
      for (let i = 0; i < 12; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const ob = new THREE.Mesh(obGeo, obMat);
        ob.position.set(side * 20, -18, 5 - i * 16);
        group.add(ob);
      }
      break;
    }

    case 'space': {
      // Starfield + Giant Ringed Planet + Orbiting Space Satellites
      const starCount = 450;
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const r = 130 + (i % 40);
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

      // Ringed gas giant in background
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
      planetGroup.position.set(-58, 28, -110);
      group.add(planetGroup);
      animatedProps.push({ obj: planetGroup, speed: 0.08 });

      // Second warm moon
      const moon = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(10, 20, 18)),
        trackMat(new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.7 }))
      );
      moon.position.set(62, 16, -90);
      group.add(moon);
      animatedProps.push({ obj: moon, speed: 0.14 });
      break;
    }

    case 'medieval': {
      // Castle stone towers with conical roofs flanking the parkour path
      const towerGeo = trackGeo(new THREE.CylinderGeometry(3.8, 4.2, 28, 12));
      const towerMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 }));
      const roofGeo = trackGeo(new THREE.ConeGeometry(4.6, 8, 12));
      const roofMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.65 }));
      for (let i = 0; i < 12; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const tg = new THREE.Group();
        const body = new THREE.Mesh(towerGeo, towerMat);
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 18;
        tg.add(body, roof);
        tg.position.set(side * (24 + (i % 3) * 8), -16, 10 - i * 18);
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
