import subprocess
import os

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(edge_path):
    edge_path = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"

url = "file:///" + os.path.abspath("mesa.html").replace("\\", "/")

# Run with virtual-time-budget so React has time to render
cmd = [
    edge_path,
    "--headless=new",
    "--disable-gpu",
    "--virtual-time-budget=3000",
    "--dump-dom",
    url
]

res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace")

print("Dump length:", len(res.stdout))
if '<div id="root"><div class=' in res.stdout:
    print("SUCCESS: React root component fully mounted and rendered!")
    idx = res.stdout.find('<div id="root">')
    print(res.stdout[idx:idx+300])
elif '<div id="root"></div>' in res.stdout:
    print("WARNING: Root div is empty! Let's check for console errors.")
else:
    print("Root div not found.")
