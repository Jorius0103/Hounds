import sys

def patch():
    with open('mesa.html', 'r', encoding='utf-8') as f:
        c = f.read()

    # 1. Remove Brand (Mesa de RPG, GURPS, Swords icon) and increase topbar spacing
    # Locate header and brand in Zone 1
    hdr_prefix = '(0,q.jsxs)("header",{className:"sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800/80 px-3 sm:px-5 py-2",children:[(0,q.jsxs)("div",{className:"w-full max-w-[1920px] mx-auto flex items-center justify-between gap-3 sm:gap-5 md:gap-6 flex-nowrap overflow-x-auto scrollbar-none",children:[(0,q.jsxs)("div",{className:"flex items-center gap-2.5 sm:gap-3.5 shrink-0 flex-nowrap",children:[(0,q.jsxs)("div",{className:"flex items-center gap-2",children:[(0,q.jsx)("div",{className:"w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400",children:(0,q.jsx)(Lr,{size:16})}),(0,q.jsx)("span",{className:"text-sm font-bold tracking-tight text-white whitespace-nowrap hidden sm:inline",children:"Mesa de RPG"}),(0,q.jsx)("span",{className:"text-sm font-bold tracking-tight text-white whitespace-nowrap sm:hidden",children:"GURPS"})]}),isMestre?'
    assert c.count(hdr_prefix) == 1, "hdr_prefix not found uniquely in mesa.html"

    new_hdr_prefix = '(0,q.jsxs)("header",{className:"sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800/80 px-3 sm:px-6 py-2",children:[(0,q.jsxs)("div",{className:"w-full max-w-[1920px] mx-auto flex items-center justify-between gap-4 sm:gap-6 md:gap-8 flex-nowrap overflow-x-auto scrollbar-none",children:[(0,q.jsxs)("div",{className:"flex items-center gap-3 sm:gap-4 shrink-0 flex-nowrap",children:[isMestre?'
    c = c.replace(hdr_prefix, new_hdr_prefix, 1)
    print("Patch 1 (Header spacing & Brand removed) applied!")

    # 2. Make Zone 2 container relative
    t_zone2 = 'className:"flex items-center gap-2 px-2.5 py-1 bg-slate-900/90 border border-slate-750 rounded-lg shadow-inner shrink-0"'
    assert c.count(t_zone2) == 1, "t_zone2 count mismatch"
    r_zone2 = 'className:"relative flex items-center gap-2 px-2.5 py-1 bg-slate-900/90 border border-slate-750 rounded-lg shadow-inner shrink-0"'
    c = c.replace(t_zone2, r_zone2, 1)
    print("Patch 2 (Zone 2 relative) applied!")

    # 3. Zone 3 Audio: remove ml-auto, remove music note icon in active & inactive
    # Let's locate the audio section from Zone 3 container opening to mute button
    idx_z3 = c.find('(0,q.jsxs)("div",{className:"ml-auto flex items-center gap-2.5 px-2.5 py-1 bg-slate-900/95 border border-slate-750 rounded-lg shadow-inner shrink-0"')
    assert idx_z3 != -1, "Cannot find Zone 3 container opening"
    idx_mute = c.find(',(0,q.jsx)("button",{type:"button",onClick:()=>window.audioStreamSync&&window.audioStreamSync.toggleMute()', idx_z3)
    assert idx_mute != -1, "Cannot find toggleMute after Zone 3"
    old_z3_start = c[idx_z3:idx_mute]

    # Reconstruct clean Zone 3 without ml-auto, without music note icon in active, and without music note icon in inactive
    # Inside old_z3_start, we keep unlockAudio if needed, and in active broadcast we keep the pulsing dot + broadcaster name
    new_z3_start = '(0,q.jsxs)("div",{className:"flex items-center gap-2.5 px-3 py-1 bg-slate-900/95 border border-slate-750 rounded-lg shadow-inner shrink-0",children:[audioState.needsInteraction&&!audioState.isBroadcasting?(0,q.jsx)("button",{type:"button",onClick:()=>window.audioStreamSync&&window.audioStreamSync.unlockAudio(),className:"flex items-center gap-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black rounded shadow-md animate-pulse cursor-pointer shrink-0",title:"Clique para habilitar a reprodu\xe7\xe3o do \xe1udio no seu navegador",children:(0,q.jsx)("span",{children:"\u25b6 Ouvir Trilha"})}):null,audioState.hasActiveBroadcast?(0,q.jsxs)("div",{className:"flex items-center gap-1.5 max-w-[120px] sm:max-w-[160px] truncate",title:"Transmitindo: "+(audioState.broadcasterName||"Mestre"),children:[(0,q.jsxs)("span",{className:"flex h-2 w-2 relative shrink-0",children:[(0,q.jsx)("span",{className:"animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"}),(0,q.jsx)("span",{className:"relative inline-flex rounded-full h-2 w-2 bg-emerald-500"})]}),(0,q.jsx)("span",{className:"text-[11px] font-bold text-amber-300 truncate font-mono",children:audioState.broadcasterName||"Mestre"})]}):null'

    c = c[:idx_z3] + new_z3_start + c[idx_mute:]
    print("Patch 3 (Zone 3 ml-auto removed & Music icons removed) applied!")

    # 4. Volume slider width increase (w-8 sm:w-11)
    t_vol = 'className:"w-5 sm:w-7 h-1.5 bg-slate-750 rounded-lg appearance-none cursor-pointer accent-amber-500"'
    assert c.count(t_vol) == 1, "t_vol count mismatch"
    r_vol = 'className:"w-8 sm:w-11 h-1.5 bg-slate-750 rounded-lg appearance-none cursor-pointer accent-amber-500"'
    c = c.replace(t_vol, r_vol, 1)
    print("Patch 4 (Volume slider enlarged to w-8 sm:w-11) applied!")

    # 5. DicePickerModal Popover & Backdrop Removal
    idx_dp = c.find('return E1().createPortal((0,ct.jsxs)("div",{\n    className:"fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none"')
    assert idx_dp != -1, "Cannot find DicePickerModal createPortal opening"
    
    # Inside createPortal, the inner card begins with: (0,ct.jsxs)("div",{\n        className:"w-full max-w-sm bg-slate-900 border border-slate-
    idx_card = c.find('(0,ct.jsxs)("div",{\n        className:"w-full max-w-sm bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden font-sans"', idx_dp)
    assert idx_card != -1, "Cannot find inner card opening in DicePickerModal"
    
    # End of createPortal is: }),document.body);
    idx_end = c.find('}),document.body);', idx_card)
    assert idx_end != -1, "Cannot find createPortal ending in DicePickerModal"

    # The card content from right after className to the end of card children
    # Let's inspect what is right after className:"w-full max-w-sm ... font-sans",
    old_card_open = '(0,ct.jsxs)("div",{\n        className:"w-full max-w-sm bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden font-sans",\n        style:{width:"100%",maxWidth:"360px",background:"#0f172a",border:"1px solid #334155",borderRadius:"16px",boxShadow:"0 25px 50px -12px rgba(0, 0, 0, 0.7)",overflow:"hidden"},\n        onClick:e=>e.stopPropagation(),'
    assert old_card_open in c[idx_card:idx_card+500], "Cannot match old_card_open"

    new_card_open = '(0,ct.jsxs)("div",{\n        className:"relative z-50 w-80 sm:w-88 max-w-[calc(100vw-24px)] bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden font-sans",\n        style:{position:"relative",zIndex:99999,width:"340px",maxWidth:"calc(100vw - 24px)",background:"#0f172a",border:"1px solid #334155",borderRadius:"16px",boxShadow:"0 20px 40px rgba(0, 0, 0, 0.8)",overflow:"hidden"},\n        onClick:e=>e.stopPropagation(),'

    # The new opening for the return statement:
    # A relative wrapper with transparent fixed click-catcher and the relative card
    new_dp_return_start = """return (0,ct.jsxs)("div",{
    className:"absolute top-full right-0 mt-2 z-50 select-none",
    style:{position:"absolute",top:"calc(100% + 8px)",right:0,zIndex:99999},
    children:[
      (0,ct.jsx)("div",{
        className:"fixed inset-0 z-40 bg-transparent select-none",
        style:{position:"fixed",inset:0,zIndex:99990,background:"transparent"},
        onClick:onClose
      }),
      """

    # We replace from idx_dp to idx_card with new_dp_return_start
    # Then replace old_card_open with new_card_open
    # And replace ending }),document.body); with });
    card_body = c[idx_card + len(old_card_open):idx_end]
    # In card_body, before ending, there was:
    #         ]
    #       })
    #     ]
    #   })
    # Since we now have children: [ clickCatcher, card ], the closing brackets match:
    #         ]
    #       })
    #     ]
    #   });

    new_dp_full = new_dp_return_start + new_card_open + card_body + "});"
    c = c[:idx_dp] + new_dp_full + c[idx_end + len('}),document.body);'):]
    print("Patch 5 (DicePickerModal transformed to popover with transparent click-catcher) applied!")

    with open('mesa.html', 'w', encoding='utf-8') as f:
        f.write(c)

    print("\nALL PATCHES V2 SUCCESSFULLY APPLIED TO MESA.HTML!")

if __name__ == '__main__':
    patch()
