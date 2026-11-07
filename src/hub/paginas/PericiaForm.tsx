import {useRef, useState, type ChangeEvent} from 'react';
import {useHub} from '../data';
import {Check} from '../ui/Check';
import {Datalist} from '../ui/Datalist';
import {closeDialog, Dialog} from '../ui/Dialog';
import {VisibilityFlag, visDraft, visFields, type VisDraft} from '../ui/Visibility';

const PAIR = {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12};
// O valor de um <select> do formulário: o da perícia, quando está na lista; senão a opção vazia (—).
const pick = (list: string[], v: string | undefined) => (v && list.includes(v) ? v : '');

/**
 * Criar (s null) ou editar uma perícia, só o Mestre: nome, atributo, dificuldade, grupo de combate, padrão,
 * pré-requisitos, especialização, cinemática, livro, página, descrição, modificadores e visibilidade. Grava com o
 * Ops.saveSkill de js/tabs/tab-pericias.js. combat: criada por Combate, começa no corpo a corpo e, salva, abre lá.
 */
export function SkillForm({s, combat = false}: {s: Skill | null; combat?: boolean}) {
  useHub();
  const editing = !!s;
  const [f, setF] = useState(() => ({
    name: s ? s.name : '',
    attribute: s ? pick(SKILL_CAT_ATTRS, s.attribute) : 'IQ',
    difficulty: s ? pick(SKILL_CAT_DIFFS, s.difficulty) : 'A',
    group: s ? skillCombatGroup(s) : combat ? 'Melee' : '',
    defaults: (s && s.defaults) || '',
    prerequisites: (s && s.prerequisites) || '',
    book: (s && s.book) || '',
    page: (s && s.page) || '',
    description: (s && s.description) || '',
    modifiers: (s && s.modifiers) || '',
  }));
  const [specialty, setSpecialty] = useState(() => !!(s && s.specialty));
  const [cinematic, setCinematic] = useState(() => !!(s && s.cinematic));
  const [vis, setVis] = useState<VisDraft>(() => visDraft(s));
  const [nameErr, setNameErr] = useState('');
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);

  const bind = (k: keyof typeof f) => ({
    value: f[k],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.value;
      setF(cur => ({...cur, [k]: value}));
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const n = f.name.trim();
    if (!n) {
      setNameErr('Informe o nome da perícia.');
      nameInput.current?.focus();
      return;
    }
    setSaving(true);
    setFormErr('');
    const group = f.group;
    const fields = {
      name: n,
      attribute: f.attribute,
      difficulty: f.difficulty,
      combatGroup: group,
      defaults: f.defaults,
      prerequisites: f.prerequisites,
      specialty,
      cinematic,
      book: f.book,
      page: f.page,
      description: f.description,
      modifiers: f.modifiers,
      ...visFields(s, true, vis),
    };
    Ops.saveSkill(s, fields).then(
      id => {
        closeDialog();
        toast(editing ? 'Perícia salva.' : 'Perícia criada.');
        // Criada por Combate, e de combate: a página dela abre em Combate.
        if (!editing) go(combat && group ? combatSkillHref(id) : skillHref(id));
      },
      er => {
        setSaving(false);
        setFormErr(errorText(er));
      },
    );
  }

  return (
    <Dialog labelledBy="kfTitle" busy={saving}>
      <form id="skillForm" noValidate onSubmit={submit}>
        <h2 id="kfTitle">{editing ? 'Editar perícia' : 'Nova perícia'}</h2>
        <div className={'field' + (nameErr ? ' invalid' : '')} id="f_kname">
          <label htmlFor="kname">Nome da perícia</label>
          <input
            type="text"
            id="kname"
            maxLength={100}
            autoComplete="off"
            placeholder="Ex.: Acrobatics"
            ref={nameInput}
            value={f.name}
            onChange={e => {
              const value = e.target.value;
              setF(cur => ({...cur, name: value}));
              if (value.trim()) setNameErr('');
            }}
          />
          <div className="err" id="err_kname">
            {nameErr}
          </div>
        </div>
        <div style={PAIR}>
          <div className="field">
            <label htmlFor="kattr">Atributo</label>
            <select id="kattr" {...bind('attribute')}>
              <option value="">—</option>
              {SKILL_CAT_ATTRS.map(x => (
                <option value={x} key={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="kdiff">Dificuldade</label>
            <select id="kdiff" {...bind('difficulty')}>
              <option value="">—</option>
              {SKILL_CAT_DIFFS.map(x => (
                <option value={x} key={x}>
                  {SKILL_CAT_LABELS[x]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="kgroup">Perícia de combate</label>
          <select id="kgroup" {...bind('group')}>
            {SKILL_COMBAT_GROUPS.map(g => (
              <option value={g[0]} key={g[0]}>
                {g[1]}
              </option>
            ))}
          </select>
          <div className="hint-text" style={{margin: '4px 0 0'}}>
            As de combate aparecem também em Regras › Combate.
          </div>
        </div>
        <div className="field">
          <label htmlFor="kdef">Padrão (default)</label>
          <input type="text" id="kdef" maxLength={300} placeholder="Ex.: IQ-5 ou Merchant-3" {...bind('defaults')} />
        </div>
        <div className="field">
          <label htmlFor="kpre">Pré-requisitos</label>
          <input type="text" id="kpre" maxLength={300} placeholder="Ex.: Trained by a Master" {...bind('prerequisites')} />
        </div>
        <div style={PAIR}>
          <Check id="kspec" on={specialty} label="Exige especialização" onChange={setSpecialty} />
          <Check id="kcine" on={cinematic} label="Cinemática" onChange={setCinematic} />
        </div>
        <div style={PAIR}>
          <div className="field">
            <label htmlFor="kbook">Livro</label>
            <input type="text" id="kbook" list="skillBookList" maxLength={100} placeholder="Ex.: GURPS Basic Set" {...bind('book')} />
            <Datalist id="skillBookList" options={skillValues('book')} />
          </div>
          <div className="field">
            <label htmlFor="kpage">Página</label>
            <input type="text" id="kpage" maxLength={30} placeholder="Ex.: B174, MA61" {...bind('page')} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="kdesc">Descrição</label>
          <textarea id="kdesc" rows={6} maxLength={20000} placeholder="O que a perícia faz, especializações…" {...bind('description')} />
        </div>
        <div className="field">
          <label htmlFor="kmod">Modificadores</label>
          <textarea id="kmod" rows={3} maxLength={5000} placeholder="Bônus e penalidades comuns" {...bind('modifiers')} />
        </div>
        <VisibilityFlag id="kvis" item={s} share draft={vis} onChange={setVis} />
        <div className="form-err" id="kfErr" role="alert">
          {formErr}
        </div>
        <div className="btn-row" style={{justifyContent: 'flex-end'}}>
          <button className="btn ghost" type="button" id="kfCancel" disabled={saving} onClick={() => closeDialog()}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" id="kfSave" disabled={saving}>
            {saving ? 'Salvando…' : editing ? 'Salvar perícia' : 'Criar perícia'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
