import {Fragment, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Icon} from './Icon';

// Modal em React, com o mesmo visual e o mesmo comportamento do modal antigo (js/modal.js): um por vez, por
// cima de qualquer página (continua aberto se a rota mudar), fechado pelo X, pelo clique fora ou pelo Esc, que
// perguntam antes de descartar alterações; o Cancelar e o salvar fecham direto (closeDialog).
//
//   openDialog(<UserForm user={u} />)   — o formulário desenha o <Dialog> em volta do próprio <form>
//
// Enquanto ele está aberto, o modalOpen dos scripts de js/ aponta para ele: as páginas antigas não redesenham
// com um formulário aberto (onData em js/app.js), o Esc (js/explorer.js) chega ao requestClose daqui e o aviso
// de alterações não salvas ao sair da página (js/modal.js) vale também para ele.

let current: {key: number; node: ReactNode} | null = null;
let opened = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function openDialog(node: ReactNode) {
  current = {key: ++opened, node};
  notify();
}

export function closeDialog() {
  current = null;
  notify();
}

/** Onde o modal aberto é desenhado (src/hub/HubApp.tsx). */
export function DialogHost() {
  const open = useSyncExternalStore(subscribe, () => current);
  return open ? createPortal(<Fragment key={open.key}>{open.node}</Fragment>, document.body) : null;
}

// O estado dos campos, para saber se há alterações não salvas: o mesmo modalFormState de js/modal.js.
function formState(box: HTMLElement) {
  const parts: unknown[] = [];
  box.querySelectorAll<HTMLInputElement>('input, select, textarea').forEach(el => {
    if (el.type === 'file' || el.getAttribute('role') === 'combobox' || el.closest('.modal-discard')) return;
    parts.push(el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value);
  });
  box.querySelectorAll('.picker > .people, .picker > .rels').forEach(b => parts.push(b.textContent));
  return JSON.stringify(parts);
}

type DialogProps = {
  /** id do título (h2) do formulário, para o leitor de tela anunciar o modal. */
  labelledBy: string;
  /** Salvando: o X, o clique fora e o Esc não fecham. */
  busy?: boolean;
  children: ReactNode;
};

export function Dialog({labelledBy, busy = false, children}: DialogProps) {
  const box = useRef<HTMLDivElement>(null);
  const [discard, setDiscard] = useState(false);
  const st = useRef({base: null as string | null, touched: false, focusBack: null as Element | null, pressOnBack: false});
  const busyRef = useRef(busy);
  const discardRef = useRef(discard);
  busyRef.current = busy;
  discardRef.current = discard;

  const dirty = () => st.current.touched || (st.current.base != null && !!box.current && formState(box.current) !== st.current.base);

  function keepEditing() {
    setDiscard(false);
    const f = st.current.focusBack as HTMLElement | null;
    if (f && f.focus && f.isConnected && box.current?.contains(f)) f.focus();
  }

  // X, clique fora e Esc. Com alterações, pergunta antes; Esc enquanto pergunta volta a editar.
  function requestClose(fromEsc?: boolean) {
    if (busyRef.current) return;
    if (discardRef.current) {
      if (fromEsc) keepEditing();
      else document.getElementById('mdKeep')?.focus();
      return;
    }
    if (!dirty()) {
      closeDialog();
      return;
    }
    st.current.focusBack = document.activeElement;
    setDiscard(true);
  }
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  // O modalOpen dos scripts de js/, enquanto este modal está aberto.
  const legacy = useRef<LegacyModal | null>(null);

  useLayoutEffect(() => {
    const last = document.activeElement as HTMLElement | null;
    const m: LegacyModal = {
      last,
      onClose: closeDialog,
      busy: busyRef.current,
      base: null,
      get touched() {
        return dirty();
      },
      requestClose: (fromEsc?: boolean) => requestCloseRef.current(fromEsc),
    };
    legacy.current = m;
    modalOpen = m;
    // Como o showModal: o primeiro campo de texto recebe o foco, e o estado dos campos é guardado logo depois
    // de o formulário se preencher.
    const field = box.current!.querySelector<HTMLElement>('input[type=text],textarea,select');
    const focusTimer = setTimeout(() => field?.focus(), 20);
    const baseTimer = setTimeout(() => {
      if (box.current) st.current.base = formState(box.current);
    }, 0);
    return () => {
      clearTimeout(focusTimer);
      clearTimeout(baseTimer);
      // Fechado por aqui (e não pelo closeModal de js/modal.js, que já faz isto): as páginas antigas recebem
      // os dados que chegaram com o modal aberto, e o foco volta para onde estava.
      if (modalOpen === m) {
        modalOpen = null;
        renderPage();
        if (last && last.focus && last.isConnected) last.focus();
      }
    };
  }, []);

  useEffect(() => {
    if (legacy.current) legacy.current.busy = busy;
  }, [busy]);

  useEffect(() => {
    if (discard) document.getElementById('mdKeep')?.focus();
  }, [discard]);

  return (
    <div
      className="modal-back"
      onPointerDown={e => {
        st.current.pressOnBack = e.target === e.currentTarget;
      }}
      onClick={e => {
        // Pressionar e soltar no fundo: arrastar para fora de um campo ao selecionar texto não fecha.
        if (st.current.pressOnBack && e.target === e.currentTarget) requestClose();
        st.current.pressOnBack = false;
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        ref={box}
        onChange={e => {
          if ((e.target as HTMLInputElement).type === 'file') st.current.touched = true;
        }}
        onDropCapture={() => {
          st.current.touched = true;
        }}
        onClickCapture={e => {
          if ((e.target as HTMLElement).closest('[id^="pvrm_"]')) st.current.touched = true;
        }}
      >
        <button className="icon-btn modal-x" type="button" aria-label="Fechar" title="Fechar (Esc)" onClick={() => requestClose()}>
          <Icon paths={ICON.x} size={18} />
        </button>
        {children}
        {discard ? (
          <div className="modal-discard">
            <div className="confirm" role="alert">
              <span>Há alterações não salvas. Descartar?</span>
              <div className="btn-row">
                <button className="btn danger solid" type="button" id="mdDiscard" onClick={closeDialog}>
                  Descartar
                </button>
                <button className="btn ghost" type="button" id="mdKeep" onClick={keepEditing}>
                  Continuar editando
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
