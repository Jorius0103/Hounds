import React, { useState } from 'react';
import { UserAccount, UserRole } from '../types/rpg';
import { Users, Plus, KeyRound, Trash2, X, Check, ShieldCheck, UserCheck, Eye } from 'lucide-react';

interface UserAccountsCrudModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  currentUser: UserAccount;
  onCreateUser: (name: string, role: UserRole, initialPassword: string) => void;
  onResetUserPassword: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
}

export const UserAccountsCrudModal: React.FC<UserAccountsCrudModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onCreateUser,
  onResetUserPassword,
  onDeleteUser,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('jogador');
  const [password, setPassword] = useState('123');

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateUser(name.trim(), role, password.trim() || '123');
    setName('');
    setPassword('123');
    setRole('jogador');
    setIsCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-750 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-amber-400" />
            <h3 className="text-base font-bold text-white">
              Controle de Acesso: Mestres e Jogadores (CRUD)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Gerencie quem pode acessar o sistema como Mestre ou como Jogador assistente.
          </p>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors whitespace-nowrap"
          >
            <Plus size={14} />
            <span>{isCreating ? 'Fechar Cadastro' : 'Novo Usuário'}</span>
          </button>
        </div>

        {isCreating && (
          <form onSubmit={handleCreate} className="bg-slate-950/80 border border-amber-500/40 rounded-xl p-3.5 space-y-3">
            <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Cadastrar Novo Usuário
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Nome / Login</label>
                <input
                  type="text"
                  placeholder="Nome do usuário"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Tipo de Acesso</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="jogador">Jogador (Vê só NPCs liberados)</option>
                  <option value="mestre">Mestre (Acesso total)</option>
                  <option value="visualizador">Visualizador (Somente visualização, não altera nada)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Senha Inicial</label>
                <input
                  type="text"
                  placeholder="Senha inicial"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-1 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg"
              >
                <Check size={14} />
                <span>Salvar Usuário</span>
              </button>
            </div>
          </form>
        )}

        {/* Users list */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Usuários Cadastrados ({users.length})
          </div>

          {users.map((u) => {
            const isSelf = u.id === currentUser.id;

            return (
              <div
                key={u.id}
                className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      u.role === 'mestre'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : u.role === 'visualizador'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    }`}
                  >
                    {u.role === 'mestre' ? (
                      <ShieldCheck size={16} />
                    ) : u.role === 'visualizador' ? (
                      <Eye size={16} />
                    ) : (
                      <UserCheck size={16} />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{u.name}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          u.role === 'mestre'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : u.role === 'visualizador'
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                            : 'bg-blue-950 text-blue-300 border border-blue-800'
                        }`}
                      >
                        {u.role}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] text-slate-400 italic">
                          (Você)
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      {u.needsPasswordReset ? (
                        <span className="text-amber-400 font-semibold">
                          ⚠️ Senha reiniciada (terá que cadastrar nova senha no login)
                        </span>
                      ) : (
                        <span>Senha ativa gravada</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (confirm(`Reiniciar senha de ${u.name}? Ao logar, este usuário terá que cadastrar uma nova senha.`)) {
                        onResetUserPassword(u.id);
                      }
                    }}
                    title="Reiniciar a senha deste usuário"
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg transition-colors"
                  >
                    <KeyRound size={13} />
                    <span>Reiniciar Senha</span>
                  </button>

                  {!isSelf && users.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`Excluir permanentemente o usuário ${u.name}?`)) {
                          onDeleteUser(u.id);
                        }
                      }}
                      title="Excluir usuário"
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
