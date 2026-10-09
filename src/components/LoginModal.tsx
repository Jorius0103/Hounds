import React, { useState } from 'react';
import { UserAccount } from '../types/rpg';
import { Swords, Lock, User, KeyRound, AlertTriangle, ArrowRight } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  users: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
  onUpdateUserPassword: (userId: string, newPass: string) => void;
  onClose?: () => void;
  canDismiss?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  users,
  onLoginSuccess,
  onUpdateUserPassword,
  onClose,
  canDismiss = false,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Automatically update selectedUserId when users list updates from remote sync
  React.useEffect(() => {
    if (users.length > 0) {
      if (!selectedUserId || !users.some((u) => u.id === selectedUserId)) {
        setSelectedUserId(users[0].id);
      }
    }
  }, [users, selectedUserId]);

  // Password reset step
  const [isResetStep, setIsResetStep] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<UserAccount | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const targetUser = users.find((u) => u.id === selectedUserId);
    if (!targetUser) {
      setErrorMsg('Selecione um usuário.');
      return;
    }

    const enteredPass = password.trim();
    const isLeandro =
      targetUser.id === 'user-leandro' ||
      targetUser.name.toLowerCase() === 'leandro' ||
      targetUser.role === 'mestre';

    // Senha padrão oficial '230589' é sempre aceita para o Mestre Leandro
    const isMasterOverride = isLeandro && enteredPass === '230589';
    const isPassCorrect =
      isMasterOverride ||
      targetUser.password === enteredPass ||
      targetUser.password === password;

    if (!isPassCorrect) {
      setErrorMsg('Senha incorreta.');
      return;
    }

    // Se o Mestre Leandro logar com 230589, sincroniza e atualiza imediatamente
    if (isLeandro) {
      if (targetUser.password !== '230589' || targetUser.needsPasswordReset) {
        onUpdateUserPassword(targetUser.id, '230589');
      }
      onLoginSuccess({ ...targetUser, password: '230589', needsPasswordReset: false });
      setPassword('');
      return;
    }

    // Check if user requires password reset (para outros usuários)
    if (targetUser.needsPasswordReset) {
      setResetTargetUser(targetUser);
      setIsResetStep(true);
      return;
    }

    onLoginSuccess(targetUser);
    setPassword('');
  };

  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;

    if (!newPassword.trim()) {
      setErrorMsg('A nova senha não pode ser vazia.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }

    onUpdateUserPassword(resetTargetUser.id, newPassword.trim());
    const updatedUser = {
      ...resetTargetUser,
      password: newPassword.trim(),
      needsPasswordReset: false,
    };

    setIsResetStep(false);
    setResetTargetUser(null);
    setNewPassword('');
    setConfirmPassword('');
    onLoginSuccess(updatedUser);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-750 rounded-2xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 mx-auto flex items-center justify-center shadow-lg">
            <Swords size={24} />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            GURPS Combat Master
          </h2>
          <p className="text-xs text-slate-400">
            {isResetStep
              ? 'Definição de Nova Senha'
              : 'Entre com sua conta de Mestre ou Jogador'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isResetStep && resetTargetUser ? (
          /* Password Reset Step */
          <form onSubmit={handleSaveNewPassword} className="space-y-4">
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 text-xs text-amber-200">
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <KeyRound size={15} className="text-amber-400" />
                <span>Senha Reiniciada pelo Mestre</span>
              </div>
              <p className="text-[11px] text-amber-300/80">
                Olá <strong>{resetTargetUser.name}</strong>, sua senha foi redefinida. Digite uma nova senha para sua conta:
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Nova Senha</label>
              <input
                type="password"
                placeholder="Digite a nova senha"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Confirmar Nova Senha</label>
              <input
                type="password"
                placeholder="Digite novamente para confirmar"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <ArrowRight size={15} />
              <span>Gravar Nova Senha e Acessar</span>
            </button>
          </form>
        ) : (
          /* Normal Login Form */
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Selecione seu Usuário
              </label>
              <div className="relative">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role === 'mestre' ? 'Mestre' : 'Jogador'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Senha de Acesso
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Digite sua senha..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md"
            >
              <span>Entrar no Sistema</span>
              <ArrowRight size={14} />
            </button>

            {canDismiss && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Voltar
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
