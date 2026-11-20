import * as THREE from 'three';
import { SkinDef } from '../types/game';

export interface CharacterRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  torso: THREE.Mesh;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  accessories: THREE.Object3D[];
  dispose: () => void;
}

export interface CharacterAnimState {
  speed: number;
  maxSpeed: number;
  grounded: boolean;
  crouching: boolean;
  vy: number;
  doubleJumpFlipTimer: number;
  landSquash: number;
  time: number;
}

export function buildCharacterRig(skin: SkinDef): CharacterRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const primaryMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: skin.primaryColor,
      metalness: skin.metalness,
      roughness: skin.roughness,
      clearcoat: skin.clearcoat ?? 0.15,
      clearcoatRoughness: 0.2,
    })
  );

  const secondaryMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: skin.secondaryColor,
      metalness: Math.max(0, skin.metalness - 0.2),
      roughness: Math.min(0.95, skin.roughness + 0.28),
    })
  );

  const accentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: skin.accentColor,
      emissive: skin.emissiveColor,
      emissiveIntensity: skin.emissiveIntensity,
      metalness: 0.65,
      roughness: 0.25,
    })
  );

  const headMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: skin.skinTone,
      metalness: skin.id === 'golden' || skin.id === 'futuristic_robot' ? 0.8 : 0.08,
      roughness: skin.id === 'golden' ? 0.18 : 0.6,
    })
  );

  const bootMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.2,
      roughness: 0.82,
    })
  );

  // Torso (primary silhouette) - center at y = 0.96
  const torsoGeo = trackGeo(new THREE.BoxGeometry(0.56, 0.62, 0.34));
  const torso = new THREE.Mesh(torsoGeo, primaryMat);
  torso.position.y = 0.96;
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyPivot.add(torso);

  // Chest belt & emblem (accent detail)
  const beltGeo = trackGeo(new THREE.BoxGeometry(0.58, 0.1, 0.36));
  const belt = new THREE.Mesh(beltGeo, secondaryMat);
  belt.position.y = -0.24;
  torso.add(belt);

  const emblemGeo = trackGeo(new THREE.OctahedronGeometry(0.09, 0));
  const emblem = new THREE.Mesh(emblemGeo, accentMat);
  emblem.position.set(0, 0.08, 0.18);
  emblem.scale.set(1, 1, 0.45);
  torso.add(emblem);

  // Shoulder pads
  const padGeo = trackGeo(new THREE.BoxGeometry(0.18, 0.14, 0.32));
  const leftPad = new THREE.Mesh(padGeo, accentMat);
  leftPad.position.set(-0.34, 0.26, 0);
  torso.add(leftPad);
  const rightPad = new THREE.Mesh(padGeo, accentMat);
  rightPad.position.set(0.34, 0.26, 0);
  torso.add(rightPad);

  // Head group (pivot at neck y = 1.32)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.32, 0);
  bodyPivot.add(headGroup);

  const headGeo = trackGeo(new THREE.BoxGeometry(0.42, 0.42, 0.42));
  const headMesh = new THREE.Mesh(headGeo, headMat);
  headMesh.position.y = 0.22;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Eyes / Visor (facing +Z locally, rotated when moving)
  const visorGeo = trackGeo(new THREE.BoxGeometry(0.34, 0.11, 0.06));
  const visor = new THREE.Mesh(visorGeo, accentMat);
  visor.position.set(0, 0.24, 0.2);
  headGroup.add(visor);

  // Arms (pivoted at shoulder y = 1.2)
  const makeArm = (side: -1 | 1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.37, 1.2, 0);
    const upperGeo = trackGeo(new THREE.BoxGeometry(0.16, 0.48, 0.18));
    const upper = new THREE.Mesh(upperGeo, primaryMat);
    upper.position.y = -0.22;
    upper.castShadow = true;
    pivot.add(upper);

    const gloveGeo = trackGeo(new THREE.BoxGeometry(0.17, 0.14, 0.19));
    const glove = new THREE.Mesh(gloveGeo, secondaryMat);
    glove.position.y = -0.46;
    pivot.add(glove);
    bodyPivot.add(pivot);
    return pivot;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // Legs (pivoted at hip y = 0.65, bottom of boot sits exactly at y = 0!)
  const makeLeg = (side: -1 | 1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.16, 0.65, 0);

    const legGeo = trackGeo(new THREE.BoxGeometry(0.2, 0.48, 0.22));
    const leg = new THREE.Mesh(legGeo, secondaryMat);
    leg.position.y = -0.24;
    leg.castShadow = true;
    pivot.add(leg);

    const bootGeo = trackGeo(new THREE.BoxGeometry(0.22, 0.17, 0.28));
    const boot = new THREE.Mesh(bootGeo, bootMat);
    boot.position.set(0, -0.565, 0.03);
    boot.castShadow = true;
    pivot.add(boot);

    const soleGeo = trackGeo(new THREE.BoxGeometry(0.23, 0.04, 0.29));
    const sole = new THREE.Mesh(soleGeo, accentMat);
    sole.position.set(0, -0.63, 0.03);
    pivot.add(sole);

    bodyPivot.add(pivot);
    return pivot;
  };
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  // Skin-specific composite accessories
  const accessories: THREE.Object3D[] = [];

  switch (skin.accessory) {
    case 'urban_cap': {
      const capCrown = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, 0.14, 0.45)), accentMat);
      capCrown.position.set(0, 0.44, 0);
      headGroup.add(capCrown);
      const brim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.04, 0.22)), secondaryMat);
      brim.position.set(0, 0.39, -0.25); // backward cap!
      headGroup.add(brim);
      break;
    }
    case 'ninja_katana': {
      const headband = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, 0.09, 0.45)), accentMat);
      headband.position.set(0, 0.34, 0);
      headGroup.add(headband);
      const tail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.09, 0.32, 0.05)), accentMat);
      tail.position.set(0.12, 0.24, -0.27);
      tail.rotation.x = 0.4;
      headGroup.add(tail);
      accessories.push(tail);
      // Katana on back
      const sheath = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.035, 0.035, 0.95, 8)), secondaryMat);
      sheath.position.set(0, 0.12, -0.22);
      sheath.rotation.z = 0.55;
      torso.add(sheath);
      const hilt = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.05, 0.05, 0.18, 8)), accentMat);
      hilt.position.set(-0.26, 0.45, -0.22);
      hilt.rotation.z = 0.55;
      torso.add(hilt);
      break;
    }
    case 'robot_antenna': {
      const stem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 8)), secondaryMat);
      stem.position.set(0, 0.56, 0);
      headGroup.add(stem);
      const orb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.06, 12, 12)), accentMat);
      orb.position.set(0, 0.72, 0);
      headGroup.add(orb);
      accessories.push(orb);
      break;
    }
    case 'astronaut_pack': {
      const helmetRim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.5, 0.5, 0.48)), primaryMat);
      helmetRim.position.set(0, 0.22, -0.02);
      helmetRim.scale.set(1.06, 1.06, 1.02);
      headGroup.add(helmetRim);
      const pack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.48, 0.22)), secondaryMat);
      pack.position.set(0, 0.04, -0.26);
      torso.add(pack);
      break;
    }
    case 'knight_plume': {
      const crest = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.1, 0.26, 0.44)), accentMat);
      crest.position.set(0, 0.52, -0.04);
      headGroup.add(crest);
      const cape = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.52, 0.72, 0.05)), secondaryMat);
      cape.position.set(0, -0.06, -0.22);
      cape.rotation.x = 0.14;
      torso.add(cape);
      accessories.push(cape);
      break;
    }
    case 'cyber_visor': {
      const cyberLens = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.14, 0.14)), accentMat);
      cyberLens.position.set(0, 0.24, 0.19);
      headGroup.add(cyberLens);
      const collar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.62, 0.18, 0.4)), accentMat);
      collar.position.set(0, 0.3, -0.04);
      torso.add(collar);
      break;
    }
    case 'space_thruster': {
      for (const side of [-0.14, 0.14]) {
        const pod = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.1, 0.42, 10)), secondaryMat);
        pod.position.set(side, 0.02, -0.24);
        torso.add(pod);
        const flame = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.06, 0.18, 8)), accentMat);
        flame.position.set(side, -0.25, -0.24);
        flame.rotation.x = Math.PI;
        torso.add(flame);
        accessories.push(flame);
      }
      break;
    }
    case 'lava_horns': {
      for (const side of [-1, 1]) {
        const horn = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.07, 0.34, 8)), accentMat);
        horn.position.set(side * 0.2, 0.5, 0);
        horn.rotation.z = -side * 0.45;
        headGroup.add(horn);
      }
      break;
    }
    case 'ice_crown': {
      for (let i = 0; i < 4; i++) {
        const spike = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.06, 0.24, 5)), accentMat);
        const a = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
        spike.position.set(Math.cos(a) * 0.15, 0.5, Math.sin(a) * 0.15);
        headGroup.add(spike);
      }
      break;
    }
    case 'shadow_wisps': {
      for (let i = 0; i < 3; i++) {
        const wisp = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.08, 0)), accentMat);
        wisp.position.set(Math.cos(i * 2.1) * 0.42, 0.1 + i * 0.15, Math.sin(i * 2.1) * 0.35);
        torso.add(wisp);
        accessories.push(wisp);
      }
      break;
    }
    case 'alien_antennae': {
      for (const side of [-1, 1]) {
        const stalk = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.02, 0.03, 0.28, 6)), headMat);
        stalk.position.set(side * 0.14, 0.52, 0);
        stalk.rotation.z = -side * 0.28;
        headGroup.add(stalk);
        const tip = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.055, 10, 10)), accentMat);
        tip.position.set(side * 0.19, 0.65, 0);
        headGroup.add(tip);
        accessories.push(tip);
      }
      break;
    }
    case 'golden_crown': {
      const band = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.24, 0.1, 8)), accentMat);
      band.position.set(0, 0.46, 0);
      headGroup.add(band);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const point = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.045, 0.14, 4)), accentMat);
        point.position.set(Math.cos(a) * 0.18, 0.56, Math.sin(a) * 0.18);
        headGroup.add(point);
      }
      break;
    }
    case 'sports_shades': {
      const shades = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.44, 0.11, 0.12)), secondaryMat);
      shades.position.set(0, 0.25, 0.19);
      headGroup.add(shades);
      break;
    }
    case 'soldier_comms': {
      const helmet = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.18, 0.46)), primaryMat);
      helmet.position.set(0, 0.39, 0);
      headGroup.add(helmet);
      const mic = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.04, 0.04, 0.2)), accentMat);
      mic.position.set(-0.24, 0.22, 0.12);
      headGroup.add(mic);
      break;
    }
    case 'explorer_hat': {
      const brim = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.42, 0.44, 0.05, 16)), primaryMat);
      brim.position.set(0, 0.43, 0);
      headGroup.add(brim);
      const dome = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.22, 0.26, 0.18, 12)), primaryMat);
      dome.position.set(0, 0.53, 0);
      headGroup.add(dome);
      const bag = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.36, 0.42, 0.18)), secondaryMat);
      bag.position.set(0, 0.02, -0.25);
      torso.add(bag);
      break;
    }
  }

  const dispose = () => {
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
  };

  return {
    root,
    bodyPivot,
    torso,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    accessories,
    dispose,
  };
}

