import subprocess
import time
import os

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(edge_path):
    edge_path = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"

dump_file = "tools/dom_dump.html"
if os.path.exists(dump_file):
    os.remove(dump_file)

url = "file:///" + os.path.abspath("mesa.html").replace("\\", "/")

cmd = [
    edge_path,
    "--headless=new",
    "--disable-gpu",
    "--dump-dom",
    url
]

print("Launching Edge to dump DOM...")
res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace")

with open(dump_file, "w", encoding="utf-8") as f:
    f.write(res.stdout)

print("Dump length:", len(res.stdout))
if "Carregando a Mesa de RPG" in res.stdout:
    print("WARNING: Still stuck on loading!")
elif '<div id="root">' in res.stdout:
    root_idx = res.stdout.find('<div id="root">')
    print("SUCCESS: Root div rendered!")
    print(res.stdout[root_idx:root_idx+500])
else:
    print("Root div not found!")
