import os

file_path = os.path.join(os.path.dirname(__file__), '..', 'mesa.html')
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Script tag in <head>
target1 = '<script src="js/dice-roller-3d.js?v=20261021_1300"></script>'
repl1 = '<script src="js/dice-roller-3d.js?v=20261021_1300"></script><script src="js/audio-stream-sync.js?v=20261021_1"></script>'
if target1 not in content:
    raise ValueError('Target 1 not found in mesa.html')
content = content.replace(target1, repl1, 1)
print('1. Script tag added to <head>')

# 2. TopNav state in _p
target2 = 'let[dicePickerOpen,setDicePickerOpen]=(0,t1.useState)(!1);'
repl2 = target2 + 'let[audioState,setAudioState]=(0,t1.useState)(()=>window.audioStreamSync?window.audioStreamSync.getState():{isBroadcasting:!1,hasActiveBroadcast:!1,volume:80,isMuted:!1});(0,t1.useEffect)(()=>{if(window.audioStreamSync)return window.audioStreamSync.subscribe(s=>setAudioState(s));},[]);'
if target2 not in content:
    raise ValueError('Target 2 not found in mesa.html')
content = content.replace(target2, repl2, 1)
print('2. Audio state hooks added to _p')

# 3. TopNav Zone 2 audio control JSX
target3 = '(0,q.jsx)(DicePickerModal,{isOpen:dicePickerOpen,onClose:()=>setDicePickerOpen(!1),onRoll:(cnt,sds)=>onRollDice&&onRollDice(cnt,sds)})]})'
audio_jsx = ',(0,q.jsxs)("div",{className:"flex items-center gap-1.5 px-2 py-1 bg-slate-900/90 border border-slate-750 rounded-lg shadow-inner shrink-0",children:[audioState.hasActiveBroadcast?(0,q.jsxs)("div",{className:"flex items-center gap-1.5",title:"Trilha Sonora transmitida por: "+(audioState.broadcasterName||"Mestre"),children:[(0,q.jsxs)("span",{className:"flex h-2 w-2 relative",children:[(0,q.jsx)("span",{className:"animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"}),(0,q.jsx)("span",{className:"relative inline-flex rounded-full h-2 w-2 bg-emerald-500"})]}),(0,q.jsxs)("svg",{viewBox:"0 0 24 24",width:13,height:13,fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",className:"text-emerald-400 shrink-0",children:[(0,q.jsx)("path",{d:"M9 18V5l12-2v13"}),(0,q.jsx)("circle",{cx:6,cy:18,r:3}),(0,q.jsx)("circle",{cx:18,cy:16,r:3})]}),(0,q.jsx)("span",{className:"text-[11px] font-semibold text-emerald-300 hidden md:inline truncate max-w-[90px]",children:audioState.isBroadcasting?"Transmitindo":audioState.broadcasterName||"Trilha"})]}):(0,q.jsxs)("div",{className:"flex items-center gap-1 text-slate-400",title:"Trilha Sonora (Inativa)",children:[(0,q.jsxs)("svg",{viewBox:"0 0 24 24",width:13,height:13,fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",className:"text-slate-500 shrink-0",children:[(0,q.jsx)("path",{d:"M9 18V5l12-2v13"}),(0,q.jsx)("circle",{cx:6,cy:18,r:3}),(0,q.jsx)("circle",{cx:18,cy:16,r:3})]}),(0,q.jsx)("span",{className:"text-[11px] text-slate-400 hidden xl:inline",children:"Música"})]}),(0,q.jsx)("button",{type:"button",onClick:()=>window.audioStreamSync&&window.audioStreamSync.toggleMute(),className:"p-1 rounded-md transition-all cursor-pointer "+(audioState.isMuted?"text-rose-400 hover:text-rose-300 bg-rose-950/40 border border-rose-800/50":"text-slate-300 hover:text-white hover:bg-slate-800"),title:audioState.isMuted?"Música mutada (clique para ativar áudio)":"Mutar música",children:audioState.isMuted?(0,q.jsxs)("svg",{viewBox:"0 0 24 24",width:13,height:13,fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",children:[(0,q.jsx)("polygon",{points:"11 5 6 9 2 9 2 15 6 15 11 19 11 5"}),(0,q.jsx)("line",{x1:22,x2:16,y1:9,y2:15}),(0,q.jsx)("line",{x1:16,x2:22,y1:9,y2:15})]}):(0,q.jsxs)("svg",{viewBox:"0 0 24 24",width:13,height:13,fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",children:[(0,q.jsx)("polygon",{points:"11 5 6 9 2 9 2 15 6 15 11 19 11 5"}),(0,q.jsx)("path",{d:"M15.54 8.46a5 5 0 0 1 0 7.07"}),(0,q.jsx)("path",{d:"M19.07 4.93a10 10 0 0 1 0 14.14"})]})}),(0,q.jsxs)("div",{className:"flex items-center gap-1",children:[(0,q.jsx)("input",{type:"range",min:0,max:100,value:audioState.isMuted?0:audioState.volume,onChange:evt=>window.audioStreamSync&&window.audioStreamSync.setVolume(Number(evt.target.value)),className:"w-14 sm:w-18 h-1.5 bg-slate-750 rounded-lg appearance-none cursor-pointer accent-amber-500",title:"Volume: "+(audioState.isMuted?"Mutado":audioState.volume+"%")}),(0,q.jsx)("span",{className:"text-[10px] font-mono font-bold text-slate-400 w-6 text-right hidden sm:inline",children:audioState.isMuted?"0%":audioState.volume+"%"})]}),(isMestre||canEditCurrent)?(audioState.isBroadcasting?(0,q.jsxs)("button",{type:"button",onClick:()=>window.audioStreamSync&&window.audioStreamSync.stopBroadcasting(),className:"flex items-center gap-1 px-2 py-0.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-[11px] font-bold rounded border border-rose-700/60 transition-all cursor-pointer shadow-xs ml-0.5",title:"Encerrar transmissão da trilha sonora",children:[(0,q.jsxs)("svg",{viewBox:"0 0 24 24",width:11,height:11,fill:"currentColor",className:"text-rose-400",children:[(0,q.jsx)("rect",{width:16,height:16,x:4,y:4,rx:2})]}),(0,q.jsx)("span",{className:"hidden sm:inline",children:"Parar"})]}):(0,q.jsxs)("button",{type:"button",onClick:()=>window.audioStreamSync&&window.audioStreamSync.startBroadcasting(c?.name||(isMestre?"Mestre":"Jogador")),className:"flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 text-slate-300 text-[11px] font-bold rounded border border-slate-700 hover:border-emerald-600/60 transition-all cursor-pointer shadow-xs ml-0.5",title:"Transmitir áudio de uma aba do Spotify, YouTube ou do sistema para todos os jogadores",children:[(0,q.jsxs)("svg",{viewBox:"0 0 24 24",width:11,height:11,fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",className:"text-emerald-400",children:[(0,q.jsx)("circle",{cx:12,cy:12,r:2}),(0,q.jsx)("path",{d:"M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"})]}),(0,q.jsx)("span",{className:"hidden sm:inline",children:"Transmitir"})]})):null]})'
repl3 = target3 + audio_jsx
if target3 not in content:
    raise ValueError('Target 3 not found in mesa.html')
content = content.replace(target3, repl3, 1)
print('3. Audio controls JSX injected into TopNav Zone 2')

# 4. ha.connect & ha.onSyncMessage
target4 = 'ha.connect();let C=ha.onStatusChange(L=>{s(L)}),B=ha.onSyncMessage(L=>{'
repl4 = 'ha.connect();if(window.audioStreamSync&&typeof window.audioStreamSync.init==="function"){window.audioStreamSync.init(ha.getClientId(),function(p){ha.sendPayloadImmediate(p);});}let C=ha.onStatusChange(L=>{s(L)}),B=ha.onSyncMessage(L=>{if(L&&(String(L.type).indexOf("AUDIO_STREAM_")===0||String(L.type).indexOf("RTC_")===0)){if(window.audioStreamSync)window.audioStreamSync.handleSignalMessage(L);return;}'
if target4 not in content:
    raise ValueError('Target 4 not found in mesa.html')
content = content.replace(target4, repl4, 1)
print('4. ha.connect and signal message listener wired')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: mesa.html updated with Audio Streaming!')

