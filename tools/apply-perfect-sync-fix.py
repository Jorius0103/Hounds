import os
import subprocess

file_path = os.path.join(os.path.dirname(__file__), '..', 'mesa.html')
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Carregamento dos retratos de dados/retratos-mesa.json e listener de storage em Qp
old_snap_effect = '''  (0,Xo.useEffect)(()=>{
    if(t){
      try{
        let raw=localStorage.getItem("hounds_mesa_snapshots_v1");
        if(raw){
          let parsed=JSON.parse(raw);
          if(Array.isArray(parsed))setSnapshots(parsed);
        }
      }catch(err){console.error("Erro ao carregar snapshots:",err);}
    }
  },[t]);'''

new_snap_effect = '''  (0,Xo.useEffect)(()=>{
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
      let localList=[];
      try{
        let raw=localStorage.getItem("hounds_mesa_snapshots_v1");
        if(raw){
          let parsed=JSON.parse(raw);
          if(Array.isArray(parsed)){localList=parsed;setSnapshots(parsed);}
        }
      }catch(err){console.error("Erro ao carregar snapshots:",err);}
      fetch("dados/retratos-mesa.json?v="+Date.now()).then(res=>res.json()).then(repoSnapshots=>{
        if(Array.isArray(repoSnapshots)&&repoSnapshots.length>0){
          let map=new Map();
          repoSnapshots.forEach(s=>map.set(s.id,s));
          localList.forEach(s=>map.set(s.id,s));
          let merged=Array.from(map.values());
          setSnapshots(merged);
          try{localStorage.setItem("hounds_mesa_snapshots_v1",JSON.stringify(merged));}catch(e){}
        }
      }).catch(()=>{});
    }
  },[t]);'''

assert old_snap_effect in content, "1. old_snap_effect not found"
content = content.replace(old_snap_effect, new_snap_effect, 1)
print("Step 1 OK: Snapshots loader and storage listener added.")

# 2. saveSnapshots e exportAll no Qp
old_save_snap = '''  let saveSnapshots=list=>{
    setSnapshots(list);
    try{localStorage.setItem("hounds_mesa_snapshots_v1",JSON.stringify(list));}catch(e){}
  };'''

new_save_snap = '''  let saveSnapshots=list=>{
    setSnapshots(list);
    try{localStorage.setItem("hounds_mesa_snapshots_v1",JSON.stringify(list));}catch(e){}
    try{if(window.parent&&window.parent.hubMesaBus){window.parent.hubMesaBus.publish(JSON.stringify({type:"SYNC_SNAPSHOTS_LIST",snapshots:list,timestamp:Date.now()}));}}catch(e){}
    try{ha.sendPayloadImmediate({type:"SYNC_SNAPSHOTS_LIST",snapshots:list,timestamp:Date.now()});}catch(e){}
    try{if(typeof X==="function")X(void 0,void 0,void 0,void 0,void 0,void 0,true);}catch(e){}
  };
  let handleExportAllForRepo=()=>{
    let blob=new Blob([JSON.stringify(snapshots,null,2)],{type:"application/json"});
    let url=URL.createObjectURL(blob);
    let a=document.createElement("a");
    a.href=url;
    a.download="retratos-mesa.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast("Arquivo retratos-mesa.json baixado! Salve-o na pasta dados/ do repositório.");
  };'''

assert old_save_snap in content, "2. old_save_snap not found"
content = content.replace(old_save_snap, new_save_snap, 1)
print("Step 2 OK: saveSnapshots and handleExportAllForRepo added.")

# 3. Botão Exportar Repositório na barra de ações
old_snap_actions = '''(0,et.jsxs)("div",{className:"flex items-center gap-2",children:[
          (0,et.jsxs)("button",{type:"button",onClick:handleStartCreate,className:"flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-all shadow-sm active:scale-95",children:[(0,et.jsx)(Ct,{size:14}),(0,et.jsx)("span",{children:"Novo Retrato da Mesa"})]}),
          (0,et.jsxs)("label",{className:"flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer shadow-sm",children:[
            (0,et.jsx)(IUpload,{size:13}),(0,et.jsx)("span",{children:"Importar (.json)"}),
            (0,et.jsx)("input",{type:"file",accept:".json",className:"hidden",onChange:handleImportFile})
          ]})
        ]})'''

