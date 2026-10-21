import os

file_path = os.path.join(os.path.dirname(__file__), '..', 'mesa.html')
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Em Qp (CombatManagerModal no mesa.html): Adicionar listener de storage para atualizar snapshots ao vivo
old_qp_snap_effect = '''  (0,Xo.useEffect)(()=>{
    if(t){
      let localList=[];'''

new_qp_snap_effect = '''  (0,Xo.useEffect)(()=>{
    let h=ev=>{
      if(ev.key==="hounds_mesa_snapshots_v1"&&ev.newValue){
        try{let p=JSON.parse(ev.newValue);if(Array.isArray(p))setSnapshots(p);}catch(e){}
      }
    };
    window.addEventListener("storage",h);
    return()=>window.removeEventListener("storage",h);
  },[]);
  (0,Xo.useEffect)(()=>{
    if(t){
      let localList=[];'''

assert old_qp_snap_effect in content, "old_qp_snap_effect not found"
content = content.replace(old_qp_snap_effect, new_qp_snap_effect, 1)
print("1. Listener de storage para snapshots adicionado no modal de mesa.html.")

# 2. saveSnapshots no mesa.html deve chamar ha.sendPayloadImmediate e acionar sincronização
old_save_snap = '''  let saveSnapshots=list=>{
    setSnapshots(list);
    try{localStorage.setItem("hounds_mesa_snapshots_v1",JSON.stringify(list));}catch(e){}
    try{if(window.parent&&window.parent.hubMesaBus){window.parent.hubMesaBus.publish(JSON.stringify({type:"SYNC_SNAPSHOTS_LIST",snapshots:list,timestamp:Date.now()}));}}catch(e){}
  };'''

new_save_snap = '''  let saveSnapshots=list=>{
    setSnapshots(list);
    try{localStorage.setItem("hounds_mesa_snapshots_v1",JSON.stringify(list));}catch(e){}
    try{if(window.parent&&window.parent.hubMesaBus){window.parent.hubMesaBus.publish(JSON.stringify({type:"SYNC_SNAPSHOTS_LIST",snapshots:list,timestamp:Date.now()}));}}catch(e){}
    try{ha.sendPayloadImmediate({type:"SYNC_SNAPSHOTS_LIST",snapshots:list,timestamp:Date.now()});}catch(e){}
    try{if(typeof X==="function")X(void 0,void 0,void 0,void 0,void 0,void 0,true);}catch(e){}
  };'''

assert old_save_snap in content, "old_save_snap not found"
content = content.replace(old_save_snap, new_save_snap, 1)
print("2. saveSnapshots atualizado com sendPayloadImmediate e X.")

# 3. Na função X: incluir snapshots locais no payload de SYNC_FULL e SYNC_STATE
old_X_start = 'let X=(C,B,L,j,W,E,isImmediate)=>{let V=E?.updatedAt||Date.now();v.current=V;let _=C||S.current.combats,it=B||S.current.conditions,Tt=L||S.current.users,Et=j||S.current.activeCombatId,oe=W||S.current.players;'
new_X_start = 'let X=(C,B,L,j,W,E,isImmediate)=>{let V=E?.updatedAt||Date.now();v.current=V;let _=C||S.current.combats,it=B||S.current.conditions,Tt=L||S.current.users,Et=j||S.current.activeCombatId,oe=W||S.current.players;let _snaps=[];try{let _rawSn=localStorage.getItem("hounds_mesa_snapshots_v1");if(_rawSn){let _p=JSON.parse(_rawSn);if(Array.isArray(_p))_snaps=_p;}}catch(e){}'

assert old_X_start in content, "old_X_start not found"
content = content.replace(old_X_start, new_X_start, 1)

old_state_msg = 'try{$a.current?.postMessage({type:"SYNC_STATE",sourceId:ha.getClientId(),timestamp:V,combats:_,conditions:it,users:Tt,activeCombatId:Et,players:oe,deletedCombatIds:hubDelGet()})}catch{}'
new_state_msg = 'try{$a.current?.postMessage({type:"SYNC_STATE",sourceId:ha.getClientId(),timestamp:V,combats:_,conditions:it,users:Tt,activeCombatId:Et,players:oe,snapshots:_snaps,deletedCombatIds:hubDelGet()})}catch{}'

assert old_state_msg in content, "old_state_msg not found"
content = content.replace(old_state_msg, new_state_msg, 1)

