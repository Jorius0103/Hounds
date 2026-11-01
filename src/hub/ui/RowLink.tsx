import type {ReactNode} from 'react';
import {Icon} from './Icon';
import {ImageSlot} from './ImageSlot';

// Uma linha das listas das caixas do lado das páginas: a miniatura (o thumbSlot de js/pagina.js, com o ícone até a
// imagem chegar) e o que vem depois dela, como o '<li><a class="row-link">' das páginas antigas.
export function RowLink({href, imgRef, icon, children}: {href: string; imgRef?: string | null; icon: string; children: ReactNode}) {
  return (
    <li>
      <a className="row-link" href={href}>
        <ImageSlot className="mthumb" imgRef={imgRef}>
          <Icon paths={icon} size={16} stroke={1.8} />
        </ImageSlot>
        {children}
      </a>
    </li>
  );
}
