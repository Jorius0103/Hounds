import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {useHub} from '../data';
import {Icon} from './Icon';

// Visibilidade dos itens (js/mundo.js: um item com visible false só é visto pelo Mestre, por quem criou e pelas
// contas em sharedWith). Aqui ficam as versões React do que js/app.js põe nas páginas de item (tagPage) e do
// campo dos formulários (flagHtml, flagVal e shareVal de js/mundo.js).

const CHEVRON_DOWN = '<path d="m6 9 6 6 6-6"/>';
const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every(id => b.includes(id));

function patchItem(col: string, item: Doc, p: object) {
  return item.catalog ? patchCatalogItem(col, item, p) : W.store!.patch(col, item.id, p);
}

/**
 * A etiqueta "Só …" e o botão de visibilidade de uma página de item, no fim do <h1>, como o tagPage de js/app.js:
 * ocultar ou revelar a todos, ou, para o Mestre num item oculto, o menu de revelar para contas escolhidas.
 * icon: o botão ganha o olho, como nas páginas que o põem numa fila de botões (a Ficha).
 */
export function VisibilityControls({item, col, icon = false}: {item: Doc; col: string; icon?: boolean}) {
  useHub();
  const secret = isSecret(item);
  const tag = secret ? (
    <span className="secret-tag" title="Não está visível para todos">
      <Icon paths={EYE_OFF} size={12} stroke={2.4} />
      {'Só ' + seenBy(item)}
    </span>
  ) : null;
  if (!canSetVis(item) || !canWrite()) return tag;
  return (
    <>
      {tag}
      {secret && isMestre() ? <RevealMenu item={item} col={col} icon={icon} /> : <VisibilityToggle item={item} col={col} icon={icon} />}
    </>
  );
}

function VisibilityToggle({item, col, icon}: {item: Doc; col: string; icon: boolean}) {
  const [busy, setBusy] = useState(false);
  const secret = isSecret(item), who = seenBy(item);
  function toggle() {
    setBusy(true);
    patchItem(col, item, {visible: secret, updatedAt: now()}).then(
      () => {
        setBusy(false);
        toast(secret ? 'Agora todos podem ver.' : 'Agora só ' + who + ' ' + seenVerb(item) + '.');
      },
      er => {
        setBusy(false);
        toast(errorText(er), true);
      },
    );
  }
  return (
    <button className="btn vis-toggle" type="button" id="visToggle" disabled={busy} onClick={toggle}>
      {icon ? <Icon paths={secret ? EYE_ON : EYE_OFF} size={15} /> : null}
      {secret ? 'Revelar a todos' : who === 'o Mestre' ? 'Ocultar dos jogadores' : 'Ocultar dos outros'}
    </button>
  );
}

// "Revelar" de um item oculto (Mestre): a todos ou só às contas escolhidas (sharedWith), como o revealMenu de
// js/app.js. Quem criou o item sempre vê; a conta ligada a uma ficha também, e fica de fora da lista.
function RevealMenu({item, col, icon}: {item: Doc; col: string; icon: boolean}) {
  const linked = col === 'sheets' ? W.users.filter(u => u.sheetId === item.id)[0] : undefined;
  const users = W.users.filter(u => u.role !== 'mestre' && u !== linked).sort(byName);
  const had = (item.sharedWith || []).filter(id => id !== item.createdBy && users.some(u => u.id === id));
  const [draft, setDraft] = useState<{all: boolean; ids: string[]} | null>(null);
  const [saving, setSaving] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLSpanElement>(null);
  const focusFirst = useRef(false);
  const open = !!draft;
  const picked = draft ? users.filter(u => u.id !== item.createdBy && draft.ids.includes(u.id)).map(u => u.id) : [];

  // Aberto: o menu fica dentro da tela quando o botão está perto da borda direita.
  useLayoutEffect(() => {
    const el = pop.current;
    if (!open || !el) return;
    el.style.left = '0px';
    const r = el.getBoundingClientRect(), shift = Math.min(0, window.innerWidth - 16 - r.right);
    el.style.left = Math.max(shift, 16 - r.left) + 'px';
    if (focusFirst.current) el.querySelector('input')?.focus();
    focusFirst.current = false;
  }, [open]);

  // Fecha com um clique fora do menu ou com o Esc.
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (!(e.target instanceof Element && e.target.closest('.vis-menu'))) setDraft(null);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setDraft(null);
      button.current?.focus();
    };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  function save() {
    if (!draft) return;
    const ids = linked ? picked.concat([linked.id]) : picked, all = draft.all;
    setSaving(true);
    patchItem(col, item, all ? {visible: true, updatedAt: now()} : {sharedWith: ids, updatedAt: now()}).then(
      () => {
        setSaving(false);
        setDraft(null);
        const after = {createdBy: item.createdBy, sharedWith: ids};
        toast(all ? 'Agora todos podem ver.' : 'Agora só ' + seenBy(after) + ' ' + seenVerb(after) + '.');
      },
      er => {
        setSaving(false);
        toast(errorText(er), true);
      },
    );
  }

  return (
    <span className="vis-menu">
      <button
        ref={button}
        className="btn vis-toggle"
        type="button"
        id="visToggle"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (open) return setDraft(null);
          focusFirst.current = true;
          setDraft({all: false, ids: had.slice()});
        }}
      >
        {icon ? <Icon paths={EYE_ON} size={15} /> : null}
        Revelar
        <Icon paths={CHEVRON_DOWN} size={13} stroke={2.4} />
      </button>
      <span ref={pop} className="vis-pop" id="visPop" role="dialog" aria-label="Revelar para" hidden={!open}>
        {draft ? (
          <>
            <span className="lab">Mostrar para</span>
            <label className="vis-user vis-all">
              <input type="checkbox" data-all="" checked={draft.all} onChange={e => setDraft({...draft, all: e.target.checked})} />
              <span>Todos</span>
              <small>Qualquer conta vê</small>
            </label>
            {users.length ? (
              <span className={'vis-users' + (draft.all ? ' off' : '')}>
                {users.map(u => {
                  const creator = item.createdBy === u.id;
                  return (
                    <label className="vis-user" key={u.id}>
                      <input
                        type="checkbox"
                        data-share={u.id}
                        data-creator={creator ? '' : undefined}
                        checked={creator || draft.ids.includes(u.id)}
                        disabled={creator || draft.all}
                        onChange={e => setDraft({...draft, ids: e.target.checked ? draft.ids.concat([u.id]) : draft.ids.filter(x => x !== u.id)})}
                      />
                      <span>{u.name}</span>
                      <small>{creator ? 'Criou' : roleLabel(u.role)}</small>
                    </label>
                  );
                })}
              </span>
            ) : null}
            <span className="btn-row">
              <button
                className="btn ghost"
                type="button"
                data-cancel=""
                onClick={() => {
                  setDraft(null);
                  button.current?.focus();
                }}
              >
                Cancelar
              </button>
              <button className="btn primary" type="button" data-save="" disabled={saving || (!draft.all && sameIds(picked, had))} onClick={save}>
                Salvar
              </button>
            </span>
          </>
        ) : null}
      </span>
    </span>
  );
}

