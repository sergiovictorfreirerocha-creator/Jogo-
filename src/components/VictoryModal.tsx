import { ArrowRight, Coins, Home, RotateCcw, Star, Timer, Trophy } from 'lucide-react';
import { LevelCompletionResult } from '../types/game';
import { getWorldById } from '../data/worlds';
import { soundEngine } from '../audio/soundEngine';

interface VictoryModalProps {
  result: LevelCompletionResult;
  hasNextLevel: boolean;
  onNextLevel: () => void;
  onReplay: () => void;
  onMainMenu: () => void;
}

export function VictoryModal({
  result,
  hasNextLevel,
  onNextLevel,
  onReplay,
  onMainMenu,
}: VictoryModalProps) {
  const rb = result.rewardBreakdown;
  const unlockedWorld = result.unlockedNextWorldId ? getWorldById(result.unlockedNextWorldId) : null;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-slate-950/82">
      <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-2xl p-6 space-y-5 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
            <Trophy className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-white">FASE CONCLUÍDA!</h2>
          <p className="text-xs text-slate-400">
            Fase {result.levelNumber}: {result.levelName} ({result.difficulty})
          </p>

          <div className="flex items-center justify-center gap-2 pt-1">
            {[1, 2, 3].map((s) => (
              <Star
                key={s}
                className={`w-7 h-7 ${
                  result.stars >= s ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-slate-800/75 border border-slate-700 rounded-xl p-3">
            <div className="flex items-center justify-center gap-1 text-xs text-slate-400">
              <Timer className="w-3.5 h-3.5 text-sky-400" />
              Tempo
            </div>
            <div className="text-lg font-black text-white mt-0.5 tabular-nums">
              {result.timeSeconds.toFixed(1)}s
            </div>
            {result.isNewBestTime && (
              <div className="text-[10px] font-bold text-emerald-400">NOVO RECORDE!</div>
            )}
          </div>

          <div className="bg-slate-800/75 border border-slate-700 rounded-xl p-3">
            <div className="flex items-center justify-center gap-1 text-xs text-slate-400">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              Moedas na Fase
            </div>
            <div className="text-lg font-black text-white mt-0.5 tabular-nums">
              {result.coinsCollected}/{result.totalLevelCoins}
            </div>
            <div className="text-[10px] text-slate-400">Quedas: {result.fallsCount}</div>
          </div>
        </div>

        {/* Reward Breakdown */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-1.5 text-xs tabular-nums">
          <div className="flex justify-between text-slate-300">
            <span>Recompensa da Fase</span>
            <span>+{rb.base}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Moedas Coletadas</span>
            <span>+{rb.coinsValue}</span>
          </div>
          {rb.timeBonus > 0 && (
            <div className="flex justify-between text-sky-300">
              <span>Bônus de Tempo (Meta: {result.parTime}s)</span>
              <span>+{rb.timeBonus}</span>
            </div>
          )}
          {rb.difficultyBonus > 0 && (
            <div className="flex justify-between text-orange-300">
              <span>Bônus de Dificuldade</span>
              <span>+{rb.difficultyBonus}</span>
            </div>
          )}
          {rb.challengeBonus > 0 && (
            <div className="flex justify-between text-emerald-300">
              <span>Desafio Sem Quedas</span>
              <span>+{rb.challengeBonus}</span>
            </div>
          )}
          {rb.firstClearBonus > 0 && (
            <div className="flex justify-between text-violet-300">
              <span>Primeira Conclusão</span>
              <span>+{rb.firstClearBonus}</span>
            </div>
          )}
          <div className="pt-2 mt-1 border-t border-slate-800 flex justify-between text-sm font-black text-amber-300">
            <span>Total Recebido</span>
            <span>+{rb.totalEarned} moedas</span>
          </div>
        </div>

        {unlockedWorld && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs font-bold text-center">
            Novo Mundo Desbloqueado: Mundo {unlockedWorld.order} — {unlockedWorld.name}!
          </div>
        )}

        <div className="flex flex-col gap-2">
          {hasNextLevel && (
            <button
              onClick={() => {
                soundEngine.playMenuClick();
                onNextLevel();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm cursor-pointer"
            >
              Próxima Fase
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                soundEngine.playMenuClick();
                onReplay();
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs border border-slate-700 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Jogar Novamente
            </button>
            <button
              onClick={() => {
                soundEngine.playMenuClick();
                onMainMenu();
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs border border-slate-700 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              Menu Principal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