old_send_imm = 'if(isImmediate||j!==void 0){ha.sendPayloadImmediate({type:"SYNC_FULL",timestamp:V,combats:_,conditions:it,users:Tt,activeCombatId:Et,players:oe,deletedCombatIds:hubDelGet()});}else{ha.sendPayload({type:"SYNC_FULL",timestamp:V,combats:_,conditions:it,users:Tt,activeCombatId:Et,players:oe,deletedCombatIds:hubDelGet()});}'
new_send_imm = 'if(isImmediate||j!==void 0){ha.sendPayloadImmediate({type:"SYNC_FULL",timestamp:V,combats:_,conditions:it,users:Tt,activeCombatId:Et,players:oe,snapshots:_snaps,deletedCombatIds:hubDelGet()});}else{ha.sendPayload({type:"SYNC_FULL",timestamp:V,combats:_,conditions:it,users:Tt,activeCombatId:Et,players:oe,snapshots:_snaps,deletedCombatIds:hubDelGet()});}'

assert old_send_imm in content, "old_send_imm not found"
content = content.replace(old_send_imm, new_send_imm, 1)

old_bus_pub = 'if(window.parent&&window.parent.hubMesaBus){try{window.parent.hubMesaBus.publish(JSON.stringify({type:"SYNC_FULL",timestamp:V,combats:_,conditions:it,users:Tt,activeCombatId:Et,players:oe,deletedCombatIds:hubDelGet()}))}catch{}}'
new_bus_pub = 'if(window.parent&&window.parent.hubMesaBus){try{window.parent.hubMesaBus.publish(JSON.stringify({type:"SYNC_FULL",timestamp:V,combats:_,conditions:it,users:Tt,activeCombatId:Et,players:oe,snapshots:_snaps,deletedCombatIds:hubDelGet()}))}catch{}}'

assert old_bus_pub in content, "old_bus_pub not found"
content = content.replace(old_bus_pub, new_bus_pub, 1)
print("3. Função X agora inclui snapshots em todos os envios de SYNC_FULL e SYNC_STATE.")

# 4. No recebimento de mensagens MQTT e Supabase: tratar SYNC_SNAPSHOTS_LIST e snapshots no SYNC_FULL
target_snap_recv = 'if(L.type==="SYNC_SNAPSHOTS_LIST"&&Array.isArray(L.snapshots)){try{localStorage.setItem("hounds_mesa_snapshots_v1",JSON.stringify(L.snapshots));window.dispatchEvent(new StorageEvent("storage",{key:"hounds_mesa_snapshots_v1",newValue:JSON.stringify(L.snapshots)}));}catch(e){}return;}'
if target_snap_recv not in content:
    idx_dice = content.find('if(L.type==="SYNC_DICE_ROLL"&&L.rollData){')
    assert idx_dice != -1, "SYNC_DICE_ROLL not found"
    content = content[:idx_dice] + target_snap_recv + content[idx_dice:]
    print("4. Tratamento de SYNC_SNAPSHOTS_LIST adicionado ao onSyncMessage.")

# E no SYNC_FULL recebido:
old_sync_full_end = 'L.activeCombatId&&L.activeCombatId!==S.current.activeCombatId&&(S.current.activeCombatId=L.activeCombatId,k(L.activeCombatId),(()=>{try{localStorage.setItem("gurps_combat_master_active_combat_id_v1",JSON.stringify(L.activeCombatId))}catch(e){}})())}'
new_sync_full_end = 'L.activeCombatId&&L.activeCombatId!==S.current.activeCombatId&&(S.current.activeCombatId=L.activeCombatId,k(L.activeCombatId),(()=>{try{localStorage.setItem("gurps_combat_master_active_combat_id_v1",JSON.stringify(L.activeCombatId))}catch(e){}})());if(Array.isArray(L.snapshots)&&L.snapshots.length>0){try{localStorage.setItem("hounds_mesa_snapshots_v1",JSON.stringify(L.snapshots));window.dispatchEvent(new StorageEvent("storage",{key:"hounds_mesa_snapshots_v1",newValue:JSON.stringify(L.snapshots)}));}catch(e){}}}'

assert old_sync_full_end in content, "old_sync_full_end not found"
content = content.replace(old_sync_full_end, new_sync_full_end, 1)
print("5. Tratamento de snapshots em SYNC_FULL adicionado.")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: Full snapshots sync applied to mesa.html!")

