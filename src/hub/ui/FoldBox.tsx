import {useState, type ReactNode} from 'react';
import {Icon} from './Icon';

const CHEVRON = '<path d="m9 18 6-6-6-6"/>';

/**
 * Caixa recolhível do lado das páginas, como o foldBox de js/pagina.js. Fica como a pessoa deixou enquanto a
 * página está aberta, e uma página nova começa como começa (a casca remonta a página a cada item; HubApp.tsx).
 * count aparece ao lado do título, quando não é null.
 */
export function FoldBox({foldKey, title, count = null, startOpen = false, children}: {foldKey: string; title: string; count?: string | number | null; startOpen?: boolean; children: ReactNode}) {
  const [open, setOpen] = useState(startOpen);
  return (
    <details className="box fold" data-fold={foldKey} open={open} onToggle={e => setOpen(e.currentTarget.open)}>
      <summary>
        <h2 className="sec-title">{title}</h2>
        {count != null ? <span className="fold-count">{count}</span> : null}
        <span className="fold-chev">
          <Icon paths={CHEVRON} size={14} stroke={2.4} />
        </span>
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  );
}
