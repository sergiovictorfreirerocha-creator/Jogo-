import { ArrowLeft, Gamepad2, Layers, Sparkles } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface CreditsModalProps {
  onClose: () => void;
}

export function CreditsModal({ onClose }: CreditsModalProps) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 md:p-8 bg-slate-950/80">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <h2 className="text-xl font-black text-white">CRÉDITOS</h2>
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

        <div className="p-6 space-y-5 text-sm text-slate-300">
          <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 space-y-2">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              PARKOUR WORLD 3D
            </h3>
            <p className="text-xs leading-relaxed text-slate-300">
              Jogo de plataforma e parkour 3D completo com motor físico próprio em Three.js,
              renderização PBR, iluminação dinâmica, áudio procedural via Web Audio API e
              salvamento automático em LocalStorage.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-4 space-y-1.5">
              <div className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
                <Layers className="w-4 h-4 text-emerald-400" />
                Conteúdo Completo
              </div>
              <ul className="text-xs text-slate-300 space-y-1">
                <li>• 8 Mundos 3D com mecânicas únicas</li>
                <li>• 40 Fases jogáveis (5 níveis de dificuldade)</li>
                <li>• 15 Skins de personagem em 3D</li>
                <li>• Checkpoints, moedas e caminhos secretos</li>
              </ul>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-4 space-y-1.5">
              <div className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
                <Gamepad2 className="w-4 h-4 text-amber-400" />
                Dicas de Movimento
              </div>
              <ul className="text-xs text-slate-300 space-y-1">
                <li>• Pressione ESPAÇO no ar para Pulo Duplo</li>
                <li>• Segure SHIFT para correr e alcançar saltos longos</li>
                <li>• Segure CTRL para passar sob lasers e vigas baixas</li>
                <li>• Arraste o mouse para girar a câmera livremente</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
