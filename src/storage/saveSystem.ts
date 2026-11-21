import { ActionKey, KeyBindings, LevelCompletionResult, LevelDef, SaveData, WorldId } from '../types/game';
import { getNextLevelInWorld } from '../data/levels';
import { getNextWorldId } from '../data/worlds';
import { clearProceduralHistory } from '../engine/proceduralGenerator';

const STORAGE_KEY = 'hora_do_parkour_save_v1';
const LEGACY_STORAGE_KEY = 'parkour_world_3d_save_v1';

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  forward: 'KeyW',
  backward: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  jump: 'Space',
  sprint: 'ShiftLeft',
  crouch: 'ControlLeft',
  camera: 'KeyC',
  interact: 'KeyE',
  restart: 'KeyR',
  pause: 'Escape',
};

export const ACTION_LABELS_PT: Record<ActionKey, string> = {
  forward: 'Mover para Frente',
  backward: 'Mover para Trás',
  left: 'Mover para Esquerda',
  right: 'Mover para Direita',
  jump: 'Pular / Pulo Duplo',
  sprint: 'Correr (Sprint)',
  crouch: 'Agachar',
  camera: 'Distância da Câmera',
  interact: 'Interagir',
  restart: 'Reiniciar Fase',
  pause: 'Menu de Pausa',
};

export function formatKeyCodePT(code: string): string {
  if (!code) return '---';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map: Record<string, string> = {
    Space: 'ESPAÇO',
    ShiftLeft: 'SHIFT ESQ.',
    ShiftRight: 'SHIFT DIR.',
    ControlLeft: 'CTRL ESQ.',
    ControlRight: 'CTRL DIR.',
    AltLeft: 'ALT ESQ.',
    AltRight: 'ALT DIR.',
    Escape: 'ESC',
    Enter: 'ENTER',
    Tab: 'TAB',
    ArrowUp: 'SETA CIMA',
    ArrowDown: 'SETA BAIXO',
    ArrowLeft: 'SETA ESQ.',
    ArrowRight: 'SETA DIR.',
  };
  return map[code] || code.toUpperCase();
}

export function createDefaultSaveData(): SaveData {
  return {
    coins: 50, // Welcome coins
    unlockedWorlds: ['urban'],
    unlockedLevels: ['urban-1'],
    levelRecords: {},
    purchasedSkins: ['urban_runner'],
    equippedSkin: 'urban_runner',
    keyBindings: { ...DEFAULT_KEY_BINDINGS },
    settings: {
      musicVolume: 0.45,
      sfxVolume: 0.7,
      cameraSensitivity: 1.0,
      cameraDistance: 'medium',
      shadowsEnabled: true,
      particlesEnabled: true,
    },
    stats: {
      totalJumps: 0,
      totalFalls: 0,
      totalCoinsCollected: 0,
      totalPlayTime: 0,
    },
  };
}

export function loadSaveData(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return createDefaultSaveData();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const def = createDefaultSaveData();
    return {
      ...def,
      ...parsed,
      unlockedWorlds: Array.isArray(parsed.unlockedWorlds) && parsed.unlockedWorlds.length > 0
        ? (Array.from(new Set(['urban', ...parsed.unlockedWorlds])) as WorldId[])
        : def.unlockedWorlds,
      unlockedLevels: Array.isArray(parsed.unlockedLevels) && parsed.unlockedLevels.length > 0
        ? Array.from(new Set(['urban-1', ...parsed.unlockedLevels]))
        : def.unlockedLevels,
      purchasedSkins: Array.isArray(parsed.purchasedSkins)
        ? Array.from(new Set([...def.purchasedSkins, ...parsed.purchasedSkins]))
        : def.purchasedSkins,
      keyBindings: { ...def.keyBindings, ...(parsed.keyBindings || {}) },
      settings: { ...def.settings, ...(parsed.settings || {}) },
      stats: { ...def.stats, ...(parsed.stats || {}) },
      levelRecords: parsed.levelRecords || {},
    };
  } catch {
    return createDefaultSaveData();
  }
}

export function persistSaveData(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota errors
  }
}

export function resetSaveData(): SaveData {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('hora_do_parkour') || key.startsWith('parkour_world_3d'))) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore storage errors
  }
  clearProceduralHistory();
  const fresh = createDefaultSaveData();
  persistSaveData(fresh);
  return fresh;
}

