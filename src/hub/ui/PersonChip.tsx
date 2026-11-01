import {ImageSlot} from './ImageSlot';

// Um personagem como etiqueta com link, como o personChip de js/tabs/tab-personagens.js: as iniciais (ou a imagem,
// quando chega) e o nome.
export function PersonChip({c}: {c: Character}) {
  return (
    <a className="person" href={charHref(c.id)}>
      <ImageSlot as="i" imgRef={c.image && c.image.ref}>
        {initials(c.name)}
      </ImageSlot>
      {c.name}
    </a>
  );
}
