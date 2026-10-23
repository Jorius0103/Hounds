"""
Acrescenta ao advantages.csv os PERKS do GURPS Power-Ups 2: Perks (o livro todo é uma lista de perks,
com mais de 160), lidos do PDF: livro; pagina; advantage; custo; tipo (Perk); descricao.

Uso (depois do extrair_advantages.py, que gera o advantages.csv dos outros livros):
    pip install pdfplumber
    python extrair_perks_pu2.py
    python extrair_perks_pu2.py --pdf "C:\\outra\\pasta\\GURPS 4th - Power Ups 2 - Perks.pdf"

Pode rodar de novo: as linhas do Power-Ups 2 que já estão no CSV são trocadas pelas novas.
Depois, gere os arquivos do site com  node tools/gurps-csv-para-json.mjs  e aumente CATALOG_VERSION
em js/mundo.js.

Como o livro é lido (págs. 4 a 21, em duas colunas):
  - o nome de um perk é uma linha em NewAster-SemiBold 11 (às vezes quebrada em duas linhas);
    depois do nome, os símbolos do livro (quadro Special Properties, p. 4): * cinemático,
    † exige especialização, ‡ vem em níveis (cada nível custa 1 ponto). Eles saem do nome e viram
    a primeira frase da descrição;
  - a descrição é o texto até o próximo nome; um parágrafo começa numa linha com recuo;
  - um título de seção (NewAster-Black, em versalete) encerra o perk anterior: a introdução
    da seção não entra em nenhum perk;
  - quadros laterais (um título NewAster-Black 20 de palavras inteiras, como "Special Properties"
    e "Power Perks") ficam de fora enquanto o texto tiver o recuo do quadro;
  - frases em destaque (corpo 14 ou mais), cabeçalho e rodapé (THE PERKS, número da página) e a
    propaganda da última página (outras fontes, não NewAster) ficam de fora;
  - um parágrafo começa numa linha com recuo em relação à de cima (algumas colunas ficam
    deslocadas por ilustrações; o recuo conta a partir da linha anterior, não da margem).
Nomes repetidos no livro ganham entre parênteses de que tipo são, como no índice (p. 22):
Controllable Disadvantage (Mental), p. 12, e (Physical), p. 13.
"""
import argparse, collections, csv, io, re, sys
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    sys.exit("Instale antes:  pip install pdfplumber")

PASTA = Path(__file__).resolve().parent
PDF_PADRAO = PASTA / "GURPS 4th - Power Ups 2 - Perks.pdf"
CSV = PASTA / "advantages.csv"
LIVRO = "GURPS Power-Ups 2: Perks"
CAMPOS = ["livro", "pagina", "advantage", "custo", "tipo", "descricao"]
PAGINAS = range(4, 22)  # impressas; a página do PDF é a mesma
MEIO = 306              # entre as duas colunas


def eh_titulo(ws):
    return all("SemiBold" in w["fontname"] and abs(w["size"] - 11) < 0.6 for w in ws)


def eh_secao(ws):
    return any("Black" in w["fontname"] for w in ws)


def eh_quadro(ws):
    # Título de quadro: só palavras inteiras em Black 20 (uma seção tem a inicial em 20 e o resto em 15).
    return all("Black" in w["fontname"] and w["size"] >= 19 for w in ws) and all(len(w["text"]) > 1 for w in ws)


def linhas_da_pagina(pg):
    """As linhas de cada coluna, de cima para baixo: [(coluna, top, [palavras])]."""
    ws = pg.extract_words(extra_attrs=["fontname", "size"], x_tolerance=1.5, keep_blank_chars=False)
    out = collections.OrderedDict()
    for w in sorted(ws, key=lambda w: (0 if w["x0"] < MEIO else 1, round(w["top"]), w["x0"])):
        col = 0 if w["x0"] < MEIO else 1
        chave = (col, round(w["top"]))
        # Palavras da mesma linha às vezes variam meio ponto no topo.
        if (col, chave[1] - 1) in out: chave = (col, chave[1] - 1)
        out.setdefault(chave, []).append(w)
    return [(c, t, sorted(v, key=lambda w: w["x0"])) for (c, t), v in out.items()]


def juntar(linhas):
    """Texto das linhas de uma descrição: hifens de quebra, espaços e parágrafos."""
    out = ""
    for texto, novo_paragrafo in linhas:
        if not out:
            out = texto
        # Recuo só começa parágrafo depois do fim de uma frase (uma ilustração também desloca a linha).
        elif novo_paragrafo and re.search(r"[.!?:)”’]$", out):
            out += "\n\n" + texto
        # Hífen de quebra no meio de uma palavra sai; depois de um número fica ("10-yard").
        elif out.endswith("-") and out[-2:-1].isalpha() and texto[:1].islower():
            out = out[:-1] + texto
        elif out.endswith(("-", "–")) and not out.endswith(" –"):
            out += texto
        else:
            out += " " + texto
    return re.sub(r"[ \t]+", " ", out).strip()


