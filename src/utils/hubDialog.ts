// Diálogos de aviso e confirmação da Mesa, no lugar de alert() e confirm() do navegador
// (que ficam fora do visual da Mesa e podem ser bloqueados dentro do iframe do hub).
// Montados direto no DOM para poderem ser chamados de qualquer lugar, fora do React.

const OVERLAY_STYLE =
  'position:fixed;inset:0;z-index:2147483000;background:rgba(2,6,23,0.85);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit;overflow-y:auto';

/** Abre um aviso (isConfirm=false) ou uma confirmação; resolve true em OK/Confirmar ou Enter. */
export function hubDialog(msg: string, isConfirm: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    const d = document;
    const ov = d.createElement('div');
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.style.cssText = OVERLAY_STYLE;

    const bx = d.createElement('div');
    bx.style.cssText =
      'position:relative;margin:auto;width:100%;max-width:440px;background:#0f172a;border:1px solid ' +
      (isConfirm ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.35)') +
      ';border-radius:16px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.75);overflow:hidden;color:#e2e8f0;display:flex;flex-direction:column';

    const hdr = d.createElement('div');
    hdr.style.cssText =
      'flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:10px 18px;border-bottom:1px solid ' +
      (isConfirm ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.2)') +
      ';background:' +
      (isConfirm
        ? 'linear-gradient(to right,rgba(136,19,55,0.35),#0f172a,#0f172a)'
        : 'linear-gradient(to right,rgba(69,26,3,0.3),#0f172a,#0f172a)');
    const hLeft = d.createElement('div');
    hLeft.style.cssText = 'display:flex;align-items:center;gap:8px;min-width:0';
    const hBadge = d.createElement('div');
    hBadge.style.cssText =
      'width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;background:' +
      (isConfirm ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)') +
      ';border:1px solid ' +
      (isConfirm ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)') +
      ';color:' +
      (isConfirm ? '#f87171' : '#fbbf24');
    hBadge.textContent = isConfirm ? '⚠' : 'ℹ';
    const hTitle = d.createElement('h4');
    hTitle.style.cssText = 'margin:0;font-size:14px;font-weight:bold;color:#ffffff';
    hTitle.textContent = isConfirm ? 'Confirmar Ação' : 'Aviso da Mesa';
    hLeft.appendChild(hBadge);
    hLeft.appendChild(hTitle);

    const hClose = d.createElement('button');
    hClose.type = 'button';
    hClose.textContent = '×';
    hClose.style.cssText =
      'padding:2px 8px;border-radius:6px;cursor:pointer;background:transparent;border:none;color:#94a3b8;font-size:18px;line-height:1;display:flex;align-items:center;justify-content:center';
    hClose.onclick = () => done(false);
    hdr.appendChild(hLeft);
    hdr.appendChild(hClose);

    const body = d.createElement('div');
    body.style.cssText =
      'padding:14px 18px;font-size:12px;color:#cbd5e1;line-height:1.55;white-space:pre-line;flex:1 1 auto;overflow-y:auto';
    body.textContent = String(msg);

    const ftr = d.createElement('div');
    ftr.style.cssText =
      'flex-shrink:0;display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:10px 18px;border-top:1px solid #1e293b;background:rgba(2,6,23,0.6)';

    const done = (value: boolean) => {
      d.removeEventListener('keydown', onKeyDown, true);
      ov.remove();
      resolve(value);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        done(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        done(true);
      }
    };

    if (isConfirm) {
      const no = d.createElement('button');
      no.type = 'button';
      no.textContent = 'Cancelar';
      no.style.cssText =
        'padding:5px 14px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid #334155;background:#1e293b;color:#cbd5e1';
      no.onclick = () => done(false);
      ftr.appendChild(no);
    }

    const ok = d.createElement('button');
    ok.type = 'button';
    ok.textContent = isConfirm ? 'Confirmar' : 'OK';
    ok.style.cssText =
      'padding:5px 16px;border-radius:7px;font-size:11px;font-weight:bold;cursor:pointer;border:none;background:' +
      (isConfirm ? '#dc2626' : '#f59e0b') +
      ';color:' +
      (isConfirm ? '#ffffff' : '#020617') +
      ';box-shadow:0 2px 4px rgba(0,0,0,0.3)';
    ok.onclick = () => done(true);
    ftr.appendChild(ok);

    bx.appendChild(hdr);
    bx.appendChild(body);
    bx.appendChild(ftr);
    ov.appendChild(bx);
    ov.addEventListener('mousedown', (e) => {
      if (e.target === ov) done(false);
    });
    d.addEventListener('keydown', onKeyDown, true);
    d.body.appendChild(ov);
    setTimeout(() => ok.focus(), 0);
  });
}

export function hubConfirm(msg: string): Promise<boolean> {
  return hubDialog(msg, true);
}

export function hubAlert(msg: string): void {
  hubDialog(msg, false);
}
