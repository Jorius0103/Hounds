# -*- coding: utf-8 -*-
import sys
import re

def patch_mesa_all_modals():
    with open('mesa.html', 'r', encoding='utf-8') as f:
        content = f.read()

    print("Original size:", len(content))

    # All modal markers to style
    modal_configs = [
        # (Marker in modal, max_width, description)
        (r'Grim\xF3rio de Magias: ', "640px", "Grimorio de Magias"),
        (r'Cadastrar Regra Espec\xEDfica', "480px", "Regra Armadura 1"),
        (r'Regra Espec\xEDfica desta Parte do Corpo', "480px", "Regra Armadura 2"),
        (r'Lan\xE7ar Dano / Fadiga', "600px", "Lancar Dano / Fadiga"),
        (r'Foto / Token de ', "540px", "Avatar Picker"),
        (r'Configura\xE7\xF5es da Mesa de Combate', "640px", "Configuracoes Mesa"),
        (r'Gerenciador de Condi\xE7\xF5es & Estados (CRUD)', "640px", "Gerenciador Condicoes"),
        (r'Controle de Acesso: Mestres e Jogadores (CRUD)', "580px", "Controle Acesso Usuarios"),
        (r'Nova Senha', "440px", "Login"),
        (r'Preencher rapidamente com modelo GURPS 4e:', "640px", "Armas"),
        (r'Link de Acesso para o Jogador:', "480px", "Sincronizacao Online"),
        (r'Log do Sistema & Debug de Sincroniza\xE7\xE3o', "640px", "Log do Sistema"),
    ]

    for marker, max_w, desc in modal_configs:
        pos = content.find(marker)
        if pos == -1:
            print(f"Skipping {desc}: marker '{marker}' not found")
            continue
        
        # find the preceding fixed inset-0
        bg_idx = content.rfind('className:"fixed inset-0', 0, pos)
        if bg_idx == -1 or pos - bg_idx > 3000:
            print(f"Skipping {desc}: backdrop not found in proximity ({pos - bg_idx})")
            continue
        
        # 1. Enrich backdrop
        bg_open = content.find('("div",{', bg_idx - 20)
        if bg_open != -1 and bg_open < bg_idx:
            insert_bg = bg_open + len('("div",{')
            sub_bg = content[insert_bg:insert_bg+80]
            if 'style:{' not in sub_bg and 'style: {' not in sub_bg:
                bg_style_str = 'style:{position:"fixed",inset:0,zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",background:"rgba(2,6,23,0.85)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)",overflowY:"auto"},'
                content = content[:insert_bg] + bg_style_str + content[insert_bg:]
                # adjust pos
                pos += len(bg_style_str)

        # 2. Enrich card
        card_idx = content.find('children:(0,', bg_idx)
        if card_idx == -1 or card_idx > pos:
            card_idx = content.find('children:', bg_idx)
        
        card_open = content.find('("div",{', card_idx)
        if card_open != -1 and card_open < pos:
            insert_card = card_open + len('("div",{')
            sub_card = content[insert_card:insert_card+80]
            if 'style:{' not in sub_card and 'style: {' not in sub_card:
                card_style_str = f'style:{{position:"relative",margin:"auto",width:"100%",maxWidth:"{max_w}",maxHeight:"85vh",display:"flex",flexDirection:"column",background:"#0f172a",border:"1px solid rgba(245,158,11,0.35)",borderRadius:"16px",boxShadow:"0 25px 50px -12px rgba(0,0,0,0.75)",overflow:"hidden"}},'
                content = content[:insert_card] + card_style_str + content[insert_card:]
                pos += len(card_style_str)
                print(f"Successfully styled card for {desc} (maxWidth: {max_w})")
            else:
                print(f"{desc} card already has style")

    with open('mesa.html', 'w', encoding='utf-8') as f:
        f.write(content)

    print("Patched mesa.html successfully! Final size:", len(content))

if __name__ == '__main__':
    patch_mesa_all_modals()