export function applyLevelCompletion(
  save: SaveData,
  level: LevelDef,
  timeSeconds: number,
  coinsCollected: number,
  coinsValueCollected: number,
  fallsCount: number
): { updatedSave: SaveData; result: LevelCompletionResult } {
  const prevRecord = save.levelRecords[level.id];
  const isFirstClear = !prevRecord?.completed;
  const totalLevelCoins = level.coins.length;

  // Star calculation:
  // 1 star: Completed
  // 2 stars: Within 1.35x par time OR >= 60% coins
  // 3 stars: Within par time AND >= 75% coins (or zero falls + within parTime * 1.15)
  let stars = 1;
  if (timeSeconds <= level.parTime * 1.35 || (totalLevelCoins > 0 && coinsCollected / totalLevelCoins >= 0.6)) {
    stars = 2;
  }
  if (
    timeSeconds <= level.parTime &&
    ((totalLevelCoins > 0 && coinsCollected / totalLevelCoins >= 0.7) || fallsCount === 0)
  ) {
    stars = 3;
  }

  const diffMult: Record<string, number> = {
    Iniciante: 1.0,
    Fácil: 1.25,
    Intermediário: 1.5,
    Difícil: 1.85,
    Extremo: 2.3,
  };

  const base = level.baseReward;
  const coinsValue = coinsValueCollected;
  const timeBonus = timeSeconds <= level.parTime
    ? Math.round(35 + Math.max(0, level.parTime - timeSeconds) * 2.5)
    : timeSeconds <= level.parTime * 1.4
      ? 15
      : 0;
  const difficultyBonus = Math.round(base * ((diffMult[level.difficulty] || 1) - 1) * 0.5);
  const challengeBonus = fallsCount === 0 ? 35 : 0;
  const firstClearBonus = isFirstClear ? Math.round(base * 0.5) : 0;

  const totalEarned = base + coinsValue + timeBonus + difficultyBonus + challengeBonus + firstClearBonus;

  const isNewBestTime =
    !prevRecord?.bestTime || timeSeconds < prevRecord.bestTime;

  const updatedRecords = {
    ...save.levelRecords,
    [level.id]: {
      completed: true,
      bestTime: prevRecord?.bestTime ? Math.min(prevRecord.bestTime, timeSeconds) : timeSeconds,
      bestCoins: Math.max(prevRecord?.bestCoins || 0, coinsCollected),
      totalCoinsInLevel: totalLevelCoins,
      stars: Math.max(prevRecord?.stars || 0, stars),
    },
  };

  const unlockedLevels = new Set(save.unlockedLevels);
  const unlockedWorlds = new Set<WorldId>(save.unlockedWorlds);

  let unlockedNextLevelId: string | null = null;
  let unlockedNextWorldId: WorldId | null = null;

  const nextLevel = getNextLevelInWorld(level.id);
  if (nextLevel && !unlockedLevels.has(nextLevel.id)) {
    unlockedLevels.add(nextLevel.id);
    unlockedNextLevelId = nextLevel.id;
  }

  // Count completed levels in current world; completing 3 levels unlocks the next world!
  const completedInWorld = Object.keys(updatedRecords).filter(
    (lid) => lid.startsWith(`${level.worldId}-`) && updatedRecords[lid]?.completed
  ).length;

  const nextWorld = getNextWorldId(level.worldId);
  if (nextWorld && completedInWorld >= 3 && !unlockedWorlds.has(nextWorld)) {
    unlockedWorlds.add(nextWorld);
    unlockedLevels.add(`${nextWorld}-1`);
    unlockedNextWorldId = nextWorld;
  }

  const updatedSave: SaveData = {
    ...save,
    coins: save.coins + totalEarned,
    unlockedWorlds: Array.from(unlockedWorlds),
    unlockedLevels: Array.from(unlockedLevels),
    levelRecords: updatedRecords,
    stats: {
      ...save.stats,
      totalCoinsCollected: save.stats.totalCoinsCollected + coinsCollected,
      totalPlayTime: save.stats.totalPlayTime + timeSeconds,
    },
  };

  const result: LevelCompletionResult = {
    levelId: level.id,
    worldId: level.worldId,
    levelNumber: level.levelNumber,
    levelName: level.name,
    difficulty: level.difficulty,
    timeSeconds,
    parTime: level.parTime,
    coinsCollected,
    totalLevelCoins,
    fallsCount,
    stars,
    isNewBestTime,
    rewardBreakdown: {
      base,
      coinsValue,
      timeBonus,
      difficultyBonus,
      challengeBonus,
      firstClearBonus,
      totalEarned,
    },
    unlockedNextLevelId,
    unlockedNextWorldId,
  };

  return { updatedSave, result };
}
