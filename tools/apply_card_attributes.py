import sys

def apply_patch():
    with open('mesa.html', 'r', encoding='utf-8') as f:
        c = f.read()

    # Find insertion or replacement
    target = 'children:s.name}):(0,I.jsx)("span",{className:"text-[11px] text-slate-500 italic bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800/80 block",children:"Sem manobra"})})]})'
    idx_target = c.find(target)
    assert idx_target != -1, "Target not found"

    idx1 = idx_target + len(target)
    idx2 = c.find(' ,(()=>{let cb=[];', idx1)
    assert idx2 != -1, "End cb marker not found"

    new_attr_line = ''',(showStats&&(0,I.jsxs)("div",{className:"w-full flex items-center justify-between px-2.5 py-1 bg-slate-950/70 border border-slate-800/80 rounded-lg select-none text-[11px] gap-1.5 flex-wrap sm:flex-nowrap",title:"Atributos: ST, DX, IQ, HT, Per, Will, Spd, Move",children:[(0,I.jsxs)("span",{className:"inline-flex items-center gap-1 shrink-0",title:"For\xe7a (ST)",children:[(0,I.jsx)("span",{className:"font-bold text-slate-400 text-[10px] mr-0.5",children:"ST"}),(0,I.jsx)("span",{className:"font-mono font-black text-amber-300 text-xs",children:h.st??10})]}),(0,I.jsxs)("span",{className:"inline-flex items-center gap-1 shrink-0",title:"Destreza (DX)",children:[(0,I.jsx)("span",{className:"font-bold text-slate-400 text-[10px] mr-0.5",children:"DX"}),(0,I.jsx)("span",{className:"font-mono font-black text-amber-300 text-xs",children:h.dx??10})]}),(0,I.jsxs)("span",{className:"inline-flex items-center gap-1 shrink-0",title:"Intelig\xeancia (IQ)",children:[(0,I.jsx)("span",{className:"font-bold text-slate-400 text-[10px] mr-0.5",children:"IQ"}),(0,I.jsx)("span",{className:"font-mono font-black text-amber-300 text-xs",children:h.iq??10})]}),(0,I.jsxs)("span",{className:"inline-flex items-center gap-1 shrink-0",title:"Vitalidade (HT)",children:[(0,I.jsx)("span",{className:"font-bold text-slate-400 text-[10px] mr-0.5",children:"HT"}),(0,I.jsx)("span",{className:"font-mono font-black text-amber-300 text-xs",children:h.ht??10})]}),(0,I.jsx)("div",{className:"hidden sm:block h-3.5 w-[1px] bg-slate-800 shrink-0"}),(0,I.jsxs)("span",{className:"inline-flex items-center gap-1 shrink-0",title:"Percep\xe7\xe3o (Per)",children:[(0,I.jsx)("span",{className:"font-bold text-teal-400 text-[10px] mr-0.5",children:"Per"}),(0,I.jsx)("span",{className:"font-mono font-black text-teal-200 text-xs",children:h.per??h.iq??10})]}),(0,I.jsxs)("span",{className:"inline-flex items-center gap-1 shrink-0",title:"Vontade (Will)",children:[(0,I.jsx)("span",{className:"font-bold text-indigo-300 text-[10px] mr-0.5",children:"Will"}),(0,I.jsx)("span",{className:"font-mono font-black text-indigo-200 text-xs",children:h.will??h.iq??10})]}),(0,I.jsxs)("span",{className:"inline-flex items-center gap-1 shrink-0",title:"Basic Speed (Spd)",children:[(0,I.jsx)("span",{className:"font-bold text-amber-400 text-[10px] mr-0.5",children:"Spd"}),(0,I.jsx)("span",{className:"font-mono font-black text-amber-300 text-xs",children:h.basicSpeed??0})]}),(0,I.jsxs)("span",{className:"inline-flex items-center gap-1 shrink-0",title:"Basic Move (Move)",children:[(0,I.jsx)("span",{className:"font-bold text-emerald-400 text-[10px] mr-0.5",children:"Move"}),(0,I.jsx)("span",{className:"font-mono font-black text-emerald-300 text-xs whitespace-nowrap",children:(h.basicMove!==void 0&&h.basicMove!==null&&String(h.basicMove).trim()!=="")?h.basicMove:(h.basicSpeed?Math.floor(h.basicSpeed):0)})]})]}))'''

    new_c = c[:idx1] + new_attr_line + c[idx2:]

    with open('mesa.html', 'w', encoding='utf-8') as f:
        f.write(new_c)

    print("Successfully patched mesa.html with character attributes line!")

if __name__ == '__main__':
    apply_patch()
