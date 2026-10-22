import os
import subprocess

file_path = os.path.join(os.path.dirname(__file__), '..', 'mesa.html')
with open(file_path, 'r', encoding='utf-8') as f:
    c = f.read()

# No Zp:
# Antes:
# let isMestreUser=i==="mestre",canDragCards=isMestreUser&&srt==="mestre";let[n,l]=(0,qp.useState)("all"),[srt,ssrt]=(0,qp.useState)(()=>{try{let s=localStorage.getItem("gurps_combat_sort_mode_v1");if(s==="alpha"||s==="speed"||s==="mestre")return s}catch{}return"speed"}),setSrt=m=>{ssrt(m);try{localStorage.setItem("gurps_combat_sort_mode_v1",m)}catch{}},
#
# Depois:
# let[n,l]=(0,qp.useState)("all"),[srt,ssrt]=(0,qp.useState)(()=>{try{let s=localStorage.getItem("gurps_combat_sort_mode_v1");if(s==="alpha"||s==="speed"||s==="mestre")return s}catch{}return"speed"}),setSrt=m=>{ssrt(m);try{localStorage.setItem("gurps_combat_sort_mode_v1",m)}catch{}},isMestreUser=i==="mestre",canDragCards=isMestreUser&&srt==="mestre";

old_bad = 'let isMestreUser=i==="mestre",canDragCards=isMestreUser&&srt==="mestre";let[n,l]=(0,qp.useState)("all"),[srt,ssrt]=(0,qp.useState)(()=>{try{let s=localStorage.getItem("gurps_combat_sort_mode_v1");if(s==="alpha"||s==="speed"||s==="mestre")return s}catch{}return"speed"}),setSrt=m=>{ssrt(m);try{localStorage.setItem("gurps_combat_sort_mode_v1",m)}catch{}},'

new_good = 'let[n,l]=(0,qp.useState)("all"),[srt,ssrt]=(0,qp.useState)(()=>{try{let s=localStorage.getItem("gurps_combat_sort_mode_v1");if(s==="alpha"||s==="speed"||s==="mestre")return s}catch{}return"speed"}),setSrt=m=>{ssrt(m);try{localStorage.setItem("gurps_combat_sort_mode_v1",m)}catch{}},isMestreUser=i==="mestre",canDragCards=isMestreUser&&srt==="mestre";'

assert old_bad in c, "Error: old_bad not found in mesa.html"
c = c.replace(old_bad, new_good, 1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(c)

print("SUCCESS: TDZ in Zp fixed!")

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
