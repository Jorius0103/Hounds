"""
Gera um CSV com todas as MAGIAS (spells) encontradas nos seus livros GURPS.

Colunas: livro; pagina; magia; escola; classe; descricao; duracao; custo;
         tempo_de_conjuracao; pre_requisitos; item

Uso:
    pip install pdfplumber
    python extrair_magias.py
    python extrair_magias.py --pasta "C:\\outra\\pasta" --saida magias.csv

O script lê todos os PDFs da pasta (e subpastas) e reconhece as magias pelo
formato padrão dos livros GURPS 4e: título em negrito-itálico, seguido da
linha de classe (Regular, Area, Missile, Melee, Information...) e dos campos
Duration, Cost, Time to cast, Prerequisites e Item.
O CSV usa ";" e UTF-8 com BOM, para abrir direto no Excel em português.
"""
import argparse, csv, gc, re, sys
from collections import Counter
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    sys.exit("Instale antes:  pip install pdfplumber")

PASTA_PADRAO = Path(r"C:\Users\junior\Desktop\Hounds\Hounds\Gurps")

CLASSE = re.compile(r"^(Regular|Area|Missile|Melee|Information|Blocking|Enchantment|Special|Charm)\b")
ROTULOS = {
    "duration": "duracao",
    "cost": "custo",
    "base cost": "custo",
    "time to cast": "tempo_de_conjuracao",
    "prerequisite": "pre_requisitos",
    "prerequisites": "pre_requisitos",
}
CAMPOS = ["livro", "pagina", "magia", "escola", "classe", "descricao", "duracao", "custo",
          "tempo_de_conjuracao", "pre_requisitos", "item"]


def fonte(w):
    return w["fontname"].split("+")[-1]


def eh_titulo_magia(w):
    return "SemiBoldItalic" in fonte(w) and w["size"] >= 13


def eh_classe(w):
    f = fonte(w)
    return "SemiBold" in f and "Italic" not in f and 10.5 <= w["size"] < 12


def eh_secao(w):
    return "Black" in fonte(w)


def eh_italico(w):
    f = fonte(w)
    return "Italic" in f and "Bold" not in f


def colunas(words, largura):
    inicios = Counter()
    linhas = {}
    for w in words:
        linhas.setdefault(round(w["top"] / 2), []).append(w)
    for ws in linhas.values():
        ws.sort(key=lambda w: w["x0"])
        anterior = None
        for w in ws:
            if anterior is None or w["x0"] - anterior["x1"] > 15:
                inicios[round(w["x0"] / 6) * 6] += 1
            anterior = w
    picos = sorted(x for x, c in inicios.items() if c >= 6)
    cols = []
    for x in picos:
        if not cols or x - cols[-1] > largura * 0.2:
            cols.append(x)
    return cols or [0]


def ler_pagina(page):
    """Devolve (linhas na ordem de leitura, número impresso, texto do rodapé)."""
    h = page.height
    todas = page.extract_words(x_tolerance=1.5, extra_attrs=["fontname", "size"])
    rodape = sorted([w for w in todas if w["top"] >= h - 50], key=lambda w: w["x0"])
    numero = next((w["text"] for w in rodape if w["text"].isdigit()), "")
    texto_rodape = colar([w for w in rodape if not w["text"].isdigit()])
    words = [w for w in todas if 30 < w["top"] < h - 50 and "ICONS" not in w["fontname"].upper()]
    cols = colunas(words, page.width)
    grupos = {}
    for w in words:
        c = max([i for i, x in enumerate(cols) if x <= w["x0"] + 4] or [0])
        grupos.setdefault(c, []).append(w)
    linhas = []
    for c in sorted(grupos):
        ws = sorted(grupos[c], key=lambda w: (round(w["bottom"] / 3), w["x0"]))
        atual = []
        for w in ws:
            if atual and abs(atual[-1]["bottom"] - w["bottom"]) >= 3:
                linhas.append(atual)
                atual = []
            atual.append(w)
        if atual:
            linhas.append(atual)
    return linhas, numero, texto_rodape.strip()


def juntar(partes):
    texto = ""
    for p in partes:
        p = p.strip()
        if not p:
            continue
        if texto.endswith("-") and p[:1].islower():
            texto = texto[:-1] + p
        else:
            texto = f"{texto} {p}" if texto else p
    return re.sub(r"\s+", " ", texto).strip()


def colar(ws):
    """Junta palavras de títulos em versalete (ex.: "B ODY C ONTROL" -> "BODY CONTROL")."""
    texto, anterior = "", None
    for w in sorted(ws, key=lambda w: w["x0"]):
        if anterior is not None and w["x0"] - anterior["x1"] > 2:
            texto += " "
        texto += w["text"]
        anterior = w
    return texto


def escola_do_texto(t):
    m = re.search(r"([A-Za-z&' ]+?)[\s\-]*SPELLS\b", t.upper())
    return re.sub(r"^(Spell )?Lists? ", "", m.group(1).strip().title()) if m else ""


