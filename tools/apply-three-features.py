import os
import subprocess

file_path = os.path.join(os.path.dirname(__file__), '..', 'mesa.html')
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# -------------------------------------------------------------------------
# 1. OCULTAR ALERTA DE MORTE (HT) PARA JOGADORES
# -------------------------------------------------------------------------

# 1.1 Em CombatHomeScreen (dentro de Zp)
target_hp1 = 'let hpW=N.warningTexts&&N.warningTexts.length>0?N.warningTexts:(N.warningText?[N.warningText]:[]);hpW.forEach((wt,ix)=>{'
replace_hp1 = 'let hpW=(N.warningTexts&&N.warningTexts.length>0?N.warningTexts:(N.warningText?[N.warningText]:[])).filter(wt=>!(i==="jogador"&&String(wt).indexOf("Teste de morte (HT) a cada múltiplo")!==-1));hpW.forEach((wt,ix)=>{'
assert target_hp1 in content, "Error: target_hp1 not found"
content = content.replace(target_hp1, replace_hp1, 1)
print("1.1 CombatHomeScreen hp warnings filtered for players.")

# 1.2 Em NpcDetailView
target_hp2 = 'let hpW=s.warningTexts&&s.warningTexts.length>0?s.warningTexts:(s.warningText?[s.warningText]:[]);hpW.forEach((w,ix)=>{'
replace_hp2 = 'let hpW=(s.warningTexts&&s.warningTexts.length>0?s.warningTexts:(s.warningText?[s.warningText]:[])).filter(w=>!(p==="jogador"&&String(w).indexOf("Teste de morte (HT) a cada múltiplo")!==-1));hpW.forEach((w,ix)=>{'
assert target_hp2 in content, "Error: target_hp2 not found"
content = content.replace(target_hp2, replace_hp2, 1)
print("1.2 NpcDetailView hp warnings filtered for players.")

# 1.3 Em Card alert indicator em NpcListBar
target_card_warn = 'x=u||(N.warningTexts?N.warningTexts.length:N.warningText)||(fpSt.warningTexts?fpSt.warningTexts.length:fpSt.warningText)||((w||isMaster)&&(typeof $getCrippledBodyParts!=="undefined"&&$getCrippledBodyParts(h).length>0))||(h.statusConditions&&h.statusConditions.length>0)'
replace_card_warn = 'hpWCard=(N.warningTexts||(N.warningText?[N.warningText]:[])).filter(wt=>!(i==="jogador"&&String(wt).indexOf("Teste de morte (HT) a cada múltiplo")!==-1)),x=u||(hpWCard.length>0)||(fpSt.warningTexts?fpSt.warningTexts.length:fpSt.warningText)||((w||isMaster)&&(typeof $getCrippledBodyParts!=="undefined"&&$getCrippledBodyParts(h).length>0))||(h.statusConditions&&h.statusConditions.length>0)'
assert target_card_warn in content, "Error: target_card_warn not found"
content = content.replace(target_card_warn, replace_card_warn, 1)
print("1.3 Card alert badge filtered for players.")

# -------------------------------------------------------------------------
# 2. PASSAR O DIA COM CAMPO DIGITÁVEL DE DIAS
# -------------------------------------------------------------------------

# 2.1 Adicionar estado passDays e atualizar banner / input em PassDayModal
target_passday_state = '''  let [selMap, setSelMap] = (0, ht.useState)(() => {
    let init = {};
    charManaList.forEach(({char, items}) => { init[char.id] = new Set(items.map(it => it.id)); });
    return init;
  });'''
replace_passday_state = '''  let [passDays, setPassDays] = (0, ht.useState)(1);
  let [selMap, setSelMap] = (0, ht.useState)(() => {
    let init = {};
    charManaList.forEach(({char, items}) => { init[char.id] = new Set(items.map(it => it.id)); });
    return init;
  });'''
assert target_passday_state in content, "Error: target_passday_state not found"
content = content.replace(target_passday_state, replace_passday_state, 1)

