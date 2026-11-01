import {useEffect, useRef, useState} from 'react';
import {useHub} from '../data';
import {Datalist} from '../ui/Datalist';
import {closeDialog, Dialog} from '../ui/Dialog';
import {IdPicker} from '../ui/IdPicker';
import {ImageField, noImagePick, type ImagePick} from '../ui/ImageField';
import {ImageSlot} from '../ui/ImageSlot';
import {TextPicker} from '../ui/TextPicker';
import {VisibilityFlag, visDraft, visFields, type VisDraft} from '../ui/Visibility';

type MemberPick = {id: string; text: string};

/**
 * Criar (o null) ou editar uma organização: nome, imagem, descrição, reputação, membros com os cargos, locais,
 * mapas e visibilidade. Grava com o Ops.saveOrganization de js/tabs/tab-organizacoes.js. focusMembers: aberto por
 * "Adicionar membro", com o foco na busca de personagens.
 */
export function OrgForm({o, focusMembers = false}: {o: Organization | null; focusMembers?: boolean}) {
  const {W} = useHub();
  const editing = !!o, canImg = !!W.store && W.store.canUpload;
  const [name, setName] = useState(o ? o.name : '');
  const [desc, setDesc] = useState(o ? o.description || '' : '');
  const [rep, setRep] = useState(o ? o.reputation || '' : '');
  const [members, setMembers] = useState<MemberPick[]>(() => (o ? orgMembers(o).map(m => ({id: m.c.id, text: m.rank})) : []));
  const [locs, setLocs] = useState<string[]>(() => (o ? orgLocs(o).map(l => l.id) : []));
  const [maps, setMaps] = useState<string[]>(() => (o ? orgMaps(o).map(m => m.id) : []));
  const [vis, setVis] = useState<VisDraft>(() => visDraft(o));
  const [img, setImg] = useState<ImagePick>(noImagePick);
  const [nameErr, setNameErr] = useState('');
  const [formErr, setFormErr] = useState('');
  // Nome repetido: avisa uma vez, e o segundo clique em salvar continua mesmo assim.
  const [warned, setWarned] = useState(false);
  const [saving, setSaving] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const drop = useRef<HTMLLabelElement>(null);

  useEffect(() => {
    if (!focusMembers || !W.characters.length) return;
    const t = setTimeout(() => document.getElementById('omem')?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const n = name.trim();
    if (!n) {
      setNameErr('Informe o nome da organização.');
      nameInput.current?.focus();
      return;
    }
    if (W.organizations.some(x => (!o || x.id !== o.id) && norm(x.name) === norm(n)) && !warned) {
      setFormErr('Já existe uma organização com esse nome. Clique em ' + (editing ? 'Salvar' : 'Criar') + ' organização de novo para continuar mesmo assim.');
      setWarned(true);
      return;
    }
    if (canImg && img.error && !img.file) {
      drop.current?.focus();
      return;
    }
    setSaving(true);
    setFormErr('');
    const fields = {
      name: n,
      description: desc.trim(),
      reputation: rep.trim(),
      members: members.filter(s => charById(s.id)).map(s => ({charId: s.id, rank: s.text.trim()})),
      locationIds: locs.filter(id => locById(id)),
      mapIds: maps.filter(id => mapById(id)),
      ...visFields(o, true, vis),
    };
    Ops.saveOrganization(o, fields, canImg ? img.file : null, canImg ? img.dims : null, canImg && img.removed).then(
      id => {
        closeDialog();
        toast(editing ? 'Organização salva.' : 'Organização criada.');
        if (!editing) go(orgHref(id));
      },
      er => {
        setSaving(false);
        setFormErr(errorText(er));
      },
    );
  }

  const saveLabel = saving ? (canImg && img.file ? 'Enviando imagem…' : 'Salvando…') : editing ? 'Salvar organização' : 'Criar organização';
  const existing = o && o.image ? {ref: o.image.ref, name: 'Imagem atual', dims: o.image.w ? o.image.w + ' × ' + o.image.h + ' px' : ''} : null;
  return (
    <Dialog labelledBy="ofTitle" busy={saving}>
      <form id="orgForm" noValidate onSubmit={submit}>
        <h2 id="ofTitle">{editing ? 'Editar organização' : 'Nova organização'}</h2>
        <div className={'field' + (nameErr ? ' invalid' : '')} id="f_oname">
          <label htmlFor="oname">Nome</label>
          <input
            type="text"
            id="oname"
            maxLength={100}
            autoComplete="off"
            placeholder="Ex.: The Hounds"
            ref={nameInput}
            value={name}
            onChange={e => {
              setName(e.target.value);
              if (e.target.value.trim()) setNameErr('');
            }}
          />
          <div className="err" id="err_oname">
            {nameErr}
          </div>
        </div>
        {canImg ? <ImageField id="oimg" label="Imagem" help="Brasão, símbolo ou ilustração. Opcional, até 20 MB." removable existing={existing} value={img} onChange={setImg} dropRef={drop} /> : null}
        <div className="field">
          <label htmlFor="odesc">Descrição</label>
          <textarea id="odesc" rows={6} maxLength={20000} placeholder="O que é, objetivos, história, onde atua…" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="orep">Reputação</label>
          <input
            type="text"
            id="orep"
            list="repList"
            maxLength={120}
            autoComplete="off"
            placeholder="Ex.: Temida no porto, +2 entre os nobres"
            value={rep}
            onChange={e => setRep(e.target.value)}
          />
          <Datalist id="repList" options={reputations()} />
        </div>
        <TextPicker
          id="omem"
          listId="oMemList"
          boxId="oMemSel"
          label="Membros"
          placeholder="Buscar personagem"
          empty={W.characters.length ? '' : 'Nenhum personagem cadastrado ainda'}
          hint="Opcional. Ao lado de cada membro, o cargo dele. Ex.: Líder, General, Recruta. Dá para mudar o cargo quando quiser."
          textLabel="Cargo"
          datalist={{id: 'rankList', options: rankTypes()}}
          sel={members}
          onChange={setMembers}
          rowKey={s => s.id}
          name={s => (charById(s.id) || {name: ''}).name}
          chip={s => {
            const c = charById(s.id);
            return (
              c && (
                <span className="person">
                  <ImageSlot as="i" imgRef={c.image && c.image.ref}>
                    {initials(c.name)}
                  </ImageSlot>
                  {c.name}
                </span>
              )
            );
          }}
          find={q =>
            W.characters
              .slice()
              .sort(byName)
              .filter(c => !members.some(s => s.id === c.id) && (!q || norm(c.name + ' ' + charSubtitle(c)).indexOf(q) >= 0))
              .map(c => ({label: c.name, sub: charSubtitle(c), pick: {id: c.id, text: ''}}))
          }
        />
        <IdPicker
          id="oloc"
          label="Locais"
          placeholder="Buscar local"
          empty={W.locations.length ? '' : 'Nenhum local cadastrado ainda'}
          hint="Opcional. Onde a organização fica ou atua. Ex.: a sede, um porto, uma fortaleza."
          sel={locs}
          onChange={setLocs}
          chip={id => {
            const l = locById(id);
            return l && {name: l.name, icon: ICON.pin};
          }}
          find={q => locPickOptions(q)}
        />
        <IdPicker
          id="omap"
          label="Mapas"
          placeholder="Buscar mapa"
          empty={W.maps.length ? '' : 'Nenhum mapa cadastrado ainda'}
          hint="Opcional. As regiões onde a organização atua."
          sel={maps}
          onChange={setMaps}
          chip={id => {
            const m = mapById(id);
            return m && {name: m.name, icon: ICON.map};
          }}
          find={q => mapPickOptions(q)}
        />
        <VisibilityFlag id="ovis" item={o} share draft={vis} onChange={setVis} />
        <div className="form-err" id="ofErr" role="alert">
          {formErr}
        </div>
        <div className="btn-row" style={{justifyContent: 'flex-end'}}>
          <button className="btn ghost" type="button" id="ofCancel" disabled={saving} onClick={() => closeDialog()}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" id="ofSave" disabled={saving}>
            {saveLabel}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
