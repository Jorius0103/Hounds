// Globais que não são declarados nos arquivos de js/: propriedades em `window`
// usadas entre scripts (e pela Mesa no iframe) e os SDKs carregados sob demanda.

interface Window {
  /** Usuário escolhido na tela de entrada (js/gate.js). */
  hubUser: { id: string; name: string; role: string } | null;
  hubUsers(): { id: string; name: string; role: string }[] | null;
  hubSwitchUser(): void;
  hubApplyUser(u: { id: string; name: string; role: string }): void;
  /** Força a Mesa a recarregar na próxima abertura. */
  hubMesaStale(): void;
  /** Promise com o HTML da Mesa (js/mesa-frame.js). */
  hubMesaSource(): Promise<string>;
  hubMesaPrepare(): Promise<unknown>;
  hubMesaFlush(): unknown;
  hubMesaBus: { publish: (msg: string) => void; subscribe: (fn: (msg: string) => void) => () => void };
  /** Na janela da Mesa (iframe): reabre a escolha de jogo. */
  __mesaOpenPicker?(): void;
  /** firebase-config.js */
  HOUNDS_FIREBASE: { apiKey: string; authDomain: string; projectId: string; storageBucket: string; messagingSenderId: string; appId: string; campaignEmail: string } | null;
  /** supabase-config.js */
  HOUNDS_SUPABASE: { url: string; anonKey: string; bucket?: string } | null;
  /** SDK do Supabase, carregado por js/store/supabase.js. */
  supabase: any;
  /** Plataforma de artifacts do claude.ai, quando o site roda lá. */
  claude?: { use(name: string): Promise<any> };
}

/** SDK do Firebase, carregado por js/store/firebase.js. */
declare var firebase: any;
