import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CameraDistanceMode,
  GameScreen,
  HudSnapshot,
  LevelCompletionResult,
  LevelDef,
  SaveData,
  SkinDef,
  WorldId,
} from './types/game';
import {
  applyLevelCompletion,
  loadSaveData,
  persistSaveData,
  resetSaveData,
} from './storage/saveSystem';
import { getLevelById, getNextLevelInWorld, LEVELS } from './data/levels';
import { getWorldById } from './data/worlds';
import { ParkourEngine } from './engine/ParkourEngine';
import { generateProceduralLevel } from './engine/proceduralGenerator';
import { soundEngine } from './audio/soundEngine';
import { MainMenu } from './components/MainMenu';
import { WorldSelectModal } from './components/WorldSelectModal';
import { LevelSelectModal } from './components/LevelSelectModal';
import { SkinShopModal } from './components/SkinShopModal';
import { SettingsModal } from './components/SettingsModal';
import { RecordsModal } from './components/RecordsModal';
import { CreditsModal } from './components/CreditsModal';
import { GameplayHUD } from './components/GameplayHUD';
import { PauseModal } from './components/PauseModal';
import { VictoryModal } from './components/VictoryModal';

const INITIAL_HUD: HudSnapshot = {
  elapsedTime: 0,
  collectedCoins: 0,
  totalCoins: 0,
  progressPercent: 0,
  activeCheckpoint: 0,
  totalCheckpoints: 0,
  isCrouching: false,
  isSprinting: false,
  cameraDistance: 'medium',
  nearbyPrompt: null,
  toastMessage: null,
  jumpsRemaining: 2,
  isEliminated: false,
  eliminationTimer: 0,
  eliminationReason: null,
  activeBridgeTimer: null,
  activeBridgeMax: 6.0,
  activeBridgeWarning: false,
};

