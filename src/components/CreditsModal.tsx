import { ArrowLeft, Calendar, User } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface CreditsModalProps {
  onClose: () => void;
}

export function CreditsModal({ onClose }: CreditsModalProps) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 md:p-8 bg-slate-950/80">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <h2 className="text-xl font-black tracking-wide text-white">CRÉDITOS</h2>
          <button
            onClick={() => {
              soundEngine.playMenuClick();
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>

        <div className="p-7 sm:p-8 flex flex-col items-center text-center space-y-6">
          {/* Game Identity */}
          <div className="flex flex-col items-center space-y-3">
            <svg width="56" height="56" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="hdpCreditsLogoGrad" x1="0" y1="0" x2="48" y2="48">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="60%" stopColor="#0ea5e9" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
              <rect
                x="3"
                y="3"
                width="42"
                height="42"
                rx="12"
                fill="#0f172a"
                stroke="url(#hdpCreditsLogoGrad)"
                strokeWidth="2.5"
              />
              <path
                d="M12 33L20 15L27 24L36 12"
                stroke="#38bdf8"
                strokeWidth="3.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="36" cy="12" r="3.5" fill="#fbbf24" />
              <path d="M11 36H37" stroke="#f59e0b" strokeWidth="2.6" strokeLinecap="round" />
            </svg>

            <div className="space-y-1.5">
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-none">
                HORA DO <span className="text-sky-400">PARKOUR</span>
              </h3>
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/50 text-[10px] font-black tracking-widest text-amber-300">
                  BETA
                </span>
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

          {/* Creator & Release Date */}
          <div className="w-full space-y-3.5">
            <div className="bg-slate-950/75 border border-slate-800 rounded-xl px-5 py-4 flex flex-col items-center gap-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-sky-400">
                <User className="w-3.5 h-3.5" />
                Criado por:
              </span>
              <span className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Sérgio Victor Freire Rocha
              </span>
            </div>

            <div className="bg-slate-950/75 border border-slate-800 rounded-xl px-5 py-3.5 flex flex-col items-center gap-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-400">
                <Calendar className="w-3.5 h-3.5" />
                Data de lançamento:
              </span>
              <span className="text-sm sm:text-base font-bold text-slate-100 tabular-nums">
                20/11/2026
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