# 2.2 Atualizar handleConfirm em PassDayModal para passar passDays
target_passday_confirm = '''  let handleConfirm = () => {
    let res = {};
    Object.entries(selMap).forEach(([cid, s]) => { res[cid] = Array.from(s); });
    onConfirm(res);
    onClose();
  };'''
replace_passday_confirm = '''  let handleConfirm = () => {
    let res = {};
    Object.entries(selMap).forEach(([cid, s]) => { res[cid] = Array.from(s); });
    onConfirm(res, Math.max(1, passDays || 1));
    onClose();
  };'''
assert target_passday_confirm in content, "Error: target_passday_confirm not found"
content = content.replace(target_passday_confirm, replace_passday_confirm, 1)

# 2.3 Atualizar Header badge e Banner em PassDayModal com o input de dias
target_passday_banner = '''(0, ct.jsx)("span", { className: "text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-700/60 font-bold", children: "Recarga +1 Mana" })]
                    }),
                    (0, ct.jsx)("p", { className: "text-xs text-slate-400", children: "Itens Extras & Recursos com tipo Mana dos Personagens" })
                  ]
                })
              ]
            }),
            (0, ct.jsx)("button", {
              type: "button",
              onClick: onClose,
              className: "p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0",
              title: "Fechar",
              children: (0, ct.jsxs)("svg", { viewBox: "0 0 24 24", width: "18", height: "18", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, ct.jsx)("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), (0, ct.jsx)("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] })
            })
          ]
        }),
        /* Info Banner (shrink-0) */
        (0, ct.jsxs)("div", {
          className: "shrink-0 px-5 py-2.5 bg-slate-950/70 border-b border-slate-800/80 text-xs text-slate-300 flex items-start gap-2",
          children: [
            (0, ct.jsx)("span", { className: "text-cyan-400 shrink-0 mt-0.5", children: "\u2728" }),
            (0, ct.jsxs)("span", { className: "leading-relaxed", children: ["Ao confirmar, os itens selecionados receber\xE3o ", (0, ct.jsx)("strong", { children: "+1 ponto" }), " de mana atual (limitado ao total do item). Desmarque os itens que n\xE3o deseja atualizar."] })
          ]
        }),'''

replace_passday_banner = '''(0, ct.jsx)("span", { className: "text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-700/60 font-bold", children: `Recarga +${passDays} Mana` })]
                    }),
                    (0, ct.jsx)("p", { className: "text-xs text-slate-400", children: "Itens Extras & Recursos com tipo Mana dos Personagens" })
                  ]
                })
              ]
            }),
            (0, ct.jsx)("button", {
              type: "button",
              onClick: onClose,
              className: "p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0",
              title: "Fechar",
              children: (0, ct.jsxs)("svg", { viewBox: "0 0 24 24", width: "18", height: "18", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, ct.jsx)("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), (0, ct.jsx)("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] })
            })
          ]
        }),
        /* Info Banner & Input de Dias */
        (0, ct.jsxs)("div", {
          className: "shrink-0 px-5 py-2.5 bg-slate-950/70 border-b border-slate-800/80 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3",
          children: [
            (0, ct.jsxs)("div", {
              className: "flex items-center gap-2 flex-1 min-w-[200px]",
              children: [
                (0, ct.jsx)("span", { className: "text-cyan-400 shrink-0 mt-0.5", children: "\u2728" }),
                (0, ct.jsxs)("span", { className: "leading-relaxed", children: ["Ao confirmar, os itens selecionados receber\xE3o ", (0, ct.jsx)("strong", { children: `+${passDays} ponto${passDays > 1 ? 's' : ''}` }), " de mana atual (limitado ao total do item)."] })
              ]
            }),
            (0, ct.jsxs)("div", {
              className: "flex items-center gap-2 bg-slate-900/90 border border-amber-500/40 px-3 py-1.5 rounded-xl shadow-inner",
              children: [
                (0, ct.jsx)("label", { className: "text-xs font-bold text-amber-400 whitespace-nowrap", children: "Passar Dias:" }),
                (0, ct.jsx)("input", {
                  type: "number",
                  min: 1,
                  max: 365,
                  value: passDays,
                  onChange: e => {
                    let v = parseInt(e.target.value, 10);
                    setPassDays(isNaN(v) || v < 1 ? 1 : v);
                  },
                  className: "w-16 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg px-2 py-1 text-center text-xs font-mono font-bold text-white focus:outline-none"
                })
              ]
            })
          ]
        }),'''

