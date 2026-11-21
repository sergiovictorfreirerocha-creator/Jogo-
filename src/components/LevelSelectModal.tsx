import { ArrowLeft, Check, Coins, Lock, Play, Star, Timer } from 'lucide-react';
import { getLevelsByWorld } from '../data/levels';
import { getWorldById, WORLDS } from '../data/worlds';
import { LevelDef, SaveData, WorldId } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

interface LevelSelectModalProps {
  saveData: SaveData;
  selectedWorldId: WorldId;
  onChangeWorld: (worldId: WorldId) => void;
  onStartLevel: (level: LevelDef) => void;
  onClose: () => void;
}

const DIFF_COLORS: Record<string, string> = {
  Iniciante: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  Fácil: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  Intermediário: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  Difícil: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  Extremo: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
};

export function LevelSelectModal({
  saveData,
  selectedWorldId,
  onChangeWorld,
  onStartLevel,
  onClose,
}: LevelSelectModalProps) {
  const world = getWorldById(selectedWorldId);
  const levels = getLevelsByWorld(selectedWorldId);
  const isWorldUnlocked = saveData.unlockedWorlds.includes(selectedWorldId);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 md:p-8 bg-slate-950/80">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div>
            <h2 className="text-xl font-black text-white">SELECIONAR FASE — {world.name}</h2>
            <p className="text-xs text-slate-400">{world.subtitle} · {world.mechanicLabel}</p>
          </div>
          <button
            onClick={() => {
              soundEngine.playMenuClick();
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>

        {/* World tabs */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex gap-2 overflow-x-auto">
          {WORLDS.map((w) => {
            const unlocked = saveData.unlockedWorlds.includes(w.id);
            return (
              <button
                key={w.id}
                onClick={() => {
                  soundEngine.playMenuClick();
                  onChangeWorld(w.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  w.id === selectedWorldId
                    ? 'bg-sky-500 text-slate-950'
                    : unlocked
                      ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                {!unlocked && <Lock className="w-3 h-3" />}
                {w.order}. {w.name}
              </button>
            );
          })}
        </div>

        <div className="p-6 overflow-y-auto space-y-3">
          {!isWorldUnlocked && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
              Este mundo ainda está bloqueado. {world.unlockRequirementText} para desbloqueá-lo.
            </div>
          )}

          {levels.map((lvl) => {
            const unlocked = isWorldUnlocked && saveData.unlockedLevels.includes(lvl.id);
            const rec = saveData.levelRecords[lvl.id];

            return (
              <div
                key={lvl.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border ${
                  unlocked
                    ? 'bg-slate-800/75 border-slate-700 hover:border-slate-500'
                    : 'bg-slate-950/60 border-slate-800/80 opacity-65'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-slate-400">FASE {lvl.levelNumber}</span>
                    <h3 className="text-base font-extrabold text-white">{lvl.name}</h3>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${DIFF_COLORS[lvl.difficulty]}`}>
                      {lvl.difficulty}
                    </span>
                    {rec?.completed && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded">
                        <Check className="w-3 h-3" /> Concluída
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{lvl.description}</p>

                  <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-300 tabular-nums">
                    <span className="flex items-center gap-1">
                      <Timer className="w-3.5 h-3.5 text-sky-400" />
                      Melhor tempo: {rec?.bestTime ? `${rec.bestTime.toFixed(1)}s` : `-- (Meta: ${lvl.parTime}s)`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      Moedas: {rec?.bestCoins ?? 0}/{lvl.coins.length}
                    </span>
                    <span className="flex items-center gap-0.5">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            (rec?.stars ?? 0) >= s ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                          }`}
                        />
                      ))}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  {unlocked ? (
                    <button
                      onClick={() => {
                        soundEngine.unlock();
                        soundEngine.playMenuClick();
                        onStartLevel(lvl);
                      }}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Jogar Fase
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-slate-500 text-xs font-bold">
                      <Lock className="w-3.5 h-3.5" />
                      Bloqueada
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
