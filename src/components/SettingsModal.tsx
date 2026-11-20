import { useEffect, useState } from 'react';
import { ArrowLeft, Keyboard, RotateCcw, Volume2 } from 'lucide-react';
import { ActionKey, CameraDistanceMode, SaveData } from '../types/game';
import {
  ACTION_LABELS_PT,
  DEFAULT_KEY_BINDINGS,
  formatKeyCodePT,
} from '../storage/saveSystem';
import { soundEngine } from '../audio/soundEngine';

interface SettingsModalProps {
  saveData: SaveData;
  onUpdateSave: (updater: (prev: SaveData) => SaveData) => void;
  onClose: () => void;
}

const ACTION_ORDER: ActionKey[] = [
  'forward',
  'backward',
  'left',
  'right',
  'jump',
  'sprint',
  'crouch',
  'camera',
  'interact',
  'restart',
  'pause',
];

export function SettingsModal({ saveData, onUpdateSave, onClose }: SettingsModalProps) {
  const [listeningAction, setListeningAction] = useState<ActionKey | null>(null);

  useEffect(() => {
    if (!listeningAction) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const code = e.code;
      onUpdateSave((prev) => ({
        ...prev,
        keyBindings: {
          ...prev.keyBindings,
          [listeningAction]: code,
        },
      }));
      soundEngine.playMenuClick();
      setListeningAction(null);
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [listeningAction, onUpdateSave]);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 md:p-8 bg-slate-950/85">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div>
            <h2 className="text-xl font-black text-white">CONFIGURAÇÕES</h2>
            <p className="text-xs text-slate-400">
              Áudio, gráficos, câmera e personalização completa dos controles do teclado
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

        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Audio & Graphics */}
          <div className="space-y-5">
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-sky-400" />
                Áudio e Câmera
              </h3>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1 tabular-nums">
                  <span>Volume da Música</span>
                  <span>{Math.round(saveData.settings.musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={saveData.settings.musicVolume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateSave((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, musicVolume: val },
                    }));
                  }}
                  className="w-full accent-sky-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1 tabular-nums">
                  <span>Volume dos Efeitos Sonoros</span>
                  <span>{Math.round(saveData.settings.sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={saveData.settings.sfxVolume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateSave((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, sfxVolume: val },
                    }));
                  }}
                  className="w-full accent-sky-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1 tabular-nums">
                  <span>Sensibilidade da Câmera</span>
                  <span>{saveData.settings.cameraSensitivity.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min={0.4}
                  max={2.2}
                  step={0.1}
                  value={saveData.settings.cameraSensitivity}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateSave((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, cameraSensitivity: val },
                    }));
                  }}
                  className="w-full accent-sky-400"
                />
              </div>

              <div>
                <div className="text-xs text-slate-300 mb-2">Distância Padrão da Câmera</div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['close', 'Próxima'],
                      ['medium', 'Média'],
                      ['far', 'Distante'],
                    ] as Array<[CameraDistanceMode, string]>
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      onClick={() =>
                        onUpdateSave((prev) => ({
                          ...prev,
                          settings: { ...prev.settings, cameraDistance: mode },
                        }))
                      }
                      className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        saveData.settings.cameraDistance === mode
                          ? 'bg-sky-500 text-slate-950'
                          : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-200">Sombras Dinâmicas 3D</span>
                <button
                  onClick={() =>
                    onUpdateSave((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, shadowsEnabled: !prev.settings.shadowsEnabled },
                    }))
                  }
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    saveData.settings.shadowsEnabled
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {saveData.settings.shadowsEnabled ? 'Ativado' : 'Desativado'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-200">Partículas Ambientais</span>
                <button
                  onClick={() =>
                    onUpdateSave((prev) => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        particlesEnabled: !prev.settings.particlesEnabled,
                      },
                    }))
                  }
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    saveData.settings.particlesEnabled
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {saveData.settings.particlesEnabled ? 'Ativado' : 'Desativado'}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Keyboard Remapping */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-amber-400" />
                Controles do Teclado
              </h3>
              <button
                onClick={() => {
                  soundEngine.playMenuClick();
                  onUpdateSave((prev) => ({
                    ...prev,
                    keyBindings: { ...DEFAULT_KEY_BINDINGS },
                  }));
                }}
                className="flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200 font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restaurar Padrão
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Clique em qualquer tecla para reconfigurá-la.
            </p>

            <div className="space-y-1.5">
              {ACTION_ORDER.map((action) => {
                const isListening = listeningAction === action;
                return (
                  <div
                    key={action}
                    className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-900/70 border border-slate-800"
                  >
                    <span className="text-xs font-medium text-slate-200">
                      {ACTION_LABELS_PT[action]}
                    </span>
                    <button
                      onClick={() => setListeningAction(action)}
                      className={`min-w-[110px] px-3 py-1 rounded-md text-xs font-black tracking-wide cursor-pointer ${
                        isListening
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700'
                      }`}
                    >
                      {isListening
                        ? 'Pressione tecla...'
                        : formatKeyCodePT(saveData.keyBindings[action])}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