/** O que o campo de visibilidade guarda enquanto o formulário está aberto. */
export type VisDraft = {visible: boolean; shared: string[]};

/** Como o campo começa: um item novo começa oculto; o que já existe, como está. */
export const visDraft = (item: Doc | null): VisDraft => ({visible: item ? !isSecret(item) : false, shared: (item && item.sharedWith) || []});

// O campo aparece para quem pode mudar a visibilidade do item; a lista de contas, só para o Mestre (share).
const flagShown = (item: Doc | null) => !!window.hubUser && canSetVis(item);
const shareUsers = (share: boolean) => (share && isMestre() ? W.users.filter(u => u.role !== 'mestre').sort(byName) : []);

/** visible e sharedWith para gravar, como o flagVal e o shareVal: sem o campo (ou sem a lista), o item fica como estava. */
export function visFields(item: Doc | null, share: boolean, draft: VisDraft) {
  const kept = ((item && item.sharedWith) || []).slice();
  if (!flagShown(item)) return {visible: item ? !isSecret(item) : true, sharedWith: kept};
  const users = shareUsers(share);
  const sharedWith = users.length ? users.filter(u => !(item && item.createdBy === u.id) && draft.shared.includes(u.id)).map(u => u.id) : kept;
  return {visible: draft.visible, sharedWith};
}

/** "Visível para todos" de um formulário, com a lista de contas que veem o item oculto (Mestre), como o flagHtml. */
export function VisibilityFlag({id, item, share = false, draft, onChange}: {id: string; item: Doc | null; share?: boolean; draft: VisDraft; onChange: (d: VisDraft) => void}) {
  useHub();
  if (!flagShown(item)) return null;
  const users = shareUsers(share);
  const flag = (
    <label className="vis-flag" htmlFor={id}>
      <input type="checkbox" id={id} checked={draft.visible} onChange={e => onChange({...draft, visible: e.target.checked})} />
      <span>
        <b>Visível para todos</b>
        <small>{users.length ? 'Desmarcado, só o Mestre e as contas marcadas abaixo veem.' : 'Desmarcado, só ' + seenBy(item) + ' ' + seenVerb(item) + '.'}</small>
      </span>
    </label>
  );
  if (!users.length) return flag;
  return (
    <div className="vis-wrap">
      {flag}
      <div className="vis-share" id={id + '_share'} hidden={draft.visible}>
        <span className="lab">Contas que podem ver</span>
        <div className="vis-users">
          {users.map(u => {
            const creator = !!item && item.createdBy === u.id;
            return (
              <label className="vis-user" key={u.id}>
                <input
                  type="checkbox"
                  data-share={u.id}
                  checked={creator || draft.shared.includes(u.id)}
                  disabled={creator}
                  onChange={e => onChange({...draft, shared: e.target.checked ? draft.shared.concat([u.id]) : draft.shared.filter(x => x !== u.id)})}
                />
                <span>{u.name}</span>
                <small>{creator ? 'Criou' : roleLabel(u.role)}</small>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