export default function App() {
  const [saveData, setSaveData] = useState<SaveData>(() => loadSaveData());
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [selectedWorldId, setSelectedWorldId] = useState<WorldId>('urban');
  const [activeLevel, setActiveLevel] = useState<LevelDef>(() => LEVELS[0]);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseSettingsOpen, setPauseSettingsOpen] = useState(false);
  const [victoryResult, setVictoryResult] = useState<LevelCompletionResult | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ParkourEngine | null>(null);
  const saveRef = useRef<SaveData>(saveData);
  const activeLevelRef = useRef<LevelDef>(activeLevel);
  const screenRef = useRef<GameScreen>(screen);
  const isPausedRef = useRef<boolean>(isPaused);

  useEffect(() => {
    saveRef.current = saveData;
    persistSaveData(saveData);
    engineRef.current?.updateSettings(saveData);
    if (!isMuted) {
      soundEngine.setVolumes(saveData.settings.musicVolume, saveData.settings.sfxVolume);
    }
  }, [saveData, isMuted]);

  useEffect(() => {
    activeLevelRef.current = activeLevel;
  }, [activeLevel]);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const updateSave = useCallback((updater: (prev: SaveData) => SaveData) => {
    setSaveData((prev) => updater(prev));
  }, []);

  const startLevel = useCallback((baseOrCurrentLevel: LevelDef) => {
    const baseTemplate = getLevelById(baseOrCurrentLevel.id) || baseOrCurrentLevel;
    const proceduralLevel = generateProceduralLevel(baseTemplate);
    activeLevelRef.current = proceduralLevel;
    setActiveLevel(proceduralLevel);
    setSelectedWorldId(proceduralLevel.worldId);
    setVictoryResult(null);
    setIsPaused(false);
    setPauseSettingsOpen(false);
    setScreen('playing');
    engineRef.current?.loadLevel(proceduralLevel);
  }, []);

  // Initialize Three.js ParkourEngine once on mount
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new ParkourEngine(mount, saveRef.current, {
      onHudUpdate: (snapshot) => {
        setHud(snapshot);
      },
      onLevelComplete: (stats) => {
        const level = activeLevelRef.current;
        const { updatedSave, result } = applyLevelCompletion(
          saveRef.current,
          level,
          stats.timeSeconds,
          stats.coinsCollected,
          stats.coinsValueCollected,
          stats.fallsCount
        );
        setSaveData(updatedSave);
        setVictoryResult(result);
      },
      onPauseRequest: () => {
        if (screenRef.current !== 'playing') return;
        setIsPaused((prev) => {
          const next = !prev;
          engineRef.current?.setPaused(next);
          if (!next) setPauseSettingsOpen(false);
          return next;
        });
      },
      onRestartRequest: () => {
        if (screenRef.current !== 'playing') return;
        const base = getLevelById(activeLevelRef.current.id) || activeLevelRef.current;
        startLevel(base);
      },
      onCameraDistanceChange: (mode: CameraDistanceMode) => {
        setSaveData((prev) => ({
          ...prev,
          settings: { ...prev.settings, cameraDistance: mode },
        }));
      },
      onJumpStat: () => {
        setSaveData((prev) => ({
          ...prev,
          stats: { ...prev.stats, totalJumps: prev.stats.totalJumps + 1 },
        }));
      },
      onFallStat: () => {
        setSaveData((prev) => ({
          ...prev,
          stats: { ...prev.stats, totalFalls: prev.stats.totalFalls + 1 },
        }));
      },
    });

    engineRef.current = engine;
    soundEngine.setVolumes(saveRef.current.settings.musicVolume, saveRef.current.settings.sfxVolume);

    return () => {
      soundEngine.stopMusic();
      engine.dispose();
      engineRef.current = null;
    };
  }, [startLevel]);

  const handlePlayContinue = useCallback(() => {
    // Find latest unlocked uncompleted level, or fallback to latest unlocked
    const unlocked = saveData.unlockedLevels
      .map((id) => getLevelById(id))
      .filter((l): l is LevelDef => Boolean(l));
    const nextUnfinished = unlocked.find((l) => !saveData.levelRecords[l.id]?.completed);
    const target = nextUnfinished || unlocked[unlocked.length - 1] || LEVELS[0];
    startLevel(target);
  }, [saveData.unlockedLevels, saveData.levelRecords, startLevel]);

  // Enter key starts game from Main Menu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (screenRef.current === 'menu' && e.code === 'Enter') {
        e.preventDefault();
        soundEngine.unlock();
        soundEngine.playMenuClick();
        handlePlayContinue();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlePlayContinue]);

  const handleReturnToMenu = useCallback(() => {
    soundEngine.stopMusic();
    setVictoryResult(null);
    setIsPaused(false);
    setPauseSettingsOpen(false);
    setScreen('menu');
    engineRef.current?.enterShowcase(selectedWorldId);
  }, [selectedWorldId]);

  const handleBuySkin = useCallback(
    (skin: SkinDef) => {
      updateSave((prev) => {
        if (prev.coins < skin.price || prev.purchasedSkins.includes(skin.id)) return prev;
        soundEngine.playPurchase();
        return {
          ...prev,
          coins: prev.coins - skin.price,
          purchasedSkins: [...prev.purchasedSkins, skin.id],
          equippedSkin: skin.id,
        };
      });
    },
    [updateSave]
  );

  const handleEquipSkin = useCallback(
    (skinId: string) => {
      updateSave((prev) => ({
        ...prev,
        equippedSkin: skinId,
      }));
    },
    [updateSave]
  );

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        soundEngine.setVolumes(0, 0);
      } else {
        soundEngine.setVolumes(
          saveRef.current.settings.musicVolume,
          saveRef.current.settings.sfxVolume
        );
      }
      return next;
    });
  }, []);

  const handleResetGame = useCallback(() => {
    soundEngine.stopMusic();
    const freshSave = resetSaveData();
    saveRef.current = freshSave;
    setSaveData(freshSave);
    setSelectedWorldId('urban');
    activeLevelRef.current = LEVELS[0];
    setActiveLevel(LEVELS[0]);
    setHud(INITIAL_HUD);
    setVictoryResult(null);
    setIsPaused(false);
    setPauseSettingsOpen(false);
    setIsMuted(false);
    soundEngine.setVolumes(freshSave.settings.musicVolume, freshSave.settings.sfxVolume);
    setScreen('menu');
    engineRef.current?.updateSettings(freshSave);
    engineRef.current?.enterShowcase('urban');
  }, []);

  const handleVirtualMove = useCallback((x: number, y: number) => {
    engineRef.current?.setVirtualMove(x, y);
  }, []);

  const handleVirtualSprint = useCallback((active: boolean) => {
    engineRef.current?.setVirtualFlags({ sprint: active });
  }, []);

  const handleVirtualCrouch = useCallback((active: boolean) => {
    engineRef.current?.setVirtualFlags({ crouch: active });
  }, []);

  const handleVirtualJump = useCallback(() => {
    engineRef.current?.triggerVirtualJump();
  }, []);

  const handleVirtualInteract = useCallback(() => {
    engineRef.current?.triggerVirtualInteract();
  }, []);

  const handleCycleCamera = useCallback(() => {
    engineRef.current?.cycleCameraDistance();
  }, []);

  const handleRetryElimination = useCallback(() => {
    engineRef.current?.retryFromElimination();
  }, []);

  const currentWorld = getWorldById(activeLevel.worldId);
  const nextLevel = getNextLevelInWorld(activeLevel.id);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-white font-sans">
      {/* Isolated WebGL Canvas Container */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* Screens & Modals */}
      {screen === 'menu' && (
        <MainMenu
          saveData={saveData}
          onPlayContinue={handlePlayContinue}
          onNavigate={(next) => setScreen(next)}
        />
      )}

      {screen === 'worlds' && (
        <WorldSelectModal
          saveData={saveData}
          selectedWorldId={selectedWorldId}
          onSelectWorld={(worldId) => {
            setSelectedWorldId(worldId);
            engineRef.current?.enterShowcase(worldId);
            setScreen('levels');
          }}
          onClose={() => setScreen('menu')}
        />
      )}

      {screen === 'levels' && (
        <LevelSelectModal
          saveData={saveData}
          selectedWorldId={selectedWorldId}
          onChangeWorld={(worldId) => {
            setSelectedWorldId(worldId);
            engineRef.current?.enterShowcase(worldId);
          }}
          onStartLevel={startLevel}
          onClose={() => setScreen('menu')}
        />
      )}

      {(screen === 'shop' || screen === 'customize') && (
        <SkinShopModal
          mode={screen === 'shop' ? 'shop' : 'customize'}
          saveData={saveData}
          onBuySkin={handleBuySkin}
          onEquipSkin={handleEquipSkin}
          onClose={() => setScreen('menu')}
        />
      )}

      {screen === 'settings' && (
        <SettingsModal
          saveData={saveData}
          onUpdateSave={updateSave}
          onResetGame={handleResetGame}
          onClose={() => setScreen('menu')}
        />
      )}

      {screen === 'records' && (
        <RecordsModal saveData={saveData} onClose={() => setScreen('menu')} />
      )}

      {screen === 'credits' && <CreditsModal onClose={() => setScreen('menu')} />}

      {screen === 'playing' && (
        <>
          <GameplayHUD
            world={currentWorld}
            level={activeLevel}
            hud={hud}
            keyBindings={saveData.keyBindings}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onPause={() => {
              setIsPaused(true);
              engineRef.current?.setPaused(true);
            }}
            onRestart={() => startLevel(activeLevel)}
            onVirtualMove={handleVirtualMove}
            onVirtualSprint={handleVirtualSprint}
            onVirtualCrouch={handleVirtualCrouch}
            onVirtualJump={handleVirtualJump}
            onVirtualInteract={handleVirtualInteract}
            onCycleCamera={handleCycleCamera}
            onRetryElimination={handleRetryElimination}
          />

          {isPaused && !victoryResult && !pauseSettingsOpen && (
            <PauseModal
              world={currentWorld}
              level={activeLevel}
              onResume={() => {
                setIsPaused(false);
                engineRef.current?.setPaused(false);
              }}
              onRestart={() => startLevel(activeLevel)}
              onOpenSettings={() => setPauseSettingsOpen(true)}
              onSelectLevels={() => {
                soundEngine.stopMusic();
                setIsPaused(false);
                setScreen('levels');
                engineRef.current?.enterShowcase(selectedWorldId);
              }}
              onMainMenu={handleReturnToMenu}
            />
          )}

          {isPaused && pauseSettingsOpen && (
            <SettingsModal
              saveData={saveData}
              onUpdateSave={updateSave}
              onResetGame={handleResetGame}
              onClose={() => setPauseSettingsOpen(false)}
            />
          )}

          {victoryResult && (
            <VictoryModal
              result={victoryResult}
              hasNextLevel={Boolean(nextLevel)}
              onNextLevel={() => {
                if (nextLevel) startLevel(nextLevel);
              }}
              onReplay={() => startLevel(activeLevel)}
              onMainMenu={handleReturnToMenu}
            />
          )}
        </>
      )}
    </div>
  );
}