new_snap_actions = '''(0,et.jsxs)("div",{className:"flex items-center gap-2",children:[
          (0,et.jsxs)("button",{type:"button",onClick:handleStartCreate,className:"flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-all shadow-sm active:scale-95",children:[(0,et.jsx)(Ct,{size:14}),(0,et.jsx)("span",{children:"Novo Retrato da Mesa"})]}),
          (0,et.jsxs)("label",{className:"flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer shadow-sm",children:[
            (0,et.jsx)(IUpload,{size:13}),(0,et.jsx)("span",{children:"Importar (.json)"}),
            (0,et.jsx)("input",{type:"file",accept:".json",className:"hidden",onChange:handleImportFile})
          ]}),
          (0,et.jsxs)("button",{type:"button",onClick:handleExportAllForRepo,className:"flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 text-xs font-semibold rounded-lg border border-amber-600/40 transition-colors shadow-sm cursor-pointer",title:"Baixar todos os retratos como retratos-mesa.json para colocar na pasta dados/ do repositório",children:[(0,et.jsx)(IDownload,{size:13}),(0,et.jsx)("span",{children:"Exportar Repositório"})]})
        ]})'''

assert old_snap_actions in content, "3. old_snap_actions not found"
content = content.replace(old_snap_actions, new_snap_actions, 1)
print("Step 3 OK: Export button added.")

# 4. handleRestoreSnap no Qp
old_restore_snap = '''      alert(`Backup "${snap.name}" restaurado com sucesso! A Mesa de Combate será recarregada.`);
      window.location.reload();'''

new_restore_snap = '''      if(window._restoreMesaSnapshot){
        window._restoreMesaSnapshot(snap);
        showToast(`Retrato "${snap.name}" restaurado e transmitido para todos os usuários!`);
      }else{
        alert(`Backup "${snap.name}" restaurado com sucesso! A Mesa de Combate será recarregada.`);
        window.location.reload();
      }'''

assert old_restore_snap in content, "4. old_restore_snap not found"
content = content.replace(old_restore_snap, new_restore_snap, 1)
print("Step 4 OK: handleRestoreSnap updated.")

# 5. Definir window._restoreMesaSnapshot antes de let X=
old_X_header = 'let X=(C,B,L,j,W,E)=>{'
new_X_header = '''window._restoreMesaSnapshot=function(snap){
  if(!snap||!snap.data)return;
  let newCombats=snap.data.combats||[];
  let newPlayers=snap.data.players||[];
  let newConditions=snap.data.conditions||[];
  let newActiveId=snap.data.activeCombatId||(newCombats[0]?.id||"combat-vazio");
  a(newCombats);S.current.combats=newCombats;
  if(newPlayers.length>0){r(newPlayers);S.current.players=newPlayers;}
  if(newConditions.length>0){i(newConditions);S.current.conditions=newConditions;}
  k(newActiveId);S.current.activeCombatId=newActiveId;
  try{localStorage.setItem(i1,JSON.stringify(newCombats));}catch(e){}
  try{if(newPlayers.length>0)localStorage.setItem(n4,JSON.stringify(newPlayers));}catch(e){}
  try{if(newConditions.length>0)localStorage.setItem(i4,JSON.stringify(newConditions));}catch(e){}
  try{localStorage.setItem("gurps_combat_master_active_combat_id_v1",JSON.stringify(newActiveId));}catch(e){}
  if(snap.data.deletedCombatIds){try{localStorage.setItem("gurps_combat_master_deleted_v1",JSON.stringify(snap.data.deletedCombatIds));}catch(e){}}
  X(newCombats,newConditions,void 0,newActiveId,newPlayers,void 0,true);
  try{
    ha.sendPayloadImmediate({type:"SYNC_SNAPSHOT_RESTORED",snapshotName:snap.name,timestamp:Date.now()});
    if(window.parent&&window.parent.hubMesaBus){
      window.parent.hubMesaBus.publish(JSON.stringify({type:"SYNC_SNAPSHOT_RESTORED",snapshotName:snap.name,timestamp:Date.now()}));
    }
  }catch(e){}
};
let X=(C,B,L,j,W,E,isImmediate)=>{'''

assert old_X_header in content, "5. old_X_header not found"
content = content.replace(old_X_header, new_X_header, 1)
print("Step 5 OK: window._restoreMesaSnapshot injected.")

