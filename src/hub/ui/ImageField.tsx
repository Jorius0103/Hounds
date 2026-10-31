import {useEffect, useRef, useState, type Dispatch, type Ref, type SetStateAction} from 'react';
import {Icon} from './Icon';
import {useImageUrl} from './ImageSlot';

/** O que o campo de imagem tem para gravar: o arquivo escolhido e as medidas, ou a imagem atual removida. */
export type ImagePick = {file: File | null; dims: {w: number; h: number} | null; removed: boolean; error: string};
export const noImagePick: ImagePick = {file: null, dims: null, removed: false, error: ''};

/**
 * Campo de imagem como o imageFieldHtml e o imageField de js/modal.js: escolher ou arrastar um arquivo, a prévia
 * com o nome e as medidas, remover (removable) e a imagem já salva (existing: a ref, o nome e as medidas para
 * mostrar). O formulário guarda o que foi escolhido (value/onChange) e pode dar foco à área de soltar (dropRef).
 */
export function ImageField({
  id,
  label,
  help,
  removable = false,
  existing = null,
  value,
  onChange,
  dropRef,
}: {
  id: string;
  label: string;
  help: string;
  removable?: boolean;
  existing?: {ref: string; name: string; dims: string} | null;
  value: ImagePick;
  onChange: Dispatch<SetStateAction<ImagePick>>;
  dropRef?: Ref<HTMLLabelElement>;
}) {
  const existingUrl = useImageUrl(existing && existing.ref);
  const [picked, setPicked] = useState<{url: string; name: string; dims: string} | null>(null);
  const [over, setOver] = useState(false);
  const objectUrl = useRef<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  const setError = (error: string) => onChange(v => ({...v, error}));

  function setFile(f: File | null | undefined) {
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
      setPicked(null);
    }
    onChange(v => ({...v, file: null, dims: null}));
    if (!f) return;
    if (ACCEPT.indexOf(f.type) < 0) return setError('Esse formato não é aceito. Use PNG, JPG, WebP ou GIF.');
    if (f.size > 20 * 1024 * 1024) return setError('A imagem passa de 20 MB. Reduza o arquivo e tente de novo.');
    const url = URL.createObjectURL(f), img = new Image();
    img.onload = () => {
      objectUrl.current = url;
      const dims = {w: img.naturalWidth, h: img.naturalHeight};
      setPicked({url, name: f.name, dims: dims.w + ' × ' + dims.h + ' px · ' + fmtBytes(f.size)});
      onChange(v => ({...v, file: f, dims, removed: false, error: ''}));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError('Não foi possível abrir essa imagem. Tente outro arquivo.');
    };
    img.src = url;
  }

  function remove() {
    setFile(null);
    onChange(v => ({...v, removed: true}));
    if (input.current) input.current.value = '';
  }

  const shown = picked || (existing && existingUrl && !value.removed ? {url: existingUrl, name: existing.name, dims: existing.dims} : null);
  const dragging = (on: boolean) => (e: React.DragEvent) => {
    e.preventDefault();
    setOver(on);
  };

  return (
    <div className={'field' + (value.error ? ' invalid' : '')} id={'f_' + id}>
      <span className="lab" id={'lab_' + id}>
        {label}
      </span>
      <label
        className={'drop' + (over ? ' over' : '')}
        id={'drop_' + id}
        ref={dropRef}
        onDragEnter={dragging(true)}
        onDragOver={dragging(true)}
        onDragLeave={dragging(false)}
        onDrop={e => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
          if (f) setFile(f);
        }}
      >
        <input type="file" id={'file_' + id} accept={ACCEPT.join(',')} aria-labelledby={'lab_' + id} ref={input} onChange={e => setFile(e.target.files && e.target.files[0])} />
        <Icon paths={ICON.image} size={26} stroke={1.8} />
        <span>
          <b>Escolher imagem</b> ou arrastar para cá
        </span>
        <small>{help}</small>
      </label>
      <div className="pv" id={'pv_' + id} hidden={!shown}>
        <img id={'pvimg_' + id} alt="Pré-visualização" src={shown ? shown.url : undefined} />
        <div className="pv-meta">
          <span id={'pvname_' + id}>{shown ? shown.name : ''}</span>
          <span id={'pvdims_' + id}>{shown ? shown.dims : ''}</span>
        </div>
      </div>
      <div className="btn-row" id={'pvact_' + id} hidden={!(shown && removable)}>
        <button className="btn ghost" type="button" id={'pvrm_' + id} onClick={remove}>
          <Icon paths={ICON.trash} size={14} />
          Remover imagem
        </button>
      </div>
      <div className="err" id={'err_' + id}>
        {value.error}
      </div>
    </div>
  );
}
