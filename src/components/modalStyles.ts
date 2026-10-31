import type { CSSProperties } from 'react';

// Visual comum dos modais da Mesa (fundo escuro, caixa com borda âmbar e rodapé fixo), o mesmo
// do mesa.html que estava no ar. Inline para não depender da ordem do CSS. O cabeçalho fica
// no componente ModalHeader.

export const MODAL_BACKDROP_STYLE: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 99999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
  background: 'rgba(2,6,23,0.85)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  overflowY: 'auto',
};

export function modalCardStyle(maxWidth: string, extra?: CSSProperties): CSSProperties {
  return {
    position: 'relative',
    margin: 'auto',
    width: '100%',
    maxWidth,
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#0f172a',
    border: '1px solid rgba(245,158,11,0.35)',
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.75)',
    overflow: 'hidden',
    ...extra,
  };
}

export const MODAL_FOOTER_STYLE: CSSProperties = {
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: '10px 18px',
  borderTop: '1px solid #1e293b',
  background: 'rgba(2, 6, 23, 0.6)',
  gap: '8px',
};