class Magia:
    def __init__(self, livro, pagina, nome, escola):
        self.d = {c: "" for c in CAMPOS}
        self.d.update(livro=livro, pagina=pagina, magia=nome, escola=escola)
        self.partes = {c: [] for c in ("classe", "descricao", "duracao", "custo",
                                       "tempo_de_conjuracao", "pre_requisitos", "item")}
        self.campo = "classe"

    def adicionar(self, ln):
        if self.campo == "classe":
            if eh_classe(ln[0]):
                self.partes["classe"].append(" ".join(w["text"] for w in ln))
                return
            self.campo = "descricao"
        # "Item" em negrito no começo da linha: o resto da magia é a seção de item
        if self.campo != "item" and eh_classe(ln[0]) and ln[0]["text"].startswith("Item"):
            self.campo = "item"
            ln = ln[1:]
            if not ln:
                return
        # rótulo em itálico no começo da linha (Duration:, Cost:, Time to cast: ...)
        if self.campo != "item" and eh_italico(ln[0]):
            rot = []
            for k, w in enumerate(ln):
                if not eh_italico(w):
                    break
                rot.append(w["text"])
                if w["text"].endswith(":"):
                    chave = " ".join(rot)[:-1].lower()
                    if chave in ROTULOS:
                        self.campo = ROTULOS[chave]
                        ln = ln[k + 1:]
                    break
        self.partes[self.campo].append(" ".join(w["text"] for w in ln))

    def finalizar(self):
        for c, p in self.partes.items():
            self.d[c] = juntar(p)
        return self.d


def processar(caminho, nome_livro, saida, contador):
    atual = None
    escola_corpo = ""
    secao = ""
    with pdfplumber.open(caminho) as pdf:
        total = len(pdf.pages)
        for i, page in enumerate(pdf.pages):
            linhas, numero, rodape = ler_pagina(page)
            page.flush_cache()
            escola_rodape = escola_do_texto(rodape)
            pagina = numero or str(i + 1)
            k = 0
            while k < len(linhas):
                ln = linhas[k]
                texto = " ".join(w["text"] for w in ln)
                if all(eh_secao(w) for w in ln):
                    secao = (secao + " " + colar(ln)).strip()
                    e = escola_do_texto(secao)
                    if e:
                        escola_corpo = e
                        secao = ""
                else:
                    secao = ""
                if all(eh_titulo_magia(w) for w in ln):
                    nome = texto
                    j = k + 1
                    # título quebrado em duas linhas
                    if j < len(linhas) and all(eh_titulo_magia(w) for w in linhas[j]):
                        nome += " " + " ".join(w["text"] for w in linhas[j])
                        j += 1
                    if j < len(linhas) and eh_classe(linhas[j][0]) and \
                            CLASSE.match(" ".join(w["text"] for w in linhas[j])):
                        if atual:
                            saida.writerow(atual.finalizar())
                            contador[nome_livro] += 1
                        atual = Magia(nome_livro, pagina, nome, escola_rodape or escola_corpo)
                        k = j
                        continue
                    # outro título qualquer encerra a magia em andamento
                    if atual:
                        saida.writerow(atual.finalizar())
                        contador[nome_livro] += 1
                        atual = None
                elif atual and all(eh_secao(w) for w in ln):
                    saida.writerow(atual.finalizar())
                    contador[nome_livro] += 1
                    atual = None
                elif atual:
                    atual.adicionar(ln)
                k += 1
            if (i + 1) % 50 == 0:
                print(f"    página {i + 1}/{total}...")
            gc.collect()
    if atual:
        saida.writerow(atual.finalizar())
        contador[nome_livro] += 1


def nome_bonito(p):
    n = re.sub(r"[_]+", " ", p.stem)
    n = re.sub(r"\s*-\s*4th Edition\s*-\s*", " ", n)
    n = n.replace("GURPS 4e - ", "GURPS ").replace(" - ", ": ")
    return re.sub(r"\s+", " ", n).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pasta", type=Path, default=PASTA_PADRAO)
    ap.add_argument("--saida", type=Path, default=None)
    a = ap.parse_args()
    if not a.pasta.is_dir():
        sys.exit(f"Pasta não encontrada: {a.pasta}")
    pdfs = sorted(a.pasta.rglob("*.pdf"))
    if not pdfs:
        sys.exit(f"Nenhum PDF em {a.pasta}")
    arquivo = a.saida or (a.pasta / "magias.csv")
    contador = Counter()
    with open(arquivo, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=CAMPOS, delimiter=";")
        w.writeheader()
        for p in pdfs:
            livro = nome_bonito(p)
            print(f"Lendo {p.name} ...")
            try:
                processar(p, livro, w, contador)
            except Exception as e:
                print(f"  ERRO: {e}")
                continue
            print(f"  {contador[livro]} magias")
    print(f"\nTotal: {sum(contador.values())} magias -> {arquivo}")


if __name__ == "__main__":
    main()
