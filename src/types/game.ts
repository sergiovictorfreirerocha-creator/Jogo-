export type WorldId =
  | 'urban'
  | 'forest'
  | 'volcanic'
  | 'frozen'
  | 'cyberpunk'
  | 'desert'
  | 'space'
  | 'medieval';

export type Difficulty = 'Iniciante' | 'Fácil' | 'Intermediário' | 'Difícil' | 'Extremo';

export type GameScreen =
  | 'menu'
  | 'worlds'
  | 'levels'
  | 'customize'
  | 'shop'
  | 'settings'
  | 'records'
  | 'credits'
  | 'playing';

export type CameraDistanceMode = 'close' | 'medium' | 'far';

export type ActionKey =
  | 'forward'
  | 'backward'
  | 'left'
  | 'right'
  | 'jump'
  | 'sprint'
  | 'crouch'
  | 'camera'
  | 'interact'
  | 'restart'
  | 'pause';

export type KeyBindings = Record<ActionKey, string>;

export type SkinAccessory =
  | 'urban_cap'
  | 'ninja_katana'
  | 'robot_antenna'
  | 'astronaut_pack'
  | 'knight_plume'
  | 'cyber_visor'
  | 'space_thruster'
  | 'lava_horns'
  | 'ice_crown'
  | 'shadow_wisps'
  | 'alien_antennae'
  | 'golden_crown'
  | 'sports_shades'
  | 'soldier_comms'
  | 'explorer_hat';

export interface SkinDef {
  id: string;
  name: string;
  description: string;
  price: number;
  rarity: 'Comum' | 'Raro' | 'Épico' | 'Lendário';
  primaryColor: number;
  secondaryColor: number;
  accentColor: number;
  skinTone: number;
  emissiveColor: number;
  emissiveIntensity: number;
  metalness: number;
  roughness: number;
  clearcoat?: number;
  accessory: SkinAccessory;
}

export type PlatformKind =
  | 'normal'
  | 'moving'
  | 'disappearing'
  | 'ice'
  | 'bounce'
  | 'bridge'
  | 'narrow'
  | 'climb'
  | 'gate_bridge';

export interface PlatformDef {
  id: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  kind: PlatformKind;
  // Moving platform parameters
  moveAxis?: 'x' | 'y' | 'z';
  moveRange?: number;
  moveSpeed?: number;
  movePhase?: number;
  // Disappearing platform timing
  stayTime?: number;
  respawnTime?: number;
  // Bounce pad force
  bounceForce?: number;
  // Gate / temporary bridge parameters
  switchId?: string;
  bridgeGroupId?: string;
  timedDuration?: number;
  cooldownDuration?: number;
  autoTrigger?: boolean;
  triggerPos?: { x: number; y: number; z: number };
  // Visual accent override
  isCheckpointBase?: boolean;
}

export type ObstacleKind =
  | 'rotator'
  | 'laser_bar'
  | 'pendulum'
  | 'crouch_beam'
  | 'wall'
  | 'moving_block'
  | 'moving_wall'
  | 'crusher';

export interface ObstacleDef {
  id: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  kind: ObstacleKind;
  speed?: number;
  phase?: number;
  range?: number;
  axis?: 'x' | 'z';
  lethal?: boolean;
}

export interface CoinDef {
  id: string;
  x: number;
  y: number;
  z: number;
  value: number;
  isSecret?: boolean;
}

export interface CheckpointDef {
  id: string;
  index: number;
  x: number;
  y: number;
  z: number;
}

export interface InteractSwitchDef {
  id: string;
  x: number;
  y: number;
  z: number;
  label: string;
}

export interface LevelDef {
  id: string;
  worldId: WorldId;
  levelNumber: number; // 1 to 5
  name: string;
  description: string;
  difficulty: Difficulty;
  parTime: number; // seconds for bonus
  baseReward: number;
  fallLimitY: number;
  startPos: { x: number; y: number; z: number };
  finishPos: { x: number; y: number; z: number };
  platforms: PlatformDef[];
  obstacles: ObstacleDef[];
  coins: CoinDef[];
  checkpoints: CheckpointDef[];
  switches: InteractSwitchDef[];
  seed?: number;
  waypoints?: Array<{ x: number; y: number; z: number }>;
}

export interface WorldDef {
  id: WorldId;
  order: number;
  name: string;
  subtitle: string;
  description: string;
  mechanicLabel: string;
  skyTop: string;
  skyBottom: string;
  fogColor: number;
  fogDensity: number;
  ambientSky: number;
  ambientGround: number;
  sunColor: number;
  primaryPlatformColor: number;
  secondaryPlatformColor: number;
  accentColor: number;
  hazardColor: number;
  gravity: number;
  defaultFriction: number;
  unlockRequirementText: string;
}

export interface LevelRecord {
  completed: boolean;
  bestTime: number | null;
  bestCoins: number;
  totalCoinsInLevel: number;
  stars: number; // 1-3
}

export interface SaveData {
  coins: number;
  unlockedWorlds: WorldId[];
  unlockedLevels: string[]; // level IDs
  levelRecords: Record<string, LevelRecord>;
  purchasedSkins: string[];
  equippedSkin: string;
  keyBindings: KeyBindings;
  settings: {
    musicVolume: number;
    sfxVolume: number;
    cameraSensitivity: number;
    cameraDistance: CameraDistanceMode;
    shadowsEnabled: boolean;
    particlesEnabled: boolean;
  };
  stats: {
    totalJumps: number;
    totalFalls: number;
    totalCoinsCollected: number;
    totalPlayTime: number;
  };
}

export interface HudSnapshot {
  elapsedTime: number;
  collectedCoins: number;
  totalCoins: number;
  progressPercent: number;
  activeCheckpoint: number;
  totalCheckpoints: number;
  isCrouching: boolean;
  isSprinting: boolean;
  cameraDistance: CameraDistanceMode;
  nearbyPrompt: string | null;
  toastMessage: string | null;
  jumpsRemaining: number;
  isEliminated?: boolean;
  eliminationTimer?: number;
  eliminationReason?: string | null;
  activeBridgeTimer?: number | null;
  activeBridgeMax?: number;
  activeBridgeWarning?: boolean;
}

export interface LevelCompletionResult {
  levelId: string;
  worldId: WorldId;
  levelNumber: number;
  levelName: string;
  difficulty: Difficulty;
  timeSeconds: number;
  parTime: number;
  coinsCollected: number;
  totalLevelCoins: number;
  fallsCount: number;
  stars: number;
  isNewBestTime: boolean;
  rewardBreakdown: {
    base: number;
    coinsValue: number;
    timeBonus: number;
    difficultyBonus: number;
    challengeBonus: number;
    firstClearBonus: number;
    totalEarned: number;
  };
  unlockedNextLevelId: string | null;
  unlockedNextWorldId: WorldId | null;
}
