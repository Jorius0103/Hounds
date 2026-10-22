# -*- coding: utf-8 -*-
with open('mesa.html', 'r', encoding='utf-8') as f:
    content = f.read()

targets = [
    (r'children:["Lan\xE7ar Dano / Fadiga"', "600px", "Lancar Dano / Fadiga"),
    (r'children:"Configura', "640px", "Configuracoes Mesa"),
    (r'editRuleIdx!==null&&', "480px", "Regra Armadura 1"),
    (r'editPartRuleKey!==null&&', "480px", "Regra Armadura 2"),
]

for marker, max_w, desc in targets:
    pos = content.find(marker)
    if pos == -1:
        print(f"Skipping {desc}: marker '{marker}' not found")
        continue

    # find the preceding fixed inset-0
    bg_idx = content.find('className:"fixed inset-0', pos - 1500 if desc.startswith('Regra') else pos - 3000)
    if bg_idx == -1 or bg_idx > pos + 300:
        # try search backwards
        bg_idx = content.rfind('className:"fixed inset-0', 0, pos + 100)
    
    print(f"Processing {desc}: marker at {pos}, bg_idx at {bg_idx}")

    # 1. Enrich backdrop
    bg_open = content.find('("div",{', bg_idx - 30)
    if bg_open != -1 and bg_open < bg_idx:
        insert_bg = bg_open + len('("div",{')
        sub_bg = content[insert_bg:insert_bg+80]
        if 'style:{' not in sub_bg and 'style: {' not in sub_bg:
            bg_style_str = 'style:{position:"fixed",inset:0,zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",background:"rgba(2,6,23,0.85)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)",overflowY:"auto"},'
            content = content[:insert_bg] + bg_style_str + content[insert_bg:]
            pos += len(bg_style_str)

    # 2. Enrich card
    card_idx = content.find('children:(0,', bg_idx)
    if card_idx == -1 or card_idx > pos + 500:
        card_idx = content.find('children:', bg_idx)

    card_open = content.find('("div",{', card_idx)
    if card_open != -1 and card_open < pos + 500:
        insert_card = card_open + len('("div",{')
        sub_card = content[insert_card:insert_card+80]
        if 'style:{' not in sub_card and 'style: {' not in sub_card:
            card_style_str = f'style:{{position:"relative",margin:"auto",width:"100%",maxWidth:"{max_w}",maxHeight:"85vh",display:"flex",flexDirection:"column",background:"#0f172a",border:"1px solid rgba(245,158,11,0.35)",borderRadius:"16px",boxShadow:"0 25px 50px -12px rgba(0,0,0,0.75)",overflow:"hidden"}},'
            content = content[:insert_card] + card_style_str + content[insert_card:]
            print(f"Successfully styled card for {desc} (maxWidth: {max_w})")
        else:
            print(f"{desc} card already has style")

with open('mesa.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Finished patching remaining modals! Size:", len(content))
