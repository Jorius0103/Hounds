import sys

def patch():
    with open('mesa.html', 'r', encoding='utf-8') as f:
        c = f.read()

    # 1. 80px distance between functions across the topbar
    t_gap = 'className:"w-full max-w-[1920px] mx-auto flex items-center justify-between gap-4 sm:gap-6 md:gap-8 flex-nowrap overflow-x-auto scrollbar-none"'
    assert c.count(t_gap) == 1, "t_gap count mismatch"
    r_gap = 'className:"w-full max-w-[1920px] mx-auto flex items-center justify-between flex-nowrap overflow-x-auto scrollbar-none",style:{gap:"80px"}'
    c = c.replace(t_gap, r_gap, 1)
    print("Patch 1 (80px distance between topbar functions) applied!")

    # 2. Put 'Tela Inicial / Tela Detalhada' button as FIRST button in Zone 1
    # Find Zone 1 opening
    t_z1 = 'className:"flex items-center gap-3 sm:gap-4 shrink-0 flex-nowrap",children:[isMestre?'
    assert c.count(t_z1) == 1, "t_z1 count mismatch"
    
    # We find the home button in the file
    idx_home = c.find('onOpenHomeScreen&&(0,q.jsxs)("button",{type:"button",onClick:onOpenHomeScreen,className:`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg transition-all shadow-sm font-medium border ${isHomeScreen?"bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30":"bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-white"}`')
    assert idx_home != -1, "Cannot find idx_home"
    
    # End of the home button
    target_end = 'children:isHomeScreen?"Tela Detalhada":"Tela Inicial"})]}),'
    idx_home_end = c.find(target_end, idx_home) + len(target_end)
    home_button_code = c[idx_home:idx_home_end]

    # Remove the first occurrence from inside the Mestre section
    c = c[:idx_home] + c[idx_home_end:]
    
    # Now find the second occurrence (inside Jogador section) and remove it too
    idx_home2 = c.find('onOpenHomeScreen&&(0,q.jsxs)("button",{type:"button",onClick:onOpenHomeScreen')
    assert idx_home2 != -1, "Cannot find second idx_home2"
    idx_home2_end = c.find(target_end, idx_home2) + len(target_end)
    c = c[:idx_home2] + c[idx_home2_end:]

    # Now insert home_button_code at the start of Zone 1!
    r_z1 = 'className:"flex items-center gap-3 sm:gap-4 shrink-0 flex-nowrap",children:[' + home_button_code + 'isMestre?'
    assert c.count(t_z1) == 1, "t_z1 count after removal mismatch"
    c = c.replace(t_z1, r_z1, 1)
    print("Patch 2 (Home screen button placed as first button in Zone 1) applied!")

    # 3. Double the volume slider width (w-16 sm:w-24 style:{width:"80px"})
    t_vol = 'className:"w-8 sm:w-11 h-1.5 bg-slate-750 rounded-lg appearance-none cursor-pointer accent-amber-500"'
    assert c.count(t_vol) == 1, "t_vol count mismatch"
    r_vol = 'className:"w-16 sm:w-24 h-1.5 bg-slate-750 rounded-lg appearance-none cursor-pointer accent-amber-500",style:{width:"80px"}'
    c = c.replace(t_vol, r_vol, 1)
    print("Patch 3 (Volume slider doubled in width) applied!")

    # 4. DicePickerModal & button coords measurement:
    # In TopNav state, add dicePickerCoords
    t_state = 'let[dicePickerOpen,setDicePickerOpen]=(0,t1.useState)(!1);'
    assert c.count(t_state) == 1, "t_state count mismatch"
    r_state = 'let[dicePickerOpen,setDicePickerOpen]=(0,t1.useState)(!1);let[dicePickerCoords,setDicePickerCoords]=(0,t1.useState)(null);'
    c = c.replace(t_state, r_state, 1)

    # Button + Dados: add id and measure coords
    t_btn = 'onClick:()=>setDicePickerOpen(!dicePickerOpen)'
    if t_btn not in c:
        # let's check what onClick was on + Dados button
        idx_b = c.find('title:"Abrir seletor de dados Roll20')
        btn_slice = c[idx_b-120:idx_b]
        print("btn_slice before title:", btn_slice)
        # It's likely onClick:()=>setDicePickerOpen(!dicePickerOpen) or onClick:()=>setDicePickerOpen(!prev)
    
    t_btn_match = 'title:"Abrir seletor de dados Roll20 (D4, D6, D8, D10, D12, D20, D100)"'
    # Find button before it
    idx_btn_title = c.find(t_btn_match)
    btn_start = c.rfind('(0,q.jsxs)("button",{type:"button",', 0, idx_btn_title)
    old_btn_open = c[btn_start:idx_btn_title + len(t_btn_match)]
    
    new_btn_open = '(0,q.jsxs)("button",{id:"btn-dice-picker",type:"button",onClick:()=>{if(!dicePickerOpen){let btn=document.getElementById("btn-dice-picker");if(btn){let r=btn.getBoundingClientRect();setDicePickerCoords({top:Math.round(r.bottom+8),right:Math.max(12,Math.round(window.innerWidth-r.right))});}setDicePickerOpen(!0);}else{setDicePickerOpen(!1);}},className:`flex items-center gap-1 px-2.5 py-1 text-xs font-black rounded-lg transition-all shadow-sm font-mono border cursor-pointer ${dicePickerOpen?"bg-amber-500 text-slate-950 border-amber-400":"bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-white border-slate-750 hover:border-amber-500/50"}`,title:"Abrir seletor de dados Roll20 (D4, D6, D8, D10, D12, D20, D100)"'
    c = c[:btn_start] + new_btn_open + c[idx_btn_title + len(t_btn_match):]

    # Pass anchorRect to DicePickerModal in TopNav
    t_dp_call = '(0,q.jsx)(DicePickerModal,{isOpen:dicePickerOpen,onClose:()=>setDicePickerOpen(!1),onRoll:(cnt,sds)=>onRollDice&&onRollDice(cnt,sds)})'
    assert c.count(t_dp_call) == 1, "t_dp_call count mismatch"
    r_dp_call = '(0,q.jsx)(DicePickerModal,{isOpen:dicePickerOpen,onClose:()=>setDicePickerOpen(!1),onRoll:(cnt,sds)=>onRollDice&&onRollDice(cnt,sds),anchorRect:dicePickerCoords})'
    c = c.replace(t_dp_call, r_dp_call, 1)

    # Now update DicePickerModal implementation to accept anchorRect and return E1().createPortal(..., document.body)
    idx_dp_func = c.find('var DicePickerModal=({isOpen:isOpen,onClose:onClose,onRoll:onRoll})=>{')
    assert idx_dp_func != -1, "Cannot find DicePickerModal function signature"
    c = c.replace('var DicePickerModal=({isOpen:isOpen,onClose:onClose,onRoll:onRoll})=>{', 'var DicePickerModal=({isOpen:isOpen,onClose:onClose,onRoll:onRoll,anchorRect:anchorRect})=>{', 1)

    # Change DicePickerModal return statement
    old_dp_ret_start = """return (0,ct.jsxs)("div",{
    className:"absolute top-full right-0 mt-2 z-50 select-none",
    style:{position:"absolute",top:"calc(100% + 8px)",right:0,zIndex:99999},
    children:[
      (0,ct.jsx)("div",{
        className:"fixed inset-0 z-40 bg-transparent select-none",
        style:{position:"fixed",inset:0,zIndex:99990,background:"transparent"},
        onClick:onClose
      }),
      (0,ct.jsxs)("div",{
        className:"relative z-50 w-80 sm:w-88 max-w-[calc(100vw-24px)] bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden font-sans",
        style:{position:"relative",zIndex:99999,width:"340px",maxWidth:"calc(100vw - 24px)",background:"#0f172a",border:"1px solid #334155",borderRadius:"16px",boxShadow:"0 20px 40px rgba(0, 0, 0, 0.8)",overflow:"hidden"},
        onClick:e=>e.stopPropagation(),"""

    new_dp_ret_start = """return E1().createPortal((0,ct.jsxs)("div",{
    className:"fixed inset-0 select-none pointer-events-auto",
    style:{position:"fixed",inset:0,zIndex:99999,pointerEvents:"auto"},
    children:[
      (0,ct.jsx)("div",{
        className:"fixed inset-0 bg-transparent select-none",
        style:{position:"fixed",inset:0,zIndex:99998,background:"transparent"},
        onClick:onClose
      }),
      (0,ct.jsxs)("div",{
        className:"bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden font-sans ring-1 ring-black/70",
        style:{position:"fixed",top:anchorRect?anchorRect.top+"px":"56px",right:anchorRect?anchorRect.right+"px":"16px",zIndex:99999,width:"340px",maxWidth:"calc(100vw - 24px)",background:"#0f172a",border:"1px solid #334155",borderRadius:"16px",boxShadow:"0 20px 40px rgba(0, 0, 0, 0.8)",overflow:"hidden"},
        onClick:e=>e.stopPropagation(),"""

    assert old_dp_ret_start in c, "old_dp_ret_start not found in c"
    c = c.replace(old_dp_ret_start, new_dp_ret_start, 1)

    # Update ending of DicePickerModal from `  });\n};` to `  }),document.body);\n};`
    # Let's find ending right before `var PassDayModalComponent`
    idx_pdm = c.find('var PassDayModalComponent =')
    end_bracket = c.rfind('  });\n};', 0, idx_pdm)
    assert end_bracket != -1, "Cannot find end bracket before PassDayModalComponent"
    c = c[:end_bracket] + '  }),document.body);\n};' + c[end_bracket + len('  });\n};'):]
    print("Patch 4 (DicePickerModal createPortal to document.body with anchorRect) applied!")

    with open('mesa.html', 'w', encoding='utf-8') as f:
        f.write(c)

    print("\nALL PATCHES V3 APPLIED CLEANLY TO MESA.HTML!")

if __name__ == '__main__':
    patch()