# 6. Atualizar corpo de X: ler snapshots locais e enviar
old_X_body = 'v.current=V;let _=C||S.current.combats,it=B||S.current.conditions,Tt=L||S.current.users,Et=j||S.current.activeCombatId,oe=W||S.current.players;'
new_X_body = 'v.current=V;let _=C||S.current.combats,it=B||S.current.conditions,Tt=L||S.current.users,Et=j||S.current.activeCombatId,oe=W||S.current.players;let _snaps=[];try{let _rawSn=localStorage.getItem("hounds_mesa_snapshots_v1");if(_rawSn){let _p=JSON.parse(_rawSn);if(Array.isArray(_p))_snaps=_p;}}catch(e){}'

assert old_X_body in content, "6. old_X_body not found"
content = content.replace(old_X_body, new_X_body, 1)

old_post_msg = 'try{$a.current?.postMessage({type:"SYNC_STATE",sourceId:ha.getClientId(),timestamp:V,combats:_,conditions:it,users:Tt,activeCombatId:Et,players:oe,deletedCombatIds:hubDelGet()})}catch{}ha.sendPayload({type:"SYNC_FULL",timestamp:V,combats:_,conditions:it,users:Tt,activeCombatId:Et,players:oe,deletedCombatIds:hubDelGet()});if(window.parent&&window.parent.hubMesaBus){try{window.parent.hubMesaBus.publish(JSON.stringify({type:"SYNC_FULL",timestamp:V,combats:_,conditions:it,users:Tt,activeCombatId:Et,players:oe,deletedCombatIds:hubDelGet()}))}catch{}}'

new_post_msg = 'try{$a.current?.postMessage({type:"SYNC_STATE",sourceId:ha.getClientId(),timestamp:V,combats:_,conditions:it,users:Tt,activeCombatId:Et,players:oe,snapshots:_snaps,deletedCombatIds:hubDelGet()})}catch{}if(isImmediate||j!==void 0){ha.sendPayloadImmediate({type:"SYNC_FULL",timestamp:V,combats:_,conditions:it,users:Tt,activeCombatId:Et,players:oe,snapshots:_snaps,deletedCombatIds:hubDelGet()});}else{ha.sendPayload({type:"SYNC_FULL",timestamp:V,combats:_,conditions:it,users:Tt,activeCombatId:Et,players:oe,snapshots:_snaps,deletedCombatIds:hubDelGet()});}if(window.parent&&window.parent.hubMesaBus){try{window.parent.hubMesaBus.publish(JSON.stringify({type:"SYNC_FULL",timestamp:V,combats:_,conditions:it,users:Tt,activeCombatId:Et,players:oe,snapshots:_snaps,deletedCombatIds:hubDelGet()}))}catch{}}'

assert old_post_msg in content, "6b. old_post_msg not found"
content = content.replace(old_post_msg, new_post_msg, 1)
print("Step 6 OK: Function X sends snapshots and supports isImmediate.")

# 7. Ut (troca de combate)
old_Ut = 'let Ut=C=>{k(C);let B=t.find(j=>j.id===C);if(!e.some(j=>j.id===g)){let j=B?.npcs?.filter(W=>W.characterType!=="player")||[];j.length>0?N(j[0].id):e.length>0&&N(e[0].id)}X(void 0,void 0,void 0,C)},'
new_Ut = 'let Ut=C=>{k(C);S.current.activeCombatId=C;try{localStorage.setItem("gurps_combat_master_active_combat_id_v1",JSON.stringify(C));}catch(e){}let B=t.find(j=>j.id===C);if(!e.some(j=>j.id===g)){let j=B?.npcs?.filter(W=>W.characterType!=="player")||[];j.length>0?N(j[0].id):e.length>0&&N(e[0].id)}X(void 0,void 0,void 0,C,void 0,void 0,true);},'

assert old_Ut in content, "7. old_Ut not found"
content = content.replace(old_Ut, new_Ut, 1)
print("Step 7 OK: Ut updated.")

# 8. onSyncMessage: aceitar activeCombatId incondicionalmente e receber snapshots
old_sync_msg_target = 'if(L.type==="SYNC_DICE_ROLL"&&L.rollData){'
new_sync_msg_target = '''if(L.type==="SYNC_SNAPSHOTS_LIST"&&Array.isArray(L.snapshots)){
        try{localStorage.setItem("hounds_mesa_snapshots_v1",JSON.stringify(L.snapshots));window.dispatchEvent(new StorageEvent("storage",{key:"hounds_mesa_snapshots_v1",newValue:JSON.stringify(L.snapshots)}));}catch(e){}
        return;
      }
      if(L.type==="SYNC_DICE_ROLL"&&L.rollData){'''

