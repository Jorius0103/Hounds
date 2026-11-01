import {useRef, useState, type ChangeEvent} from 'react';
import {useHub} from '../data';
import {Datalist} from '../ui/Datalist';
import {closeDialog, Dialog} from '../ui/Dialog';
import {VisibilityFlag, visDraft, visFields, type VisDraft} from '../ui/Visibility';

// Os campos de texto do formulário; a dificuldade é H ou VH.
type SpellText = Pick<Required<Spell>, 'name' | 'college' | 'class' | 'difficulty' | 'timeToCast' | 'duration' | 'initialCost' | 'maintenanceCost' | 'page' | 'prerequisites' | 'item' | 'description' | 'source'>;
const PAIR = {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12};

/**
 * Criar (s null) ou editar uma magia, só o Mestre: nome, escola, classe, dificuldade, tempo, duração, custos, página,
 * pré-requisitos, item mágico, descrição, fonte e visibilidade. Grava com o Ops.saveSpell de js/mundo.js; numa magia dos
 * livros, o documento com o id dela guarda as alterações.
 */
export function SpellForm({s}: {s: Spell | null}) {
  useHub();
  const editing = !!s;
  const [f, setF] = useState<SpellText>(() => ({
    name: s ? s.name : '',
    college: (s && s.college) || '',
    class: (s && s.class) || '',
    difficulty: s && s.difficulty === 'VH' ? 'VH' : 'H',
    timeToCast: (s && s.timeToCast) || '',
    duration: (s && s.duration) || '',
    initialCost: (s && s.initialCost) || '',
    maintenanceCost: (s && s.maintenanceCost) || '',
    page: (s && s.page) || '',
    prerequisites: (s && s.prerequisites) || '',
    item: (s && s.item) || '',
    description: (s && s.description) || '',
    source: (s && s.source) || '',
  }));
  const [vis, setVis] = useState<VisDraft>(() => visDraft(s));
  const [nameErr, setNameErr] = useState('');
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);

  // value e onChange de um campo.
  const bind = (k: keyof SpellText) => ({
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
      setNameErr('Informe o nome da magia.');
      nameInput.current?.focus();
      return;
    }
    setSaving(true);
    setFormErr('');
    const t = (k: keyof SpellText) => f[k].trim();
    const fields = {
      name: n,
      college: t('college'),
      class: t('class'),
      difficulty: t('difficulty'),
      timeToCast: t('timeToCast'),
      duration: t('duration'),
      initialCost: t('initialCost'),
      maintenanceCost: t('maintenanceCost'),
      prerequisites: t('prerequisites'),
      item: t('item'),
      description: t('description'),
      page: t('page'),
      source: t('source'),
      ...visFields(s, true, vis),
    };
    Ops.saveSpell(s, fields).then(
      id => {
        closeDialog();
        toast(editing ? 'Magia salva.' : 'Magia criada.');
        if (!editing) go(spellHref(id));
      },
      er => {
        setSaving(false);
        setFormErr(errorText(er));
      },
    );
  }

  return (
    <Dialog labelledBy="sfTitle" busy={saving}>
      <form id="spellForm" noValidate onSubmit={submit}>
        <h2 id="sfTitle">{editing ? 'Editar magia' : 'Nova magia'}</h2>
        <div className={'field' + (nameErr ? ' invalid' : '')} id="f_sname">
          <label htmlFor="sname">Nome da magia</label>
          <input
            type="text"
            id="sname"
            maxLength={100}
            autoComplete="off"
            placeholder="Ex.: Fireball"
            ref={nameInput}
            value={f.name}
            onChange={e => {
              const value = e.target.value;
              setF(cur => ({...cur, name: value}));
              if (value.trim()) setNameErr('');
            }}
          />
          <div className="err" id="err_sname">
            {nameErr}
          </div>
        </div>
        <div style={PAIR}>
          <div className="field">
            <label htmlFor="scollege">Escola / Colégio</label>
            <input type="text" id="scollege" list="collegeList" maxLength={100} placeholder="Ex.: Fire, Air" {...bind('college')} />
            <Datalist id="collegeList" options={spellColleges()} />
          </div>
          <div className="field">
            <label htmlFor="sclass">Classe</label>
            <input type="text" id="sclass" list="classList" maxLength={80} placeholder="Ex.: Missile, Regular" {...bind('class')} />
            <Datalist id="classList" options={spellClasses()} />
          </div>
        </div>
        <div style={PAIR}>
          <div className="field">
            <label htmlFor="sdiff">Dificuldade</label>
            <select id="sdiff" {...bind('difficulty')}>
              <option value="H">Hard (H)</option>
              <option value="VH">Very Hard (VH)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="scast">Tempo de conjuração</label>
            <input type="text" id="scast" maxLength={50} placeholder="Ex.: 1 sec., 1 hour" {...bind('timeToCast')} />
          </div>
        </div>
        <div style={PAIR}>
          <div className="field">
            <label htmlFor="sdur">Duração</label>
            <input type="text" id="sdur" maxLength={50} placeholder="Ex.: 1 min., Instantaneous" {...bind('duration')} />
          </div>
          <div className="field">
            <label htmlFor="scost">Custo inicial</label>
            <input type="text" id="scost" maxLength={2000} placeholder="Ex.: 2 to cast; 1 to maintain" {...bind('initialCost')} />
          </div>
        </div>
        <div style={PAIR}>
          <div className="field">
            <label htmlFor="smaint">Custo de manutenção</label>
            <input type="text" id="smaint" maxLength={500} placeholder="Ex.: 1, Half, Same, –" {...bind('maintenanceCost')} />
          </div>
          <div className="field">
            <label htmlFor="spage">Página / Livro</label>
            <input type="text" id="spage" maxLength={50} placeholder="Ex.: B246, M45" {...bind('page')} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="sprereq">Pré-requisitos</label>
          <input type="text" id="sprereq" maxLength={5000} placeholder="Ex.: Magery 1, Ignite Fire" {...bind('prerequisites')} />
        </div>
        <div className="field">
          <label htmlFor="sitem">Item mágico</label>
          <textarea id="sitem" rows={3} maxLength={5000} placeholder="Em que objetos a magia pode ser encantada e o custo de energia." {...bind('item')} />
        </div>
        <div className="field">
          <label htmlFor="sdesc">Descrição / Efeito</label>
          <textarea id="sdesc" rows={6} maxLength={20000} placeholder="Descreva o efeito mágico, dados de dano, testes resistidos…" {...bind('description')} />
        </div>
        <div className="field">
          <label htmlFor="ssource">Fonte / Livro de origem</label>
          <input type="text" id="ssource" maxLength={100} placeholder="Ex.: Basic Set, GURPS Magic" {...bind('source')} />
        </div>
        <VisibilityFlag id="svis" item={s} share draft={vis} onChange={setVis} />
        <div className="form-err" id="sfErr" role="alert">
          {formErr}
        </div>
        <div className="btn-row" style={{justifyContent: 'flex-end'}}>
          <button className="btn ghost" type="button" id="sfCancel" disabled={saving} onClick={() => closeDialog()}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" id="sfSave" disabled={saving}>
            {saving ? 'Salvando…' : editing ? 'Salvar magia' : 'Criar magia'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
