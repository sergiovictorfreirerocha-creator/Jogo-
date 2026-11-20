import {
  Award,
  Coins,
  Globe,
  Info,
  Layers,
  Play,
  Settings,
  ShoppingBag,
  Sparkles,
  User,
} from 'lucide-react';
import { GameScreen, SaveData } from '../types/game';
import { getSkinById } from '../data/skins';
import { LEVELS } from '../data/levels';
import { soundEngine } from '../audio/soundEngine';

interface MainMenuProps {
  saveData: SaveData;
  onPlayContinue: () => void;
  onNavigate: (screen: GameScreen) => void;
}

export function MainMenu({ saveData, onPlayContinue, onNavigate }: MainMenuProps) {
  const skin = getSkinById(saveData.equippedSkin);
  const completedCount = Object.values(saveData.levelRecords).filter((r) => r.completed).length;

  const clickNav = (screen: GameScreen) => {
    soundEngine.unlock();
    soundEngine.playMenuClick();
    onNavigate(screen);
  };

  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-between p-6 md:p-10 pointer-events-none select-none">
      {/* Top Bar: Bespoke SVG Logo + Player Economy Summary */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="pointer-events-auto bg-slate-950/88 border border-slate-700/70 rounded-2xl px-6 py-4 shadow-2xl max-w-md">
          <div className="flex items-center gap-3">
            <svg width="44" height="44" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="pwLogoGrad" x1="0" y1="0" x2="48" y2="48">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>
              <rect x="3" y="3" width="42" height="42" rx="11" fill="#0f172a" stroke="url(#pwLogoGrad)" strokeWidth="2.5" />
              <path d="M13 33L21 15L28 24L35 13" stroke="#38bdf8" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="35" cy="13" r="3.5" fill="#fbbf24" />
              <path d="M11 36H37" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-none">
                PARKOUR <span className="text-sky-400">WORLD</span> <span className="text-amber-400">3D</span>
              </h1>
              <p className="text-xs text-slate-300 mt-1">
                8 Mundos Únicos · 40 Fases · 15 Skins Desbloqueáveis
              </p>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-3">
          <div className="bg-slate-950/88 border border-amber-500/40 rounded-xl px-4 py-2.5 flex items-center gap-2.5 shadow-lg">
            <Coins className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Moedas</div>
              <div className="text-lg font-bold text-amber-300 tabular-nums leading-tight">{saveData.coins}</div>
            </div>
          </div>
          <div className="bg-slate-950/88 border border-sky-500/40 rounded-xl px-4 py-2.5 flex items-center gap-2.5 shadow-lg">
            <Sparkles className="w-5 h-5 text-sky-400" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Progresso</div>
              <div className="text-lg font-bold text-white tabular-nums leading-tight">
                {completedCount}/{LEVELS.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Left Menu Panel leaving Center/Right 3D Showcase unobstructed */}
      <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-6 my-auto">
        <nav className="pointer-events-auto w-full max-w-xs flex flex-col gap-2.5 bg-slate-950/88 border border-slate-700/70 rounded-2xl p-4 shadow-2xl">
          <button
            onClick={() => {
              soundEngine.unlock();
              soundEngine.playMenuClick();
              onPlayContinue();
            }}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-base tracking-wide transition-colors cursor-pointer shadow-lg"
          >
            <span className="flex items-center gap-2.5">
              <Play className="w-5 h-5 fill-current" />
              JOGAR
            </span>
            <span className="text-xs font-bold bg-slate-950/20 px-2 py-0.5 rounded">ENTER</span>
          </button>

          <button
            onClick={() => clickNav('worlds')}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 font-semibold text-sm transition-colors cursor-pointer border border-slate-700/60"
          >
            <Globe className="w-4 h-4 text-sky-400" />
            SELECIONAR MUNDO
          </button>

          <button
            onClick={() => clickNav('levels')}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 font-semibold text-sm transition-colors cursor-pointer border border-slate-700/60"
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            SELECIONAR FASE
          </button>

          <button
            onClick={() => clickNav('customize')}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 font-semibold text-sm transition-colors cursor-pointer border border-slate-700/60"
          >
            <User className="w-4 h-4 text-violet-400" />
            PERSONALIZAR PERSONAGEM
          </button>

          <button
            onClick={() => clickNav('shop')}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 font-semibold text-sm transition-colors cursor-pointer border border-slate-700/60"
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            LOJA DE SKINS
          </button>

          <button
            onClick={() => clickNav('settings')}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 font-semibold text-sm transition-colors cursor-pointer border border-slate-700/60"
          >
            <Settings className="w-4 h-4 text-slate-300" />
            CONFIGURAÇÕES
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => clickNav('records')}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 font-semibold text-xs transition-colors cursor-pointer border border-slate-700/60"
            >
              <Award className="w-4 h-4 text-amber-400" />
              RECORDES
            </button>
            <button
              onClick={() => clickNav('credits')}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 font-semibold text-xs transition-colors cursor-pointer border border-slate-700/60"
            >
              <Info className="w-4 h-4 text-sky-300" />
              CRÉDITOS
            </button>
          </div>
        </nav>

        {/* Equipped Skin Tag on Bottom Right */}
        <div className="pointer-events-auto bg-slate-950/85 border border-slate-700/70 rounded-xl px-4 py-2.5 text-right hidden md:block">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Skin Equipada</div>
          <div className="text-sm font-bold text-white">{skin.name}</div>
        </div>
      </div>

      {/* Flat Control Hint Line */}
      <div className="flex justify-center">
        <div className="bg-slate-950/85 border border-slate-700/60 rounded-xl px-5 py-2 text-xs text-slate-300 tracking-wide">
          WASD Mover · Espaço Pular / Pulo Duplo · Shift Correr · Ctrl Agachar · C Câmera · E Interagir · R Reiniciar · ESC Pausa
        </div>
      </div>
    </div>
  );
}
