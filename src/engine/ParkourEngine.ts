import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CameraDistanceMode,
  HudSnapshot,
  KeyBindings,
  LevelDef,
  ObstacleDef,
  PlatformDef,
  SaveData,
  WorldDef,
} from '../types/game';
import { getSkinById } from '../data/skins';
import { getWorldById } from '../data/worlds';
import { buildCharacterRig, animateCharacterRig, CharacterRig } from './characterBuilder';
import { buildWorldScenery, WorldSceneryHandle } from './worldScenery';
import { getHazardStripeTexture, getSoftShadowTexture, getWorldPlatformTexture } from './textures';
import { soundEngine } from '../audio/soundEngine';

// Pre-allocated math helpers outside render loop (Zero GC)
const _camTarget = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _forwardVec = new THREE.Vector3();
const _rightVec = new THREE.Vector3();

interface RuntimePlatform {
  def: PlatformDef;
  mesh: THREE.Mesh;
  trimMesh?: THREE.Mesh;
  curX: number;
  curY: number;
  curZ: number;
  prevX: number;
  prevY: number;
  prevZ: number;
  // Disappearing state
  disState: 'solid' | 'shaking' | 'gone';
  disTimer: number;
  // Gate / temporary bridge state
  gateActive: boolean;
  bridgeState: 'permanent' | 'ready' | 'active' | 'vanishing' | 'cooldown';
  bridgeTimer: number;
  bridgeDuration: number;
  cooldownDuration: number;
  warnBeep2s: boolean;
  warnBeep1s: boolean;
  baseColorHex: number;
  baseEmissiveHex: number;
  baseEmissiveInt: number;
}

interface RuntimeObstacle {
  def: ObstacleDef;
  mesh: THREE.Mesh;
  curX: number;
  curY: number;
  curZ: number;
  angle: number;
}

interface RuntimeCoin {
  id: string;
  value: number;
  isSecret: boolean;
  mesh: THREE.Group;
  x: number;
  y: number;
  z: number;
  collected: boolean;
}

interface RuntimeCheckpoint {
  index: number;
  x: number;
  y: number;
  z: number;
  activated: boolean;
  ringMesh: THREE.Mesh;
  beaconMesh: THREE.Mesh;
}

interface RuntimeSwitch {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  activated: boolean;
  cooldown: boolean;
  leverMesh: THREE.Mesh;
  orbMesh: THREE.Mesh;
}

interface BurstParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

export interface EngineCallbacks {
  onHudUpdate: (hud: HudSnapshot) => void;
  onLevelComplete: (stats: {
    timeSeconds: number;
    coinsCollected: number;
    coinsValueCollected: number;
    fallsCount: number;
  }) => void;
  onPauseRequest: () => void;
  onRestartRequest?: () => void;
  onCameraDistanceChange: (mode: CameraDistanceMode) => void;
  onJumpStat: () => void;
  onFallStat: () => void;
}

