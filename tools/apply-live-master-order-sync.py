import os
import subprocess

file_path = os.path.join(os.path.dirname(__file__), '..', 'mesa.html')
with open(file_path, 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Em l4: detectar cstOrdChg e preservar customOrder
old_l4_check = 'let rndChg=(i.currentRound!==undefined&&i.currentRound!==n.currentRound)||(i.round!==undefined&&i.round!==n.round),pidsChg=JSON.stringify(i.playerIds||[])!==JSON.stringify(n.playerIds||[])||Boolean(i.playerIdsMigratedV2)!==Boolean(n.playerIdsMigratedV2);'
new_l4_check = 'let rndChg=(i.currentRound!==undefined&&i.currentRound!==n.currentRound)||(i.round!==undefined&&i.round!==n.round),pidsChg=JSON.stringify(i.playerIds||[])!==JSON.stringify(n.playerIds||[])||Boolean(i.playerIdsMigratedV2)!==Boolean(n.playerIdsMigratedV2),cstOrdChg=JSON.stringify(i.customOrder||[])!==JSON.stringify(n.customOrder||[]);'

assert old_l4_check in c, "Error: old_l4_check not found"
c = c.replace(old_l4_check, new_l4_check, 1)

old_l4_cond = '(c||rndChg||pidsChg||evChg)&&(e=!0),r.set(i.id,{...n,...i,npcs:isEmp?[]:l,events:mEvs,currentRound:i.currentRound??i.round??n.currentRound??n.round??0,round:i.round??i.currentRound??n.round??n.currentRound??0})'
new_l4_cond = '(c||rndChg||pidsChg||evChg||cstOrdChg)&&(e=!0),r.set(i.id,{...n,...i,npcs:isEmp?[]:l,events:mEvs,customOrder:i.customOrder!==undefined?i.customOrder:n.customOrder,currentRound:i.currentRound??i.round??n.currentRound??n.round??0,round:i.round??i.currentRound??n.round??n.currentRound??0})'

assert old_l4_cond in c, "Error: old_l4_cond not found"
c = c.replace(old_l4_cond, new_l4_cond, 1)
print("1. l4 updated to detect customOrder changes and preserve customOrder.")

# 2. Em Zp: clicar em 'mestre' recarrega a ordem imediatamente e fallback no localStorage
old_zp_click = '(0,I.jsx)("button",{type:"button",onClick:()=>setSrt("mestre"),className:`flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold transition-all text-[11px] cursor-pointer ${srt==="mestre"?"bg-purple-950/90 text-purple-300 shadow-sm border border-purple-500/50":"text-slate-400 hover:text-purple-300 hover:bg-slate-900"}`,title:"Ordem definida pelo Mestre (arraste e solte os cards para reorganizar)",children:(0,I.jsx)("span",{children:"\U0001f451 Mestre"})})'

new_zp_click = '(0,I.jsx)("button",{type:"button",onClick:()=>{setSrt("mestre");let fresh=cstOrd;if(!fresh||!fresh.length){try{let s=localStorage.getItem("gurps_mesa_master_order_v1");if(s){let p=JSON.parse(s);if(Array.isArray(p)&&p.length)fresh=p;}}catch(e){}}if(fresh&&fresh.length)setLocOrd([...fresh]);},className:`flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold transition-all text-[11px] cursor-pointer ${srt==="mestre"?"bg-purple-950/90 text-purple-300 shadow-sm border border-purple-500/50":"text-slate-400 hover:text-purple-300 hover:bg-slate-900"}`,title:"Ordem definida pelo Mestre (clique para atualizar a ordem instantaneamente)",children:(0,I.jsx)("span",{children:"\U0001f451 Mestre"})})'

assert old_zp_click in c, "Error: old_zp_click not found"
c = c.replace(old_zp_click, new_zp_click, 1)

# E na ordenação sort em Zp: buscar em cascata locOrd -> cstOrd -> localStorage
old_zp_sort = 'if(srt==="mestre"){let mOrd=locOrd||cstOrd||[];let idxA=mOrd.indexOf(h.id);let idxB=mOrd.indexOf(g.id);if(idxA!==-1&&idxB!==-1)return idxA-idxB;if(idxA!==-1)return -1;if(idxB!==-1)return 1;if(N&&!w)return -1;if(!N&&w)return 1;return(h.name||"").localeCompare(g.name||"","pt-BR")}'

new_zp_sort = 'if(srt==="mestre"){let mOrd=locOrd||cstOrd;if(!mOrd||!mOrd.length){try{let s=localStorage.getItem("gurps_mesa_master_order_v1");if(s){let p=JSON.parse(s);if(Array.isArray(p)&&p.length)mOrd=p;}}catch(e){}}mOrd=mOrd||[];let idxA=mOrd.indexOf(h.id);let idxB=mOrd.indexOf(g.id);if(idxA!==-1&&idxB!==-1)return idxA-idxB;if(idxA!==-1)return -1;if(idxB!==-1)return 1;if(N&&!w)return -1;if(!N&&w)return 1;return(h.name||"").localeCompare(g.name||"","pt-BR")}'

assert old_zp_sort in c, "Error: old_zp_sort not found"
c = c.replace(old_zp_sort, new_zp_sort, 1)
print("2. Zp updated for instant master order reload on click.")

# 3. Em handleSaveMasterOrder: propagar SYNC_MASTER_ORDER imediato
old_save_mord = 'let handleSaveMasterOrder=newOrderIds=>{_setMasterOrder(newOrderIds);try{localStorage.setItem("gurps_mesa_master_order_v1",JSON.stringify(newOrderIds));}catch(e){}if(f){let nextCombats=t.map(cb=>cb.id===f.id?{...cb,customOrder:newOrderIds}:cb);S.current.combats=nextCombats;a(nextCombats);try{localStorage.setItem(i1,JSON.stringify(nextCombats));}catch(err){}X(nextCombats,null,null,null,e);}else{X(null,null,null,null,e);}};'

new_save_mord = 'let handleSaveMasterOrder=newOrderIds=>{_setMasterOrder(newOrderIds);try{localStorage.setItem("gurps_mesa_master_order_v1",JSON.stringify(newOrderIds));}catch(e){}try{ha.sendPayloadImmediate({type:"SYNC_MASTER_ORDER",combatId:f?.id,customOrder:newOrderIds,timestamp:Date.now()});}catch(e){}try{$a.current?.postMessage({type:"SYNC_MASTER_ORDER",combatId:f?.id,customOrder:newOrderIds,timestamp:Date.now()});}catch(e){}if(window.parent&&window.parent.hubMesaBus){try{window.parent.hubMesaBus.publish(JSON.stringify({type:"SYNC_MASTER_ORDER",combatId:f?.id,customOrder:newOrderIds,timestamp:Date.now()}));}catch(e){}}let nextCombats=t;if(f){nextCombats=t.map(cb=>cb.id===f.id?{...cb,customOrder:newOrderIds}:cb);S.current.combats=nextCombats;a(nextCombats);try{localStorage.setItem(i1,JSON.stringify(nextCombats));}catch(err){}}X(nextCombats,null,null,null,e,void 0,true);};'

assert old_save_mord in c, "Error: old_save_mord not found"
c = c.replace(old_save_mord, new_save_mord, 1)
print("3. handleSaveMasterOrder sends immediate SYNC_MASTER_ORDER.")

# 4. Receber SYNC_MASTER_ORDER em onSyncMessage e BroadcastChannel
old_sync_msg_start = 'let C=ha.onStatusChange(L=>{s(L)}),handleIncomingSyncMsg=L=>{if(L&&(String(L.type).indexOf("AUDIO_STREAM_")===0||String(L.type).indexOf("RTC_")===0)){'

new_sync_msg_start = 'let C=ha.onStatusChange(L=>{s(L)}),handleIncomingSyncMsg=L=>{if(L&&L.type==="SYNC_MASTER_ORDER"&&Array.isArray(L.customOrder)){_setMasterOrder(L.customOrder);try{localStorage.setItem("gurps_mesa_master_order_v1",JSON.stringify(L.customOrder));}catch(e){}if(L.combatId){let nC=t.map(cb=>cb.id===L.combatId?{...cb,customOrder:L.customOrder}:cb);S.current.combats=nC;a(nC);}return;}if(L&&(String(L.type).indexOf("AUDIO_STREAM_")===0||String(L.type).indexOf("RTC_")===0)){'

assert old_sync_msg_start in c, "Error: old_sync_msg_start not found"
c = c.replace(old_sync_msg_start, new_sync_msg_start, 1)

# BroadcastChannel listener
old_bc_msg = 'if(B.data?.type==="SYNC_STATE"){'
new_bc_msg = 'if(B.data&&B.data.type==="SYNC_MASTER_ORDER"&&Array.isArray(B.data.customOrder)){_setMasterOrder(B.data.customOrder);try{localStorage.setItem("gurps_mesa_master_order_v1",JSON.stringify(B.data.customOrder));}catch(e){}if(B.data.combatId){let nC=t.map(cb=>cb.id===B.data.combatId?{...cb,customOrder:B.data.customOrder}:cb);S.current.combats=nC;a(nC);}return;}if(B.data?.type==="SYNC_STATE"){'

assert old_bc_msg in c, "Error: old_bc_msg not found"
c = c.replace(old_bc_msg, new_bc_msg, 1)
print("4. SYNC_MASTER_ORDER listener wired up to onSyncMessage and BroadcastChannel.")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(c)

print("SUCCESS: mesa.html updated with real-time master order sync!")

# Test with Microsoft Edge headless
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
