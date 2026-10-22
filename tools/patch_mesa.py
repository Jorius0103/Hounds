import sys

def patch():
    with open('mesa.html', 'r', encoding='utf-8') as f:
        c = f.read()

    # 1. Pass Day log
    idx_pday = c.find('handleConfirmPassDay=(selectedByChar,passDaysNum=1)=>{')
    assert idx_pday != -1, "Cannot find handleConfirmPassDay"
    sub_curVal = 'let curVal=it.current||0,maxVal=it.max||(curVal+effDays),nxtVal=Math.min(curVal+effDays,maxVal);'
    idx_cur = c.find(sub_curVal, idx_pday)
    assert idx_cur != -1, "Cannot find curVal"
    idx_nxt = c.find('return {...it,current:nxtVal};', idx_cur)
    old_pday_block = c[idx_cur:idx_nxt + len('return {...it,current:nxtVal};')]
    
    # We find where charUpdated.push is
    assert 'charUpdated.push' in old_pday_block
    new_pday_block = """let curVal=it.current||0,maxVal=it.max||(curVal+effDays),nxtVal=Math.min(curVal+effDays,maxVal);
        if(nxtVal>curVal){
          anyUpd=!0;pChanged=!0;
          charUpdated.push(`${it.name} (${curVal}\u2794${nxtVal})`);
        }
        return {...it,current:nxtVal};"""
    c = c.replace(old_pday_block, new_pday_block, 1)
    print("Patch 1 (Pass Day Log) applied!")

    # 2. HT death test warnings (NpcDetailView, NpcListBar, CombatHomeScreen)
    # Pos a: NpcDetailView
    anchor_a = 'N.warningTexts&&N.warningTexts.length>0?N.warningTexts:'
    idx_a = c.find(anchor_a)
    assert idx_a != -1, "Cannot find anchor_a"
    end_a = c.find(';hpW.forEach(', idx_a)
    slice_a = c[idx_a:end_a]
    assert 'Teste de morte (HT)' in slice_a
    # wt=>!(i==="jogador"&&String(wt).indexOf(
    new_slice_a = slice_a.replace('wt=>!(i==="jogador"&&String(wt)', 'wt=>!(i==="jogador"&&!w&&String(wt)')
    assert new_slice_a != slice_a
    c = c[:idx_a] + new_slice_a + c[end_a:]
    print("Patch 2a (HT Warn NpcDetailView) applied!")

    # Pos b: NpcListBar
    anchor_b = 'hpWCard=(N.warningTexts||(N.warningText?[N.warningText]:[])).filter('
    idx_b = c.find(anchor_b)
    assert idx_b != -1, "Cannot find anchor_b"
    end_b = c.find(')),x=', idx_b) + 1
    slice_b = c[idx_b:end_b]
    assert 'Teste de morte (HT)' in slice_b
    new_slice_b = slice_b.replace('wt=>!(i==="jogador"&&String(wt)', 'wt=>!(i==="jogador"&&!w&&String(wt)')
    assert new_slice_b != slice_b
    c = c[:idx_b] + new_slice_b + c[end_b:]
    print("Patch 2b (HT Warn NpcListBar) applied!")

    # Pos c: CombatHomeScreen
    anchor_c = '{let hpW=(s.warningTexts&&s.warningTexts.length>0?s.warningTexts:'
    idx_c = c.find(anchor_c)
    assert idx_c != -1, "Cannot find anchor_c"
    end_c = c.find(';hpW.forEach(', idx_c)
    slice_c = c[idx_c:end_c]
    assert 'Teste de morte (HT)' in slice_c
    new_slice_c = slice_c.replace('w=>!(p==="jogador"&&String(w)', 'w=>!(p==="jogador"&&t.characterType!=="player"&&String(w)')
    assert new_slice_c != slice_c
    c = c[:idx_c] + new_slice_c + c[end_c:]
    print("Patch 2c (HT Warn CombatHomeScreen) applied!")

    # 3. Remove v1.2.0
    t3 = '(0,q.jsx)("span",{className:"text-sm font-bold tracking-tight text-white whitespace-nowrap sm:hidden",children:"GURPS"}),(0,q.jsx)("span",{className:"text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 ml-1.5",children:"v1.2.0"})]})'
    r3 = '(0,q.jsx)("span",{className:"text-sm font-bold tracking-tight text-white whitespace-nowrap sm:hidden",children:"GURPS"})]})'
    assert c.count(t3) == 1, "t3 count not 1"
    c = c.replace(t3, r3, 1)
    print("Patch 3 (Remove v1.2.0) applied!")

    # 4. Insert 2D6 dice button between 3D6 and 1D6
    anchor_3d6 = 'onClick:()=>onRollDice&&onRollDice(3)'
    idx_3d6 = c.find(anchor_3d6)
    assert idx_3d6 != -1, "Cannot find 3D6"
    anchor_1d6 = 'onClick:()=>onRollDice&&onRollDice(1)'
    idx_1d6 = c.find(anchor_1d6, idx_3d6)
    assert idx_1d6 != -1, "Cannot find 1D6"
    # Find button opening before 1d6: `,(0,q.jsxs)("button",{type:"button",onClick:()=>onRollDice&&onRollDice(1)`
    prefix = ',(0,q.jsxs)("button",{type:"button",'
    btn_start = c.rfind(prefix, idx_3d6, idx_1d6)
    assert btn_start != -1, "Cannot find button start before 1D6"

    # Construct 2D6 button
    btn_2d6 = ',(0,q.jsxs)("button",{type:"button",onClick:()=>onRollDice&&onRollDice(2),className:"flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 active:scale-95 text-amber-300 hover:text-white text-xs font-black rounded-lg transition-all shadow-sm font-mono border border-slate-750 hover:border-amber-500/50 cursor-pointer",title:"Rolar 2D6 com anima\xe7\xe3o e registrar no log",children:[(0,q.jsxs)("svg",{viewBox:"0 0 24 24",width:"13",height:"13",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",className:"shrink-0 text-amber-400",children:[(0,q.jsx)("rect",{width:"18",height:"18",x:"3",y:"3",rx:"3"}),(0,q.jsx)("circle",{cx:"8",cy:"8",r:"1.5",fill:"currentColor"}),(0,q.jsx)("circle",{cx:"16",cy:"16",r:"1.5",fill:"currentColor"})]}),(0,q.jsx)("span",{children:"2D6"})]})'
    c = c[:btn_start] + btn_2d6 + c[btn_start:]
    print("Patch 4 (Add 2D6 button) applied!")

    # 5. Audio Streamer Clean up (remove trackTitle, edit button, "DJ:", keep only streamer name)
    anchor_streamer = 'audioState.hasActiveBroadcast?'
    idx_streamer = c.find(anchor_streamer)
    assert idx_streamer != -1, "Cannot find anchor_streamer"
    # End of active + inactive block is before mute button: `,(0,q.jsx)("button",{type:"button",onClick:()=>window.audioStreamSync&&window.audioStreamSync.toggleMute()`
    anchor_mute = ',(0,q.jsx)("button",{type:"button",onClick:()=>window.audioStreamSync&&window.audioStreamSync.toggleMute()'
    idx_mute = c.find(anchor_mute, idx_streamer)
    assert idx_mute != -1, "Cannot find anchor_mute"
    old_audio_block = c[idx_streamer:idx_mute]

    new_audio_block = 'audioState.hasActiveBroadcast?(0,q.jsxs)("div",{className:"flex items-center gap-1.5 max-w-[120px] sm:max-w-[160px] truncate",title:"Transmitindo: "+(audioState.broadcasterName||"Mestre"),children:[(0,q.jsxs)("span",{className:"flex h-2 w-2 relative shrink-0",children:[(0,q.jsx)("span",{className:"animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"}),(0,q.jsx)("span",{className:"relative inline-flex rounded-full h-2 w-2 bg-emerald-500"})]}),(0,q.jsxs)("svg",{viewBox:"0 0 24 24",width:13,height:13,fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",className:"text-emerald-400 shrink-0",children:[(0,q.jsx)("path",{d:"M9 18V5l12-2v13"}),(0,q.jsx)("circle",{cx:6,cy:18,r:3}),(0,q.jsx)("circle",{cx:18,cy:16,r:3})]}),(0,q.jsx)("span",{className:"text-[11px] font-bold text-amber-300 truncate font-mono",children:audioState.broadcasterName||"Mestre"})]}):(0,q.jsx)("div",{className:"flex items-center gap-1 text-slate-400 shrink-0",title:"Trilha Sonora (Inativa)",children:(0,q.jsxs)("svg",{viewBox:"0 0 24 24",width:13,height:13,fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",className:"text-slate-500 shrink-0",children:[(0,q.jsx)("path",{d:"M9 18V5l12-2v13"}),(0,q.jsx)("circle",{cx:6,cy:18,r:3}),(0,q.jsx)("circle",{cx:18,cy:16,r:3})]})})'
    c = c[:idx_streamer] + new_audio_block + c[idx_mute:]
    print("Patch 5 (Audio Streamer Cleanup) applied!")

    # 6. Halve volume slider width
    t6_vol = 'className:"w-10 sm:w-14 h-1.5 bg-slate-750 rounded-lg appearance-none cursor-pointer accent-amber-500"'
    r6_vol = 'className:"w-5 sm:w-7 h-1.5 bg-slate-750 rounded-lg appearance-none cursor-pointer accent-amber-500"'
    assert c.count(t6_vol) == 1, "t6_vol count not 1"
    c = c.replace(t6_vol, r6_vol, 1)
    print("Patch 6 (Halve Volume Slider) applied!")

    # 7. Spacing adjustments for TopNav
    t7_header = 'header",{className:"sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800/80 px-3 lg:px-5 py-2",children:[(0,q.jsxs)("div",{className:"w-full max-w-[1920px] mx-auto flex items-center justify-between gap-2 flex-nowrap overflow-x-auto scrollbar-none",children:[(0,q.jsxs)("div",{className:"flex items-center gap-2 shrink-0 flex-nowrap",children:'
    r7_header = 'header",{className:"sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800/80 px-3 sm:px-5 py-2",children:[(0,q.jsxs)("div",{className:"w-full max-w-[1920px] mx-auto flex items-center justify-between gap-3 sm:gap-5 md:gap-6 flex-nowrap overflow-x-auto scrollbar-none",children:[(0,q.jsxs)("div",{className:"flex items-center gap-2.5 sm:gap-3.5 shrink-0 flex-nowrap",children:'
    assert c.count(t7_header) == 1, "t7_header count not 1"
    c = c.replace(t7_header, r7_header, 1)

    t7_dice = '"div",{className:"flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 border border-slate-750 rounded-lg shadow-inner shrink-0",children:[isMestre&&onToggleHideGmRolls&&'
    r7_dice = '"div",{className:"flex items-center gap-2 px-2.5 py-1 bg-slate-900/90 border border-slate-750 rounded-lg shadow-inner shrink-0",children:[isMestre&&onToggleHideGmRolls&&'
    assert c.count(t7_dice) == 1, "t7_dice count not 1"
    c = c.replace(t7_dice, r7_dice, 1)

    t7_audio = '"div",{className:"ml-auto flex items-center gap-1.5 px-2 py-1 bg-slate-900/95 border border-slate-750 rounded-lg shadow-inner shrink-0",children:[audioState.needsInteraction&&'
    r7_audio = '"div",{className:"ml-auto flex items-center gap-2.5 px-2.5 py-1 bg-slate-900/95 border border-slate-750 rounded-lg shadow-inner shrink-0",children:[audioState.needsInteraction&&'
    assert c.count(t7_audio) == 1, "t7_audio count not 1"
    c = c.replace(t7_audio, r7_audio, 1)
    print("Patch 7 (TopNav Spacing) applied!")

    with open('mesa.html', 'w', encoding='utf-8') as f:
        f.write(c)

    print("\nALL PATCHES SUCCESSFULLY APPLIED TO MESA.HTML!")

if __name__ == '__main__':
    patch()