export class ParkourEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private maxAnisotropy: number;

  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;
  private envMap: THREE.Texture;

  private frameId = 0;
  private disposed = false;
  private lastTimeMs = 0;
  private simTime = 0;

  // Mode
  private mode: 'showcase' | 'playing' | 'paused' | 'victory' = 'showcase';
  private currentWorld: WorldDef = getWorldById('urban');
  private currentLevel: LevelDef | null = null;
  private scenery: WorldSceneryHandle | null = null;
  private levelGroup = new THREE.Group();

  // Player
  private playerRig: CharacterRig | null = null;
  private equippedSkinId = 'urban_runner';
  private contactShadow: THREE.Mesh;
  private playerPos = new THREE.Vector3(0, 0.2, 0);
  private playerVel = new THREE.Vector3(0, 0, 0);
  private playerYaw = Math.PI; // facing -Z initially
  private grounded = false;
  private groundedPlatform: RuntimePlatform | null = null;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private jumpsRemaining = 2;
  private doubleJumpFlipTimer = 0;
  private landSquash = 0;
  private crouching = false;
  private sprinting = false;
  private spawnPos = new THREE.Vector3(0, 0.2, 0);
  private activeCheckpointIndex = 0;

  // Level runtime entities
  private platforms: RuntimePlatform[] = [];
  private obstacles: RuntimeObstacle[] = [];
  private coins: RuntimeCoin[] = [];
  private checkpoints: RuntimeCheckpoint[] = [];
  private switches: RuntimeSwitch[] = [];
  private finishGroup: THREE.Group | null = null;
  private finishPos = new THREE.Vector3(0, 0, -50);
  private levelDisposables: Array<{ dispose: () => void }> = [];

  // Particle pool
  private particlePool: BurstParticle[] = [];
  private particleGeo: THREE.BoxGeometry;

  // Run stats & elimination state
  private elapsedRunTime = 0;
  private obstacleSimTime = 0;
  private collectedCoinsCount = 0;
  private collectedCoinsValue = 0;
  private fallsCount = 0;
  private eliminated = false;
  private eliminationTimer = 0;
  private eliminationReason: string | null = null;
  private fellFromTimedBridge = false;
  private fellBridgeOriginY = 0;
  private toastMessage: string | null = null;
  private toastTimer = 0;
  private hudThrottle = 0;

  // Camera
  private camYaw = 0; // 0 looks along -Z
  private camPitch = 0.34;
  private camDistMode: CameraDistanceMode = 'medium';
  private camCurDist = 6.8;
  private camSensitivity = 1.0;
  private camShake = 0;
  private isDraggingCam = false;
  private activeCamPointerId: number | null = null;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private raycaster = new THREE.Raycaster();

  // Input
  private heldKeys = new Set<string>();
  private keyBindings: KeyBindings;
  private particlesEnabled = true;
  private virtualMoveX = 0;
  private virtualMoveY = 0;
  private virtualSprint = false;
  private virtualCrouch = false;

  // Bound event listeners
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onBlurBound: () => void;
  private onResizeBound: () => void;
  private onPointerDownBound: (e: PointerEvent) => void;
  private onPointerMoveBound: (e: PointerEvent) => void;
  private onPointerUpBound: (e: PointerEvent) => void;
  private onWheelBound: (e: WheelEvent) => void;

  constructor(container: HTMLElement, initialSave: SaveData, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.keyBindings = { ...initialSave.keyBindings };
    this.equippedSkinId = initialSave.equippedSkin;
    this.camDistMode = initialSave.settings.cameraDistance;
    this.camSensitivity = initialSave.settings.cameraSensitivity;
    this.particlesEnabled = initialSave.settings.particlesEnabled;

    // Software WebGL detection via renderer string
    this.isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas');
        const gl = probe.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && initialSave.settings.shadowsEnabled;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    this.maxAnisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      62,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.1,
      450
    );

    // Studio PMREM Environment
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envMap;
    pmrem.dispose();

    // 3-Point Warm/Cool Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x334155, 0.75);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff5dc, 1.55);
    this.sunLight.position.set(18, 32, 16);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 110;
    const d = 28;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.rimLight = new THREE.DirectionalLight(0x93c5fd, 0.55);
    this.rimLight.position.set(-16, 12, -20);
    this.scene.add(this.rimLight);

    this.scene.add(this.levelGroup);

    // Contact shadow grounding plane
    const shadowGeo = new THREE.PlaneGeometry(1.3, 1.3);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: getSoftShadowTexture(),
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    });
    this.contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.scene.add(this.contactShadow);

    // Particle pool
    this.particleGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    for (let i = 0; i < 42; i++) {
      const m = new THREE.Mesh(
        this.particleGeo,
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
      );
      m.visible = false;
      this.scene.add(m);
      this.particlePool.push({ mesh: m, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1 });
    }

    this.setEquippedSkin(this.equippedSkinId);
    this.enterShowcase('urban');

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Input & Resize listeners
    this.onKeyDownBound = this.handleKeyDown.bind(this);
    this.onKeyUpBound = this.handleKeyUp.bind(this);
    this.onBlurBound = () => {
      this.heldKeys.clear();
      this.virtualMoveX = 0;
      this.virtualMoveY = 0;
      this.virtualSprint = false;
      this.virtualCrouch = false;
      this.isDraggingCam = false;
      this.activeCamPointerId = null;
    };
    this.onResizeBound = this.handleResize.bind(this);
    this.onPointerDownBound = this.handlePointerDown.bind(this);
    this.onPointerMoveBound = this.handlePointerMove.bind(this);
    this.onPointerUpBound = (e: PointerEvent) => {
      if (this.activeCamPointerId === null || e.pointerId === this.activeCamPointerId) {
        this.isDraggingCam = false;
        this.activeCamPointerId = null;
      }
    };
    this.onWheelBound = this.handleWheel.bind(this);

    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    window.addEventListener('blur', this.onBlurBound);
    window.addEventListener('resize', this.onResizeBound);
    const dom = this.renderer.domElement;
    dom.style.touchAction = 'none';
    dom.addEventListener('pointerdown', this.onPointerDownBound);
    window.addEventListener('pointermove', this.onPointerMoveBound);
    window.addEventListener('pointerup', this.onPointerUpBound);
    window.addEventListener('pointercancel', this.onPointerUpBound);
    dom.addEventListener('wheel', this.onWheelBound, { passive: true });

    this.lastTimeMs = performance.now();
    this.startLoop();
  }

  public updateSettings(save: SaveData): void {
    this.keyBindings = { ...save.keyBindings };
    this.camSensitivity = save.settings.cameraSensitivity;
    this.camDistMode = save.settings.cameraDistance;
    this.particlesEnabled = save.settings.particlesEnabled;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && save.settings.shadowsEnabled;
    if (save.equippedSkin !== this.equippedSkinId) {
      this.setEquippedSkin(save.equippedSkin);
    }
  }

  public setEquippedSkin(skinId: string): void {
    this.equippedSkinId = skinId;
    if (this.playerRig) {
      this.scene.remove(this.playerRig.root);
      this.playerRig.dispose();
    }
    const skin = getSkinById(skinId);
    this.playerRig = buildCharacterRig(skin);
    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.root.rotation.y = this.playerYaw;
    this.scene.add(this.playerRig.root);
  }

  public enterShowcase(worldId: LevelDef['worldId'] = 'urban'): void {
    this.mode = 'showcase';
    this.currentLevel = null;
    this.clearLevel();
    this.applyWorldAtmosphere(getWorldById(worldId));
    // Build a hero rooftop pedestal for the menu backdrop
    const tex = getWorldPlatformTexture(worldId, this.maxAnisotropy);
    const pedGeo = new THREE.BoxGeometry(7, 1.2, 7);
    const pedMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.65,
      metalness: 0.15,
    });
    const ped = new THREE.Mesh(pedGeo, pedMat);
    ped.position.set(0, -0.6, 0);
    ped.receiveShadow = true;
    this.levelGroup.add(ped);
    this.levelDisposables.push(pedGeo, pedMat);

    this.playerPos.set(0, 0, 0);
    this.playerVel.set(0, 0, 0);
    this.playerYaw = 0.25;
    this.grounded = true;
    this.crouching = false;
    this.sprinting = false;
    this.eliminated = false;
    this.eliminationTimer = 0;
    this.eliminationReason = null;
    this.fellFromTimedBridge = false;
    this.fellBridgeOriginY = 0;
    this.activeCheckpointIndex = 0;
    this.elapsedRunTime = 0;
    this.collectedCoinsCount = 0;
    this.collectedCoinsValue = 0;
    this.fallsCount = 0;
    this.toastMessage = null;
    this.toastTimer = 0;
    this.heldKeys.clear();
    this.virtualMoveX = 0;
    this.virtualMoveY = 0;
    this.virtualSprint = false;
    this.virtualCrouch = false;
    if (this.playerRig) {
      this.playerRig.root.position.copy(this.playerPos);
      this.playerRig.root.rotation.set(0, this.playerYaw, 0);
    }
  }

  public loadLevel(level: LevelDef): void {
    this.clearLevel();
    this.currentLevel = level;
    const world = getWorldById(level.worldId);
    this.applyWorldAtmosphere(world);

    const platTex = getWorldPlatformTexture(world.id, this.maxAnisotropy);
    const hazardTex = getHazardStripeTexture(this.maxAnisotropy);

    // Build platforms
    level.platforms.forEach((p) => {
      const geo = new THREE.BoxGeometry(p.w, p.h, p.d);
      const texClone = platTex.clone();
      texClone.needsUpdate = true;
      texClone.repeat.set(Math.max(1, Math.round(p.w / 3)), Math.max(1, Math.round(p.d / 3)));

      let color = world.primaryPlatformColor;
      let emissive = 0x000000;
      let emissiveInt = 0;
      let roughness = 0.72;
      let metalness = 0.15;
      let transparent = false;
      let opacity = 1;

      if (p.kind === 'moving') {
        color = world.secondaryPlatformColor;
        metalness = 0.35;
      } else if (p.kind === 'disappearing') {
        color = 0xf59e0b;
        emissive = 0x78350f;
        emissiveInt = 0.25;
      } else if (p.kind === 'ice') {
        color = 0xbae6fd;
        roughness = 0.12;
        metalness = 0.1;
      } else if (p.kind === 'bounce') {
        color = 0x10b981;
        emissive = 0x059669;
        emissiveInt = 0.5;
      } else if (p.kind === 'gate_bridge') {
        color = world.accentColor;
        emissive = world.accentColor;
        emissiveInt = 0.45;
        transparent = true;
        opacity = 0.34;
      } else if (p.kind === 'narrow') {
        color = world.secondaryPlatformColor;
      }

      const mat = new THREE.MeshStandardMaterial({
        map: p.kind === 'ice' || p.kind === 'bounce' ? null : texClone,
        color,
        emissive,
        emissiveIntensity: emissiveInt,
        roughness,
        metalness,
        transparent,
        opacity,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(p.x, p.y, p.z);
      mesh.castShadow = p.kind !== 'gate_bridge';
      mesh.receiveShadow = true;
      this.levelGroup.add(mesh);
      this.levelDisposables.push(geo, mat, texClone);

      // Visual accent trim on special platforms
      let trimMesh: THREE.Mesh | undefined;
      if (p.kind === 'bounce') {
        const ringGeo = new THREE.CylinderGeometry(p.w * 0.36, p.w * 0.4, 0.18, 20);
        const ringMat = new THREE.MeshStandardMaterial({
          color: 0x34d399,
          emissive: 0x10b981,
          emissiveIntensity: 0.9,
        });
        trimMesh = new THREE.Mesh(ringGeo, ringMat);
        trimMesh.position.set(p.x, p.y + p.h / 2 + 0.08, p.z);
        this.levelGroup.add(trimMesh);
        this.levelDisposables.push(ringGeo, ringMat);
      }

      const isBridge = p.kind === 'gate_bridge';
      this.platforms.push({
        def: p,
        mesh,
        trimMesh,
        curX: p.x,
        curY: p.y,
        curZ: p.z,
        prevX: p.x,
        prevY: p.y,
        prevZ: p.z,
        disState: 'solid',
        disTimer: 0,
        gateActive: !isBridge,
        bridgeState: isBridge ? 'ready' : 'permanent',
        bridgeTimer: 0,
        bridgeDuration: p.timedDuration ?? 6.0,
        cooldownDuration: p.cooldownDuration ?? 4.0,
        warnBeep2s: false,
        warnBeep1s: false,
        baseColorHex: color,
        baseEmissiveHex: emissive,
        baseEmissiveInt: emissiveInt,
      });
    });

    // Build obstacles
    level.obstacles.forEach((o) => {
      const geo = new THREE.BoxGeometry(o.w, o.h, o.d);
      const isLaser = o.kind === 'laser_bar';
      const isLethal = this.isLethalObstacleDef(o);
      const obsColor = isLaser
        ? 0xf43f5e
        : o.kind === 'crusher'
          ? 0xef4444
          : o.kind === 'moving_wall' || o.kind === 'moving_block'
            ? 0xf97316
            : world.hazardColor;
      const mat = new THREE.MeshStandardMaterial({
        map: isLaser ? null : hazardTex,
        color: obsColor,
        emissive: isLaser ? 0xf43f5e : isLethal ? 0xdc2626 : world.hazardColor,
        emissiveIntensity: isLaser ? 1.2 : isLethal ? 0.55 : 0.3,
        roughness: 0.35,
        metalness: 0.45,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(o.x, o.y, o.z);
      mesh.rotation.y = o.phase || 0;
      mesh.castShadow = true;
      this.levelGroup.add(mesh);
      this.levelDisposables.push(geo, mat);

      this.obstacles.push({
        def: o,
        mesh,
        curX: o.x,
        curY: o.y,
        curZ: o.z,
        angle: o.phase || 0,
      });
    });

    // Build coins (composite spinning gold ring + core gem)
    const coinRingGeo = new THREE.TorusGeometry(0.32, 0.08, 10, 20);
    const coinCoreGeo = new THREE.OctahedronGeometry(0.18, 0);
    const coinGoldMat = new THREE.MeshPhysicalMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.35,
      metalness: 0.92,
      roughness: 0.16,
      clearcoat: 0.9,
    });
    const coinSecretMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      metalness: 0.85,
      roughness: 0.14,
      clearcoat: 1.0,
    });
    this.levelDisposables.push(coinRingGeo, coinCoreGeo, coinGoldMat, coinSecretMat);

    level.coins.forEach((c) => {
      const g = new THREE.Group();
      const mat = c.isSecret ? coinSecretMat : coinGoldMat;
      const ring = new THREE.Mesh(coinRingGeo, mat);
      const core = new THREE.Mesh(coinCoreGeo, mat);
      g.add(ring, core);
      g.position.set(c.x, c.y, c.z);
      this.levelGroup.add(g);
      this.coins.push({
        id: c.id,
        value: c.value,
        isSecret: Boolean(c.isSecret),
        mesh: g,
        x: c.x,
        y: c.y,
        z: c.z,
        collected: false,
      });
    });

    // Build checkpoints
    const cpRingGeo = new THREE.TorusGeometry(0.95, 0.09, 10, 28);
    cpRingGeo.rotateX(Math.PI / 2);
    const cpBeaconGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2, 10);
    this.levelDisposables.push(cpRingGeo, cpBeaconGeo);

    level.checkpoints.forEach((cp) => {
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.6,
      });
      const beaconMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.75,
        transparent: true,
        opacity: 0.65,
      });
      const ringMesh = new THREE.Mesh(cpRingGeo, ringMat);
      ringMesh.position.set(cp.x, cp.y + 0.12, cp.z);
      const beaconMesh = new THREE.Mesh(cpBeaconGeo, beaconMat);
      beaconMesh.position.set(cp.x, cp.y + 1.15, cp.z);
      this.levelGroup.add(ringMesh, beaconMesh);
      this.levelDisposables.push(ringMat, beaconMat);

      this.checkpoints.push({
        index: cp.index,
        x: cp.x,
        y: cp.y,
        z: cp.z,
        activated: false,
        ringMesh,
        beaconMesh,
      });
    });

    // Build interactive switches
    const pedGeo = new THREE.CylinderGeometry(0.32, 0.4, 0.9, 12);
    const orbGeo = new THREE.OctahedronGeometry(0.26, 0);
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.4 });
    this.levelDisposables.push(pedGeo, orbGeo, pedMat);

    level.switches.forEach((sw) => {
      const orbMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 0.9,
      });
      const leverMesh = new THREE.Mesh(pedGeo, pedMat);
      leverMesh.position.set(sw.x, sw.y + 0.45, sw.z);
      const orbMesh = new THREE.Mesh(orbGeo, orbMat);
      orbMesh.position.set(sw.x, sw.y + 1.15, sw.z);
      this.levelGroup.add(leverMesh, orbMesh);
      this.levelDisposables.push(orbMat);

      this.switches.push({
        id: sw.id,
        label: sw.label,
        x: sw.x,
        y: sw.y,
        z: sw.z,
        activated: false,
        cooldown: false,
        leverMesh,
        orbMesh,
      });
    });

    // Build Finish Portal
    const finishGroup = new THREE.Group();
    const archGeo = new THREE.TorusGeometry(1.65, 0.2, 14, 36);
    const archMat = new THREE.MeshPhysicalMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.65,
      metalness: 0.85,
      roughness: 0.2,
    });
    const portalGeo = new THREE.CircleGeometry(1.5, 32);
    const portalMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const arch = new THREE.Mesh(archGeo, archMat);
    const portal = new THREE.Mesh(portalGeo, portalMat);
    finishGroup.add(arch, portal);
    finishGroup.position.set(level.finishPos.x, level.finishPos.y + 1.75, level.finishPos.z);
    this.levelGroup.add(finishGroup);
    this.levelDisposables.push(archGeo, archMat, portalGeo, portalMat);
    this.finishGroup = finishGroup;
    this.finishPos.set(level.finishPos.x, level.finishPos.y, level.finishPos.z);

    // Reset player & run state
    this.spawnPos.set(level.startPos.x, level.startPos.y + 0.05, level.startPos.z);
    this.playerPos.copy(this.spawnPos);
    this.playerVel.set(0, 0, 0);
    this.playerYaw = Math.PI;
    this.camYaw = 0;
    this.camPitch = 0.34;
    this.grounded = false;
    this.groundedPlatform = null;
    this.jumpsRemaining = 2;
    this.crouching = false;
    this.sprinting = false;
    this.activeCheckpointIndex = 0;

    this.elapsedRunTime = 0;
    this.obstacleSimTime = 0;
    this.collectedCoinsCount = 0;
    this.collectedCoinsValue = 0;
    this.fallsCount = 0;
    this.eliminated = false;
    this.eliminationTimer = 0;
    this.eliminationReason = null;
    this.fellFromTimedBridge = false;
    this.fellBridgeOriginY = 0;
    this.toastMessage = null;
    this.toastTimer = 0;
    if (this.playerRig) {
      this.playerRig.root.rotation.set(0, this.playerYaw, 0);
    }

    this.mode = 'playing';
    soundEngine.startWorldMusic(world.id);
    if (level.seed !== undefined) {
      this.showToast('Novo percurso procedural gerado!');
    }
    this.pushHudSnapshot();
  }

  public retryFromElimination(): void {
    if (this.eliminated) {
      this.completeEliminationRespawn();
    }
  }

  public setVirtualMove(x: number, y: number): void {
    this.virtualMoveX = Math.max(-1, Math.min(1, x));
    this.virtualMoveY = Math.max(-1, Math.min(1, y));
  }

  public setVirtualFlags(opts: { sprint?: boolean; crouch?: boolean }): void {
    if (opts.sprint !== undefined) this.virtualSprint = opts.sprint;
    if (opts.crouch !== undefined) this.virtualCrouch = opts.crouch;
  }

  public triggerVirtualJump(): void {
    soundEngine.unlock();
    if (this.mode === 'playing' && !this.eliminated) {
      this.jumpBufferTimer = 0.14;
    }
  }

  public triggerVirtualInteract(): void {
    soundEngine.unlock();
    if (this.mode === 'playing' && !this.eliminated) {
      this.tryInteract();
    }
  }

  public cycleCameraDistance(): void {
    const order: CameraDistanceMode[] = ['close', 'medium', 'far'];
    const next = order[(order.indexOf(this.camDistMode) + 1) % order.length];
    this.camDistMode = next;
    this.callbacks.onCameraDistanceChange(next);
    const label = next === 'close' ? 'Próxima' : next === 'medium' ? 'Média' : 'Distante';
    this.showToast(`Câmera: ${label}`);
  }

  public restartLevel(): void {
    if (this.callbacks.onRestartRequest) {
      this.callbacks.onRestartRequest();
      return;
    }
    if (this.currentLevel) {
      this.loadLevel(this.currentLevel);
      this.showToast('Fase reiniciada!');
    }
  }

  public setPaused(paused: boolean): void {
    if (this.mode === 'victory' || this.mode === 'showcase') return;
    this.mode = paused ? 'paused' : 'playing';
    this.heldKeys.clear();
    this.virtualMoveX = 0;
    this.virtualMoveY = 0;
    this.virtualSprint = false;
    this.virtualCrouch = false;
  }

  private applyWorldAtmosphere(world: WorldDef): void {
    this.currentWorld = world;
    if (this.scenery) {
      this.scene.remove(this.scenery.group);
      this.scenery.dispose();
      this.scenery = null;
    }
    this.scene.fog = new THREE.FogExp2(world.fogColor, world.fogDensity);
    this.scene.background = new THREE.Color(world.fogColor);
    this.hemiLight.color.setHex(world.ambientSky);
    this.hemiLight.groundColor.setHex(world.ambientGround);
    this.sunLight.color.setHex(world.sunColor);

    this.scenery = buildWorldScenery(world, this.particlesEnabled, this.currentLevel ?? undefined);
    this.scene.add(this.scenery.group);
  }

  private clearLevel(): void {
    while (this.levelGroup.children.length > 0) {
      this.levelGroup.remove(this.levelGroup.children[0]);
    }
    this.levelDisposables.forEach((d) => d.dispose());
    this.levelDisposables = [];
    this.platforms = [];
    this.obstacles = [];
    this.coins = [];
    this.checkpoints = [];
    this.switches = [];
    this.finishGroup = null;
  }

  private showToast(msg: string): void {
    this.toastMessage = msg;
    this.toastTimer = 2.4;
  }

  private spawnBurst(x: number, y: number, z: number, colorHex: number, count = 10): void {
    if (!this.particlesEnabled) return;
    let spawned = 0;
    for (const p of this.particlePool) {
      if (p.life <= 0) {
        p.life = 0.45 + Math.random() * 0.25;
        p.maxLife = p.life;
        p.mesh.position.set(x, y, z);
        p.vx = (Math.random() - 0.5) * 6;
        p.vy = 2 + Math.random() * 4.5;
        p.vz = (Math.random() - 0.5) * 6;
        (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
        p.mesh.visible = true;
        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    soundEngine.unlock();
    if (this.mode !== 'playing') {
      if (e.code === this.keyBindings.pause && this.mode === 'paused') {
        e.preventDefault();
        this.callbacks.onPauseRequest();
      }
      return;
    }

    if (this.eliminated) {
      if (!e.repeat && (e.code === 'Enter' || e.code === this.keyBindings.jump)) {
        e.preventDefault();
        this.retryFromElimination();
      } else if (!e.repeat && e.code === this.keyBindings.restart) {
        this.restartLevel();
      } else if (!e.repeat && e.code === this.keyBindings.pause) {
        e.preventDefault();
        this.callbacks.onPauseRequest();
      }
      return;
    }

    const wasHeld = this.heldKeys.has(e.code);
    this.heldKeys.add(e.code);

    if (e.code === this.keyBindings.jump) {
      e.preventDefault();
      if (!wasHeld) {
        this.jumpBufferTimer = 0.14;
      }
    }

    if (!wasHeld && e.code === this.keyBindings.camera) {
      const order: CameraDistanceMode[] = ['close', 'medium', 'far'];
      const next = order[(order.indexOf(this.camDistMode) + 1) % order.length];
      this.camDistMode = next;
      this.callbacks.onCameraDistanceChange(next);
      const label = next === 'close' ? 'Próxima' : next === 'medium' ? 'Média' : 'Distante';
      this.showToast(`Câmera: ${label}`);
    }

    if (!wasHeld && e.code === this.keyBindings.interact) {
      this.tryInteract();
    }

    if (!wasHeld && e.code === this.keyBindings.restart) {
      this.restartLevel();
    }

    if (!wasHeld && e.code === this.keyBindings.pause) {
      e.preventDefault();
      this.callbacks.onPauseRequest();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.heldKeys.delete(e.code);
  }

  private handlePointerDown(e: PointerEvent): void {
    soundEngine.unlock();
    if (this.mode !== 'playing') return;
    if (this.isDraggingCam && this.activeCamPointerId !== null) return;
    this.isDraggingCam = true;
    this.activeCamPointerId = e.pointerId;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  }

  private handlePointerMove(e: PointerEvent): void {
    if (this.mode !== 'playing' || !this.isDraggingCam || e.pointerId !== this.activeCamPointerId) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.camYaw -= dx * 0.0055 * this.camSensitivity;
    this.camPitch = THREE.MathUtils.clamp(
      this.camPitch + dy * 0.0045 * this.camSensitivity,
      0.08,
      1.15
    );
  }

  private handleWheel(e: WheelEvent): void {
    if (this.mode !== 'playing') return;
    if (e.deltaY < 0) {
      this.camDistMode = this.camDistMode === 'far' ? 'medium' : 'close';
    } else if (e.deltaY > 0) {
      this.camDistMode = this.camDistMode === 'close' ? 'medium' : 'far';
    }
    this.callbacks.onCameraDistanceChange(this.camDistMode);
  }

  private handleResize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private isLethalObstacleDef(o: ObstacleDef): boolean {
    if (o.kind === 'crouch_beam' || o.kind === 'wall') {
      return Boolean(o.lethal);
    }
    if (o.kind === 'laser_bar') {
      return o.lethal !== false;
    }
    return (
      o.kind === 'rotator' ||
      o.kind === 'pendulum' ||
      o.kind === 'moving_block' ||
      o.kind === 'moving_wall' ||
      o.kind === 'crusher'
    );
  }

  private activateBridgeGroup(groupKey: string, viaSwitch?: RuntimeSwitch): void {
    let activatedAny = false;
    let duration = 6.0;
    for (const p of this.platforms) {
      if (p.def.kind !== 'gate_bridge') continue;
      const matches = p.def.switchId === groupKey || p.def.bridgeGroupId === groupKey;
      if (!matches || p.bridgeState !== 'ready') continue;
      p.bridgeState = 'active';
      p.bridgeTimer = p.bridgeDuration;
      duration = p.bridgeDuration;
      p.warnBeep2s = false;
      p.warnBeep1s = false;
      p.gateActive = true;
      p.mesh.visible = true;
      p.mesh.scale.set(1, 1, 1);
      const pMat = p.mesh.material as THREE.MeshStandardMaterial;
      pMat.color.setHex(p.baseColorHex);
      pMat.emissive.setHex(p.baseEmissiveHex);
      pMat.emissiveIntensity = 0.72;
      pMat.opacity = 0.94;
      pMat.transparent = false;
      activatedAny = true;
    }

    if (!activatedAny) return;

    if (viaSwitch) {
      viaSwitch.activated = true;
      viaSwitch.cooldown = false;
      const mat = viaSwitch.orbMesh.material as THREE.MeshStandardMaterial;
      mat.color.setHex(0x10b981);
      mat.emissive.setHex(0x10b981);
      this.spawnBurst(viaSwitch.x, viaSwitch.y + 1.2, viaSwitch.z, 0x34d399, 14);
    }

    soundEngine.playSwitch();
    this.showToast(`Ponte temporária ativada (${Math.round(duration)}s)!`);
    this.pushHudSnapshot();
  }

  private tryInteract(): void {
    for (const sw of this.switches) {
      if (sw.activated || sw.cooldown) continue;
      const dist = Math.hypot(this.playerPos.x - sw.x, this.playerPos.y - sw.y, this.playerPos.z - sw.z);
      if (dist <= 3.6) {
        this.activateBridgeGroup(sw.id, sw);
        return;
      }
    }
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      const rawDt = (now - this.lastTimeMs) / 1000;
      this.lastTimeMs = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
      this.simTime += dt;

      this.update(dt);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || !gl.fenceSync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private update(dt: number): void {
    if (this.mode === 'showcase') {
      // Slow cinematic orbit around player on pedestal
      const angle = this.simTime * 0.35;
      const camR = 5.4;
      this.camera.position.set(Math.sin(angle) * camR, 2.35, Math.cos(angle) * camR);
      this.camera.lookAt(0, 1.05, 0);
      if (this.playerRig) {
        animateCharacterRig(this.playerRig, {
          speed: 0,
          maxSpeed: 10,
          grounded: true,
          crouching: false,
          vy: 0,
          doubleJumpFlipTimer: 0,
          landSquash: 0,
          time: this.simTime,
        });
      }
      this.contactShadow.position.set(0, 0.02, 0);
      this.scenery?.update(dt, this.simTime, this.playerPos);
      return;
    }

    if (this.mode === 'paused' || this.mode === 'victory') {
      return;
    }

    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastMessage = null;
    }

    // Handle active elimination defeat animation & auto-respawn countdown
    if (this.eliminated) {
      this.eliminationTimer -= dt;
      this.playerVel.y = Math.max(-24, this.playerVel.y + this.currentWorld.gravity * dt);
      this.playerPos.x += this.playerVel.x * dt;
      this.playerPos.z += this.playerVel.z * dt;
      this.playerPos.y += this.playerVel.y * dt;

      if (this.playerRig) {
        this.playerRig.root.position.copy(this.playerPos);
        this.playerRig.root.rotation.y = this.playerYaw;
        this.playerRig.root.rotation.x = THREE.MathUtils.damp(
          this.playerRig.root.rotation.x,
          -Math.PI * 0.48,
          10,
          dt
        );
        this.playerRig.root.rotation.z += dt * 4.5;
      }

      this.updateParticles(dt);
      this.updateCamera(dt);
      this.scenery?.update(dt, this.simTime, this.playerPos);

      this.hudThrottle += dt;
      if (this.hudThrottle >= 0.08) {
        this.hudThrottle = 0;
        this.pushHudSnapshot();
      }

      if (this.eliminationTimer <= 0) {
        this.completeEliminationRespawn();
      }
      return;
    }

    // Active Gameplay Simulation
    this.elapsedRunTime += dt;
    this.obstacleSimTime += dt;

    // 0. Proximity auto-activation for temporary bridges / close switch pads
    for (const sw of this.switches) {
      if (!sw.activated && !sw.cooldown) {
        const dist = Math.hypot(this.playerPos.x - sw.x, this.playerPos.y - sw.y, this.playerPos.z - sw.z);
        if (dist <= 1.35) {
          this.activateBridgeGroup(sw.id, sw);
        }
      }
    }
    for (const p of this.platforms) {
      if (p.def.kind === 'gate_bridge' && p.bridgeState === 'ready' && p.def.autoTrigger) {
        const tx = p.def.triggerPos ? p.def.triggerPos.x : p.def.x;
        const ty = p.def.triggerPos ? p.def.triggerPos.y : p.def.y + p.def.h / 2;
        const tz = p.def.triggerPos ? p.def.triggerPos.z : p.def.z;
        const dist = Math.hypot(this.playerPos.x - tx, this.playerPos.y - ty, this.playerPos.z - tz);
        if (dist <= 3.1) {
          this.activateBridgeGroup(p.def.bridgeGroupId || p.def.switchId || p.def.id);
        }
      }
    }

    // 1. Update platforms (moving + disappearing + temporary timed bridges)
    const warnedBeep2sGroups = new Set<string>();
    const warnedBeep1sGroups = new Set<string>();
    const vanishedGroups = new Set<string>();
    const readyGroups = new Set<string>();

    for (const p of this.platforms) {
      p.prevX = p.curX;
      p.prevY = p.curY;
      p.prevZ = p.curZ;

      if (p.def.kind === 'moving' || (p.def.kind === 'gate_bridge' && p.def.moveRange && p.def.moveAxis)) {
        const speed = p.def.moveSpeed ?? 1.2;
        const range = p.def.moveRange ?? 3;
        const phase = p.def.movePhase ?? 0;
        const offset = Math.sin(this.obstacleSimTime * speed + phase) * range;
        if (p.def.moveAxis === 'x') p.curX = p.def.x + offset;
        if (p.def.moveAxis === 'y') p.curY = p.def.y + offset;
        if (p.def.moveAxis === 'z') p.curZ = p.def.z + offset;
        p.mesh.position.set(p.curX, p.curY, p.curZ);
      }

      if (p.def.kind === 'disappearing') {
        if (p.disState === 'shaking') {
          p.disTimer -= dt;
          p.mesh.position.x = p.curX + Math.sin(this.simTime * 48) * 0.08;
          if (p.disTimer <= 0) {
            p.disState = 'gone';
            p.disTimer = p.def.respawnTime ?? 2.2;
            p.mesh.visible = false;
          }
        } else if (p.disState === 'gone') {
          p.disTimer -= dt;
          if (p.disTimer <= 0) {
            p.disState = 'solid';
            p.mesh.visible = true;
            p.mesh.position.set(p.curX, p.curY, p.curZ);
          }
        }
      }

      if (p.def.kind === 'gate_bridge') {
        const groupKey = p.def.bridgeGroupId || p.def.switchId || p.def.id;
        const mat = p.mesh.material as THREE.MeshStandardMaterial;
        if (p.bridgeState === 'active') {
          p.bridgeTimer -= dt;
          if (p.bridgeTimer <= 2.0) {
            const pulse = Math.sin(this.simTime * 22) * 0.5 + 0.5;
            mat.color.setHex(pulse > 0.5 ? 0xf97316 : 0xef4444);
            mat.emissive.setHex(0xef4444);
            mat.emissiveIntensity = 0.65 + pulse * 0.55;
            p.mesh.position.set(
              p.curX + Math.sin(this.simTime * 52) * 0.045,
              p.curY,
              p.curZ
            );
            if (!p.warnBeep2s) {
              p.warnBeep2s = true;
              if (!warnedBeep2sGroups.has(groupKey)) {
                warnedBeep2sGroups.add(groupKey);
                soundEngine.playBridgeWarning();
              }
            }
            if (p.bridgeTimer <= 1.0 && !p.warnBeep1s) {
              p.warnBeep1s = true;
              if (!warnedBeep1sGroups.has(groupKey)) {
                warnedBeep1sGroups.add(groupKey);
                soundEngine.playBridgeWarning();
              }
            }
          }

          if (p.bridgeTimer <= 0) {
            const standingOnThis =
              this.groundedPlatform === p ||
              (Math.abs(this.playerPos.x - p.curX) <= p.def.w / 2 + 0.35 &&
                Math.abs(this.playerPos.z - p.curZ) <= p.def.d / 2 + 0.35 &&
                Math.abs(this.playerPos.y - (p.curY + p.def.h / 2)) <= 0.45);
            if (standingOnThis) {
              this.fellFromTimedBridge = true;
              this.fellBridgeOriginY = p.curY + p.def.h / 2;
              this.grounded = false;
              this.groundedPlatform = null;
            }
            p.bridgeState = 'vanishing';
            p.bridgeTimer = 0.28;
            p.gateActive = false;
            mat.transparent = true;
            if (!vanishedGroups.has(groupKey)) {
              vanishedGroups.add(groupKey);
              soundEngine.playBridgeVanish();
              this.spawnBurst(p.curX, p.curY + p.def.h / 2, p.curZ, 0xf97316, 12);
            }
            for (const sw of this.switches) {
              if (sw.id === p.def.switchId) {
                sw.cooldown = true;
                const orbMat = sw.orbMesh.material as THREE.MeshStandardMaterial;
                orbMat.color.setHex(0x64748b);
                orbMat.emissive.setHex(0x475569);
              }
            }
          }
        } else if (p.bridgeState === 'vanishing') {
          p.bridgeTimer -= dt;
          const ratio = Math.max(0.02, p.bridgeTimer / 0.28);
          p.mesh.scale.set(ratio, ratio, ratio);
          mat.opacity = ratio * 0.85;
          if (p.bridgeTimer <= 0) {
            p.bridgeState = 'cooldown';
            p.bridgeTimer = p.cooldownDuration;
            p.mesh.visible = false;
            p.mesh.scale.set(1, 1, 1);
          }
        } else if (p.bridgeState === 'cooldown') {
          p.bridgeTimer -= dt;
          if (p.bridgeTimer <= 0) {
            p.bridgeState = 'ready';
            p.bridgeTimer = 0;
            p.gateActive = false;
            p.mesh.visible = true;
            p.mesh.scale.set(1, 1, 1);
            p.mesh.position.set(p.curX, p.curY, p.curZ);
            mat.color.setHex(p.baseColorHex);
            mat.emissive.setHex(p.baseEmissiveHex);
            mat.emissiveIntensity = p.baseEmissiveInt;
            mat.transparent = true;
            mat.opacity = 0.34;
            for (const sw of this.switches) {
              if (sw.id === p.def.switchId) {
                sw.activated = false;
                sw.cooldown = false;
                const orbMat = sw.orbMesh.material as THREE.MeshStandardMaterial;
                orbMat.color.setHex(0xef4444);
                orbMat.emissive.setHex(0xef4444);
              }
            }
            if (!readyGroups.has(groupKey)) {
              readyGroups.add(groupKey);
              soundEngine.playBridgeReady();
              this.showToast('Ponte temporária disponível novamente!');
            }
          }
        }
      }
    }

    // 2. Carry player with moving platform if standing on one
    if (this.grounded && this.groundedPlatform && this.groundedPlatform.gateActive && this.groundedPlatform.disState !== 'gone') {
      this.playerPos.x += this.groundedPlatform.curX - this.groundedPlatform.prevX;
      this.playerPos.y += this.groundedPlatform.curY - this.groundedPlatform.prevY;
      this.playerPos.z += this.groundedPlatform.curZ - this.groundedPlatform.prevZ;
    }

    // 3. Update obstacles using resettable obstacleSimTime
    for (const o of this.obstacles) {
      if (o.def.kind === 'rotator') {
        o.angle = (o.def.phase ?? 0) + (o.def.speed ?? 1.6) * this.obstacleSimTime;
        o.mesh.rotation.y = o.angle;
      } else if (o.def.kind === 'pendulum') {
        const range = o.def.range ?? 2.2;
        const speed = o.def.speed ?? 2.0;
        const t = this.obstacleSimTime * speed + (o.def.phase ?? 0);
        const swing = Math.sin(t) * range;
        const tilt = Math.sin(t) * 0.35;
        o.curY = o.def.y + (1 - Math.cos(tilt)) * 0.55;
        o.mesh.position.y = o.curY;
        if (o.def.axis === 'z') {
          o.curZ = o.def.z + swing;
          o.mesh.position.z = o.curZ;
          o.mesh.rotation.x = Math.cos(t) * 0.35;
        } else {
          o.curX = o.def.x + swing;
          o.mesh.position.x = o.curX;
          o.mesh.rotation.z = Math.cos(t) * 0.35;
        }
      } else if (o.def.kind === 'moving_block' || o.def.kind === 'moving_wall') {
        const range = o.def.range ?? 2.2;
        const speed = o.def.speed ?? 1.8;
        const offset = Math.sin(this.obstacleSimTime * speed + (o.def.phase ?? 0)) * range;
        if (o.def.axis === 'z') {
          o.curZ = o.def.z + offset;
          o.mesh.position.z = o.curZ;
        } else {
          o.curX = o.def.x + offset;
          o.mesh.position.x = o.curX;
        }
      } else if (o.def.kind === 'crusher') {
        const speed = o.def.speed ?? 1.1;
        const liftH = o.def.range ?? 3.2;
        const period = 2.6 / Math.max(0.5, speed);
        const phaseOffset = ((o.def.phase ?? 0) / (Math.PI * 2)) * period;
        const u = ((this.obstacleSimTime + phaseOffset) % period) / period;
        let heightRatio = 1;
        if (u < 0.45) {
          heightRatio = 1; // held high
        } else if (u < 0.62) {
          // fast slam down
          const k = (u - 0.45) / 0.17;
          heightRatio = 1 - k * k;
        } else if (u < 0.8) {
          heightRatio = 0; // resting on deck
        } else {
          // smooth lift back up
          heightRatio = (u - 0.8) / 0.2;
        }
        o.curY = o.def.y + heightRatio * liftH;
        o.mesh.position.y = o.curY;
      } else if (o.def.kind === 'laser_bar' && (o.def.range ?? 0) > 0) {
        const range = o.def.range ?? 1.8;
        const speed = o.def.speed ?? 2.0;
        const offset = Math.sin(this.obstacleSimTime * speed + (o.def.phase ?? 0)) * range;
        if (o.def.axis === 'z') {
          o.curZ = o.def.z + offset;
          o.mesh.position.z = o.curZ;
        } else if (o.def.axis === 'x') {
          o.curX = o.def.x + offset;
          o.mesh.position.x = o.curX;
        } else {
          o.curY = o.def.y + offset;
          o.mesh.position.y = o.curY;
        }
      }
    }

    // 4. Camera keyboard yaw assist (ArrowLeft / ArrowRight)
    if (this.heldKeys.has('ArrowLeft')) this.camYaw += 2.1 * dt;
    if (this.heldKeys.has('ArrowRight')) this.camYaw -= 2.1 * dt;

    // 5. Player movement input (keyboard + touch virtual controls)
    const kb = this.keyBindings;
    const keyF = (this.heldKeys.has(kb.forward) || this.heldKeys.has('ArrowUp') ? 1 : 0) -
                 (this.heldKeys.has(kb.backward) || this.heldKeys.has('ArrowDown') ? 1 : 0);
    const keyR = (this.heldKeys.has(kb.right) ? 1 : 0) -
                 (this.heldKeys.has(kb.left) ? 1 : 0);
    const virtualMag = Math.hypot(this.virtualMoveX, this.virtualMoveY);
    const hasVirtualMove = virtualMag > 0.01;
    const fIn = hasVirtualMove ? this.virtualMoveY : keyF;
    const rIn = hasVirtualMove ? this.virtualMoveX : keyR;

    this.crouching = this.virtualCrouch || this.heldKeys.has(kb.crouch) || this.heldKeys.has('ControlRight');
    this.sprinting = !this.crouching && (this.virtualSprint || this.heldKeys.has(kb.sprint) || this.heldKeys.has('ShiftRight'));

    const targetSpeed = this.crouching ? 3.8 : this.sprinting ? 10.3 : 6.8;

    _forwardVec.set(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
    _rightVec.set(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));
    _moveDir.set(0, 0, 0).addScaledVector(_forwardVec, fIn).addScaledVector(_rightVec, rIn);
    const rawInputLen = _moveDir.length();
    const inputMag = Math.min(1, rawInputLen);
    if (rawInputLen > 0.005) {
      _moveDir.divideScalar(rawInputLen);
      const targetYaw = Math.atan2(_moveDir.x, _moveDir.z);
      // Shortest angle lerp
      let diff = targetYaw - this.playerYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.playerYaw += diff * Math.min(1, dt * 14);
    }

    // Friction & Acceleration (Ice platforms & Frozen world use low friction!)
    const onIce =
      this.grounded &&
      (this.groundedPlatform?.def.kind === 'ice' || this.currentWorld.id === 'frozen');
    const accel = this.grounded ? (onIce ? 8.5 : 42.0) : 20.0;
    const decel = this.grounded ? (onIce ? 2.4 : 32.0) : 4.5;

    const desiredVx = _moveDir.x * targetSpeed * inputMag;
    const desiredVz = _moveDir.z * targetSpeed * inputMag;

    if (rawInputLen > 0.005) {
      this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, desiredVx, accel * 0.25, dt);
      this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, desiredVz, accel * 0.25, dt);
    } else {
      this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, 0, decel * 0.25, dt);
      this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, 0, decel * 0.25, dt);
    }

    // Coyote time & Jump buffer
    if (this.grounded) {
      this.coyoteTimer = 0.14;
      this.jumpsRemaining = 2;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= dt;
      if (this.coyoteTimer > 0) {
        // First jump
        this.playerVel.y = this.crouching ? 9.8 : 11.8;
        this.grounded = false;
        this.groundedPlatform = null;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.jumpsRemaining = 1;
        soundEngine.playJump(false);
        this.spawnBurst(this.playerPos.x, this.playerPos.y + 0.1, this.playerPos.z, 0xffffff, 6);
        this.callbacks.onJumpStat();
      } else if (this.jumpsRemaining > 0) {
        // Double jump!
        this.playerVel.y = 10.8;
        this.jumpsRemaining = 0;
        this.jumpBufferTimer = 0;
        this.doubleJumpFlipTimer = 0.42;
        soundEngine.playJump(true);
        this.spawnBurst(this.playerPos.x, this.playerPos.y + 0.1, this.playerPos.z, this.currentWorld.accentColor, 10);
        this.callbacks.onJumpStat();
      }
    }

    // Gravity
    this.playerVel.y += this.currentWorld.gravity * dt;
    this.playerVel.y = Math.max(this.playerVel.y, -38);

    // 6. Swept / Axis-separated AABB Physics Resolution
    const pRadius = 0.36;
    const pHeight = this.crouching ? 1.05 : 1.8;
    const wasGrounded = this.grounded;
    const preLandingVy = this.playerVel.y;

    // Horizontal X
    this.playerPos.x += this.playerVel.x * dt;
    this.resolveHorizontalCollisions(pRadius, pHeight, 'x');

    // Horizontal Z
    this.playerPos.z += this.playerVel.z * dt;
    this.resolveHorizontalCollisions(pRadius, pHeight, 'z');

    // Vertical Y
    this.playerPos.y += this.playerVel.y * dt;
    this.grounded = false;
    this.groundedPlatform = null;

    for (const p of this.platforms) {
      if (!p.gateActive || p.disState === 'gone') continue;
      const halfW = p.def.w / 2 + pRadius * 0.85;
      const halfD = p.def.d / 2 + pRadius * 0.85;
      if (Math.abs(this.playerPos.x - p.curX) <= halfW && Math.abs(this.playerPos.z - p.curZ) <= halfD) {
        const top = p.curY + p.def.h / 2;
        const bottom = p.curY - p.def.h / 2;
        // Landing on top
        if (this.playerVel.y <= 0 && this.playerPos.y <= top + 0.08 && this.playerPos.y >= top - 0.65) {
          this.playerPos.y = top;
          if (p.def.kind === 'bounce') {
            this.playerVel.y = p.def.bounceForce ?? 19.5;
            this.grounded = false;
            this.jumpsRemaining = 1;
            soundEngine.playBounce();
            this.spawnBurst(this.playerPos.x, top + 0.1, this.playerPos.z, 0x34d399, 12);
          } else {
            this.playerVel.y = 0;
            this.grounded = true;
            this.groundedPlatform = p;
            if (p.def.kind === 'disappearing' && p.disState === 'solid') {
              p.disState = 'shaking';
              p.disTimer = p.def.stayTime ?? 1.2;
            }
          }
        } else if (
          this.playerVel.y > 0 &&
          this.playerPos.y + pHeight >= bottom &&
          this.playerPos.y + pHeight <= bottom + 0.55
        ) {
          // Ceiling hit
          this.playerPos.y = bottom - pHeight;
          this.playerVel.y = -1;
        }
      }
    }

    if (!wasGrounded && this.grounded && preLandingVy < -5) {
      this.landSquash = Math.min(1, Math.abs(preLandingVy) / 22);
      soundEngine.playLand(Math.abs(preLandingVy));
      this.spawnBurst(this.playerPos.x, this.playerPos.y + 0.05, this.playerPos.z, 0xe2e8f0, 6);
    }

    this.landSquash = Math.max(0, this.landSquash - dt * 4.5);
    if (this.doubleJumpFlipTimer > 0) this.doubleJumpFlipTimer = Math.max(0, this.doubleJumpFlipTimer - dt);

    // 7. Obstacle collisions (crouch beams, lasers, rotators, pendulums)
    this.resolveObstacleCollisions(pRadius, pHeight);

    // 8. Coins, Checkpoints, Switches, Finish Portal, and Fall Respawn
    for (const c of this.coins) {
      if (c.collected) continue;
      c.mesh.rotation.y += dt * 2.6;
      c.mesh.position.y = c.y + Math.sin(this.simTime * 3 + c.x) * 0.14;
      const dist = Math.hypot(
        this.playerPos.x - c.x,
        this.playerPos.y + pHeight * 0.5 - c.y,
        this.playerPos.z - c.z
      );
      if (dist <= 1.05) {
        c.collected = true;
        c.mesh.visible = false;
        this.collectedCoinsCount++;
        this.collectedCoinsValue += c.value;
        soundEngine.playCoin();
        this.spawnBurst(c.x, c.y, c.z, c.isSecret ? 0x38bdf8 : 0xfbbf24, 10);
      }
    }

    for (const cp of this.checkpoints) {
      cp.ringMesh.rotation.z += dt * (cp.activated ? 2.8 : 0.8);
      if (cp.activated) continue;
      const dist = Math.hypot(this.playerPos.x - cp.x, this.playerPos.z - cp.z);
      if (dist <= 1.6 && Math.abs(this.playerPos.y - cp.y) <= 1.8) {
        cp.activated = true;
        this.activeCheckpointIndex = cp.index;
        this.spawnPos.set(cp.x, cp.y + 0.25, cp.z);
        (cp.ringMesh.material as THREE.MeshStandardMaterial).color.setHex(0x10b981);
        (cp.ringMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x10b981);
        (cp.beaconMesh.material as THREE.MeshStandardMaterial).color.setHex(0x34d399);
        (cp.beaconMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x34d399);
        soundEngine.playCheckpoint();
        this.spawnBurst(cp.x, cp.y + 0.5, cp.z, 0x34d399, 16);
        this.showToast(`Checkpoint ${cp.index} ativado!`);
      }
    }

    // Rotate switch orbs
    for (const sw of this.switches) {
      sw.orbMesh.rotation.y += dt * 2.2;
    }

    // Finish Portal check
    if (this.finishGroup) {
      this.finishGroup.children[0].rotation.z += dt * 1.4;
      const distFinish = Math.hypot(
        this.playerPos.x - this.finishPos.x,
        this.playerPos.y - this.finishPos.y,
        this.playerPos.z - this.finishPos.z
      );
      if (distFinish <= 1.95) {
        this.mode = 'victory';
        soundEngine.playVictory();
        this.spawnBurst(this.finishPos.x, this.finishPos.y + 1.5, this.finishPos.z, 0xfbbf24, 24);
        this.callbacks.onLevelComplete({
          timeSeconds: this.elapsedRunTime,
          coinsCollected: this.collectedCoinsCount,
          coinsValueCollected: this.collectedCoinsValue,
          fallsCount: this.fallsCount,
        });
        return;
      }
    }

    // Fall limit / vanished temporary bridge elimination check
    if (this.fellFromTimedBridge && !this.grounded && this.playerPos.y < this.fellBridgeOriginY - 2.4) {
      this.triggerElimination('A ponte temporária desapareceu!');
      return;
    }
    if (this.currentLevel && this.playerPos.y < this.currentLevel.fallLimitY) {
      this.triggerElimination('Você caiu no abismo!');
      return;
    }

    // 9. Update character rig, shadow, particles, lights, camera
    if (this.playerRig) {
      this.playerRig.root.position.copy(this.playerPos);
      this.playerRig.root.rotation.y = this.playerYaw;
      const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
      animateCharacterRig(this.playerRig, {
        speed: horizSpeed,
        maxSpeed: 10.3,
        grounded: this.grounded,
        crouching: this.crouching,
        vy: this.playerVel.y,
        doubleJumpFlipTimer: this.doubleJumpFlipTimer,
        landSquash: this.landSquash,
        time: this.simTime,
      });
    }

    this.updateContactShadow();
    this.updateParticles(dt);

    // Move key directional light with player so shadows stay crisp across long levels
    this.sunLight.position.set(this.playerPos.x + 18, this.playerPos.y + 32, this.playerPos.z + 16);
    this.sunLight.target.position.copy(this.playerPos);
    this.sunLight.target.updateMatrixWorld();

    this.updateCamera(dt);
    this.scenery?.update(dt, this.simTime, this.playerPos);

    this.hudThrottle += dt;
    if (this.hudThrottle >= 0.08) {
      this.hudThrottle = 0;
      this.pushHudSnapshot();
    }
  }

  private resolveHorizontalCollisions(pRadius: number, pHeight: number, axis: 'x' | 'z'): void {
    for (const p of this.platforms) {
      if (!p.gateActive || p.disState === 'gone') continue;
      const top = p.curY + p.def.h / 2;
      const bottom = p.curY - p.def.h / 2;
      // Ignore if completely above or below platform
      if (this.playerPos.y >= top - 0.06 || this.playerPos.y + pHeight <= bottom + 0.06) continue;

      const halfW = p.def.w / 2 + pRadius;
      const halfD = p.def.d / 2 + pRadius;
      const dx = this.playerPos.x - p.curX;
      const dz = this.playerPos.z - p.curZ;

      if (Math.abs(dx) < halfW && Math.abs(dz) < halfD) {
        // Ledge mantle assist: if player feet are within 0.62m below top edge, step smoothly onto top!
        if (top - this.playerPos.y <= 0.62 && this.playerVel.y > -6) {
          this.playerPos.y = top;
          this.playerVel.y = Math.max(0, this.playerVel.y);
          this.grounded = true;
          this.groundedPlatform = p;
          continue;
        }
        if (axis === 'x') {
          this.playerPos.x = p.curX + (dx >= 0 ? halfW : -halfW);
          this.playerVel.x = 0;
        } else {
          this.playerPos.z = p.curZ + (dz >= 0 ? halfD : -halfD);
          this.playerVel.z = 0;
        }
      }
    }
  }

  private resolveObstacleCollisions(pRadius: number, pHeight: number): void {
    for (const o of this.obstacles) {
      const top = o.curY + o.def.h / 2;
      const bottom = o.curY - o.def.h / 2;
      // Vertical overlap check (crouching lowers playerPos.y + pHeight so player passes under crouch_beam!)
      if (this.playerPos.y + pHeight <= bottom + 0.05 || this.playerPos.y >= top - 0.05) {
        continue;
      }

      const lethal = this.isLethalObstacleDef(o.def);

      if (o.def.kind === 'rotator') {
        // Real oriented box/bar check in local rotated space
        const halfLen = o.def.w / 2;
        const cosA = Math.cos(-o.angle);
        const sinA = Math.sin(-o.angle);
        const relX = this.playerPos.x - o.curX;
        const relZ = this.playerPos.z - o.curZ;
        const localX = relX * cosA - relZ * sinA;
        const localZ = relX * sinA + relZ * cosA;
        const barHalfD = o.def.d / 2 + pRadius * 0.9;
        if (Math.abs(localX) <= halfLen + pRadius * 0.9 && Math.abs(localZ) <= barHalfD) {
          if (lethal) {
            const pushSign = localZ >= 0 ? 1 : -1;
            this.playerVel.x = -sinA * pushSign * 7.5;
            this.playerVel.z = cosA * pushSign * 7.5;
            this.playerVel.y = 6.0;
            this.triggerElimination('Atingido por barra giratória!');
            return;
          }
          const pushSign = localZ >= 0 ? 1 : -1;
          const worldPushX = -sinA * pushSign;
          const worldPushZ = cosA * pushSign;
          this.playerVel.x = worldPushX * 8.5;
          this.playerVel.z = worldPushZ * 8.5;
          this.playerVel.y = Math.max(this.playerVel.y, 4.5);
          this.camShake = 0.28;
          soundEngine.playLand(12);
        }
      } else {
        const halfW = o.def.w / 2 + pRadius * 0.9;
        const halfD = o.def.d / 2 + pRadius * 0.9;
        const dx = this.playerPos.x - o.curX;
        const dz = this.playerPos.z - o.curZ;
        if (Math.abs(dx) < halfW && Math.abs(dz) < halfD) {
          if (lethal) {
            this.playerVel.x = (dx >= 0 ? 1 : -1) * 5.5;
            this.playerVel.z = (dz >= 0 ? 1 : -1) * 5.5;
            this.playerVel.y = 5.5;
            const reason =
              o.def.kind === 'pendulum'
                ? 'Atingido por pêndulo mortal!'
                : o.def.kind === 'crusher'
                  ? 'Esmagado por obstáculo!'
                  : o.def.kind === 'laser_bar'
                    ? 'Atingido por laser mortal!'
                    : 'Atingido por obstáculo móvel!';
            this.triggerElimination(reason);
            return;
          }
          const overlapX = halfW - Math.abs(dx);
          const overlapZ = halfD - Math.abs(dz);
          if (overlapX < overlapZ) {
            this.playerPos.x = o.curX + (dx >= 0 ? halfW : -halfW);
            this.playerVel.x = (dx >= 0 ? 1 : -1) * 5.0;
          } else {
            this.playerPos.z = o.curZ + (dz >= 0 ? halfD : -halfD);
            this.playerVel.z = (dz >= 0 ? 1 : -1) * 5.0;
          }
        }
      }
    }
  }

  private triggerElimination(reason: string): void {
    if (this.eliminated) return;
    this.eliminated = true;
    this.eliminationTimer = 2.0;
    this.eliminationReason = reason;
    this.fallsCount++;
    this.callbacks.onFallStat();
    this.heldKeys.clear();
    this.virtualMoveX = 0;
    this.virtualMoveY = 0;
    this.virtualSprint = false;
    this.virtualCrouch = false;
    this.grounded = false;
    this.groundedPlatform = null;
    this.camShake = 0.48;
    soundEngine.playEliminated();
    this.spawnBurst(this.playerPos.x, this.playerPos.y + 0.9, this.playerPos.z, 0xf43f5e, 22);
    this.pushHudSnapshot();
  }

  private resetDynamicEntitiesOnRespawn(): void {
    this.obstacleSimTime = 0;
    for (const o of this.obstacles) {
      o.curX = o.def.x;
      o.curY = o.def.y;
      o.curZ = o.def.z;
      o.angle = o.def.phase ?? 0;
      o.mesh.position.set(o.def.x, o.def.y, o.def.z);
      o.mesh.rotation.set(0, o.angle, 0);
    }

    for (const p of this.platforms) {
      p.curX = p.def.x;
      p.curY = p.def.y;
      p.curZ = p.def.z;
      p.prevX = p.def.x;
      p.prevY = p.def.y;
      p.prevZ = p.def.z;
      p.mesh.position.set(p.def.x, p.def.y, p.def.z);
      p.mesh.scale.set(1, 1, 1);

      if (p.def.kind === 'disappearing') {
        p.disState = 'solid';
        p.disTimer = 0;
        p.mesh.visible = true;
      }

      if (p.def.kind === 'gate_bridge') {
        p.bridgeState = 'ready';
        p.bridgeTimer = 0;
        p.warnBeep2s = false;
        p.warnBeep1s = false;
        p.gateActive = false;
        p.mesh.visible = true;
        const mat = p.mesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(p.baseColorHex);
        mat.emissive.setHex(p.baseEmissiveHex);
        mat.emissiveIntensity = p.baseEmissiveInt;
        mat.transparent = true;
        mat.opacity = 0.34;
      }
    }

    for (const sw of this.switches) {
      sw.activated = false;
      sw.cooldown = false;
      const orbMat = sw.orbMesh.material as THREE.MeshStandardMaterial;
      orbMat.color.setHex(0xef4444);
      orbMat.emissive.setHex(0xef4444);
    }
  }

  private completeEliminationRespawn(): void {
    this.eliminated = false;
    this.eliminationTimer = 0;
    this.eliminationReason = null;
    this.fellFromTimedBridge = false;
    this.playerPos.copy(this.spawnPos);
    this.playerVel.set(0, 0, 0);
    this.grounded = false;
    this.groundedPlatform = null;
    this.jumpsRemaining = 2;
    this.coyoteTimer = 0.14;
    if (this.playerRig) {
      this.playerRig.root.rotation.set(0, this.playerYaw, 0);
      this.playerRig.root.position.copy(this.playerPos);
    }
    this.resetDynamicEntitiesOnRespawn();
    this.showToast(
      this.activeCheckpointIndex > 0
        ? `Renascido no Checkpoint ${this.activeCheckpointIndex}`
        : 'Renascido no início da fase'
    );
    this.pushHudSnapshot();
  }

  private updateContactShadow(): void {
    let bestTop = -999;
    for (const p of this.platforms) {
      if (!p.gateActive || p.disState === 'gone') continue;
      if (
        Math.abs(this.playerPos.x - p.curX) <= p.def.w / 2 &&
        Math.abs(this.playerPos.z - p.curZ) <= p.def.d / 2
      ) {
        const top = p.curY + p.def.h / 2;
        if (top <= this.playerPos.y + 0.1 && top > bestTop) {
          bestTop = top;
        }
      }
    }
    if (bestTop > -900) {
      const dist = Math.max(0, this.playerPos.y - bestTop);
      this.contactShadow.visible = dist < 8;
      this.contactShadow.position.set(this.playerPos.x, bestTop + 0.025, this.playerPos.z);
      const scale = THREE.MathUtils.clamp(1 - dist * 0.08, 0.35, 1);
      this.contactShadow.scale.setScalar(scale);
      (this.contactShadow.material as THREE.MeshBasicMaterial).opacity = 0.46 * scale;
    } else {
      this.contactShadow.visible = false;
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particlePool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        continue;
      }
      p.vy -= 14 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      const ratio = p.life / p.maxLife;
      p.mesh.scale.setScalar(ratio);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = ratio * 0.9;
    }
  }

  private updateCamera(dt: number): void {
    const targetDist =
      this.camDistMode === 'close' ? 4.2 : this.camDistMode === 'medium' ? 6.8 : 9.8;
    this.camCurDist = THREE.MathUtils.damp(this.camCurDist, targetDist, 9, dt);

    _camTarget.set(this.playerPos.x, this.playerPos.y + (this.crouching ? 1.0 : 1.45), this.playerPos.z);

    const cosP = Math.cos(this.camPitch);
    const sinP = Math.sin(this.camPitch);
    const offsetX = Math.sin(this.camYaw) * cosP * this.camCurDist;
    const offsetY = sinP * this.camCurDist;
    const offsetZ = Math.cos(this.camYaw) * cosP * this.camCurDist;

    _camDesired.set(_camTarget.x + offsetX, _camTarget.y + offsetY, _camTarget.z + offsetZ);

    // Camera collision check against level platform meshes
    _rayOrigin.copy(_camTarget);
    _rayDir.copy(_camDesired).sub(_camTarget);
    const fullDist = _rayDir.length();
    let finalDist = fullDist;
    if (fullDist > 0.2) {
      _rayDir.divideScalar(fullDist);
      this.raycaster.set(_rayOrigin, _rayDir);
      this.raycaster.near = 0.3;
      this.raycaster.far = fullDist;
      const hits = this.raycaster.intersectObjects(this.levelGroup.children, false);
      if (hits.length > 0) {
        finalDist = Math.max(1.6, hits[0].distance - 0.35);
      }
    }

    _camDesired.copy(_camTarget).addScaledVector(_rayDir, finalDist);

    if (this.camShake > 0) {
      this.camShake = Math.max(0, this.camShake - dt * 1.6);
      _camDesired.x += (Math.random() - 0.5) * this.camShake * 0.6;
      _camDesired.y += (Math.random() - 0.5) * this.camShake * 0.6;
    }

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camDesired.x, 16, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camDesired.y, 16, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camDesired.z, 16, dt);
    this.camera.lookAt(_camTarget);
  }

  private pushHudSnapshot(): void {
    if (!this.currentLevel) return;
    let progressPercent = 0;
    const wps = this.currentLevel.waypoints;
    if (wps && wps.length > 1) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < wps.length; i++) {
        const d = Math.hypot(this.playerPos.x - wps[i].x, this.playerPos.z - wps[i].z);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      progressPercent = Math.min(100, Math.max(0, Math.round((bestIdx / (wps.length - 1)) * 100)));
    } else {
      const totalZ = Math.max(1, Math.abs(this.finishPos.z - this.currentLevel.startPos.z));
      const curZ = Math.max(0, this.currentLevel.startPos.z - this.playerPos.z);
      progressPercent = Math.min(100, Math.max(0, Math.round((curZ / totalZ) * 100)));
    }

    let nearbyPrompt: string | null = null;
    for (const sw of this.switches) {
      if (!sw.activated && !sw.cooldown) {
        const d = Math.hypot(this.playerPos.x - sw.x, this.playerPos.y - sw.y, this.playerPos.z - sw.z);
        if (d <= 3.6) {
          nearbyPrompt = `Pressione E para ${sw.label} (6s)`;
          break;
        }
      }
    }

    let activeBridgeTimer: number | null = null;
    let activeBridgeMax = 6.0;
    for (const p of this.platforms) {
      if (p.def.kind === 'gate_bridge' && p.bridgeState === 'active') {
        if (activeBridgeTimer === null || p.bridgeTimer < activeBridgeTimer) {
          activeBridgeTimer = Math.max(0, p.bridgeTimer);
          activeBridgeMax = p.bridgeDuration;
        }
      }
    }

    this.callbacks.onHudUpdate({
      elapsedTime: this.elapsedRunTime,
      collectedCoins: this.collectedCoinsCount,
      totalCoins: this.coins.length,
      progressPercent,
      activeCheckpoint: this.activeCheckpointIndex,
      totalCheckpoints: this.checkpoints.length,
      isCrouching: this.crouching,
      isSprinting: this.sprinting,
      cameraDistance: this.camDistMode,
      nearbyPrompt,
      toastMessage: this.toastMessage,
      jumpsRemaining: this.jumpsRemaining,
      isEliminated: this.eliminated,
      eliminationTimer: Math.max(0, this.eliminationTimer),
      eliminationReason: this.eliminationReason,
      activeBridgeTimer,
      activeBridgeMax,
      activeBridgeWarning: activeBridgeTimer !== null && activeBridgeTimer <= 2.0,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    window.removeEventListener('blur', this.onBlurBound);
    window.removeEventListener('resize', this.onResizeBound);
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onPointerDownBound);
    window.removeEventListener('pointermove', this.onPointerMoveBound);
    window.removeEventListener('pointerup', this.onPointerUpBound);
    window.removeEventListener('pointercancel', this.onPointerUpBound);
    dom.removeEventListener('wheel', this.onWheelBound);

    this.clearLevel();
    if (this.scenery) this.scenery.dispose();
    if (this.playerRig) this.playerRig.dispose();
    this.contactShadow.geometry.dispose();
    (this.contactShadow.material as THREE.Material).dispose();
    this.particleGeo.dispose();
    this.particlePool.forEach((p) => (p.mesh.material as THREE.Material).dispose());
    this.envMap.dispose();
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
