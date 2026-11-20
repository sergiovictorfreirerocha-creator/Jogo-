import { ArrowLeft, CheckCircle2, Lock, Play } from 'lucide-react';
import { WORLDS } from '../data/worlds';
import { getLevelsByWorld } from '../data/levels';
import { SaveData, WorldId } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

interface WorldSelectModalProps {
  saveData: SaveData;
  selectedWorldId: WorldId;
  onSelectWorld: (worldId: WorldId) => void;
  onUnlockWorldWithCoins: (worldId: WorldId, cost: number) => void;
  onClose: () => void;
}

const WORLD_UNLOCK_COSTS: Record<WorldId, number> = {
  urban: 0,
  forest: 150,
  volcanic: 260,
  frozen: 380,
  cyberpunk: 520,
  desert: 680,
  space: 850,
  medieval: 1050,
};

export function WorldSelectModal({
  saveData,
  selectedWorldId,
  onSelectWorld,
  onUnlockWorldWithCoins,
  onClose,
}: WorldSelectModalProps) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 md:p-8 bg-slate-950/80">
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div>
            <h2 className="text-xl font-black text-white">SELECIONAR MUNDO</h2>
            <p className="text-xs text-slate-400">
              8 mundos únicos com arquiteturas, físicas e trilhas sonoras exclusivas
            </p>
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

        <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {WORLDS.map((w) => {
            const isUnlocked = saveData.unlockedWorlds.includes(w.id);
            const worldLevels = getLevelsByWorld(w.id);
            const completedCount = worldLevels.filter(
              (l) => saveData.levelRecords[l.id]?.completed
            ).length;
            const isSelected = w.id === selectedWorldId;
            const unlockCost = WORLD_UNLOCK_COSTS[w.id];

            return (
              <div
                key={w.id}
                className={`flex flex-col justify-between rounded-xl border p-4 transition-colors ${
                  isSelected
                    ? 'border-sky-400 bg-slate-800/95'
                    : isUnlocked
                      ? 'border-slate-700 bg-slate-800/60 hover:border-slate-500'
                      : 'border-slate-800 bg-slate-950/70 opacity-90'
                }`}
              >
                <div>
                  <div
                    className="h-20 rounded-lg mb-3 p-3 flex flex-col justify-between border border-white/10"
                    style={{
                      background: `linear-gradient(135deg, ${w.skyTop}, ${w.skyBottom})`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider bg-slate-950/75 text-white px-2 py-0.5 rounded">
                        Mundo {w.order}
                      </span>
                      {isUnlocked ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      ) : (
                        <Lock className="w-4 h-4 text-slate-200" />
                      )}
                    </div>
                    <div className="text-[11px] font-bold text-white drop-shadow">
                      {w.mechanicLabel}
                    </div>
                  </div>

                  <h3 className="text-base font-extrabold text-white">{w.name}</h3>
                  <p className="text-xs text-sky-300 font-medium mb-1.5">{w.subtitle}</p>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">{w.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-700/60">
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-2 tabular-nums">
                    <span>Fases concluídas</span>
                    <span className="font-bold">
                      {completedCount}/{worldLevels.length}
                    </span>
                  </div>

                  {isUnlocked ? (
                    <button
                      onClick={() => {
                        soundEngine.playMenuClick();
                        onSelectWorld(w.id);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Ver Fases
                    </button>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="text-[11px] text-amber-300/90 leading-tight">
                        {w.unlockRequirementText}
                      </div>
                      <button
                        disabled={saveData.coins < unlockCost}
                        onClick={() => onUnlockWorldWithCoins(w.id, unlockCost)}
                        className={`w-full py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                          saveData.coins >= unlockCost
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        Desbloquear ({unlockCost} moedas)
                      </button>
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
