import {useEffect, useRef, useState} from 'react';
import {useHub} from '../data';
import {closeDialog, Dialog} from '../ui/Dialog';
import {ImageField, noImagePick, type ImagePick} from '../ui/ImageField';
import {mapSelectOptions} from '../ui/options';
import {VisibilityFlag, visDraft, visFields, type VisDraft} from '../ui/Visibility';

/**
 * Criar (m null) ou editar um mapa: nome, mapa pai, imagem e visibilidade. Um mapa novo precisa da imagem, e o nome
 * vem do arquivo quando está vazio. Trocar a imagem de um mapa com marcadores exclui todos eles (as posições valem
 * só para a imagem atual): antes de gravar, o formulário confere quantos há e pergunta. Grava com o Ops.createMap,
 * o Ops.updateMap e o Ops.replaceMapImage de js/mundo.js.
 */
export function MapForm({m}: {m: HMap | null}) {
  const {W} = useHub();
  const editing = !!m, canImg = !m || (!!W.store && W.store.canUpload);
  const [name, setName] = useState(m ? m.name : '');
  const [parent, setParent] = useState(() => (m ? W.parent[m.id] || '' : ''));
  const [vis, setVis] = useState<VisDraft>(() => visDraft(m));
  const [img, setImg] = useState<ImagePick>(noImagePick);
  const [nameErr, setNameErr] = useState('');
  const [formErr, setFormErr] = useState('');
  // O que o botão de salvar diz enquanto trabalha; null: parado.
  const [busy, setBusy] = useState<string | null>(null);
  // Quantos marcadores a troca de imagem vai excluir, enquanto o formulário pergunta.
  const [swapAsk, setSwapAsk] = useState<{count: number} | null>(null);
  // A troca de imagem foi confirmada (ou o mapa não tem marcadores).
  const confirmed = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const parentSelect = useRef<HTMLSelectElement>(null);
  const drop = useRef<HTMLLabelElement>(null);
  const saveBtn = useRef<HTMLButtonElement>(null);
  const swapYes = useRef<HTMLButtonElement>(null);
  // Editando, o próprio mapa e os de dentro dele não podem ser o mapa pai.
  const exclude = m ? validParents(m.id) : null;

  useEffect(() => {
    if (swapAsk) swapYes.current?.focus();
  }, [swapAsk]);

  function onPick(f: File) {
    if (!m) setName(n => (n.trim() ? n : f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 80)));
    else {
      confirmed.current = false;
      setSwapAsk(null);
    }
  }

  function submit() {
    if (busy) return;
    const n = name.trim(), up = parent || null, swap = !!m && !!img.file;
    let ok = true;
    if (!n) {
      setNameErr('Informe o nome do mapa.');
      ok = false;
    }
    if (!m && !img.file) {
      if (!img.error) setImg(v => ({...v, error: 'Selecione a imagem do mapa.'}));
      ok = false;
    }
    if (m && canImg && !img.file && img.error) ok = false;
    if (m && up && validParents(m.id)[up]) {
      setFormErr(errorText({code: 'cycle'}));
      ok = false;
    }
    if (!ok) {
      (n ? (canImg ? drop.current : parentSelect.current) : nameInput.current)?.focus();
      return;
    }
    setFormErr('');
    // Antes de gravar qualquer coisa, descobre se a imagem nova excluiria marcadores.
    if (m && swap && !confirmed.current) {
      setBusy('Verificando marcadores…');
      W.store!.all('maps/' + m.id + '/markers').then(
        list => {
          if (list.length) {
            setBusy(null);
            setSwapAsk({count: list.length});
          } else {
            confirmed.current = true;
            save(n, up, swap);
          }
        },
        er => {
          setBusy(null);
          setFormErr(errorText(er));
        },
      );
      return;
    }
    save(n, up, swap);
  }

  function save(n: string, up: string | null, swap: boolean) {
    setBusy(swap || !m ? 'Enviando imagem…' : 'Salvando…');
    const v = visFields(m, true, vis);
    let dropped = 0;
    const saving = m
      ? Ops.updateMap(m.id, n, up, v.visible, v.sharedWith)
          .then(() => (swap ? Ops.replaceMapImage(m.id, img.file!, img.dims!, confirmed.current) : 0))
          .then(k => {
            dropped = k || 0;
            return m.id;
          })
      : Ops.createMap(n, up, img.file!, img.dims!, v.visible, v.sharedWith);
    saving.then(
      id => {
        closeDialog();
        toast(!m ? 'Mapa criado.' : !swap ? 'Mapa salvo.' : dropped ? 'Mapa salvo com a nova imagem. ' + plural(dropped, 'marcador excluído', 'marcadores excluídos') + '.' : 'Mapa salvo com a nova imagem.');
        if (!m) go(mapHref(id));
      },
      er => {
        setBusy(null);
        // Alguém pôs marcadores depois da conferência: pergunta de novo, com o número certo.
        if (er && er.code === 'markers_exist') {
          confirmed.current = false;
          setSwapAsk({count: er.count});
          return;
        }
        setFormErr(errorText(er));
      },
    );
  }

  const existing = m && m.image && m.image.ref ? {ref: m.image.ref, name: 'Imagem atual', dims: m.image.w ? m.image.w + ' × ' + m.image.h + ' px' : ''} : null;
  return (
    <Dialog labelledBy="mfTitle" busy={!!busy}>
      <form
        id="mapForm"
        noValidate
        onSubmit={e => {
          e.preventDefault();
          submit();
        }}
      >
        <h2 id="mfTitle">{editing ? 'Editar mapa' : 'Novo mapa'}</h2>
        <div className={'field' + (nameErr ? ' invalid' : '')} id="f_mname">
          <label htmlFor="mname">Nome do mapa</label>
          <input
            type="text"
            id="mname"
            maxLength={80}
            autoComplete="off"
            placeholder="Ex.: Reino de Ludgrim"
            ref={nameInput}
            value={name}
            onChange={e => {
              setName(e.target.value);
              if (e.target.value.trim()) setNameErr('');
            }}
          />
          <div className="err" id="err_mname">
            {nameErr}
          </div>
        </div>
        <div className="field">
          <label htmlFor="mparent">Mapa pai</label>
          <select id="mparent" ref={parentSelect} value={parent} onChange={e => setParent(e.target.value)}>
            {mapSelectOptions('Nenhum (mapa de nível superior)', exclude).map(o => (
              <option value={o.value} key={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="hint-text">
            O mapa mais amplo onde este fica. Ex.: uma cidade dentro de uma região.
            {exclude && Object.keys(exclude).length > 1 ? ' Submapas deste mapa não aparecem na lista, para não criar ciclos.' : ''}
          </span>
        </div>
        {canImg ? (
          <ImageField
            id="mimg"
            label="Imagem do mapa"
            help={
              editing
                ? 'Opcional: escolha outra imagem só para trocar a atual. Trocar a imagem exclui os marcadores do mapa. PNG, JPG, WebP ou GIF, até 20 MB.'
                : 'PNG, JPG, WebP ou GIF, até 20 MB. A imagem é guardada no tamanho original.'
            }
            existing={existing}
            value={img}
            onChange={setImg}
            onPick={onPick}
            dropRef={drop}
          />
        ) : null}
        <VisibilityFlag id="mvis" item={m} share draft={vis} onChange={setVis} />
        <div id="mfSwap">
          {swapAsk ? (
            <div className="confirm" role="alert">
              <span>
                Este mapa tem <b>{plural(swapAsk.count, 'marcador', 'marcadores')}</b>. Se a imagem for trocada, <b>todos os marcadores existentes no mapa serão excluídos</b>, porque as
                posições deles valem só para a imagem atual. Não dá para desfazer.
              </span>
              <div className="btn-row">
                <button
                  className="btn danger solid"
                  type="button"
                  id="mfSwapYes"
                  ref={swapYes}
                  onClick={() => {
                    confirmed.current = true;
                    setSwapAsk(null);
                    submit();
                  }}
                >
                  Trocar imagem e excluir marcadores
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  id="mfSwapNo"
                  onClick={() => {
                    confirmed.current = false;
                    setSwapAsk(null);
                    setImg(noImagePick);
                    toast('Troca cancelada. A imagem e os marcadores continuam como estavam.');
                    saveBtn.current?.focus();
                  }}
                >
                  Cancelar troca
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <div className="form-err" id="mfErr" role="alert">
          {formErr}
        </div>
        <div className="btn-row" style={{justifyContent: 'flex-end'}}>
          <button className="btn ghost" type="button" id="mfCancel" disabled={!!busy} onClick={() => closeDialog()}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" id="mfSave" ref={saveBtn} disabled={!!busy}>
            {busy || (editing ? 'Salvar mapa' : 'Criar mapa')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
