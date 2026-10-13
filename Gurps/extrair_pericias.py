"""
Gera um CSV com todas as PERÍCIAS (skills) encontradas nos seus livros GURPS.

Colunas: livro; pagina; pericia; tipo; atributo; dificuldade; especializacao; cinematica;
         defaults; pre_requisitos; descricao; modificadores

"tipo" é a linha de tipo como está no livro ("IQ/Hard", "Melee; DX/Very Hard" ou uma
remissão como "see Crewman, p. 185"); atributo e dificuldade saem dela.

Uso:
    pip install pdfplumber
    python extrair_pericias.py
    python extrair_pericias.py --pasta "C:\\outra\\pasta" --saida pericias.csv

O script lê todos os PDFs da pasta (e subpastas) e reconhece as perícias pelo
formato padrão dos livros GURPS 4e: título em negrito-itálico, seguido da
linha de tipo (IQ/Hard, DX/Average...) ou de uma remissão ("see Crewman, p. 185"),
e dos campos Default(s), Prerequisite(s) e Modifiers.
Famílias de perícias com tipo "Varies" (como Melee Weapon, DX/Varies) saem também
separadas, uma linha por perícia da família ("Rapier (DX/Average): ...").
Perícias marcadas com † exigem especialização (coluna "especializacao"); as marcadas
com * são cinemáticas (coluna "cinematica").
O texto dos quadros laterais (sidebars) é ignorado.
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

TIPO = re.compile(r"^(?:[A-Za-z][\w -]*;\s*)?(ST|DX|IQ|HT|Will|Per)\s*/\s*(Very Hard|Easy|Average|Hard|Varies|VH|E|A|H)\b")
# Uma perícia dentro de uma família "Varies": rótulo em itálico "Rapier (DX/Average):".
SUB_PERICIA = re.compile(r"^(.+?)\s*\((ST|DX|IQ|HT|Will|Per)/(Very Hard|Easy|Average|Hard)\):$")
DEFAULT_NO_TEXTO = re.compile(r"\bDefaults?:\s*(.+?)\.(?=\s|$)")
REMISSAO = re.compile(r"^see\b", re.I)
# ponto final seguido de uma frase (não "p. 185", "e.g." etc.)
FIM_DE_CAMPO = re.compile(r"(?<!\bp)(?<!\bpp)(?<!e\.g)(?<!i\.e)(?<!\betc)(?<!\bvs)\.\s+(?=[A-Z][a-z]*(?: \S+){5})")
DIFICULDADES = {"E": "Easy", "A": "Average", "H": "Hard", "VH": "Very Hard"}
ROTULOS = {
    "default": "defaults",
    "defaults": "defaults",
    "prerequisite": "pre_requisitos",
    "prerequisites": "pre_requisitos",
    "modifier": "modificadores",
    "modifiers": "modificadores",
}
CAMPOS = ["livro", "pagina", "pericia", "tipo", "atributo", "dificuldade", "especializacao",
          "cinematica", "defaults", "pre_requisitos", "descricao", "modificadores"]


def fonte(w):
    return w["fontname"].split("+")[-1]


def eh_titulo_pericia(w):
    return "SemiBoldItalic" in fonte(w) and w["size"] >= 13


def eh_tipo(w):
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
    # as linhas de tipo são alinhadas à direita e, repetidas, pareceriam uma coluna
    for w in words:
        if not eh_tipo(w):
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


def quadros(page):
    """Caixas dos quadros laterais: contornos sem preenchimento (os fundos da página são preenchidos)."""
    caixas = []
    for c in page.curves + page.rects:
        if not c.get("stroke") or c.get("fill"):
            continue
        if c["x1"] - c["x0"] < 50 or c["bottom"] - c["top"] < 50:
            continue
        caixas.append((c["x0"], c["top"], c["x1"], c["bottom"]))
    return caixas


def dentro(w, caixas):
    x, y = (w["x0"] + w["x1"]) / 2, (w["top"] + w["bottom"]) / 2
    return any(x0 <= x <= x1 and t <= y <= b for x0, t, x1, b in caixas)


def ler_pagina(page):
    """Devolve (linhas na ordem de leitura como (palavras, recuada), número impresso)."""
    h = page.height
    todas = page.extract_words(x_tolerance=1.5, extra_attrs=["fontname", "size"])
    rodape = sorted([w for w in todas if w["top"] >= h - 50], key=lambda w: w["x0"])
    numero = next((w["text"] for w in rodape if w["text"].isdigit()), "")
    caixas = quadros(page)
    words = [w for w in todas if 30 < w["top"] < h - 50 and "ICONS" not in w["fontname"].upper()
             and not dentro(w, caixas)]
    return agrupar(words, page.width), numero


def agrupar(words, largura, folga=4):
    """Linhas na ordem de leitura, como (palavras, recuada), das palavras de uma área da página.
    folga: quanto uma palavra pode começar à esquerda do início da coluna e ainda ser dela."""
    if not words:
        return []
    cols = colunas(words, largura)
    grupos = {}
    for w in words:
        c = max([i for i, x in enumerate(cols) if x <= w["x0"] + folga] or [0])
        grupos.setdefault(c, []).append(w)
    linhas = []
    for c in sorted(grupos):
        ws = sorted(grupos[c], key=lambda w: (round(w["bottom"] / 3), w["x0"]))
        da_coluna, atual = [], []
        for w in ws:
            if atual and abs(atual[-1]["bottom"] - w["bottom"]) >= 3:
                da_coluna.append(atual)
                atual = []
            atual.append(w)
        if atual:
            da_coluna.append(atual)
        # margem da coluna = início de linha mais comum; mais à direita = parágrafo novo
        margem = Counter(round(ln[0]["x0"]) for ln in da_coluna).most_common(1)[0][0]
        linhas += [(ln, ln[0]["x0"] - margem > 5) for ln in da_coluna]
    return linhas


def juntar(partes):
    texto = ""
    for p in partes:
        p = p.strip()
        if not p:
            continue
        if texto.endswith("-") and p[:1].islower():
            texto = texto[:-1] + p
        elif texto.endswith("-") and (p[:1].isupper() or p[:1].isdigit()):
            texto += p  # "Two-" + "Handed", "DX-" + "4"
        else:
            texto = f"{texto} {p}" if texto else p
    return re.sub(r"\s+", " ", texto).strip()


def texto(ln):
    return " ".join(w["text"] for w in ln)


class Pericia:
    def __init__(self, livro, pagina, nome):
        self.d = {c: "" for c in CAMPOS}
        self.d.update(livro=livro, pagina=pagina, pericia=re.sub(r"\s*[†*]\s*", " ", nome).strip(),
                      especializacao="sim" if "†" in nome else "",
                      cinematica="sim" if "*" in nome else "")
        self.partes = {c: [] for c in ("tipo", "defaults", "pre_requisitos", "descricao",
                                       "modificadores")}
        self.campo = "tipo"
        self.da_familia = False  # perícia de dentro de uma família "Varies"
        self.na_categoria = False  # depois de um subtítulo da família, até a próxima perícia

    def familia(self):
        """True na perícia "Varies" (Melee Weapon) e nas perícias de dentro dela."""
        return self.da_familia or "/Varies" in juntar(self.partes["tipo"])

    def adicionar(self, ln, recuada):
        if self.campo == "tipo":
            if eh_tipo(ln[0]) or (self.partes["tipo"] and "BoldItalic" in fonte(ln[0])):
                self.partes["tipo"].append(texto(ln))
                return
            self.campo = "descricao"
        # rótulo em itálico no começo da linha (Default:, Prerequisites:, Modifiers:)
        rotulo = False
        if eh_italico(ln[0]):
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
                        rotulo = True
                    break
        # parágrafo novo depois de Default/Prerequisite já terminado: começa a descrição
        if not rotulo and recuada and self.campo in ("defaults", "pre_requisitos") \
                and juntar(self.partes[self.campo]).endswith("."):
            self.campo = "descricao"
        self.partes[self.campo].append(texto(ln))

    def finalizar(self):
        self.d["tipo"] = juntar(self.partes["tipo"])
        m = TIPO.match(self.d["tipo"])
        if m:
            self.d["atributo"] = m.group(1)
            self.d["dificuldade"] = DIFICULDADES.get(m.group(2), m.group(2))
        for c in ("defaults", "pre_requisitos", "descricao", "modificadores"):
            self.d[c] = juntar(self.partes[c])
        # alguns livros continuam a descrição na mesma linha do Default/Prerequisite
        for c in ("pre_requisitos", "defaults"):
            m = FIM_DE_CAMPO.search(self.d[c])
            if m:
                self.d["descricao"] = juntar([self.d[c][m.end():], self.d["descricao"]])
                self.d[c] = self.d[c][:m.start() + 1]
        # nas famílias, o Default costuma vir no meio do parágrafo
        if self.da_familia and not self.d["defaults"]:
            m = DEFAULT_NO_TEXTO.search(self.d["descricao"])
            if m:
                self.d["defaults"] = m.group(1)
                self.d["descricao"] = juntar([self.d["descricao"][:m.start()], self.d["descricao"][m.end():]])
        for c in ("defaults", "pre_requisitos", "modificadores"):
            self.d[c] = self.d[c].rstrip(".")
        return self.d


def sub_pericia(ln):
    """(nome, atributo, dificuldade, resto da linha) se a linha abre uma perícia de família."""
    if not eh_italico(ln[0]):
        return None
    rot = []
    for k, w in enumerate(ln):
        if not eh_italico(w):
            return None
        rot.append(w["text"])
        if w["text"].endswith(":"):
            m = SUB_PERICIA.match(" ".join(rot))
            return (m.group(1), m.group(2), m.group(3), ln[k + 1:]) if m else None
    return None


def eh_inicio_tipo(ln):
    t = texto(ln)
    return eh_tipo(ln[0]) and (TIPO.match(t) or REMISSAO.match(t))


def aponta_lista_basica(ref, livro):
    """True se a remissão cita uma página da lista de perícias do Basic Set (B174-B228)."""
    basico = "Basic Set" in livro
    for b, n in re.findall(r"\bpp?\.\s*(B?)(\d+)", ref):
        if (b or basico) and 174 <= int(n) <= 228:
            return True
    return False


def processar(caminho, nome_livro, saida, contador):
    atual = None
    # As remissões ("see Crewman, p. 185") têm o mesmo formato das remissões de vantagens;
    # só valem nas páginas em que há alguma perícia com tipo (IQ/Hard...) ou quando apontam
    # para a lista de perícias do Basic Set.
    prontas, tem_tipo = [], False

    def fechar():
        nonlocal atual
        if atual:
            prontas.append(atual.finalizar())
            atual = None

    def gravar():
        nonlocal prontas
        for d in prontas:
            if d["atributo"] or tem_tipo or aponta_lista_basica(d["tipo"], nome_livro):
                saida.writerow(d)
                contador[nome_livro] += 1
        prontas = []

    with pdfplumber.open(caminho) as pdf:
        total = len(pdf.pages)
        for i, page in enumerate(pdf.pages):
            linhas, numero = ler_pagina(page)
            page.flush_cache()
            pagina = numero or str(i + 1)
            tem_tipo = False
            k = 0
            while k < len(linhas):
                ln, recuada = linhas[k]
                if all(eh_titulo_pericia(w) for w in ln):
                    nome = texto(ln)
                    j = k + 1
                    # título quebrado em duas linhas (e não dois títulos seguidos)
                    if j + 1 < len(linhas) and all(eh_titulo_pericia(w) for w in linhas[j][0]) \
                            and eh_inicio_tipo(linhas[j + 1][0]) and not eh_inicio_tipo(linhas[j][0]):
                        nome += " " + texto(linhas[j][0])
                        j += 1
                    if j < len(linhas) and eh_inicio_tipo(linhas[j][0]):
                        fechar()
                        atual = Pericia(nome_livro, pagina, nome)
                        tem_tipo = tem_tipo or bool(TIPO.match(texto(linhas[j][0])))
                        k = j
                        continue
                    # outro título qualquer encerra a perícia em andamento
                    fechar()
                elif atual and all(eh_secao(w) for w in ln):
                    fechar()
                elif atual and atual.familia() and atual.campo != "tipo" and (
                        sub_pericia(ln) or (k + 1 < len(linhas) and sub_pericia(ln + linhas[k + 1][0]))):
                    # "Rapier (DX/Average): ..." dentro de Melee Weapon: uma perícia nova
                    # (o rótulo pode quebrar em duas linhas)
                    if sub_pericia(ln):
                        nome, atr, dif, resto = sub_pericia(ln)
                    else:
                        nome, atr, dif, resto = sub_pericia(ln + linhas[k + 1][0])
                        k += 1
                    fechar()
                    atual = Pericia(nome_livro, pagina, nome)
                    atual.partes["tipo"] = [f"{atr}/{dif}"]
                    atual.campo = "descricao"
                    atual.da_familia = True
                    tem_tipo = True
                    if resto:
                        atual.adicionar(resto, False)
                elif atual and atual.da_familia and all(eh_tipo(w) for w in ln):
                    atual.na_categoria = True  # subtítulo da família ("Fencing Weapons"): o texto dele não é da perícia
                elif atual and atual.na_categoria:
                    pass
                elif atual:
                    atual.adicionar(ln, recuada)
                k += 1
            gravar()
            if (i + 1) % 50 == 0:
                print(f"    página {i + 1}/{total}...")
            gc.collect()
    fechar()
    gravar()


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
    arquivo = a.saida or (a.pasta / "pericias.csv")
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
            print(f"  {contador[livro]} perícias")
    print(f"\nTotal: {sum(contador.values())} perícias -> {arquivo}")


if __name__ == "__main__":
    main()