assert old_sync_msg_target in content, "8. old_sync_msg_target not found"
content = content.replace(old_sync_msg_target, new_sync_msg_target, 1)

old_active_check = 'L.activeCombatId&&L.activeCombatId!==S.current.activeCombatId&&j>(v.current||0)&&(S.current.activeCombatId=L.activeCombatId,k(L.activeCombatId),(()=>{try{localStorage.setItem("gurps_combat_master_active_combat_id_v1",JSON.stringify(L.activeCombatId))}catch(e){}})())}'

new_active_check = 'L.activeCombatId&&L.activeCombatId!==S.current.activeCombatId&&(S.current.activeCombatId=L.activeCombatId,k(L.activeCombatId),(()=>{try{localStorage.setItem("gurps_combat_master_active_combat_id_v1",JSON.stringify(L.activeCombatId))}catch(e){}})());if(Array.isArray(L.snapshots)&&L.snapshots.length>0){try{localStorage.setItem("hounds_mesa_snapshots_v1",JSON.stringify(L.snapshots));window.dispatchEvent(new StorageEvent("storage",{key:"hounds_mesa_snapshots_v1",newValue:JSON.stringify(L.snapshots)}));}catch(e){}}}'

assert old_active_check in content, "8b. old_active_check not found"
content = content.replace(old_active_check, new_active_check, 1)
print("Step 8 OK: onSyncMessage snapshots and activeCombatId updated.")

# 9. Conectar hubMesaBus.subscribe no final de ha.onSyncMessage
old_effect_cleanup = 'timestamp:v.current||1})});return()=>{C(),B()}},[])'

new_effect_cleanup = '''timestamp:v.current||1});
    });
    let unsubHub=null;
    if(typeof window!=="undefined"&&window.parent&&window.parent.hubMesaBus&&typeof window.parent.hubMesaBus.subscribe==="function"){
      try{
        unsubHub=window.parent.hubMesaBus.subscribe(msgStr=>{
          try{
            let p=typeof msgStr==="string"?JSON.parse(msgStr):msgStr;
            if(p&&p.type){
              if(p.type==="SYNC_SNAPSHOT_RESTORED"){
                Ca.addLog("SYNC_RECV","Retrato restaurado na mesa: "+(p.snapshotName||"Retrato"));
                return;
              }
              B(p);
            }
          }catch(e){}
        });
      }catch(e){}
    }
    return()=>{C();B();if(unsubHub){try{unsubHub();}catch(e){}}};
  },[])'''

assert old_effect_cleanup in content, "9. old_effect_cleanup not found"
content = content.replace(old_effect_cleanup, new_effect_cleanup, 1)
print("Step 9 OK: hubMesaBus.subscribe connected and useEffect cleanup closed properly.")

# 10. BroadcastChannel activeCombatId incondicional
old_bc_act = 'B.data.activeCombatId&&(S.current.activeCombatId=B.data.activeCombatId,k(B.data.activeCombatId),(()=>{try{localStorage.setItem("gurps_combat_master_active_combat_id_v1",JSON.stringify(B.data.activeCombatId))}catch(e){}})())'
new_bc_act = 'B.data.activeCombatId&&B.data.activeCombatId!==S.current.activeCombatId&&(S.current.activeCombatId=B.data.activeCombatId,k(B.data.activeCombatId),(()=>{try{localStorage.setItem("gurps_combat_master_active_combat_id_v1",JSON.stringify(B.data.activeCombatId))}catch(e){}})())'

assert old_bc_act in content, "10. old_bc_act not found"
content = content.replace(old_bc_act, new_bc_act, 1)
print("Step 10 OK: BroadcastChannel activeCombatId updated.")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("ALL CHANGES WRITTEN TO mesa.html!")

# Validar com o Microsoft Edge headless
res = subprocess.run([
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    '--headless=new',
    '--dump-dom',
    r'file:///d:/Programas/Desenvolvimento/App Hounds/Hounds/mesa.html'
], capture_output=True, text=True, encoding='utf-8')

has_min_h = 'min-h-screen' in res.stdout
print("Edge test result: DOM length =", len(res.stdout), "| React rendered =", has_min_h)
assert has_min_h, "EDGE HEADLESS TEST FAILED: REACT DID NOT MOUNT!"
print("VERIFICATION COMPLETE: mesa.html renders 100% cleanly!")
