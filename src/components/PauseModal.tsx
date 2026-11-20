import { Home, Layers, Play, RotateCcw, Settings } from 'lucide-react';
import { LevelDef, WorldDef } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

interface PauseModalProps {
  world: WorldDef;
  level: LevelDef;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onSelectLevels: () => void;
  onMainMenu: () => void;
}

export function PauseModal({
  world,
  level,
  onResume,
  onRestart,
  onOpenSettings,
  onSelectLevels,
  onMainMenu,
}: PauseModalProps) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-slate-950/80">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-5 shadow-2xl">
        <div className="text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-sky-400">
            {world.name} · Fase {level.levelNumber}
          </div>
          <h2 className="text-2xl font-black text-white mt-1">JOGO PAUSADO</h2>
          <p className="text-xs text-slate-400 mt-1">{level.name}</p>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={() => {
              soundEngine.playMenuClick();
              onResume();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Continuar
          </button>

          <button
            onClick={() => {
              soundEngine.playMenuClick();
              onRestart();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-sm border border-slate-700 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Reiniciar Fase
          </button>

          <button
            onClick={() => {
              soundEngine.playMenuClick();
              onOpenSettings();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-sm border border-slate-700 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            Configurações
          </button>

          <button
            onClick={() => {
              soundEngine.playMenuClick();
              onSelectLevels();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-sm border border-slate-700 cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            Selecionar Fase
          </button>

          <button
            onClick={() => {
              soundEngine.playMenuClick();
              onMainMenu();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold text-sm border border-slate-800 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Menu Principal
          </button>
        </div>
      </div>
    </div>
  );
}
