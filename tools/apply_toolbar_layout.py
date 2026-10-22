import re

def apply_patch():
    with open('mesa.html', 'r', encoding='utf-8') as f:
        c = f.read()

    old_start = 'className:"flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0",children:['
    assert c.count(old_start) == 1, f"Expected 1 occurrence of old_start, found {c.count(old_start)}"

    idx1 = c.find(old_start)
    idx2 = c.find(',isHome?(0,I.jsx)("div"', idx1)
    old_full = c[idx1:idx2]

    prefix = old_start
    inner = old_full[len(prefix):-len(']})')]

    # 1. Filtro part
    idx_ordem_span = inner.find('(0,I.jsx)("span",{className:"text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1.5 select-none",children:"Ordem:"}')
    ordem_div_start = inner.rfind('(0,I.jsxs)("div",', 0, idx_ordem_span)
    filtro_code = inner[:ordem_div_start-1]

    # 2. Ordem part
    idx_part3 = inner.find('(0,I.jsxs)("div",{className:"flex items-center gap-1.5 text-xs w-full sm:w-auto",children:[')
    ordem_code = inner[ordem_div_start:idx_part3-1]

    # 3. Actions part and Rodada part from part3
    part3 = inner[idx_part3:]
    idx_rodada = part3.find('(0,I.jsxs)("div",{className:"flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 rounded-xl px-2.5 py-1 shadow-inner ml-2 shrink-0"')
    rodada_code = part3[idx_rodada:-len(']})')]

    # Rodadas: aligned to the right with sm:ml-auto, and increased padding and gap
    new_rodada_code = rodada_code.replace(
        'className:"flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 rounded-xl px-2.5 py-1 shadow-inner ml-2 shrink-0"',
        'className:"flex items-center gap-2 bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-1 shadow-inner shrink-0 sm:ml-auto"'
    )

    # Actions: + Personagem e + NPC with clear spacing and cursor-pointer
    actions_code = '''i==="mestre"&&(0,I.jsxs)("div",{className:"flex items-center gap-3 text-xs shrink-0",children:[o&&(0,I.jsxs)("button",{onClick:o,className:"flex items-center justify-center gap-1.5 px-3 py-1 text-[11px] font-bold bg-emerald-800 hover:bg-emerald-700 text-emerald-100 rounded-lg shadow-sm transition-all active:scale-95 whitespace-nowrap border border-emerald-600/50 cursor-pointer",title:"Cadastrar Novo Personagem de Jogador",children:[(0,I.jsx)(Dp,{size:12,className:"text-emerald-300"}),(0,I.jsx)("span",{children:"+ Personagem"})]}),(0,I.jsx)("button",{onClick:r,disabled:isNoCombat,className:"flex items-center justify-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-lg shadow-sm whitespace-nowrap border cursor-pointer "+(isNoCombat?"bg-slate-800 text-slate-500 border-slate-700/60 opacity-40 cursor-not-allowed":"bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400/60 active:scale-95 transition-all"),title:isNoCombat?"Não é possível adicionar NPCs no modo Sem Combate":"Adicionar Novo NPC ao combate ativo",children:(0,I.jsx)("span",{children:"+ NPC"})})]})'''

    # Assemble new toolbar layout:
    # - Full width container (w-full)
    # - Justify between
    # - Left container grouping Filtro, Ordem and Actions with 36px gap
    # - Right container with Rodadas pushed to far right
    new_toolbar = (
        'className:"w-full flex flex-wrap items-center justify-between gap-y-3 py-0.5 shrink-0",children:['
        + '(0,I.jsxs)("div",{className:"flex flex-wrap items-center gap-6 sm:gap-8 lg:gap-10",style:{gap:"36px"},children:['
        + filtro_code + ','
        + ordem_code + ','
        + actions_code
        + ']}),'
        + new_rodada_code
        + ']})'
    )

    new_c = c[:idx1] + new_toolbar + c[idx2:]

    with open('mesa.html', 'w', encoding='utf-8') as f:
        f.write(new_c)

    print("Successfully patched mesa.html toolbar layout!")

if __name__ == '__main__':
    apply_patch()

