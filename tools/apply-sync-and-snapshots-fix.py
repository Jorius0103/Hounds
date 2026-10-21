import os
import re

file_path = os.path.join(os.path.dirname(__file__), '..', 'mesa.html')
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. No carregamento de snapshots (dentro de CombatManagerModal / Qp)
old_snap_load = '''  (0,Xo.useEffect)(()=>{
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

new_snap_load = '''  (0,Xo.useEffect)(()=>{
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

assert old_snap_load in content, "old_snap_load not found in mesa.html"
content = content.replace(old_snap_load, new_snap_load, 1)
print("1. Carregamento de retratos do repositório inserido.")

# 2. saveSnapshots atualizado com broadcast para hubMesaBus
old_save_snap = '''  let saveSnapshots=list=>{
    setSnapshots(list);
    try{localStorage.setItem("hounds_mesa_snapshots_v1",JSON.stringify(list));}catch(e){}
  };'''

new_save_snap = '''  let saveSnapshots=list=>{
    setSnapshots(list);
    try{localStorage.setItem("hounds_mesa_snapshots_v1",JSON.stringify(list));}catch(e){}
    try{if(window.parent&&window.parent.hubMesaBus){window.parent.hubMesaBus.publish(JSON.stringify({type:"SYNC_SNAPSHOTS_LIST",snapshots:list,timestamp:Date.now()}));}}catch(e){}
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

assert old_save_snap in content, "old_save_snap not found in mesa.html"
content = content.replace(old_save_snap, new_save_snap, 1)
print("2. saveSnapshots e handleExportAllForRepo inseridos.")

# 3. Adicionar botão de Exportar Repositório na barra de ações
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

assert old_snap_actions in content, "old_snap_actions not found in mesa.html"
content = content.replace(old_snap_actions, new_snap_actions, 1)
print("3. Botão Exportar Repositório adicionado.")

# 4. handleRestoreSnap: acionar restauração em tempo real com propagação para todos os usuários
old_restore_snap = '''      alert(`Backup "${snap.name}" restaurado com sucesso! A Mesa de Combate será recarregada.`);
      window.location.reload();'''

new_restore_snap = '''      if(window._restoreMesaSnapshot){
        window._restoreMesaSnapshot(snap);
        showToast(`Retrato "${snap.name}" restaurado e transmitido para todos os usuários!`);
      }else{
        alert(`Backup "${snap.name}" restaurado com sucesso! A Mesa de Combate será recarregada.`);
        window.location.reload();
      }'''

assert old_restore_snap in content, "old_restore_snap not found in mesa.html"
content = content.replace(old_restore_snap, new_restore_snap, 1)
print("4. handleRestoreSnap atualizado com broadcast.")

# 5. Adicionar window._restoreMesaSnapshot e subscrição ao hubMesaBus no escopo principal
target_restore_def = 'window._restoreMesaSnapshot=function(snap){'
if target_restore_def not in content:
    # Definimos window._restoreMesaSnapshot logo antes de let X=
    idx_X = content.find('let X=(C,B,L,j,W,E)=>{')
    assert idx_X != -1, "let X= not found in mesa.html"
    restore_func_code = '''window._restoreMesaSnapshot=function(snap){
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
};'''
    content = content[:idx_X] + restore_func_code + content[idx_X:]
    print("5. window._restoreMesaSnapshot injetado no escopo principal.")

# 6. Atualizar a função X para suportar envio imediato (isImmediate)
old_X_def = 'let X=(C,B,L,j,W,E)=>{'
new_X_def = 'let X=(C,B,L,j,W,E,isImmediate)=>{'
assert old_X_def in content, "old_X_def not found in mesa.html"
content = content.replace(old_X_def, new_X_def, 1)

old_send_full = 'ha.sendPayload({type:"SYNC_FULL",timestamp:V,combats:_,conditions:it,users:Tt,activeCombatId:Et,players:oe,deletedCombatIds:hubDelGet()});'
new_send_full = 'if(isImmediate||j!==void 0){ha.sendPayloadImmediate({type:"SYNC_FULL",timestamp:V,combats:_,conditions:it,users:Tt,activeCombatId:Et,players:oe,deletedCombatIds:hubDelGet()});}else{ha.sendPayload({type:"SYNC_FULL",timestamp:V,combats:_,conditions:it,users:Tt,activeCombatId:Et,players:oe,deletedCombatIds:hubDelGet()});}'
assert old_send_full in content, "old_send_full not found in mesa.html"
content = content.replace(old_send_full, new_send_full, 1)
print("6. Função X atualizada para suportar envio imediato.")

# 7. Ut (troca de combate): enviar imediatamente e atualizar S.current.activeCombatId
old_Ut = 'let Ut=C=>{k(C);let B=t.find(j=>j.id===C);if(!e.some(j=>j.id===g)){let j=B?.npcs?.filter(W=>W.characterType!=="player")||[];j.length>0?N(j[0].id):e.length>0&&N(e[0].id)}X(void 0,void 0,void 0,C)},'
new_Ut = 'let Ut=C=>{k(C);S.current.activeCombatId=C;try{localStorage.setItem("gurps_combat_master_active_combat_id_v1",JSON.stringify(C));}catch(e){}let B=t.find(j=>j.id===C);if(!e.some(j=>j.id===g)){let j=B?.npcs?.filter(W=>W.characterType!=="player")||[];j.length>0?N(j[0].id):e.length>0&&N(e[0].id)}X(void 0,void 0,void 0,C,void 0,void 0,true);},'
assert old_Ut in content, "old_Ut not found in mesa.html"
content = content.replace(old_Ut, new_Ut, 1)
print("7. Ut (troca de combate) configurado para envio imediato e garantia local.")

# 8. No recebimento de mensagens (onSyncMessage): aceitar activeCombatId incondicionalmente
old_active_sync = 'L.activeCombatId&&L.activeCombatId!==S.current.activeCombatId&&j>(v.current||0)&&(S.current.activeCombatId=L.activeCombatId,k(L.activeCombatId),(()=>{try{localStorage.setItem("gurps_combat_master_active_combat_id_v1",JSON.stringify(L.activeCombatId))}catch(e){}})())'
new_active_sync = 'L.activeCombatId&&L.activeCombatId!==S.current.activeCombatId&&(S.current.activeCombatId=L.activeCombatId,k(L.activeCombatId),(()=>{try{localStorage.setItem("gurps_combat_master_active_combat_id_v1",JSON.stringify(L.activeCombatId))}catch(e){}})())'
assert old_active_sync in content, "old_active_sync not found in mesa.html"
content = content.replace(old_active_sync, new_active_sync, 1)
print("8. Aceitação incondicional de activeCombatId no MQTT inserida.")

# 9. No BroadcastChannel: aceitar activeCombatId incondicionalmente
old_bc_active = 'B.data.activeCombatId&&(S.current.activeCombatId=B.data.activeCombatId,k(B.data.activeCombatId),(()=>{try{localStorage.setItem("gurps_combat_master_active_combat_id_v1",JSON.stringify(B.data.activeCombatId))}catch(e){}})())'
new_bc_active = 'B.data.activeCombatId&&B.data.activeCombatId!==S.current.activeCombatId&&(S.current.activeCombatId=B.data.activeCombatId,k(B.data.activeCombatId),(()=>{try{localStorage.setItem("gurps_combat_master_active_combat_id_v1",JSON.stringify(B.data.activeCombatId))}catch(e){}})())'
if old_bc_active in content:
    content = content.replace(old_bc_active, new_bc_active, 1)
    print("9. BroadcastChannel activeCombatId ajustado.")

# 10. Conectar a escuta do iframe com o Supabase Realtime (window.parent.hubMesaBus.subscribe)
old_connect_cleanup = 'return()=>{C(),B()}},[])'
new_connect_cleanup = '''let unsubHub=null;
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
    return()=>{C();B();if(unsubHub){try{unsubHub();}catch(e){}}},[])'''

assert old_connect_cleanup in content, "old_connect_cleanup not found in mesa.html"
content = content.replace(old_connect_cleanup, new_connect_cleanup, 1)
print("10. Conexão do iframe com o Supabase (hubMesaBus.subscribe) inserida com sucesso!")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("ALL CHANGES SUCCESSFULLY APPLIED TO mesa.html!")