# (nome, página) -> nome no catálogo.
RENOMEAR = {("Controllable Disadvantage", 12): "Controllable Disadvantage (Mental)",
            ("Controllable Disadvantage", 13): "Controllable Disadvantage (Physical)"}


def ler(pdf):
    perks = []
    atual = None  # { nome, pagina, linhas }
    with pdfplumber.open(pdf) as doc:
        for num in PAGINAS:
            pg = doc.pages[num - 1]
            linhas = linhas_da_pagina(pg)
            # A margem de cada coluna: o menor x em que começam pelo menos 3 linhas de texto (o texto
            # de um quadro e o primeiro verso de um parágrafo começam mais para dentro).
            base = {}
            for col in (0, 1):
                xs = collections.Counter(round(ws[0]["x0"]) for c, t, ws in linhas if c == col and not eh_titulo(ws) and not eh_secao(ws))
                freq = [x for x, n in xs.items() if n >= 3]
                base[col] = min(freq) if freq else (56 if col == 0 else 315)
            quadro = {0: False, 1: False}
            anterior_titulo = None
            x_anterior = {0: None, 1: None}  # onde começou a linha de texto anterior, em cada coluna
            for col, top, ws in linhas:
                if top >= 755 or top < 40 and num == 4:
                    continue
                if not any("NewAster" in w["fontname"] for w in ws):
                    continue  # propaganda
                texto = " ".join(w["text"] for w in ws).strip()
                x0 = round(ws[0]["x0"])
                if eh_quadro(ws):
                    quadro[col] = True; anterior_titulo = None
                    continue
                if quadro[col]:
                    if x0 - base[col] >= 10 and not eh_titulo(ws):
                        continue
                    quadro[col] = False
                if eh_secao(ws):
                    atual = None; anterior_titulo = None
                    continue
                if max(w["size"] for w in ws) >= 14:
                    continue  # frase em destaque
                if eh_titulo(ws):
                    # Nome quebrado em duas linhas: a segunda continua o anterior.
                    if anterior_titulo is not None and anterior_titulo["col"] == col and top - anterior_titulo["top"] < 16:
                        atual["nome"] += " " + texto; anterior_titulo["top"] = top
                        continue
                    atual = {"nome": texto, "pagina": num, "linhas": []}
                    perks.append(atual)
                    anterior_titulo = {"col": col, "top": top}
                    continue
                anterior_titulo = None
                antes = x_anterior[col] if x_anterior[col] is not None else base[col]
                x_anterior[col] = x0
                if atual is not None:
                    atual["linhas"].append((texto, x0 - antes >= 8 and bool(atual["linhas"])))
    return perks


def linha_csv(p):
    nome = re.sub(r"\s+", " ", p["nome"]).strip()
    marcas = "".join(re.findall(r"[*†‡]", nome))
    nome = re.sub(r"\s*[*†‡]+", "", nome).strip()
    nome = RENOMEAR.get((nome, p["pagina"]), nome)
    notas = []
    if "*" in marcas: notas.append("Cinematic.")
    if "†" in marcas: notas.append("Requires specialization.")
    if "‡" in marcas: notas.append("Comes in levels, each costing 1 point.")
    desc = juntar(p["linhas"])
    return {"livro": LIVRO, "pagina": str(p["pagina"]), "advantage": nome,
            "custo": "1 point/level" if "‡" in marcas else "1 point", "tipo": "Perk",
            "descricao": (" ".join(notas) + "\n\n" + desc).strip() if notas else desc}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", type=Path, default=PDF_PADRAO)
    ap.add_argument("--csv", type=Path, default=CSV)
    a = ap.parse_args()
    if not a.pdf.is_file():
        sys.exit(f"PDF não encontrado: {a.pdf}")
    novas = [linha_csv(p) for p in ler(a.pdf)]
    novas = [r for r in novas if r["advantage"] and r["descricao"]]
    texto = a.csv.read_text(encoding="utf-8-sig")
    eol = "\r\n" if "\r\n" in texto else "\n"
    antigas = [r for r in csv.DictReader(io.StringIO(texto), delimiter=";") if r["livro"] != LIVRO]
    with open(a.csv, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=CAMPOS, delimiter=";", lineterminator=eol)
        w.writeheader()
        w.writerows(antigas + novas)
    print(f"{len(novas)} perks do {LIVRO} -> {a.csv}")


if __name__ == "__main__":
    main()
