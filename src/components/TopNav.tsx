import React, { useState } from 'react';
import { Combat, UserAccount } from '../types/rpg';
import { SyncStatus, onlineSyncService } from '../utils/onlineSync';
import { Swords, Settings, Plus, Download, Upload, Users, LogIn, LogOut, ShieldCheck, UserCheck, Radio, Copy, Check, EyeOff, Eye, Activity, Map, Columns, FileText } from 'lucide-react';

export type ViewMode = 'sheets' | 'tactical' | 'split';

interface TopNavProps {
  combats: Combat[];
  activeCombatId: string;
  onSelectCombat: (id: string) => void;
  onNewCombat: () => void;
  onExport: () => void;
  onImport: () => void;
  currentUser: UserAccount | null;
  onOpenUserAccounts: () => void;
  onSwitchUser: () => void;
  syncStatus: SyncStatus;
  currentRoom: string;
  onOpenOnlineRoomModal: () => void;
  onOpenSystemLog: () => void;
  systemLogsCount: number;
  activeViewMode: ViewMode;
  onSelectViewMode: (mode: ViewMode) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  combats,
  activeCombatId,
  onSelectCombat,
  onNewCombat,
  onExport,
  onImport,
  currentUser,
  onOpenUserAccounts,
  onSwitchUser,
  syncStatus,
  currentRoom,
  onOpenOnlineRoomModal,
  onOpenSystemLog,
  systemLogsCount,
  activeViewMode,
  onSelectViewMode,
}) => {
  const [copied, setCopied] = useState(false);
  const [combatMenuOpen, setCombatMenuOpen] = useState(false);

  const handleQuickCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = onlineSyncService.getShareableLink();
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800/80 px-3 lg:px-5 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Zone 1: Brand title & Combat selector */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Swords size={16} />
            </div>
            <span className="text-sm font-bold tracking-tight text-white whitespace-nowrap hidden sm:inline">
              GURPS Combat Master
            </span>
            <span className="text-sm font-bold tracking-tight text-white whitespace-nowrap sm:hidden">
              GURPS
            </span>
          </div>

          {/* Combat selector / Display com Roldana de Configuração */}
          <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 shadow-inner ml-1">
            <span className="text-[11px] text-slate-400 pl-1.5 pr-0.5 font-medium whitespace-nowrap hidden md:inline">
              Combate:
            </span>

            {currentUser?.role === 'mestre' ? (
              <>
                <select
                  value={activeCombatId}
                  onChange={(e) => onSelectCombat(e.target.value)}
                  className="bg-transparent text-[11px] font-semibold text-amber-300 py-1 px-1.5 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[130px] sm:max-w-[180px] truncate"
                >
                  {combats.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                      {c.name} ({c.npcs.length} NPCs)
                    </option>
                  ))}
                </select>

                {/* Roldana de Configuração do Combate & Ações de Campanha */}
                <button
                  onClick={() => setCombatMenuOpen(!combatMenuOpen)}
                  title="Configurações de Combates, Exportar e Importar"
                  className={`p-1 rounded transition-colors ${
                    combatMenuOpen
                      ? 'text-amber-400 bg-slate-800'
                      : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                  }`}
                >
                  <Settings size={13} className={combatMenuOpen ? 'rotate-45 transition-transform' : 'transition-transform'} />
                </button>

                {/* Dropdown Menu com Novo Combate, Exportar e Importar */}
                {combatMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setCombatMenuOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-1.5 w-56 bg-slate-900 border border-slate-750 rounded-xl shadow-2xl p-1.5 z-50 text-xs space-y-1">
                      <button
                        onClick={() => {
                          setCombatMenuOpen(false);
                          onNewCombat();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-amber-300 transition-colors text-left font-medium"
                      >
                        <Plus size={14} className="text-amber-400" />
                        <span>Novo / Gerenciar Combates</span>
                      </button>

                      <button
                        onClick={() => {
                          setCombatMenuOpen(false);
                          const emptyCombat = combats.find((c) => c.id === 'combat-vazio' || c.name.toLowerCase().includes('vazio'));
                          if (emptyCombat) {
                            onSelectCombat(emptyCombat.id);
                          } else {
                            onNewCombat();
                          }
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-amber-300 transition-colors text-left font-medium"
                      >
                        <EyeOff size={14} className="text-amber-400" />
                        <span>Combate Vazio (Ocultar Tela)</span>
                      </button>

                      <div className="h-px bg-slate-800 my-1" />

                      <button
                        onClick={() => {
                          setCombatMenuOpen(false);
                          onOpenUserAccounts();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-amber-300 transition-colors text-left font-medium"
                      >
                        <Users size={14} className="text-amber-400" />
                        <span>Controle de Usuários</span>
                      </button>

                      <div className="h-px bg-slate-800 my-1" />

                      <button
                        onClick={() => {
                          setCombatMenuOpen(false);
                          onExport();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-amber-300 transition-colors text-left"
                      >
                        <Download size={14} className="text-amber-400" />
                        <span>Exportar Campanha (JSON)</span>
                      </button>

                      <button
                        onClick={() => {
                          setCombatMenuOpen(false);
                          onImport();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-amber-300 transition-colors text-left"
                      >
                        <Upload size={14} className="text-amber-400" />
                        <span>Importar Campanha (JSON)</span>
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex items-center px-1.5 py-1 text-[11px] font-bold text-amber-300 max-w-[140px] sm:max-w-[190px] truncate">
                <span className="truncate">
                  {combats.find((c) => c.id === activeCombatId)?.name || 'Combate Ativo'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Zone 1.5: Modo de Visualização (Ficha & Log / Mesa Tática / Dividida) */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 shadow-inner">
          <button
            onClick={() => onSelectViewMode('sheets')}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              activeViewMode === 'sheets'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Visualização em Fichas, Lista de NPCs e Log de Combate"
          >
            <FileText size={13} />
            <span className="hidden sm:inline">Fichas & Log</span>
          </button>

          <button
            onClick={() => onSelectViewMode('tactical')}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              activeViewMode === 'tactical'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
            }`}
            title="Mesa Tática Interativa (Grid Hexagonal GURPS, Tokens e Medição)"
          >
            <Map size={13} className={activeViewMode === 'tactical' ? 'text-slate-950' : 'text-amber-400'} />
            <span className="font-bold">Mesa Tática</span>
          </button>

          <button
            onClick={() => onSelectViewMode('split')}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              activeViewMode === 'split'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Visão Dividida: Mesa Tática e Ficha lado a lado"
          >
            <Columns size={13} />
            <span className="hidden md:inline">Dividida</span>
          </button>
        </div>

        {/* Zone 2: Real-time Online Sync Indicator + Usuário Logado e Sair à direita */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Botão de Log do Sistema / Debug de Sincronização */}
          <button
            onClick={onOpenSystemLog}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-lg text-slate-300 hover:text-white transition-all shadow-sm"
            title="Abrir Log do Sistema / Debug de Interface e Sincronização"
          >
            <Activity size={13} className="text-amber-400" />
            <span className="text-[11px] font-semibold hidden md:inline">Log</span>
            {systemLogsCount > 0 && (
              <span className="font-mono text-[10px] text-amber-300 font-bold bg-amber-500/10 px-1 rounded border border-amber-500/30">
                {systemLogsCount}
              </span>
            )}
          </button>

          {/* Online Room Sync Status Pill */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 shadow-sm">
            <button
              onClick={onOpenOnlineRoomModal}
              className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-all ${
                syncStatus === 'connected'
                  ? 'bg-emerald-950/70 text-emerald-300 hover:bg-emerald-900'
                  : syncStatus === 'connecting'
                  ? 'bg-yellow-950/70 text-yellow-300 hover:bg-yellow-900'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
              title="Sincronização Online. Clique para abrir detalhes."
            >
              <Radio size={12} className={syncStatus === 'connected' ? 'text-emerald-400' : 'text-yellow-400'} />
              <span className="font-mono text-[10px] text-amber-300 font-bold">
                {currentRoom}
              </span>
            </button>

            <button
              onClick={handleQuickCopyLink}
              title="Copiar link da sala"
              className={`flex items-center gap-1 px-1.5 py-1 text-[10px] font-semibold rounded-md transition-colors ml-0.5 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800'
              }`}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              <span className="hidden xl:inline">{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>

          {/* Usuário Logado e Botão Sair agrupados juntos no final da linha à direita */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-0.5 shadow-sm">
              <div className="flex items-center gap-1.5 px-2 py-1 text-xs">
                {currentUser.role === 'mestre' ? (
                  <ShieldCheck size={14} className="text-amber-400 shrink-0" />
                ) : currentUser.role === 'visualizador' ? (
                  <Eye size={14} className="text-cyan-400 shrink-0" />
                ) : (
                  <UserCheck size={14} className="text-blue-400 shrink-0" />
                )}
                <span className="font-bold text-white max-w-[110px] truncate">{currentUser.name}</span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                    currentUser.role === 'mestre'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : currentUser.role === 'visualizador'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      : 'bg-blue-950 text-blue-300 border border-blue-800'
                  }`}
                >
                  {currentUser.role}
                </span>
              </div>

              {/* Botão Sair / Trocar Usuário ao lado */}
              <button
                onClick={onSwitchUser}
                title="Trocar usuário ou sair"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={onSwitchUser}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              <LogIn size={13} />
              <span>Entrar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