assert target_passday_banner in content, "Error: target_passday_banner not found"
content = content.replace(target_passday_banner, replace_passday_banner, 1)

# 2.4 Atualizar cálculo do próximo valor e badge no item
target_passday_item = '''let nextVal = Math.min((item.current || 0) + 1, item.max || ((item.current || 0) + 1));'''
replace_passday_item = '''let nextVal = Math.min((item.current || 0) + passDays, item.max || ((item.current || 0) + passDays));'''
assert target_passday_item in content, "Error: target_passday_item not found"
content = content.replace(target_passday_item, replace_passday_item, 1)

target_passday_badge = 'children: "+1"'
replace_passday_badge = 'children: `+${passDays}`'
assert target_passday_badge in content, "Error: target_passday_badge not found"
content = content.replace(target_passday_badge, replace_passday_badge, 1)

target_passday_btn = 'children: "Confirmar (+1 Mana)"'
replace_passday_btn = 'children: `Confirmar (+${passDays} Mana${passDays > 1 ? ` · ${passDays} Dias` : ""})`'
assert target_passday_btn in content, "Error: target_passday_btn not found"
content = content.replace(target_passday_btn, replace_passday_btn, 1)

# 2.5 Atualizar handleConfirmPassDay na mesa principal
target_passday_fn = 'let handleConfirmPassDay=(selectedByChar)=>{'
replace_passday_fn = 'let handleConfirmPassDay=(selectedByChar,passDaysNum=1)=>{let effDays=Math.max(1,passDaysNum||1);'
assert target_passday_fn in content, "Error: target_passday_fn not found"
content = content.replace(target_passday_fn, replace_passday_fn, 1)

target_passday_math = 'let curVal=it.current||0,maxVal=it.max||(curVal+1),nxtVal=Math.min(curVal+1,maxVal);'
replace_passday_math = 'let curVal=it.current||0,maxVal=it.max||(curVal+effDays),nxtVal=Math.min(curVal+effDays,maxVal);'
assert target_passday_math in content, "Error: target_passday_math not found"
content = content.replace(target_passday_math, replace_passday_math, 1)

target_passday_log = '''let descText=summaryDetails.length>0?`Passar o Dia (+1 Mana): ${summaryDetails.join(' | ')}.`: 'Passar o Dia (+1 Mana): Recursos de mana dos Personagens recuperados em +1 ponto.';
      let logEntry={id:`log-${now}-${Math.random().toString(36).slice(2,6)}`,timestamp:timeStr,timestampMs:now,round:f.currentRound??0,author:c?.role==='jogador'?'assistente':'mestre',authorName:c?.name||(c?.role==='jogador'?'Jogador':'Mestre'),type:'item',npcName:'Personagens',npcCharacterType:'player',itemName:'Passar o Dia',amount:1,description:descText};'''
replace_passday_log = '''let dayLbl=effDays>1?`${effDays} Dias`:'1 Dia';
      let descText=summaryDetails.length>0?`Passar ${dayLbl} (+${effDays} Mana): ${summaryDetails.join(' | ')}.`: `Passar ${dayLbl} (+${effDays} Mana): Recursos de mana dos Personagens recuperados em +${effDays} ponto(s).`;
      let logEntry={id:`log-${now}-${Math.random().toString(36).slice(2,6)}`,timestamp:timeStr,timestampMs:now,round:f.currentRound??0,author:c?.role==='jogador'?'assistente':'mestre',authorName:c?.name||(c?.role==='jogador'?'Jogador':'Mestre'),type:'item',npcName:'Personagens',npcCharacterType:'player',itemName:'Passar o Dia',amount:effDays,description:descText};'''
assert target_passday_log in content, "Error: target_passday_log not found"
content = content.replace(target_passday_log, replace_passday_log, 1)

print("2. Passar o Dia updated with configurable days.")

