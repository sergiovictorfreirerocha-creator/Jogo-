import { ArrowLeft, Award, Coins, Star, Timer, Trophy } from 'lucide-react';
import { LEVELS, getLevelsByWorld } from '../data/levels';
import { WORLDS } from '../data/worlds';
import { SaveData } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

interface RecordsModalProps {
  saveData: SaveData;
  onClose: () => void;
}

export function RecordsModal({ saveData, onClose }: RecordsModalProps) {
  const completedLevels = Object.values(saveData.levelRecords).filter((r) => r.completed).length;
  const totalStars = Object.values(saveData.levelRecords).reduce((acc, r) => acc + (r.stars || 0), 0);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 md:p-8 bg-slate-950/80">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div>
            <h2 className="text-xl font-black text-white">RECORDES E ESTATÍSTICAS</h2>
            <p className="text-xs text-slate-400">Seu desempenho geral em todos os 8 mundos</p>
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

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-800/75 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Trophy className="w-4 h-4 text-emerald-400" />
                Fases Concluídas
              </div>
              <div className="text-2xl font-black text-white mt-1 tabular-nums">
                {completedLevels}/{LEVELS.length}
              </div>
            </div>
            <div className="bg-slate-800/75 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Star className="w-4 h-4 text-amber-400" />
                Estrelas Totais
              </div>
              <div className="text-2xl font-black text-amber-300 mt-1 tabular-nums">
                {totalStars}/{LEVELS.length * 3}
              </div>
            </div>
            <div className="bg-slate-800/75 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Coins className="w-4 h-4 text-amber-400" />
                Moedas Coletadas
              </div>
              <div className="text-2xl font-black text-white mt-1 tabular-nums">
                {saveData.stats.totalCoinsCollected}
              </div>
            </div>
            <div className="bg-slate-800/75 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Award className="w-4 h-4 text-sky-400" />
                Total de Pulos
              </div>
              <div className="text-2xl font-black text-white mt-1 tabular-nums">
                {saveData.stats.totalJumps}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {WORLDS.map((w) => {
              const levels = getLevelsByWorld(w.id);
              return (
                <div key={w.id} className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-4">
                  <h3 className="text-sm font-black text-white mb-3">
                    Mundo {w.order}: {w.name}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    {levels.map((l) => {
                      const rec = saveData.levelRecords[l.id];
                      return (
                        <div
                          key={l.id}
                          className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs space-y-1"
                        >
                          <div className="font-bold text-slate-200 truncate">
                            {l.levelNumber}. {l.name}
                          </div>
                          <div className="flex items-center gap-1 text-sky-300 tabular-nums">
                            <Timer className="w-3 h-3" />
                            {rec?.bestTime ? `${rec.bestTime.toFixed(1)}s` : '--'}
                          </div>
                          <div className="flex items-center justify-between text-slate-400 tabular-nums">
                            <span>
                              {rec?.bestCoins ?? 0}/{l.coins.length} moedas
                            </span>
                            <span className="text-amber-400 font-bold">
                              {'★'.repeat(rec?.stars ?? 0)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
