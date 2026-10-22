import os

file_path = os.path.join(os.path.dirname(__file__), '..', 'mesa.html')
with open(file_path, 'r', encoding='utf-8') as f:
    c = f.read()

# 1. TopNav: Show totalNpcs if available
target_topnav = 'te":`${x.name} (${(x.npcs||[]).length} NPCs)`},x.id))})'
replace_topnav = 'te":`${x.name} (${x.totalNpcs!=null?x.totalNpcs:(x.npcs||[]).length} NPCs)`},x.id))})'
assert target_topnav in c, "Error: target_topnav not found"
c = c.replace(target_topnav, replace_topnav, 1)
print("1. TopNav combat option patched with totalNpcs fallback.")

# 2. CombatManagerModal: Show totalNpcs if available
target_modal = 'span",{children:`${y.npcs?.length||0} NPCs`})'
replace_modal = 'span",{children:`${y.totalNpcs!=null?y.totalNpcs:(y.npcs?.length||0)} NPCs`})'
assert target_modal in c, "Error: target_modal not found"
c = c.replace(target_modal, replace_modal, 1)
print("2. CombatManagerModal patched with totalNpcs fallback.")

# 3. Broadcast function X: Prepare lightweight combats for inactive combats
target_broadcast_orig = 'try{$a.current?.postMessage({type:"SYNC_STATE",sourceId:ha.getClientId(),timestamp:V,combats:_,conditions:it,users:Tt,activeCombatId:Et,players:oe,deletedCombatIds:hubDelGet()})}catch{}if(isImmediate||j!==void 0){ha.sendPayloadImmediate({type:"SYNC_FULL",timestamp:V,combats:_,conditions:it,users:Tt,activeCombatId:Et,players:oe,deletedCombatIds:hubDelGet()});}else{ha.sendPayload({type:"SYNC_FULL",timestamp:V,combats:_,conditions:it,users:Tt,activeCombatId:Et,players:oe,deletedCombatIds:hubDelGet()});}if(window.parent&&window.parent.hubMesaBus){try{window.parent.hubMesaBus.publish(JSON.stringify({type:"SYNC_FULL",timestamp:V,combats:_,conditions:it,users:Tt,activeCombatId:Et,players:oe,deletedCombatIds:hubDelGet()}))}catch{}}'

replace_broadcast = 'window._houndsCombatsPool=window._houndsCombatsPool||{};_.forEach(cb=>{if(cb&&cb.id&&cb.id!=="combat-vazio"&&Array.isArray(cb.npcs)&&cb.npcs.length>0){window._houndsCombatsPool[cb.id]={npcs:cb.npcs,events:cb.events||[]};}});let _lightCombats=_.map(cb=>{if(cb.id===Et){let p=window._houndsCombatsPool[cb.id];let n=(cb.npcs&&cb.npcs.length>0)?cb.npcs:(p?p.npcs:[]);let ev=(cb.events&&cb.events.length>0)?cb.events:(p?p.events:(cb.events||[]));return {...cb,npcs:n,events:ev,totalNpcs:n.length};}let pCount=window._houndsCombatsPool[cb.id]?.npcs?.length;let cnt=pCount!=null?pCount:(cb.totalNpcs!=null?cb.totalNpcs:(cb.npcs?.length||0));return {...cb,totalNpcs:cnt,npcs:[],events:[]};});try{$a.current?.postMessage({type:"SYNC_STATE",sourceId:ha.getClientId(),timestamp:V,combats:_lightCombats,conditions:it,users:Tt,activeCombatId:Et,players:oe,deletedCombatIds:hubDelGet()})}catch{}if(isImmediate||j!==void 0){ha.sendPayloadImmediate({type:"SYNC_FULL",timestamp:V,combats:_lightCombats,conditions:it,users:Tt,activeCombatId:Et,players:oe,deletedCombatIds:hubDelGet()});}else{ha.sendPayload({type:"SYNC_FULL",timestamp:V,combats:_lightCombats,conditions:it,users:Tt,activeCombatId:Et,players:oe,deletedCombatIds:hubDelGet()});}if(window.parent&&window.parent.hubMesaBus){try{window.parent.hubMesaBus.publish(JSON.stringify({type:"SYNC_FULL",timestamp:V,combats:_lightCombats,conditions:it,users:Tt,activeCombatId:Et,players:oe,deletedCombatIds:hubDelGet()}))}catch{}}'

assert target_broadcast_orig in c, "Error: target_broadcast_orig not found"
c = c.replace(target_broadcast_orig, replace_broadcast, 1)
print("3. Broadcast function X patched with lightweight combats transmission.")

# 4. HandleSelectCombat Ut: Restore combat from pool and switch
target_select = 'Ut=C=>{k(C);S.current.activeCombatId=C;try{localStorage.setItem("gurps_combat_master_active_combat_id_v1",JSON.stringify(C));}catch(e){}let B=t.find(j=>j.id===C);if(!e.some(j=>j.id===g)){let j=B?.npcs?.filter(W=>W.characterType!=="player")||[];j.length>0?N(j[0].id):e.length>0&&N(e[0].id)}X(void 0,void 0,void 0,C,void 0,void 0,true);}'

replace_select = 'Ut=C=>{window._houndsCombatsPool=window._houndsCombatsPool||{};let curAct=t.find(x=>x.id===m);if(curAct&&curAct.id!=="combat-vazio"&&curAct.npcs&&curAct.npcs.length>0){window._houndsCombatsPool[curAct.id]={npcs:curAct.npcs,events:curAct.events||[]};}let tPool=window._houndsCombatsPool[C];let updCb=t.map(x=>{if(x.id===C){let n=(x.npcs&&x.npcs.length>0)?x.npcs:(tPool?tPool.npcs:[]);let ev=(x.events&&x.events.length>0)?x.events:(tPool?tPool.events:(x.events||[]));return {...x,npcs:n,events:ev,totalNpcs:n.length};}return x;});a(updCb);S.current.combats=updCb;k(C);S.current.activeCombatId=C;try{localStorage.setItem("gurps_combat_master_active_combat_id_v1",JSON.stringify(C));}catch(e){}let B=updCb.find(j=>j.id===C);if(!e.some(j=>j.id===g)){let j=B?.npcs?.filter(W=>W.characterType!=="player")||[];j.length>0?N(j[0].id):e.length>0&&N(e[0].id)}X(updCb,void 0,void 0,C,void 0,void 0,true);}'

assert target_select in c, "Error: target_select not found"
c = c.replace(target_select, replace_select, 1)
print("4. Ut (handleSelectCombat) patched with pool restoration and instant broadcast.")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(c)

print("SUCCESS: mesa.html updated completely with lightweight combat sync optimization!")
