import sys

with open('mesa.html', 'r', encoding='utf-8') as f:
    text = f.read()

idx_header = text.find('header",{className:"sticky top-0')
if idx_header == -1:
    print("Error: header not found")
    sys.exit(1)

idx_header_end = text.find('isMestre&&openPerms?E1().createPortal', idx_header)
if idx_header_end == -1:
    print("Error: header end not found")
    sys.exit(1)

content = text[idx_header:idx_header_end]

idx_home = content.find('onOpenHomeScreen&&(0,q.jsxs)("button"')
target_home_end = 'children:isHomeScreen?"Tela Detalhada":"Tela Inicial"})]}),'
idx_home_end = content.find(target_home_end, idx_home) + len(target_home_end)
home_btn_code = content[idx_home:idx_home_end]

target_dice_start = '(0,q.jsxs)("div",{className:"relative flex items-center gap-2 px-2.5 py-1 bg-slate-900/90 border border-slate-750 rounded-lg shadow-inner shrink-0"'
idx_dice = content.find(target_dice_start)

target_audio_start = '(0,q.jsxs)("div",{className:"flex items-center gap-2.5 px-3 py-1 bg-slate-900/95 border border-slate-750 rounded-lg shadow-inner shrink-0"'
idx_audio = content.find(target_audio_start)

z1_rest = content[idx_home_end:idx_dice]
dice_div_code = content[idx_dice:idx_audio]
audio_div_code = content[idx_audio:]
assert audio_div_code.endswith(']}),')
audio_div_clean = audio_div_code[:-4]

home_btn_code_clean = home_btn_code.rstrip(',')

# Construct new header content:
new_header = (
    'header",{className:"sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800/80 px-3 sm:px-6 py-2",children:['
    '(0,q.jsxs)("div",{className:"w-full max-w-[1920px] mx-auto flex items-center justify-between gap-4 sm:gap-6 flex-nowrap overflow-x-auto scrollbar-none",children:['
    # Left zone (Zone 1)
    '(0,q.jsxs)("div",{className:"flex-1 flex items-center justify-start gap-3 sm:gap-4 shrink-0 flex-nowrap",children:['
    + z1_rest
    # Center zone (Botão Tela Inicial / Tela Detalhada bem no centro)
    + '(0,q.jsx)("div",{className:"flex items-center justify-center shrink-0 px-2",children:'
    + home_btn_code_clean
    + '}),'
    # Right zone (Dados e Música próximos respeitando o espaçamento)
    + '(0,q.jsxs)("div",{className:"flex-1 flex items-center justify-end gap-3 sm:gap-4 shrink-0 flex-nowrap",children:['
    + dice_div_code
    + audio_div_clean
    + ']})'
    # Close outer container w-full max-w-[1920px]
    + ']})'
    # Trailing comma before isMestre&&openPerms
    + ','
)

new_text = text[:idx_header] + new_header + text[idx_header_end:]

with open('mesa.html', 'w', encoding='utf-8', newline='\n') as f:
    f.write(new_text)

print("mesa.html patched successfully!")

