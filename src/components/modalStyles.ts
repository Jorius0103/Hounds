import type { CSSProperties } from 'react';

// Visual comum dos modais da Mesa (fundo escuro, caixa com borda âmbar, cabeçalho em degradê e
// rodapé fixo), o mesmo do mesa.html que estava no ar. Inline para não depender da ordem do CSS.

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

export const MODAL_HEADER_STYLE: CSSProperties = {
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 18px',
  borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
  background: 'linear-gradient(to right, rgba(69, 26, 3, 0.3), #0f172a, #0f172a)',
};

export const MODAL_HEADER_ICON_STYLE: CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  background: 'rgba(245, 158, 11, 0.15)',
  border: '1px solid rgba(245, 158, 11, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fbbf24',
  flexShrink: 0,
};

export const MODAL_TITLE_STYLE: CSSProperties = { fontSize: '14px', fontWeight: 'bold', color: '#ffffff', margin: 0 };

export const MODAL_SUBTITLE_STYLE: CSSProperties = { fontSize: '10px', color: '#94a3b8', margin: '1px 0 0 0' };

export const MODAL_CLOSE_STYLE: CSSProperties = {
  padding: '6px',
  borderRadius: '7px',
  cursor: 'pointer',
  flexShrink: 0,
  background: 'transparent',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#94a3b8',
};

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