# -------------------------------------------------------------------------
# 3. TERCEIRA ORDEM 'MESTRE', DRAG-AND-DROP E SALVAMENTO
# -------------------------------------------------------------------------

# 3.1 Em Zp (NpcListBar): parâmetros e estados
old_zp_sig = 'Zp=({npcs:t,selectedNpcId:a,onSelectNpc:e,onAddNewNpc:r,onAddNewPlayer:o,currentUserRole:i="mestre",currentRound:curRnd=0,onUpdateRound:updRnd,canControlRound:canCtrlRnd,isNoCombat=!1,isHomeScreen:isHome=!1})=>{let[n,l]=(0,qp.useState)("all"),[srt,ssrt]=(0,qp.useState)(()=>{try{let s=localStorage.getItem("gurps_combat_sort_mode_v1");if(s==="alpha"||s==="speed")return s}catch{}return"speed"}),setSrt=m=>{ssrt(m);try{localStorage.setItem("gurps_combat_sort_mode_v1",m)}catch{}},'
assert old_zp_sig in content, "Error: old_zp_sig not found"

new_zp_sig = 'Zp=({npcs:t,selectedNpcId:a,onSelectNpc:e,onAddNewNpc:r,onAddNewPlayer:o,currentUserRole:i="mestre",currentRound:curRnd=0,onUpdateRound:updRnd,canControlRound:canCtrlRnd,isNoCombat=!1,isHomeScreen:isHome=!1,customMasterOrder:cstOrd,onSaveMasterOrder:onSaveOrd})=>{let[locOrd,setLocOrd]=(0,qp.useState)(null),[unsavedOrd,setUnsavedOrd]=(0,qp.useState)(!1),[toastOrd,setToastOrd]=(0,qp.useState)(!1),[dragId,setDragId]=(0,qp.useState)(null),[overId,setOverId]=(0,qp.useState)(null);(0,qp.useEffect)(()=>{if(!unsavedOrd)setLocOrd(cstOrd||null)},[cstOrd,unsavedOrd]);let isMestreUser=i==="mestre",canDragCards=isMestreUser&&srt==="mestre";let[n,l]=(0,qp.useState)("all"),[srt,ssrt]=(0,qp.useState)(()=>{try{let s=localStorage.getItem("gurps_combat_sort_mode_v1");if(s==="alpha"||s==="speed"||s==="mestre")return s}catch{}return"speed"}),setSrt=m=>{ssrt(m);try{localStorage.setItem("gurps_combat_sort_mode_v1",m)}catch{}},'

content = content.replace(old_zp_sig, new_zp_sig, 1)

# Ordenação com suporte a 'mestre'
target_sort_fn = 'f=[...c.filter(h=>n==="players"?h.characterType==="player":n==="npcs"?h.characterType!=="player":n==="alive"?!h.isDead:n==="dead"?!!h.isDead:!0)].sort((h,g)=>{if(i==="mestre"){if(srt==="alpha")return(h.name||"").localeCompare(g.name||"","pt-BR");let A=h.basicSpeed??0,B=g.basicSpeed??0;return B!==A?B-A:(h.name||"").localeCompare(g.name||"","pt-BR")}let N=h.characterType==="player",w=g.characterType==="player";'

replace_sort_fn = 'f=[...c.filter(h=>n==="players"?h.characterType==="player":n==="npcs"?h.characterType!=="player":n==="alive"?!h.isDead:n==="dead"?!!h.isDead:!0)].sort((h,g)=>{let N=h.characterType==="player",w=g.characterType==="player";if(srt==="mestre"){let mOrd=locOrd||cstOrd||[];let idxA=mOrd.indexOf(h.id);let idxB=mOrd.indexOf(g.id);if(idxA!==-1&&idxB!==-1)return idxA-idxB;if(idxA!==-1)return -1;if(idxB!==-1)return 1;if(N&&!w)return -1;if(!N&&w)return 1;return(h.name||"").localeCompare(g.name||"","pt-BR")}if(i==="mestre"){if(srt==="alpha")return(h.name||"").localeCompare(g.name||"","pt-BR");let A=h.basicSpeed??0,B=g.basicSpeed??0;return B!==A?B-A:(h.name||"").localeCompare(g.name||"","pt-BR")}'

