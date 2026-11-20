import { useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Coins,
  Flag,
  Pause,
  RotateCcw,
  Timer,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { HudSnapshot, KeyBindings, LevelDef, WorldDef } from '../types/game';
import { formatKeyCodePT } from '../storage/saveSystem';

interface GameplayHUDProps {
  world: WorldDef;
  level: LevelDef;
  hud: HudSnapshot;
  keyBindings: KeyBindings;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
}

export function GameplayHUD({
  world,
  level,
  hud,
  keyBindings,
  isMuted,
  onToggleMute,
  onPause,
  onRestart,
}: GameplayHUDProps) {
  const [controlsCollapsed, setControlsCollapsed] = useState(false);

  const camLabel =
    hud.cameraDistance === 'close'
      ? 'Próxima'
      : hud.cameraDistance === 'medium'
        ? 'Média'
        : 'Distante';

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 select-none">
      {/* Top Perimeter Status Clusters */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Top-Left: World & Level */}
        <div className="bg-slate-950/88 border border-slate-700/70 rounded-xl px-4 py-2.5 shadow-lg">
          <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
            Mundo {world.order}: {world.name}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm font-black text-white">
              Fase {level.levelNumber}: {level.name}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {level.difficulty}
            </span>
          </div>
        </div>

        {/* Top-Center: Progress Bar & Checkpoint */}
        <div className="bg-slate-950/88 border border-slate-700/70 rounded-xl px-4 py-2.5 shadow-lg min-w-[210px]">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5 tabular-nums">
            <span className="font-bold">Progresso: {hud.progressPercent}%</span>
            <span className="flex items-center gap-1 text-emerald-300 font-semibold">
              <Flag className="w-3.5 h-3.5" />
              CP {hud.activeCheckpoint}/{hud.totalCheckpoints}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-sky-400 transition-all duration-150"
              style={{ width: `${hud.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Top-Right: Timer, Coins & Quick Actions */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-950/88 border border-slate-700/70 rounded-xl px-3.5 py-2 flex items-center gap-4 shadow-lg tabular-nums">
            <div className="flex items-center gap-1.5 text-white font-bold text-sm">
              <Timer className="w-4 h-4 text-sky-400" />
              {hud.elapsedTime.toFixed(1)}s
            </div>
            <div className="flex items-center gap-1.5 text-amber-300 font-bold text-sm">
              <Coins className="w-4 h-4 text-amber-400" />
              {hud.collectedCoins}/{hud.totalCoins}
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              onClick={onToggleMute}
              title={isMuted ? 'Ativar Áudio' : 'Silenciar Áudio'}
              className="p-2.5 rounded-xl bg-slate-950/88 hover:bg-slate-800 border border-slate-700/70 text-slate-200 cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onRestart}
              title={`Reiniciar Fase (${formatKeyCodePT(keyBindings.restart)})`}
              className="p-2.5 rounded-xl bg-slate-950/88 hover:bg-slate-800 border border-slate-700/70 text-slate-200 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onPause}
              title={`Pausar (${formatKeyCodePT(keyBindings.pause)})`}
              className="p-2.5 rounded-xl bg-slate-950/88 hover:bg-slate-800 border border-slate-700/70 text-slate-200 cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Center Notifications (Toast & Contextual Switch Prompt) */}
      <div className="flex flex-col items-center gap-2 my-auto">
        {hud.toastMessage && (
          <div className="bg-slate-950/90 border border-emerald-500/50 text-emerald-300 px-4 py-2 rounded-xl text-sm font-bold shadow-xl">
            {hud.toastMessage}
          </div>
        )}
        {hud.nearbyPrompt && (
          <div className="bg-slate-950/92 border border-amber-400/70 text-amber-200 px-4 py-2 rounded-xl text-sm font-black shadow-xl">
            {hud.nearbyPrompt}
          </div>
        )}
      </div>

      {/* Collapsible Bottom Control Strip */}
      <div className="flex flex-col items-center">
        <button
          onClick={() => setControlsCollapsed((v) => !v)}
          className="pointer-events-auto flex items-center gap-1 px-3 py-1 rounded-t-lg bg-slate-950/88 border border-b-0 border-slate-700/70 text-[11px] font-semibold text-slate-300 hover:text-white cursor-pointer"
        >
          {controlsCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" /> Mostrar Controles
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> Ocultar Controles
            </>
          )}
        </button>
        {!controlsCollapsed && (
          <div className="bg-slate-950/88 border border-slate-700/70 rounded-xl px-4 py-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-300 shadow-xl">
            <span>
              <strong className="text-white">
                {formatKeyCodePT(keyBindings.forward)}
                {formatKeyCodePT(keyBindings.left)}
                {formatKeyCodePT(keyBindings.backward)}
                {formatKeyCodePT(keyBindings.right)}
              </strong>{' '}
              Mover
            </span>
            <span>
              <strong className="text-white">{formatKeyCodePT(keyBindings.jump)}</strong> Pular / Duplo
            </span>
            <span>
              <strong className="text-white">{formatKeyCodePT(keyBindings.sprint)}</strong> Correr
            </span>
            <span>
              <strong className="text-white">{formatKeyCodePT(keyBindings.crouch)}</strong>{' '}
              {hud.isCrouching ? 'Agachado' : 'Agachar'}
            </span>
            <span className="flex items-center gap-1">
              <Camera className="w-3 h-3 text-sky-400" />
              <strong className="text-white">{formatKeyCodePT(keyBindings.camera)}</strong> {camLabel}
            </span>
            <span>
              <strong className="text-white">Mouse</strong> Girar Câmera
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
