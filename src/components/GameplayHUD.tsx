import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  AlertTriangle,
  ArrowUp,
  Camera,
  ChevronDown,
  ChevronUp,
  Coins,
  Flag,
  Gamepad2,
  Hand,
  Hourglass,
  Pause,
  RotateCcw,
  Skull,
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
  onVirtualMove: (x: number, y: number) => void;
  onVirtualSprint: (active: boolean) => void;
  onVirtualCrouch: (active: boolean) => void;
  onVirtualJump: () => void;
  onVirtualInteract: () => void;
  onCycleCamera: () => void;
  onRetryElimination: () => void;
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
  onVirtualMove,
  onVirtualSprint,
  onVirtualCrouch,
  onVirtualJump,
  onVirtualInteract,
  onCycleCamera,
  onRetryElimination,
}: GameplayHUDProps) {
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [touchEnabled, setTouchEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(pointer: coarse)').matches ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth < 768
    );
  });

  const [sprintLocked, setSprintLocked] = useState(false);
  const [crouchLocked, setCrouchLocked] = useState(false);
  const [joyActive, setJoyActive] = useState(false);
  const joyRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const joyPointerId = useRef<number | null>(null);

  const applyKnobTransform = (kx: number, ky: number) => {
    if (knobRef.current) {
      knobRef.current.style.transform = `translate3d(${kx}px, ${ky}px, 0)`;
    }
  };

  const resetJoystick = () => {
    joyPointerId.current = null;
    setJoyActive(false);
    applyKnobTransform(0, 0);
    onVirtualMove(0, 0);
  };

  useEffect(() => {
    if (!touchEnabled) {
      joyPointerId.current = null;
      setJoyActive(false);
      applyKnobTransform(0, 0);
      onVirtualMove(0, 0);
      onVirtualSprint(false);
      onVirtualCrouch(false);
      setSprintLocked(false);
      setCrouchLocked(false);
    }
  }, [touchEnabled, onVirtualMove, onVirtualSprint, onVirtualCrouch]);

  useEffect(() => {
    const handleWindowBlur = () => {
      if (joyPointerId.current !== null) {
        resetJoystick();
      }
    };
    window.addEventListener('blur', handleWindowBlur);
    return () => window.removeEventListener('blur', handleWindowBlur);
  }, [onVirtualMove]);

  const camLabel =
    hud.cameraDistance === 'close'
      ? 'Próxima'
      : hud.cameraDistance === 'medium'
        ? 'Média'
        : 'Distante';

  const updateJoystick = (clientX: number, clientY: number) => {
    const el = joyRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.41;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);

    if (dist < 0.001) {
      applyKnobTransform(0, 0);
      onVirtualMove(0, 0);
      return;
    }

    const clamped = Math.min(dist, maxR);
    const ux = dx / dist;
    const uy = dy / dist;
    const kx = ux * clamped;
    const ky = uy * clamped;

    // Immediate zero-lag visual tracking under the player's finger
    applyKnobTransform(kx, ky);

    // Deadzone + smooth progressive response curve to avoid involuntary drift or jerkiness
    const rawMag = clamped / maxR;
    const deadzone = 0.14;
    if (rawMag <= deadzone) {
      onVirtualMove(0, 0);
      return;
    }

    const remapped = (rawMag - deadzone) / (1 - deadzone);
    const curvedMag = Math.pow(remapped, 1.35);
    onVirtualMove(ux * curvedMag, -uy * curvedMag);
  };

  const handleJoyPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore capture fallback issues on older mobile browsers
    }
    joyPointerId.current = e.pointerId;
    setJoyActive(true);
    updateJoystick(e.clientX, e.clientY);
  };

  const handleJoyPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (joyPointerId.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    updateJoystick(e.clientX, e.clientY);
  };

  const handleJoyPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (joyPointerId.current !== e.pointerId) return;
    e.stopPropagation();
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release errors
    }
    resetJoystick();
  };

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-4 select-none">
      {/* Top Perimeter Status Clusters */}
      <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
        {/* Top-Left: World & Level */}
        <div className="bg-slate-950/88 border border-slate-700/70 rounded-xl px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-lg">
          <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-sky-400">
            <span>
              Mundo {world.order}: {world.name}
            </span>
            {level.seed !== undefined && (
              <span className="px-1.5 py-0.2 rounded bg-sky-500/15 border border-sky-400/35 text-[9px] text-sky-300">
                PROCEDURAL
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs sm:text-sm font-black text-white">
              Fase {level.levelNumber}: {level.name}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {level.difficulty}
            </span>
          </div>
        </div>

        {/* Top-Center: Progress Bar & Checkpoint */}
        <div className="bg-slate-950/88 border border-slate-700/70 rounded-xl px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-lg min-w-[175px] sm:min-w-[210px]">
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
          <div className="bg-slate-950/88 border border-slate-700/70 rounded-xl px-3 py-2 sm:px-3.5 flex items-center gap-3 sm:gap-4 shadow-lg tabular-nums">
            <div className="flex items-center gap-1.5 text-white font-bold text-xs sm:text-sm">
              <Timer className="w-4 h-4 text-sky-400" />
              {hud.elapsedTime.toFixed(1)}s
            </div>
            <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs sm:text-sm">
              <Coins className="w-4 h-4 text-amber-400" />
              {hud.collectedCoins}/{hud.totalCoins}
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              onClick={() => setTouchEnabled((v) => !v)}
              title={touchEnabled ? 'Ocultar Controles Táteis' : 'Mostrar Controles Táteis'}
              className={`p-2 sm:p-2.5 rounded-xl border cursor-pointer ${
                touchEnabled
                  ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                  : 'bg-slate-950/88 hover:bg-slate-800 border-slate-700/70 text-slate-200'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleMute}
              title={isMuted ? 'Ativar Áudio' : 'Silenciar Áudio'}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-950/88 hover:bg-slate-800 border border-slate-700/70 text-slate-200 cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onRestart}
              title={`Novo Percurso / Reiniciar (${formatKeyCodePT(keyBindings.restart)})`}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-950/88 hover:bg-slate-800 border border-slate-700/70 text-slate-200 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onPause}
              title={`Pausar (${formatKeyCodePT(keyBindings.pause)})`}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-950/88 hover:bg-slate-800 border border-slate-700/70 text-slate-200 cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Center Notifications (Temporary Bridge Countdown, Toast, Switch Prompt & Elimination Overlay) */}
      <div className="flex flex-col items-center gap-2.5 my-auto">
        {hud.activeBridgeTimer !== null && hud.activeBridgeTimer !== undefined && !hud.isEliminated && (
          <div
            className={`px-4 py-2 rounded-xl border shadow-xl min-w-[230px] transition-colors ${
              hud.activeBridgeWarning
                ? 'bg-rose-950/92 border-rose-400 text-rose-100 animate-pulse'
                : 'bg-slate-950/90 border-sky-400/70 text-sky-100'
            }`}
          >
            <div className="flex items-center justify-between gap-3 text-xs font-black tabular-nums mb-1.5">
              <span className="flex items-center gap-1.5">
                {hud.activeBridgeWarning ? (
                  <AlertTriangle className="w-4 h-4 text-amber-300" />
                ) : (
                  <Hourglass className="w-4 h-4 text-sky-300" />
                )}
                {hud.activeBridgeWarning ? 'PONTE SUMINDO!' : 'Ponte Temporária'}
              </span>
              <span>{hud.activeBridgeTimer.toFixed(1)}s</span>
            </div>
            <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
              <div
                className={`h-full transition-all duration-75 ${
                  hud.activeBridgeWarning ? 'bg-rose-500' : 'bg-sky-400'
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, (hud.activeBridgeTimer / (hud.activeBridgeMax || 6)) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {hud.isEliminated && (
          <div className="pointer-events-auto bg-slate-950/94 border-2 border-rose-500 rounded-2xl px-6 py-5 shadow-2xl flex flex-col items-center text-center max-w-sm mx-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-400/60 flex items-center justify-center mb-2.5">
              <Skull className="w-6 h-6 text-rose-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-wide text-rose-400">
              VOCÊ FOI ELIMINADO!
            </h2>
            {hud.eliminationReason && (
              <p className="text-xs sm:text-sm text-slate-200 font-semibold mt-1">
                {hud.eliminationReason}
              </p>
            )}
            <p className="text-[11px] text-slate-400 mt-2 tabular-nums">
              {hud.activeCheckpoint > 0
                ? `Voltando ao Checkpoint ${hud.activeCheckpoint} em ${(hud.eliminationTimer ?? 0).toFixed(1)}s...`
                : `Reiniciando no início em ${(hud.eliminationTimer ?? 0).toFixed(1)}s...`}
            </p>
            <button
              type="button"
              onClick={onRetryElimination}
              onPointerDown={(e) => e.stopPropagation()}
              className="mt-4 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 active:scale-95 text-white font-black text-xs sm:text-sm tracking-wide shadow-lg cursor-pointer flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              TENTAR NOVAMENTE
            </button>
          </div>
        )}

        {hud.toastMessage && !hud.isEliminated && (
          <div className="bg-slate-950/90 border border-emerald-500/50 text-emerald-300 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-xl">
            {hud.toastMessage}
          </div>
        )}
        {hud.nearbyPrompt && !hud.isEliminated && (
          <div className="bg-slate-950/92 border border-amber-400/70 text-amber-200 px-4 py-2 rounded-xl text-xs sm:text-sm font-black shadow-xl">
            {hud.nearbyPrompt}
          </div>
        )}
      </div>

      {/* Mobile / Touch Virtual Controls OR Desktop Collapsible Bottom Control Strip */}
      {touchEnabled ? (
        <div className="flex items-end justify-between w-full gap-4 pb-1">
          {/* Left Virtual Analog Joystick */}
          <div
            ref={joyRef}
            onPointerDown={handleJoyPointerDown}
            onPointerMove={handleJoyPointerMove}
            onPointerUp={handleJoyPointerUp}
            onPointerCancel={handleJoyPointerUp}
            onLostPointerCapture={handleJoyPointerUp}
            className={`pointer-events-auto relative w-36 h-36 sm:w-40 sm:h-40 ml-1 mb-1 rounded-full bg-slate-950/75 border-2 shadow-xl touch-none select-none flex items-center justify-center transition-colors ${
              joyActive ? 'border-sky-400/85 bg-slate-950/85' : 'border-slate-600/80'
            }`}
          >
            {/* Outer & deadzone guide rings + subtle directional ticks */}
            <div className="absolute inset-3 rounded-full border border-slate-700/50 pointer-events-none" />
            <div className="w-10 h-10 rounded-full border border-slate-700/80 bg-slate-900/55 pointer-events-none" />
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-slate-500/70 pointer-events-none" />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-slate-500/70 pointer-events-none" />
            <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-500/70 pointer-events-none" />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-500/70 pointer-events-none" />

            <div
              ref={knobRef}
              className={`absolute w-14 h-14 rounded-full border-2 shadow-lg pointer-events-none transition-colors ${
                joyActive
                  ? 'bg-sky-400/95 border-white shadow-sky-500/40'
                  : 'bg-sky-500/85 border-white/80'
              }`}
              style={{
                willChange: 'transform',
              }}
            />
          </div>

          {/* Right Action Pad */}
          <div className="pointer-events-auto flex items-end gap-2.5">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onCycleCamera();
                }}
                className="px-3 py-2 rounded-xl bg-slate-950/85 border border-slate-600/80 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 touch-none"
              >
                <Camera className="w-3.5 h-3.5 text-sky-400" />
                {camLabel}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const next = !crouchLocked;
                    setCrouchLocked(next);
                    if (next) {
                      setSprintLocked(false);
                      onVirtualSprint(false);
                    }
                    onVirtualCrouch(next);
                  }}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-bold active:scale-95 touch-none ${
                    crouchLocked
                      ? 'bg-amber-500/85 border-amber-300 text-slate-950'
                      : 'bg-slate-950/85 border-slate-600/80 text-slate-200'
                  }`}
                >
                  Agachar
                </button>

                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const next = !sprintLocked;
                    setSprintLocked(next);
                    if (next) {
                      setCrouchLocked(false);
                      onVirtualCrouch(false);
                    }
                    onVirtualSprint(next);
                  }}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-bold active:scale-95 touch-none ${
                    sprintLocked
                      ? 'bg-emerald-500/85 border-emerald-300 text-slate-950'
                      : 'bg-slate-950/85 border-slate-600/80 text-slate-200'
                  }`}
                >
                  Correr
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              {hud.nearbyPrompt && (
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onVirtualInteract();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 border-2 border-amber-200 text-slate-950 text-xs font-black flex items-center gap-1 shadow-lg active:scale-95 touch-none"
                >
                  <Hand className="w-3.5 h-3.5" /> Interagir
                </button>
              )}

              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onVirtualJump();
                }}
                className="w-20 h-20 rounded-full bg-sky-500/90 active:bg-sky-400 border-2 border-white/80 text-slate-950 font-black text-xs shadow-xl flex flex-col items-center justify-center active:scale-95 touch-none"
              >
                <ArrowUp className="w-6 h-6" />
                PULAR
              </button>
            </div>
          </div>
        </div>
      ) : (
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
                <strong className="text-white">Mouse / Toque</strong> Girar Câmera
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
