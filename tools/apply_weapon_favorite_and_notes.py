def apply_patch():
    with open('mesa.html', 'r', encoding='utf-8') as f:
        c = f.read()

    # 1. Target 1: genNotes declaration -> obsGerais, obsMestre, favWeapons
    p1 = 'hasSp=actSpells.length>0||affSpells.length>0,'
    idx1 = c.find(p1)
    idx2 = c.find(',ta=h.turnActions||Yt,', idx1)
    assert idx1 != -1 and idx2 != -1
    t1_old = c[idx1:idx2+1]
    t1_new = 'hasSp=actSpells.length>0||affSpells.length>0,obsGerais=((h.assistantNotes||"").trim()||(h.notes||"").trim()),obsMestre=(isMaster&&(h.masterNotes||"").trim())||"",favWeapons=(h.weapons||[]).filter(wp=>wp&&wp.isFavorite),hasFavWeapons=favWeapons.length>0,'
    assert c.count(t1_old) == 1
    c = c.replace(t1_old, t1_new, 1)

    # 2. Target 2: hasFavWeapons push after hasFavs
    t2_old = '},"fav"));hasSp&&cb.push('
    hasFavWpn_code = ''',hasFavWeapons&&cb.push((0,I.jsxs)("div",{className:"bg-slate-950/90 border border-amber-500/40 rounded-lg p-2 space-y-1.5",children:[(0,I.jsxs)("div",{className:"flex items-center justify-between gap-1 border-b border-amber-900/30 pb-1",children:[(0,I.jsxs)("span",{className:"inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300",children:[(0,I.jsx)(kr,{size:12,className:"text-amber-400"}),"Armas Favoritas"]}),(0,I.jsxs)("span",{className:"text-[10px] text-amber-400/80 font-mono font-bold",children:[favWeapons.length,favWeapons.length===1?" arma":" armas"]})]}),(0,I.jsx)("div",{className:"space-y-1.5",children:favWeapons.map(wp=>(0,I.jsxs)("div",{className:"bg-slate-900/90 border border-slate-800 rounded-lg p-2 text-[11px] space-y-1",children:[(0,I.jsxs)("div",{className:"flex items-center justify-between gap-2",children:[(0,I.jsxs)("div",{className:"flex items-center gap-1.5 min-w-0 flex-1",children:[(0,I.jsx)(Ii,{size:11,fill:"currentColor",className:"text-amber-400 shrink-0"}),(0,I.jsx)("span",{className:"font-bold text-white text-xs truncate",title:wp.name,children:wp.name})]}),(0,I.jsxs)("span",{className:"font-mono font-black text-amber-300 bg-amber-950/80 border border-amber-500/50 px-2 py-0.5 rounded text-[11px] shrink-0 tabular-nums shadow-xs",title:"N\xedvel de Habilidade (NH)",children:["NH ",wp.nh]})]}),wp.modes&&wp.modes.length>0?(0,I.jsx)("div",{className:"flex flex-wrap items-center gap-1 pt-0.5",children:wp.modes.map((md,mi)=>(0,I.jsxs)("div",{className:"bg-slate-950/90 border border-slate-800/90 rounded px-1.5 py-0.5 text-[10px] font-mono flex items-center gap-1.5 text-slate-300",title:`Ataque: ${md.name||"Ataque"} | Dano: ${md.damage||"-"} (${md.type||""}) | Alcance: ${md.reach||"-"}`,children:[md.name&&(0,I.jsxs)("span",{className:"font-bold text-amber-400 font-sans",children:[md.name,":"]}),(0,I.jsxs)("span",{children:["Dano ",(0,I.jsx)("strong",{className:"text-white",children:md.damage||"-"})]}),md.type&&(0,I.jsxs)("span",{className:"text-slate-400 font-sans",children:["(",md.type,")"]}),md.reach&&(0,I.jsxs)("span",{className:"text-slate-400",children:["Alc ",md.reach]})]},md.id||mi))}):(wp.damage?(0,I.jsxs)("div",{className:"bg-slate-950/90 border border-slate-800/90 rounded px-1.5 py-0.5 text-[10px] font-mono inline-flex items-center gap-1.5 text-slate-300",children:[(0,I.jsxs)("span",{children:["Dano ",(0,I.jsx)("strong",{className:"text-white",children:wp.damage})]}),wp.type&&(0,I.jsxs)("span",{className:"text-slate-400 font-sans",children:["(",wp.type,")"]}),wp.reach&&(0,I.jsxs)("span",{className:"text-slate-400",children:["Alc ",wp.reach]})]}):null)]},wp.id))})]},"fav-wpn"))'''
    t2_new = '},"fav"));' + hasFavWpn_code + 'hasSp&&cb.push('
    assert c.count(t2_old) == 1
    c = c.replace(t2_old, t2_new, 1)

    # 3. Target 3: genNotes&&cb.push -> separated obsGerais and obsMestre
    idx_obs_start = c.find('},"al"));genNotes&&cb.push(')
    assert idx_obs_start != -1
    idx_obs_end = c.find('if(cb.length===0)return null;', idx_obs_start)
    assert idx_obs_end != -1
    t3_old = c[idx_obs_start:idx_obs_end]
    t3_new = '''},"al"));obsGerais&&cb.push((0,I.jsxs)("div",{className:"bg-slate-950/90 border border-slate-800/80 rounded-lg p-2 text-[11px] space-y-1",children:[(0,I.jsxs)("div",{className:"flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider",children:[(0,I.jsx)(fe,{size:11,className:"text-slate-400"}),"Observa\xe7\xf5es Gerais"]}),(0,I.jsx)("p",{className:"text-slate-300 italic line-clamp-3 text-xs leading-relaxed",title:obsGerais,children:obsGerais})]},"obs-gerais"));obsMestre&&cb.push((0,I.jsxs)("div",{className:"bg-purple-950/30 border border-purple-800/50 rounded-lg p-2 text-[11px] space-y-1",children:[(0,I.jsxs)("div",{className:"flex items-center gap-1.5 text-[10px] font-bold text-purple-300 uppercase tracking-wider",children:[(0,I.jsx)(Qa,{size:11,className:"text-purple-400"}),"Observa\xe7\xf5es Privadas do Mestre"]}),(0,I.jsx)("p",{className:"text-purple-200 italic line-clamp-3 text-xs leading-relaxed",title:obsMestre,children:obsMestre})]},"obs-mestre"));'''
    assert c.count(t3_old) == 1
    c = c.replace(t3_old, t3_new, 1)

    # 4. Target 4: Ot in Yp -> add favWeapon
    t4_old = 'Ot=v=>{let H=t.weapons.filter(S=>S.id!==v);y("weapons",H)}'
    t4_new = 'Ot=v=>{let H=t.weapons.filter(S=>S.id!==v);y("weapons",H)},favWeapon=v=>{let H=t.weapons.map(S=>S.id===v?{...S,isFavorite:!S.isFavorite}:S);y("weapons",H)}'
    assert c.count(t4_old) == 1
    c = c.replace(t4_old, t4_new, 1)

    # 5. Target 5: Weapon card in Yp -> add favorite highlight
    t5_old = 't.weapons.map(v=>(0,d.jsxs)("div",{className:"p-3.5 bg-slate-950/80 border border-slate-800 hover:border-slate-750 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs",children:[(0,d.jsxs)("div",{className:"flex items-center gap-3 min-w-0 flex-1",'
    t5_new = 't.weapons.map(v=>(0,d.jsxs)("div",{className:`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${v.isFavorite?"bg-amber-950/20 border-amber-500/60 ring-1 ring-amber-500/20":"bg-slate-950/80 border-slate-800 hover:border-slate-750"}`,children:[(0,d.jsxs)("div",{className:"flex items-center gap-3 min-w-0 flex-1",'
    assert c.count(t5_old) == 1
    c = c.replace(t5_old, t5_new, 1)

    # 6. Target 6: Edit/Delete buttons in weapon card in Yp -> insert star button
    t6_old = '!g&&(0,d.jsxs)("div",{className:"flex items-center gap-1.5 shrink-0 self-end sm:self-center",children:[(0,d.jsx)("button",{onClick:()=>l(v),className:"p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors",title:"Editar arma",children:(0,d.jsx)(Po,{size:13})}),(0,d.jsx)("button",{onClick:()=>{hubConfirm(`Excluir a arma "${v.name||"Arma"}"?`).then(ok=>{ok&&Ot(v.id)})}'
    t6_new = '!g&&(0,d.jsxs)("div",{className:"flex items-center gap-1.5 shrink-0 self-end sm:self-center",children:[(0,d.jsx)("button",{type:"button",onClick:()=>favWeapon(v.id),className:`p-1.5 rounded-lg border transition-colors ${v.isFavorite?"bg-amber-500/20 border-amber-500/60 text-amber-400 hover:text-amber-300":"bg-slate-800 hover:bg-slate-700 text-slate-500 hover:text-slate-300 border-slate-700"}`,title:v.isFavorite?"Remover dos favoritos da tela inicial":"Favoritar arma para a tela inicial",children:(0,d.jsx)(Ii,{size:13,fill:v.isFavorite?"currentColor":"none"})}),(0,d.jsx)("button",{onClick:()=>l(v),className:"p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors",title:"Editar arma",children:(0,d.jsx)(Po,{size:13})}),(0,d.jsx)("button",{onClick:()=>{hubConfirm(`Excluir a arma "${v.name||"Arma"}"?`).then(ok=>{ok&&Ot(v.id)})}'
    assert c.count(t6_old) == 1
    c = c.replace(t6_old, t6_new, 1)

    # 7. Target 7: Ip save weapon -> preserve isFavorite
    t7_old = 'modes:c.filter(x=>x.damage.trim()!==""||x.type.trim()!==""),notes:m.trim()}),a()'
    t7_new = 'modes:c.filter(x=>x.damage.trim()!==""||x.type.trim()!==""),notes:m.trim(),isFavorite:r?!!r.isFavorite:!1}),a()'
    assert c.count(t7_old) == 1
    c = c.replace(t7_old, t7_new, 1)

    with open('mesa.html', 'w', encoding='utf-8') as f:
        f.write(c)

    print("Successfully applied favorite weapons and separated notes patch to mesa.html!")

if __name__ == '__main__':
    apply_patch()
