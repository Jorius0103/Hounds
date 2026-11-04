import React, { useState } from 'react';
import { useHub } from '../data';
import { Icon } from '../ui/Icon';
import { Swords, Map, Plus, Play, Sparkles, Shield, User, Info, CheckCircle2 } from 'lucide-react';

export function TabuleiroPage() {
  const { W } = useHub();
  const isMaster = isMestre();

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Swords size={22} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Tabuleiro de Combate</h1>
              <p className="text-xs text-slate-400">
                Oficina de preparação de mapas táticos, posicionamento de tokens e cenários.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="#mesa"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/10"
          >
            <Play size={15} />
            <span>Ir para a Mesa de RPG</span>
          </a>
        </div>
      </div>

      {/* Card Informativo com o Novo Fluxo */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 mt-0.5">
            <Info size={18} />
          </div>
          <div className="space-y-1 text-xs text-slate-300 leading-relaxed">
            <h2 className="text-sm font-semibold text-white">Como funciona a integração com a Mesa de RPG</h2>
            <p>
              Os jogadores <strong>permanecem na Mesa de RPG</strong> durante as sessões para acompanhar suas fichas, magias e rolagens.
            </p>
            <p>
              Quando o Mestre habilitar o combate, o <strong>Tabuleiro Tático</strong> é exibido diretamente no centro da Mesa de RPG,
              mantendo a barra superior para navegação e o <strong>Log de Combate à direita</strong> em tempo real.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800/60">
          <div className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
              <CheckCircle2 size={16} />
              <span>Tokens Automáticos</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Personagens e NPCs cadastrados no combate da Mesa já aparecem prontos para entrar no grid.
            </p>
          </div>

          <div className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <CheckCircle2 size={16} />
              <span>Sincronia de Vida (PV/FP)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Qualquer dano ou fadiga alterado no log ou na ficha reflete instantaneamente sobre a barra do token.
            </p>
          </div>

          <div className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
              <CheckCircle2 size={16} />
              <span>Consulta Roll20 Preservada</span>
            </div>
            <p className="text-[11px] text-slate-400">
              A aba <em>Tabuleiro (Roll20)</em> fica acessível no menu para consulta de fórmulas e lógicas geométricas.
            </p>
          </div>
        </div>
      </div>

      {/* Lista / Pré-visualização de Tabuleiros */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Tabuleiros & Mapas de Batalha</h3>
            <p className="text-xs text-slate-400">Gerencie cenários de combate salvos ou crie um novo para a sessão.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.hash = 'mesa';
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Plus size={14} />
            <span>Configurar na Mesa</span>
          </button>
        </div>

        <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
          <Map size={32} className="mx-auto text-slate-600 mb-2" />
          <p className="text-xs font-semibold text-slate-300">Novo sistema de Tabuleiro em inicialização</p>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1">
            Você pode alternar para a visualização tática diretamente na <strong>Mesa de RPG</strong> através do botão de mapa no topo da tela.
          </p>
        </div>
      </div>
    </div>
  );
}