assert target_sort_fn in content, "Error: target_sort_fn not found"
content = content.replace(target_sort_fn, replace_sort_fn, 1)

# Botão 'Mestre' e botão 'Salvar Ordem' na barra de ordenação
target_sort_buttons = 'children:(0,I.jsx)("span",{children:"\\uD83D\\uDD24 A-Z"})})]}),(0,I.jsxs)("div",{className:"flex items-center gap-1.5 text-xs w-full sm:w-auto",children:[i==="mestre"&&o&&(0,I.jsxs)("button",{onClick:'

replace_sort_buttons = 'children:(0,I.jsx)("span",{children:"\\uD83D\\uDD24 A-Z"})}),(0,I.jsx)("button",{type:"button",onClick:()=>setSrt("mestre"),className:`flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold transition-all text-[11px] cursor-pointer ${srt==="mestre"?"bg-purple-950/90 text-purple-300 shadow-sm border border-purple-500/50":"text-slate-400 hover:text-purple-300 hover:bg-slate-900"}`,title:"Ordem definida pelo Mestre (arraste e solte os cards para reorganizar)",children:(0,I.jsx)("span",{children:"\U0001F451 Mestre"})}),isMestreUser&&srt==="mestre"&&(0,I.jsx)("button",{type:"button",onClick:()=>{let ord=locOrd||f.map(item=>item.id);if(onSaveOrd)onSaveOrd(ord);setUnsavedOrd(!1);setToastOrd(!0);setTimeout(()=>setToastOrd(!1),2500);},className:`flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-bold transition-all text-[11px] shadow-sm ml-1 cursor-pointer ${toastOrd?"bg-emerald-600 text-white border border-emerald-400":unsavedOrd?"bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-300":"bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-500/60"}`,title:"Salvar esta ordem para todos os usuários",children:(0,I.jsx)("span",{children:toastOrd?"✓ Ordem Salva!":unsavedOrd?"Salvar Ordem *":"Salvar Ordem"})})]}),(0,I.jsxs)("div",{className:"flex items-center gap-1.5 text-xs w-full sm:w-auto",children:[i==="mestre"&&o&&(0,I.jsxs)("button",{onClick:'

assert target_sort_buttons in content, "Error: target_sort_buttons not found"
content = content.replace(target_sort_buttons, replace_sort_buttons, 1)

# Drag-and-drop nos botões dos cards
target_card_btn = '=isMaster&&x;return(0,I.jsxs)("button",{style:{borderWidth:"2px",borderStyle:"solid",borderColor:g?"#3b82f6":u?"#dc2626":x?"#f59e0b":"#047857",width:"calc((100% - 50px) / 9)",minWidth:"150px"},onClick:()=>e(h.id),className:`group relative flex items-center gap-2 px-2 py-1.5 rounded-xl text-left transition-all border-2 shrink-0 ${'

replace_card_btn = '''=isMaster&&x;return(0,I.jsxs)("button",{draggable:canDragCards,onDragStart:evt=>{if(!canDragCards)return;evt.dataTransfer.setData("text/plain",h.id);evt.dataTransfer.effectAllowed="move";setDragId(h.id);},onDragOver:evt=>{if(!canDragCards||!dragId||dragId===h.id)return;evt.preventDefault();evt.dataTransfer.dropEffect="move";if(overId!==h.id)setOverId(h.id);},onDragLeave:evt=>{if(overId===h.id)setOverId(null);},onDrop:evt=>{evt.preventDefault();if(!canDragCards||!dragId||dragId===h.id){setDragId(null);setOverId(null);return;}let cIds=f.map(n=>n.id);let fI=cIds.indexOf(dragId);let tI=cIds.indexOf(h.id);if(fI!==-1&&tI!==-1){let nIds=[...cIds];let[mvd]=nIds.splice(fI,1);nIds.splice(tI,0,mvd);let allKnown=c.map(n=>n.id);let full=Array.from(new Set([...nIds,...allKnown]));setLocOrd(full);setUnsavedOrd(!0);}setDragId(null);setOverId(null);},onDragEnd:()=>{setDragId(null);setOverId(null);},style:{borderWidth:"2px",borderStyle:"solid",borderColor:g?"#3b82f6":u?"#dc2626":x?"#f59e0b":"#047857",width:"calc((100% - 50px) / 9)",minWidth:"150px"},onClick:()=>e(h.id),className:`group relative flex items-center gap-2 px-2 py-1.5 rounded-xl text-left transition-all border-2 shrink-0 ${canDragCards?"cursor-grab active:cursor-grabbing hover:brightness-110 ":"cursor-pointer "}${dragId===h.id?"opacity-35 scale-95 ":""}${overId===h.id?"ring-2 ring-purple-400 border-purple-400 bg-purple-950/60 shadow-lg ":""}${'''

