import { useState } from 'react';
import { ArrowLeft, Check, Coins, Lock, ShoppingBag, Sparkles } from 'lucide-react';
import { getSkinById, SKINS } from '../data/skins';
import { SaveData, SkinDef } from '../types/game';
import { SkinPreview3D } from './SkinPreview3D';
import { soundEngine } from '../audio/soundEngine';

interface SkinShopModalProps {
  mode: 'shop' | 'customize';
  saveData: SaveData;
  onBuySkin: (skin: SkinDef) => void;
  onEquipSkin: (skinId: string) => void;
  onClose: () => void;
}

const RARITY_BADGE: Record<SkinDef['rarity'], string> = {
  Comum: 'bg-slate-700 text-slate-200',
  Raro: 'bg-sky-500/20 text-sky-300 border border-sky-500/40',
  Épico: 'bg-violet-500/20 text-violet-300 border border-violet-500/40',
  Lendário: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
};

export function SkinShopModal({
  mode,
  saveData,
  onBuySkin,
  onEquipSkin,
  onClose,
}: SkinShopModalProps) {
  const [selectedId, setSelectedId] = useState<string>(saveData.equippedSkin);
  const [confirmSkin, setConfirmSkin] = useState<SkinDef | null>(null);

  const visibleSkins =
    mode === 'customize'
      ? SKINS.filter((s) => saveData.purchasedSkins.includes(s.id) || s.price === 0)
      : SKINS;

  const selectedSkin = getSkinById(selectedId);
  const isOwned =
    saveData.purchasedSkins.includes(selectedSkin.id) || selectedSkin.price === 0;
  const isEquipped = saveData.equippedSkin === selectedSkin.id;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 md:p-8 bg-slate-950/80">
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div>
            <h2 className="text-xl font-black text-white">
              {mode === 'shop' ? 'LOJA DE SKINS' : 'PERSONALIZAR PERSONAGEM'}
            </h2>
            <p className="text-xs text-slate-400">
              {mode === 'shop'
                ? '15 skins únicas em 3D. Arraste a prévia para inspecionar todos os detalhes!'
                : 'Escolha e equipe qualquer uma das suas skins desbloqueadas.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 border border-amber-500/40">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-black text-amber-300 tabular-nums">{saveData.coins}</span>
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
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Live 3D Skin Preview */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <SkinPreview3D skinId={selectedSkin.id} height={310} />

            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-black text-white">{selectedSkin.name}</h3>
                  <span className={`inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded ${RARITY_BADGE[selectedSkin.rarity]}`}>
                    {selectedSkin.rarity}
                  </span>
                </div>
                <div className="text-right">
                  {selectedSkin.price === 0 ? (
                    <span className="text-xs font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-lg">
                      GRÁTIS
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-sm font-black text-amber-300 tabular-nums">
                      <Coins className="w-4 h-4" />
                      {selectedSkin.price}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{selectedSkin.description}</p>

              <div className="pt-2">
                {isEquipped ? (
                  <div className="flex gap-2">
                    <div className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4" />
                      Equipada
                    </div>
                    {selectedSkin.id !== 'urban_runner' && (
                      <button
                        onClick={() => {
                          soundEngine.playMenuClick();
                          onEquipSkin('urban_runner');
                        }}
                        className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold cursor-pointer"
                      >
                        Desequipar
                      </button>
                    )}
                  </div>
                ) : isOwned ? (
                  <button
                    onClick={() => {
                      soundEngine.playMenuClick();
                      onEquipSkin(selectedSkin.id);
                    }}
                    className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    Equipar Skin
                  </button>
                ) : (
                  <button
                    disabled={saveData.coins < selectedSkin.price}
                    onClick={() => {
                      soundEngine.playMenuClick();
                      setConfirmSkin(selectedSkin);
                    }}
                    className={`w-full py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer ${
                      saveData.coins >= selectedSkin.price
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {saveData.coins >= selectedSkin.price
                      ? `Comprar por ${selectedSkin.price} Moedas`
                      : `Faltam ${selectedSkin.price - saveData.coins} Moedas`}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right: Skins Grid */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
            {visibleSkins.map((s) => {
              const owned = saveData.purchasedSkins.includes(s.id) || s.price === 0;
              const equipped = saveData.equippedSkin === s.id;
              const selected = selectedId === s.id;

              return (
                <button
                  key={s.id}
                  onClick={() => {
                    soundEngine.playMenuClick();
                    setSelectedId(s.id);
                  }}
                  className={`text-left p-3 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between gap-2 ${
                    selected
                      ? 'border-sky-400 bg-slate-800'
                      : 'border-slate-700/80 bg-slate-800/50 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-4 h-4 rounded-full border border-white/30 inline-block"
                        style={{ backgroundColor: `#${s.primaryColor.toString(16).padStart(6, '0')}` }}
                      />
                      <span
                        className="w-3 h-3 rounded-full border border-white/20 inline-block"
                        style={{ backgroundColor: `#${s.accentColor.toString(16).padStart(6, '0')}` }}
                      />
                    </div>
                    {equipped ? (
                      <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                        EM USO
                      </span>
                    ) : owned ? (
                      <span className="text-[10px] font-bold bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                        SUA
                      </span>
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-extrabold text-white leading-tight">{s.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                      {owned ? s.rarity : `${s.price} moedas`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Purchase Confirmation Dialog */}
      {confirmSkin && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/85">
          <div className="w-full max-w-sm bg-slate-900 border border-amber-500/50 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-white">Confirmar Compra</h3>
            <p className="text-sm text-slate-300">
              Deseja desbloquear a skin <strong className="text-white">{confirmSkin.name}</strong> por{' '}
              <strong className="text-amber-300">{confirmSkin.price} moedas</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmSkin(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onBuySkin(confirmSkin);
                  setConfirmSkin(null);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-black cursor-pointer"
              >
                Confirmar Compra
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