export function animateCharacterRig(rig: CharacterRig, state: CharacterAnimState): void {
  const { speed, maxSpeed, grounded, crouching, vy, doubleJumpFlipTimer, landSquash, time } = state;
  const moveRatio = Math.min(1, speed / Math.max(1, maxSpeed));

  // Crouch scale & squash-and-stretch
  const targetScaleY = crouching ? 0.62 : 1.0 - landSquash * 0.22;
  const targetScaleXZ = crouching ? 1.12 : 1.0 + landSquash * 0.14;
  rig.bodyPivot.scale.y = THREE.MathUtils.lerp(rig.bodyPivot.scale.y, targetScaleY, 0.25);
  rig.bodyPivot.scale.x = THREE.MathUtils.lerp(rig.bodyPivot.scale.x, targetScaleXZ, 0.25);
  rig.bodyPivot.scale.z = THREE.MathUtils.lerp(rig.bodyPivot.scale.z, targetScaleXZ, 0.25);

  // Double jump 360° frontflip
  if (doubleJumpFlipTimer > 0) {
    const progress = 1 - doubleJumpFlipTimer / 0.42;
    rig.bodyPivot.rotation.x = progress * Math.PI * 2;
    rig.bodyPivot.position.y = 0.85;
    rig.torso.position.y = 0.11;
  } else {
    rig.bodyPivot.rotation.x = THREE.MathUtils.lerp(
      rig.bodyPivot.rotation.x,
      grounded ? moveRatio * 0.16 : THREE.MathUtils.clamp(-vy * 0.022, -0.25, 0.25),
      0.22
    );
    rig.bodyPivot.position.y = 0;
    rig.torso.position.y = 0.96 + (grounded && moveRatio > 0.05 ? Math.abs(Math.sin(time * (8 + moveRatio * 6))) * 0.05 : Math.sin(time * 2.5) * 0.015);
  }

  if (!grounded) {
    // Jump / Fall pose
    const airRaise = vy > 0 ? -0.9 : -1.35;
    rig.leftArm.rotation.x = THREE.MathUtils.lerp(rig.leftArm.rotation.x, airRaise, 0.2);
    rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, airRaise, 0.2);
    rig.leftArm.rotation.z = -0.28;
    rig.rightArm.rotation.z = 0.28;
    rig.leftLeg.rotation.x = THREE.MathUtils.lerp(rig.leftLeg.rotation.x, vy > 0 ? -0.45 : 0.32, 0.2);
    rig.rightLeg.rotation.x = THREE.MathUtils.lerp(rig.rightLeg.rotation.x, vy > 0 ? 0.35 : -0.25, 0.2);
  } else if (moveRatio > 0.04) {
    // Walk / Sprint cycle
    const freq = 8 + moveRatio * 7.5;
    const swing = Math.sin(time * freq) * (0.45 + moveRatio * 0.55);
    rig.leftLeg.rotation.x = swing;
    rig.rightLeg.rotation.x = -swing;
    rig.leftArm.rotation.x = -swing * 0.85;
    rig.rightArm.rotation.x = swing * 0.85;
    rig.leftArm.rotation.z = -0.08;
    rig.rightArm.rotation.z = 0.08;
  } else {
    // Idle breathing
    const idleArm = Math.sin(time * 2.5) * 0.04;
    rig.leftLeg.rotation.x = THREE.MathUtils.lerp(rig.leftLeg.rotation.x, 0, 0.2);
    rig.rightLeg.rotation.x = THREE.MathUtils.lerp(rig.rightLeg.rotation.x, 0, 0.2);
    rig.leftArm.rotation.x = THREE.MathUtils.lerp(rig.leftArm.rotation.x, idleArm, 0.2);
    rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, -idleArm, 0.2);
    rig.leftArm.rotation.z = -0.06;
    rig.rightArm.rotation.z = 0.06;
  }

  // Subtle head bob
  rig.headGroup.rotation.y = Math.sin(time * 1.4) * 0.05;

  // Animate skin accessories (wisps, capes, flames)
  rig.accessories.forEach((acc, idx) => {
    acc.rotation.y = time * 1.5 + idx;
  });
}
