import {useEffect, useState, type ReactNode} from 'react';

/** A URL de uma imagem do armazenamento (W.store.imageUrl), que chega depois; null enquanto não chega. */
export function useImageUrl(ref: string | null | undefined) {
  const [loaded, setLoaded] = useState<{ref: string; url: string} | null>(null);
  useEffect(() => {
    if (!ref || !W.store) return;
    let live = true;
    W.store.imageUrl(ref).then(url => {
      if (live && url) setLoaded({ref, url});
    });
    return () => {
      live = false;
    };
  }, [ref]);
  return loaded && loaded.ref === ref ? loaded.url : null;
}

/**
 * Um espaço de imagem como os do thumbSlot e do fillImages de js/pagina.js: mostra o conteúdo (o ícone ou as
 * iniciais) até a imagem chegar e então a <img>. A ref fica no data-img, como na versão antiga.
 */
export function ImageSlot({as: Tag = 'span', className, imgRef, children}: {as?: 'span' | 'div' | 'i'; className?: string; imgRef?: string | null; children: ReactNode}) {
  const url = useImageUrl(imgRef);
  return (
    <Tag className={className} data-img={imgRef || undefined}>
      {url ? <img src={url} alt="" loading="lazy" /> : children}
    </Tag>
  );
}