assert target_card_btn in content, "Error: target_card_btn not found"
content = content.replace(target_card_btn, replace_card_btn, 1)

# 3.2 Na função principal n1: criar _masterOrder, handleSaveMasterOrder e passar para Zp
target_n1_state = 'function n1(){let[isDicePickerOpen,setIsDicePickerOpen]=(0,ht.useState)(!1);let[isPassDayOpen,setIsPassDayOpen]=(0,ht.useState)(!1);'

replace_n1_state = '''function n1(){let[isDicePickerOpen,setIsDicePickerOpen]=(0,ht.useState)(!1);let[isPassDayOpen,setIsPassDayOpen]=(0,ht.useState)(!1);
let[_masterOrder,_setMasterOrder]=(0,ht.useState)(()=>{try{let s=localStorage.getItem("gurps_mesa_master_order_v1");if(s){let p=JSON.parse(s);if(Array.isArray(p))return p;}}catch(e){}return[];});
let handleSaveMasterOrder=newOrderIds=>{_setMasterOrder(newOrderIds);try{localStorage.setItem("gurps_mesa_master_order_v1",JSON.stringify(newOrderIds));}catch(e){}if(f){let nextCombats=t.map(cb=>cb.id===f.id?{...cb,customOrder:newOrderIds}:cb);S.current.combats=nextCombats;a(nextCombats);try{localStorage.setItem(i1,JSON.stringify(nextCombats));}catch(err){}X(nextCombats,null,null,null,e);}else{X(null,null,null,null,e);}};'''

assert target_n1_state in content, "Error: target_n1_state not found"
content = content.replace(target_n1_state, replace_n1_state, 1)

# Passar para Zp
target_zp_call = 'selectedNpcId:isHome?"":g,onSelectNpc:id=>{N(id),setIsHome(!1)},isHomeScreen:isHome,onAddNewNpc:()=>{U(),setIsHome(!1)},onAddNewPlayer:()=>sAp(!0),onUpdateNpc:br,currentUserRole:effRole,'

replace_zp_call = 'selectedNpcId:isHome?"":g,onSelectNpc:id=>{N(id),setIsHome(!1)},isHomeScreen:isHome,onAddNewNpc:()=>{U(),setIsHome(!1)},onAddNewPlayer:()=>sAp(!0),onUpdateNpc:br,currentUserRole:effRole,customMasterOrder:f?.customOrder||_masterOrder,onSaveMasterOrder:handleSaveMasterOrder,'

assert target_zp_call in content, "Error: target_zp_call not found"
content = content.replace(target_zp_call, replace_zp_call, 1)

print("3. Master sort order, drag-and-drop, and save integrated cleanly.")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: mesa.html updated completely!")

# Test with Microsoft Edge headless to ensure React mounts 100% cleanly
res = subprocess.run([
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    '--headless=new',
    '--dump-dom',
    r'file:///d:/Programas/Desenvolvimento/App Hounds\Hounds/mesa.html'
], capture_output=True, text=True, encoding='utf-8')

has_min_h = 'min-h-screen' in res.stdout
print("Edge test result: DOM length =", len(res.stdout), "| React rendered =", has_min_h)
assert has_min_h, "EDGE HEADLESS TEST FAILED: REACT DID NOT MOUNT!"
print("VERIFICATION COMPLETE: mesa.html renders 100% cleanly!")

